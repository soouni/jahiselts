# Muudatuste logi

Siin peetakse kuupäevade kaupa lühikest logi projekti olulistest muudatustest, otsustest ja ülevaatuseks esitatud ettepanekutest. Logikirje märgib ka, kas töö on alles PR-is või juba põhiharusse ühendatud.

## 2026-11-19 · Hämarik ja laskevalgus ilmapaneelis

- **Uus.** Ilmapaneelis on rida „Täna (arvutuslik)": hämariku algus ja lõpp (Päikese kõrgus −12°), laskevalguse algus ja lõpp (−6°), päikesetõus ja -loojang. Arvutatakse seadmes teegiga SunCalc, töötab ilma võrguta ja on nähtav ka külalisele.
- **Piirang.** Laskevalgus on hinnang Päikese asendist, mitte jahieeskirja aeg. Lävi on konstant `SHOOTING_LIGHT_DEGREES` failis `src/sunTimes.ts`.

## 2026-11-19 · Asukoht, ilm kõigile, jahi kordamine jahi sees

- **Asukoht.** Liikme, admini ja omaniku vasakusse nupuveergu lisati ümmargune „Asukoht" (jahirežiimis peidus, vaatajal jääb alumine riba).
- **Ilm.** Ümmargune „Ilm" on vasakus veerus kõigile, ka sisselogimata külalisele. Ilmapaneel ei nõua enam liikmeks olemist.
- **Uus samade osalejatega.** Nupp kolis salvestatud jahtide loendist avatud jahi vaatesse (omanik/admin). Loendis on „Ava jaht" ja omanikule „Kustuta jaht".

## 2026-11-19 · Omanik saab jahi kustutada

- **Uus.** Jahi planeerimise loendis on omanikule jahi juures nupp „Kustuta jaht" (ei näidata aktiivsele jahile). Kinnitusdialoog nimetab jahi ja ütleb, et kustuvad ka ajud, osalejad, positsioonid ja jahikoodid ning et seda ei saa tagasi võtta.
- **Kuidas.** Migratsioon `20261119100000_owner_delete_hunt.sql` lisab funktsiooni `delete_hunt(uuid)`: ainult aktiivne omanik, aktiivset jahti ei kustuta, kirjutab sündmuse `audit_events` tabelisse (nimi, olek, ajude ja osalejate arv). Tabeli DELETE-õigus jääb endiselt ära võetud; muud rollid (admin, jahijuht, liige) ja külalised ei saa funktsiooni kasutada.
- **Taastamine.** Kustutatud jahti rakendusest tagasi ei saa. Enne suuremat kustutamist käivita käsitsi varukoopia (Actions → Varukoopia).
- **Testid.** `tests/hunt-delete.test.mjs`: omanik kustutab koos kõigega ja see auditeeritakse; aktiivne jaht keelatud; admin, liige ja anonüümne keelatud; otsene DELETE keelatud; tundmatu jaht.

## 2026-11-17 · Intsidentide järelanalüüsid

- **Uus kaust** `docs/postmortems/`: varukoopia töö ei õnnestunud kunagi enne 2026-11-18 (13 jooksu, 0 edukat; `backups` bucket puudus, saladused olid valed; nüüd lahendatud, esimene varukoopia 2026-11-18 13:09 UTC) ning jahikoodi piirangute võidujooks (parandatud).

## 2026-11-17 · Jahikoodi piirangute võidujooks (sõltumatu audit)

- **Viga ja parandus.** Sõltumatu audit leidis, et `redeem_hunt_access_code` kontrollis piiri enne ja suurendas loendurit alles pärast koodi otsingut, nii et paralleelsed päringud pääsesid piirist mööda. Päris Postgresis (pgbench, 64 ühendust) lasi vana funktsioon 192 valest katsest läbi 61–68 (õige 5). Migratsioon `20261117140000_hunt_code_atomic_limits.sql` suurendab loendurit enne otsingut ühe `insert … on conflict … returning` käsuga; uus funktsioon lasi läbi täpselt 5, üldpiir täpselt 60, õige kood ei kuluta katseid.
- **Aadress.** IPv4-ga kaardistatud IPv6 (`::ffff:a.b.c.d`, ka kuueteistkümnendkujul) loetakse IPv4-ks, port ja tsooni-id jäetakse ära; varem koondusid need ühte ämbrisse.
- **Dokumendid.** Parandatud 960 katse/ööpäev (nüüd 1440, ADR-is 48 h arvutus), migratsioonide täielik järjekord ja jahtide automaatse lõpetamise tingimus.
- **Test.** `tests/integration/hunt-code-race.sh` kordab võidujooksu päris Postgresis.

