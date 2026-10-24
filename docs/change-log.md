# Muudatuste logi

Siin peetakse kuupäevade kaupa lühikest logi projekti olulistest muudatustest, otsustest ja ülevaatuseks esitatud ettepanekutest. Logikirje märgib ka, kas töö on alles PR-is või juba põhiharusse ühendatud.

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
