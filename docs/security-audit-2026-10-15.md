# Turvaülevaatus — 15.10.2026

## Ulatus ja meetod

Auditeeritud: `soouni/jahiselts` seis pärast PR #55, Supabase'i tootmise
funktsioonide definitsioonid, tabeliõigused, RLS-poliitikad, migratsiooniajalugu,
turvanõustaja ning avaldatud `username-login` funktsioon. Rakenduse lähtekoodis
kontrolliti autentimist, õiguste kasutamist, kliendile antavaid võtmeid ja offline-vahemälu.
Sõltuvusi kontrolliti `npm audit` abil.

Ründestsenaariumid käivitati eraldatud kohalikus PostgreSQL-i mootoris PGlite.
Fixture sisaldab ainult paranduste kontrollimiseks vajalikke rolle ja tabeleid.
See ei asenda kogu Supabase Auth/PostgREST/Storage/RLS API testi ega
mitme andmebaasiühendusega koormustesti. Tootmises kasutajaandmeid ründetesti
jaoks ei lisatud ega muudetud; kontrolliti katalooge ja rakendati parandused.

## Leiud ja parandused

| Prioriteet | Leid | Parandus ja seis |
|---|---|---|
| P1 | `assign_hunt_leader`: kui `my_role()` tagastas `NULL`, ei käivitunud `IF role NOT IN (...)` keeld. Liikmesuseta sisselogitud konto võis läbida administraatorikontrolli. | Lisatud eksplitsiitne kasutaja ja puuduva rolli kontroll. Rakendatud tootmises. |
| P1 | Aktiivse vaataja sai juhiks määrata; `can_manage_hunt` andis juhile õigused sõltumata tema liikmerollist. Ka liikmest vaatajaks alandatud juht säilitas õigused. | Juhina saab hallata ainult aktiivne `member`; omanik/admin haldab oma rolli alusel. Juhti saab määrata ainult aktiivsete `owner/admin/member` seast. Rakendatud tootmises. |
| P2 | Jahitabelitel olid anonüümsel rollil tarbetud tabeliõigused ja kliendirollidel `TRUNCATE/REFERENCES/TRIGGER`. Olemasolev RLS piiras anonüümseid reatoiminguid, kuid tabeliõigused olid liiga laiad. | Anonüümsed õigused eemaldatud kuuel jahitabelil; mittevajalikud tabeliõigused eemaldatud `authenticated` rollilt. Jahi ja aju DELETE eemaldatud; vajalik CRUD säilitatud. Rakendatud tootmises. |
| P2 | Tootmise kasutajanimega sisselogimise piiraja luges katseid ja lisas neid eraldi; piir oli ainult IP+kasutajanime paaril. IP vahetamine lähtestas konto piiri ja samaaegsed päringud võisid ületada kavandatud limiiti. | Atomaarne `INSERT ... ON CONFLICT DO UPDATE`; eraldi konto-, IP- ja üldlimiit. 15 minuti kohta vastavalt 10/40/300. Funktsioonid on `SECURITY INVOKER` ja ainult `service_role` jaoks. Rakendatud tootmises. |
| P2 | Sõltuvusaudit leidis `source-map-js` arendussõltuvuses kõrge raskusega teenusetõkestuse nõrkuse. | Lockfail uuendatud parandatud versioonile. Pärast parandust `npm audit`: 0 leidu. |
| P3 | Loendurite koristamise võrgutõrge võis nurjata juba eduka sisselogimise. | Koristus on parima võimaliku pingutusega; autentitud sessioon tagastatakse ka koristuse tõrkel. `username-login` versioon 2 avaldatud. |

`TRUNCATE` ja `REFERENCES` ei kuulu PostgreSQL-i RLS-i alla. See ei tähenda,
et olemasolev PostgREST-i tabeli-API pakkus TRUNCATE käsku; õiguste vähendamine
eemaldab tarbetu võimekuse andmebaasi tasandilt.
[PostgreSQL-i dokumentatsioon](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Kontrollid

- `npm test`: 31 läbitud, 3 välise kaarditeenuse testi jäid vahele.
- `npm run build`: läbitud.
- `npm audit`: 0 leidu pärast lockfaili parandust.
- PostgreSQL-i testid: liikmesuseta/vaataja/deaktiveeritud konto ei määra juhti;
  admin määrab liikme; vaatajaks alandatud juht kaotab haldusõiguse;
  anonüümne tabelipäring ja kliendi TRUNCATE on keelatud;
  sama konto katsete piir püsib IP vahetamisel; piiraja on ainult serverirollile.
- Tootmise kataloogidest kontrollitud: mõlemad funktsiooniparandused olemas,
  anonüümne jahitabelite lugemisõigus puudub, kliendi TRUNCATE puudub,
  liikme SELECT säilib; piiraja funktsioonid pole anon/auth rollile käivitatavad.
- Tootmises migratsioonid `20261015121220_restrict_hunt_leader_roles` ja
  `20261015121325_harden_username_login_throttle`; Edge Function versioon 2.
- Supabase API testidesse lisatud liikmesuseta konto, vaataja juhiks määramise
  ja anonüümsete tabelipäringute katsed. Testiskriptid lubavad ainult kinnitatud
  testprojekti HTTPS origin'i.

## Järelejäänud tööd tähtsuse järjekorras

1. **P1: kogu Supabase API/RLS rollitest.** Testprojekt
   `pipwbfmgmuiisrvnnnmw` oli kontrolli ajal `INACTIVE`; kohalikud testkasutajate
   mandaadid puudusid. `npm run test:rls` ja `npm run test:hunt-operations`
   jäid käivitamata. Täielikku API katvust ei kinnitata. Ka tavalise, juhiks
   määramata osaleja positsioonivalik/kinnitamine vajab eraldi kontrolli —
   olemasolev edukas stsenaarium kasutab juhiks määratud liiget.
2. **P2: lekkinud paroolide kaitse.** Supabase'i turvanõustaja teatas, et see
   on väljas. Funktsioon on Pro paketist alates; tasuta lahenduse nõuet
   arvestades tasulist paketti ei aktiveeritud.
   [Supabase'i juhend](https://supabase.com/docs/guides/auth/password-security).
3. **P2: füüsiliste telefonide privaatsus- ja välitestid.** Kahe kontoga
   vabatahtlik asukohajagamine ning selle lõpetamine; välja logimine;
   asukohaloa keeld/tühistamine; lennurežiimis laadimine ja ühenduse taastumine;
   GPS/kompassi suund ning taustale viidud rakendus.
4. **P3: privileegsete funktsioonide haldus.** Turvanõustajasse jäi 15
   `authenticated SECURITY DEFINER` hoiatust. Need on õigustega API-d ja
   RLS-i abifunktsioonid; hoiatus üksi ei tõenda nõrkust. Rollikontrollid ja
   anonüümne EXECUTE kontrolliti olulisematel mutatsioonidel. Hoida iga
   muudatusega kaasas rollitestid; kaaluda sisemiste abifunktsioonide viimist
   eraldi skeemi järgmise kavandatud andmebaasirefaktori käigus.

Kahe sisselogimisloenduri tabeli `RLS Enabled No Policy` infoteated on
tahtlikud: kliendirollidel puuduvad õigused, ligipääs on ainult serverirollil.
Vana `username_login_attempts` tabelit ei kustutatud; uus piiraja kasutab
`username_login_limits` tabelit.