## 2026-11-17 · `main.tsx` jagamine osadeks

- **Ülesehitus** — kandidaatharu `refactor/main-tsx-jagamine-20261117`: kontoga rakendus (`App`) on nüüd failis `src/App.tsx`, avalehe valik (jahikood, külalise vaade või konto) failis `src/Root.tsx` ja `src/main.tsx` sisaldab ainult käivitust. Abikomponendid `Modal`, `Field` ja `ToastContext` on `src/ui/Modal.tsx`, kategooriaikoonid `src/ui/kindIcons.ts`.
- **Puhtad funktsioonid** — `composeHuntMarkers` (`src/hunt/composeMarkers.ts`), osaleja sobitamine (`src/hunt/roster.ts`), võrguta kaardi lause (`src/offlineSummary.ts`) ja lähima objekti otsing (`src/nearest.ts`) on eraldi ja testitud; Eesti ruutkoordinaatide määratlus on ühes failis (`src/projection.ts`).
- **Käitumine ei muutunud.** Funktsioonide sisu on liigutatud muutmata (ainus erinevus: `composeHuntMarkers` võtab valikulise `now` parameetri, vaikimisi praegune aeg). `App` on endiselt umbes 80 KB ühes komponendis; selle edasine jagamine (olekud, jahirežiimi osad, kuva) vajab eraldi samme, sest olek on tihedalt seotud.
- **Testid** — 4 uut komponenditesti `Root` jaoks ja 5 ühiktesti väljatõstetud funktsioonidele; kolm olemasolevat tekstikontrolli loevad nüüd kõiki kolme faili.

## 2026-11-17 · Komponenditestid külalisvaatele

- **Renderdustestid** — kandidaatharu `test/komponenditestid-20261117`: `vitest` + `jsdom` + Testing Library katavad `CodeGate` ja `GuestHunt` komponendid (13 testi): koodi sisestamine ja automaatne saatmine, vigade teated ja nende eristamine, ainult vaatamine (ei lohistata, ei paigutata), vasak ja parem naaber, liini ots, ajaja sisenemiskoht, kohalik salvestus, sulgemine tühistatud koodi korral, võrguta salvestatud vaade. Kaart on testis asendatud lihtsa komponendiga, sest OpenLayers ei joonistu jsdom-is. Testi tõesust kontrolliti ühe teksti tahtliku murdmisega: kaks testi läksid katki.
- **`npm test`** jooksutab nüüd mõlemad komplektid (`node --test` ja `vitest run`); eraldi `npm run test:components`. Lähtekoodi tekstikontroll külalisvaate tekstide kohta asendati komponenditestidega; markeri kuju kontroll jääb allika põhjal, sest see on OpenLayersi lõuendil.

## 2026-11-17 · Hooldus: sõltuvused, Actions ja varukoopia kontroll

- **Sõltuvused** — kandidaatharu `chore/hooldus-soltuvused-actions-varukoopia-20261117`: `npm update` lubatud vahemikus (`ol` 10.11, `supabase-js` 2.119, `react` 19.3.1, `vite` 6.4.6, `proj4` 2.23). Suuri versioonihüppeid (`vite` 8, `lucide-react` 1.x, TypeScript 7) ei tehtud; `pglite` on tahtlikult kinnitatud versioonil 0.5.10.
- **GitHub Actions** — `actions/checkout` v4 → v6 ja `actions/setup-node` v4 → v6 kõigis kolmes töövoos (Node 20 tegevuste hoiatus). Lehe avaldamise tegevusi (`configure-pages`, `upload-pages-artifact`, `deploy-pages`) ei muudetud.
- **Varukoopia** — nädalane töö lõpetab nüüd vea, kui mõni fail on tühi, `database.dump` on alla 10 kB või `schema.sql`-is pole tabeleid; varem polnud mingit sisukontrolli. Töö ebaõnnestub endiselt alates 19. oktoobrist, sest GitHubi saladus `SUPABASE_DB_URL` sisaldab vana andmebaasi parooli: see tuleb käsitsi uuendada.
- **Migratsioonide versioonid** — tootmise migratsioonitabelis on neli viimast migratsiooni (`hunt_access_codes`, `confirm_hunt_position_order`, `auto_finish_hunts`, `hunt_code_lock_status`) nüüd samade versiooninumbritega nagu repos, et `supabase db push` ei rakendaks neid uuesti.

