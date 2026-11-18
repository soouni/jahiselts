# Järelanalüüs: jahikoodi piirangute võidujooks

**Kuupäev:** 2026-11-17 | **Kestus:** umbes 29 tundi (2026-11-16 09:16 kuni 2026-11-17 13:59 UTC) | **Tõsidus:** SEV3 (haavatavus, ärakasutamise märke ei ole)
**Autor:** Claude koos Martti Ojamaaga | **Staatus:** Parandatud ja avaldatud

## Kokkuvõte

4-kohalise jahikoodi kaitse seisneb katsete piirangutes (5 katset 15 minutis aadressi kohta, 60 tunnis kokku). Funktsioon `redeem_hunt_access_code` kontrollis piiri enne ja suurendas loendurit alles pärast koodi otsingut, ilma lukuta, nii et paralleelsed päringud pääsesid piirist mööda. Sõltumatu audit leidis selle ja päris Postgresis mõõdeti: 192 samaaegsest valest katsest läks läbi 61–68 (õige oleks 5). Parandus on tootmises.

## Mõju

- Võimalik: ründaja, kes saadab palju samaaegseid päringuid, saab proovida palju rohkem koode, kui piir lubab, ja jõuda kehtiva koodi kaudu ühe jahi lühendatud nimede ja kohtade vaatamiseni.
- Ärakasutamise märke ei ole leitud, aga seda ei saa tõestada: koode ja katseid ei logita tahtlikult, ja tabel `hunt_code_limits` hoiab ainult loendureid.
- Kontoga sisenemist, kirjutamisõigusi ega muid andmeid see ei mõjutanud.

## Ajajoon (UTC)

| Aeg | Sündmus |
|---|---|
| 2026-11-16 09:16 | Edge Function `hunt-code` v1 kasutusele. |
| 2026-11-17 10:30 | v2: eraldi „lukus" olek ja parem aadressi määramine (parandab teisi leide, mitte võidujooksu). |
| 2026-11-17 ~11:40 | Sõltumatu auditi agent loeb koodi ja märgib piirangute võidujooksu kõrge tõsidusega. Koodist kinnitatud. |
| 2026-11-17 ~11:50 | pgbench mõõtmine kohalikus Postgresis (64 ühendust): vana 61 ja 68 läbi lastud, uus 5. PR #112 ühendatud. |
| 2026-11-17 ~11:55 | Migratsiooni rakendamise kinnitus Supabase'is jäi vastuseta, rakendamine viibis. |
| 2026-11-17 13:59 | Tootmise funktsioon kontrollitud: aatomlikud loendurid kasutusel. Edge Function v3 avaldatud. |

## Põhjus

Kontrolli ja loenduri suurendamise vahel oli aken (check-then-act). Ainult üks andmebaasiühendus (PGlite) ei suuda paralleelsust näidata, seega testid läksid rohelisteks.

### 5 Miks

1. Miks pääses ründaja piirist mööda? → Paralleelsed päringud nägid kõik sama väikest loendurit.
2. Miks nägid? → Loendurit suurendati alles pärast kontrolli ja otsingut.
3. Miks nii kirjutati? → Loogika oli kirjutatud ühe päringu käitumise järgi, nii nagu teste kirjutati.
4. Miks ei leidnud testid? → Testid kasutavad PGlite'i, mis on üheühenduseline, ja paralleelsuse testi polnud.
5. Miks polnud paralleelsuse testi? → Piirangutele ei hinnatud eraldi ohtu „paralleelne ründaja", kuigi kaitse põhines just piirangutel.

## Mis läks hästi

- Sõltumatu audit (agent, kes ei näinud eelnevat tööd) leidis vea enne teadaolevat ärakasutamist.
- Parandust mõõdeti päris Postgresis enne ja pärast, mitte ainult teoreetiliselt.
- Piirid ei muutunud, seega sisenemise kogemus jäi samaks.

## Mis läks halvasti

- Viga oli tootmises umbes 29 tundi ja sellest umbes 4 tundi pärast avastamist (migratsiooni kinnitus viibis).
- Testid andsid vale kindlustunde.

## Tegevused

| Tegevus | Omanik | Prioriteet | Tähtaeg |
|---|---|---|---|
| Aatomlikud loendurid migratsioonina, uus Edge Function ja IPv4/IPv6 parandus | Claude | P0 | tehtud 2026-11-17 |
| Skript `tests/integration/hunt-code-race.sh` | Claude | P0 | tehtud 2026-11-17 |
| Lisa CI-sse Postgresi teenusekonteineriga töö, mis käivitab võidujooksu skripti | Claude | P1 | 2026-11-24 |
| Kontrolli päris telefonis ja päris Supabase'is koodiga sisenemist | Martti | P1 | 2026-11-18 |
| Vaata Edge Function'i logisid 16.–17. novembri ebatavalise `429` mahu osas | Claude | P2 | 2026-11-24 |

## Õppetunnid

Kaitse, mis tugineb loendurile, peab olema atomaarne ja seda peab testima samaaegselt. Üheühenduselise testibaasi roheline tulemus ei ütle midagi võidujooksu kohta.