## 2026-11-17 · Jahikoodi piirangud, ajaja marker ja eestikeelsed tekstid

- **Piirangud** — kandidaatharu `fix/jahikood-piirangud-markerid-tekstid-20261117`: kliendi aadress võetakse nüüd värava päisest või `x-forwarded-for` viimasest kirjest (esimese kirje kirjutab klient ise ja sellega sai aadressi piiri mööda minna); IPv6 loetakse /64 kaupa. Üldpiir tõusis 40-lt 60-le valele katsele tunnis ja selle ületamine saab oma teate „sisenemine on hetkeks suletud”, sest varem süüdistati õiget koodi sisestajat aadressi piiris. Piir lõpeb ise tunni pärast. Jääkrisk: kolm erinevat võrguaadressi suudavad süsteemi tunniks lukku panna; tugevama kaitse jaoks oleks 6-kohaline kood parem, aga seda ei soovitud. Uus migratsioon `20261117100000_hunt_code_lock_status.sql` ja Edge Function `hunt-code` tuleb tootmises uuesti juurutada.
- **Markerid** — ajaja sisenemiskoht on ruut, kütt ring (roheline ja pruun olid peaaegu sama heledad, kontrast 1,08:1); oma koht on kollane tumeda äärisega.
- **Tekstid** — „Vasakul: pole kedagi, oled liini otsas”; suund ilmakaarena („kirde suunas”) kraadide asemel; nupp „Salvesta kaart”; „kaardilõik” sõna „kaardipaan” asemel; „Kaart ei asenda jahijuhi ohutusjuhiseid”; piirangu teated eristavad seadme ja kogu süsteemi piiri.
- **Testid** — uued testid aadressi petmise, IPv6, üldpiiri ja lukustuse lõppemise, markerite kuju ja kontrasti ning tekstide kohta.

## 2026-11-16 · Aju külgede pikkuste ja vahemaade siltide paigutus

- **Sildid ei jää enam üksteise ega kohamärkide alla** — kandidaatharu `fix/aju-kuljepikkuste-sildid-20261116`: aju külje pikkuse silt nihkub piki külge (vajadusel sügavamale ala sisse) esimesse kohta, kus ees ei ole kohamärki, nimesilti ega küttide vahemaa silti. Küttide vahemaa silt asub joone kõrval aju ala pool, mitte joone ja märkide peal, ning väldib samuti märke ja nimesilte. Kohamärgid joonistatakse vahemaade joonte peale, et joon ei kataks koha numbrit. Kehtib nii külalise kui liikme jahivaates (`src/Map.tsx`); jahijuhi planeerimiskaarti ei muudetud. Loogika ja testid: `src/hunt/areaStyles.ts`, `tests/hunt-area-styles.test.mjs`. Teadaolev piir: kui kaks kohta on ekraanil alla umbes 120 piksli vahega, ei pruugi vahemaa sildile täiesti vaba kohta leiduda; kaardi peal olevaid nuppe paigutus ei arvesta.

## 2026-11-16 · Kütiliini naabrid vasakul ja paremal

- **Naabrid liini järjekorra järgi** — kandidaatharu `fix/kutiliini-naabrid-20261116`: külalise kast „Sinu koht" näitas kahte linnulennult lähimat kütti, mis liini otsas seistes olid mõlemad samal pool. Nüüd tuletatakse kütiliini järjekord kohtade asukohast (lühim ahel, ei sõltu kohanumbritest) ning näidatakse eraldi „Vasakul" ja „Paremal" näoga aju ala keskkoha poole. Liini otsas kuvatakse „kedagi, oled kütiliini otsas"; teist otsa näidatakse naabrina ainult siis, kui liin on suletud ring. Aju suunda ega ajajate asukohta selleks ei kasutata. Loogika: `src/guest/neighbours.ts`, testid `tests/guest-neighbours.test.mjs`. Andmebaasi ei muudeta. Samas harus asendati külalise vaate vaba mõõtmise tööriist nupuga „Vahemaad", mis näitab kaardil küttide omavahelisi kaugusi (sama funktsioon mis liikme jahivaates).

## 2026-11-16 · Külalise vaate parandused ja testide parandus

- **Avaldamise taastamine ja täiendused** — kandidaatharu `parendused-kulalisvaade-20261116`: testiandmebaasi `pg_cron`-i asendus (avaldamine oli seisnud alates PR-ist #100), testid küttide järjestusele ja öisele lõpetamisele, ajaja sisenemiskoht külalise kaardil, alati nähtavad nimesildid, ilmateate lehe parandus ning võrguta kaart külalisele. Andmebaasi ei muudeta. Üksikasjad: [jahikood](jahikood-2026-11-16.md).

## 2026-11-16 · Jahikood ja külalise jahivaade

- **Neljakohaline jahikood kontode asemel** — kandidaatharu `jahikood-kulalisvaade` (ühendamata, tootmises rakendamata): avaleht küsib jahikoodi; koodiga näeb ainult ühe jahi paigutust, muuta ei saa midagi. Jahijuhid ja adminid sisenevad kontoga ning loovad koodi jahi vaates. Külaline ei saa Supabase'i seanssi; RLS-i ei muudetud. Enne `main`-i ühendamist tuleb rakendada migratsioon ja avaldada Edge Function `hunt-code`. Üksikasjad: [jahikood](jahikood-2026-11-16.md).

## 2026-10-24 · Seltsi märgid planeerimiskaardil

- **Planeerimise puuduv objektikiht** — kandidaatharu `fix/planning-map-landmarks`: jahi planeerimise kaardile antakse põhikaardil nähtavad ja rolli järgi lubatud seltsi objektid. Nähtavad on kohamärgid, sihid/jooned, metsatukad ning valitud filtritega vaatlused ja jäljed. Põhikaart ja planeerimiskaart kasutavad ühist objektide teisendust ja stiili, säilitades sümbolid, värvid, joonelaiused ja nimed. Planeerimise objektikiht on vaatamiseks; positsiooni valimine ja ala joonistamine säilivad. Kontroll: 74 testi läbis, 3 välise teenuse testi jäeti vahele; build ja diff-check läbisid. Testid katavad geomeetriate teisenduse, sümbolid, kujunduse, kustutatud objektide väljajätmise ja filtreeritud andmete tee planeerimiskaardini. Sisselogitud telefonivaate visuaalne kontroll on tegemata. Veel põhiharusse ühendamata ega avaldatud.

## 2026-10-24 · Telefoni kaardi lohistamine

- **Puudutusega lohistamine ilma fookusenõudeta** — kandidaatharu `fix/touch-map-pan`: põhikaardi `tabIndex` aktiveeris OpenLayersi vaikimisi fookusenõude panoraamimisele; telefon ei pruugi puudutamisel kaardile fookust anda. Mõlemal kaardil kasutatakse nüüd selgesõnalisi vaikimisi interaktsioone `onFocusOnly:false` abil. Tab-fookus ja klaviatuurijuhtimine säilivad, samuti kahe sõrmega suumimine. Regresioonitest kordab vana fookuseblokeeringu ning kinnitab uue seadistusega sõrmelòhistamise alustamist ja kaardi keskme muutumist. Kontroll: 72 testi läbis, 3 välise kaarditeenuse testi jäeti vahele; tootmisbuild ja diff-check läbisid. Päris iPhone'i puudutustest on tegemata. Veel põhiharusse ühendamata ega avaldatud.

## 2026-10-24 · Jahiala siltide loetavus

- **Mõõdusildid ala sisse ja täismeetriteks** — kandidaatharu `fix/hunt-area-label-layout`: piirjoone pikkused ümardatakse täismeetriteks (570,4 m → 570 m). Sildid nihkuvad lõigu keskelt 28 ekraanipikslit ala sissepoole; kitsas alas vähendatakse nihet. Arvestatud mõlema piiripunktide järjekorraga. Planeerimis- ja põhikaardi jahimärgid ning mõõdusildid kasutavad ühist kattumise vältimist: jahimeeste ikoonid säilivad alati, kattuv nimi või mõõdusilt võib jääda peidetuks kuni suumimise/liigutamiseni. Kontroll: 71 testi läbis, 3 välise teenuse testi jäeti vahele; build ja diff-check läbisid. Visuaalne kontroll päris telefonis on tegemata. Veel põhiharusse ühendamata ega avaldatud.

## 2026-10-24

- **Aju ala piirjoonte automaatsed pikkused** — kandidaatharu `feat/hunt-area-distances`: aju ala joonistamisel ja salvestatud ala kuvamisel näidatakse iga kahe piiripunkti vahel lõigu pikkust, ka sulgeval serval. Sama kujundus planeerimiskaardil, joonistamise eelvaates ja põhikaardil. Mõõdud arvutatakse L-EST97 meetrites, pikematel lõikudel kuvatakse kilomeetrid; korduvaid/nullpikkusega joonistuspunkte ei sildistata. Eesmärk on toetada jahijuhi hinnangut kütiliinide pikkusele; automaatset meeste arvu ei arvutata. Kontroll: täiskomplektis 69 testi läbis, 3 välist kaarditeenuse testi jäeti vahele; lõpliku dublettide käsitluse 2 sihttesti ja tootmisbuild läbisid. Brauseri visuaalset ega sisselogitud jahiplaneerimise kontrolli pole tehtud. Veel põhiharusse ühendamata ega avaldatud.

## 2026-10-23

- **Kõigi kuue brauseritestileiu parandused** — kandidaatharu `fix/browser-test-findings`: mobiili infopaneel avaneb ja kerib; ringmõõtmisel eemaldatud tehniliste servade sildid; dialoogi sulgemine taastab fookuse; kaart on klaviatuuriga fokusseeritav ning nooleklahvide ja +/- abil juhitav; arvuti mõõtmispaneel ei kattu aluskaardinupuga; tööriistasildid suurendatud 11–12 px-ni ning kerimisruum kohandatud. Tööd tegid mobiili-, põhitoimingute ja ligipääsetavuse agendid eraldi harudes. Täpsemad kontrollid ja piirangud on brauseritestiraporti paranduste jaotises. Veel põhiharusse ühendamata ega avaldatud.

Koondharu automaatkontroll: 67 testi läbis, 3 välise kaarditeenuse testi jäeti vahele; tootmisbuild ja `git diff --check` läbisid.

## 2026-10-22

- **Ilmateade M-menüüs** — kandidaatharu `feat/parnjoe-weather`: kontomenüüsse lisatud „Ilmateade“, mis avab Ilmateenistuse (EMHI) Pärnjõe küla asukohaprognoosi uuel vahelehel. Püsikoordinaadid 58.631909 N, 24.927124 E on kontrollitud Ilmateenistuse koharegistrist (asukoht 6616); seadme GPS-i ei kasutata. Ilmateenistuse mudelprognoosi andmeliides vastas kontrollimisel 503-ga, seetõttu kohalikke ilmanäitajaid ei dubleerita ning kasutatakse ametlikku asukohaprognoosi otselinki. Veebilehele veel avaldamata.

- **Pärnjõe püsiv tuuleandmete asukoht** — kandidaatharu `fix/parnjoe-weather-point`: tuule kiiruse ja suuna päring kasutab ametliku jahipiirkonna keskme lähedast püsipunkti (58.639 N, 24.892 E). Kasutaja GPS, määratud jahikoht ja kaardi liigutamine ilmaandmete asukohta ei mõjuta; GPS pole tuule kuvamiseks vajalik. Lisatud kontroll, et päringu punkt asub ametliku jahipiirkonna sees. Veel põhiharusse ühendamata.

## 2026-10-21

- **Jahirežiimi kaardinuppude nähtavad sildid** — muudatuses `src/main.tsx`, `src/style.css` ja `tests/minimal-ui.test.mjs`: aluskaart näitab valitud tüüpi; külgriba ümmarguste ikoonnuppude all on lühikesed sildid. Üldmõõtmine jääb jahimeestevaheliste vahemaade tööriistast eraldi. Sildid mahuvad nupu laiusesse ja alumine silt on keritav. PR #81 ülevaatusel; pole veel põhiharusse ühendatud. Kontroll: 53 testi läbis, 3 välise kaarditeenuse testi jäid vahele; build läbis.

- **`SECURITY DEFINER` funktsioonide lähteinventuur** — dokumenteerib praeguse `main` haru autentitud RPC-de, privaatsete teostusfunktsioonide ja triggerite õigused, rollikontrollid, testiviited ning kontrollimata osad. Ainult koodivaatus; tootmiskatalooge ega andmeid ei kontrollitud. Eraldi PR #80-s; pole veel põhiharusse ühendatud.

## 2026-10-19

- **Võrguvaba kaardi valmisoleku selgem olek** — kandidaat muudatuses `src/main.tsx`: eristab rakenduse valmisoleku kaardipaketi seisust, kuvab allalaadimise edenemist ning annab võrguühenduseta olekus märku, et jahiinfo võib olla aegunud. Ühendati PR #79-s 19.10.2026. Kontroll: 52 testi läbis, 3 välise kaarditeenuse testi jäid vahele; tootmisbuild läbis.
- **Asukohaprivaatsuse telefonitest** — iPhone Safari ja Android Chrome’i vastuvõtutesti dokumentatsioon esitati eraldi PR-is. Test vajab kahte testkontot ja eraldi testprojekti; tootmisandmeid ei kasutata.

## 2026-10-22

- **Väiksem veekogu märk ühe lainega** — kandidaatharu `fix/smaller-water-symbol`: tiigi ja muu veekogu sinises ringis on üks laine. Tavakuva suurus vähenes 32 pikslilt 20 pikslile, valitud märgil 40 pikslilt 26 pikslile. Kaart, legend ja redaktor kasutavad sama märki. Veel põhiharusse ühendamata.


## 2026-10-22 · Pärnjõe kuue tunni ilmateade

- **Ilmateade jahikaardi sees** — kandidaatharu `feat/parnjoe-hourly-weather`: M-menüü ilmateade avab lehe sees Pärnjõe jahipiirkonna järgmise kuue täistunni prognoosi. Kuvatakse ilmaikoon, temperatuur, sademed, tuule suund/kiirus ja puhangud; allikas Open-Meteo. Sama püsipunkt kui kaardi tuulekihil, seadme GPS-i ei kasutata. Kellaajad Eesti ajas, andmete laadimise aeg nähtav. Viimane avalik prognoos salvestatakse seadmesse; tõrke korral näidatakse allesolevaid tulevasi tunde ja vananemismärget. Üle 30 minuti vanused andmed märgitakse aegunuks; prognoos uueneb avatud paneelis 15 minuti järel. Laadimisel 12 s ajalimiit, käsitsi uuendamine ja veateade. Veel põhiharusse ühendamata. Ilmateenistuse välislink on selles vaates asendatud Open-Meteoga.

Kontroll: 59 testi läbis, 3 välise kaarditeenuse testi jäeti vahele; build ja `git diff --check` läbisid. Päris Open-Meteo päring tagastas HTTP 200 ja brauseripäringuid lubava CORS-päise; saadud vastuse töötlemine andis 6 tulevast tundi. Brauseri visuaalset kontrolli selles keskkonnas ei tehtud.


## 2026-10-22 · Kolme agendi kasutustest

- **Avaliku lehe brauseritest** — mobiili, põhitoimingute ja ligipääsetavuse testagendid kontrollisid lehte päris Chrome’is. Kinnitati kuus erinevat puudust: mobiili peidetud infopaneel, ringmõõtmise liigsed sildid, modaali fookuse taastumine, kaardi klaviatuuritee puudumine, mõõtmise pealkirja kattumine ja 8 px aluskaardisilt. Sammud, töötanud teekonnad, piirangud ja ekraanipildid on failis `docs/browser-test-report-2026-10-22.md`. Testid ei hõlmanud sisselogitud kasutust ega päris mobiilseadet. Koodi ega seltsi andmeid ei muudetud; parandused on veel tegemata.
