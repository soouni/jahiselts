# Muudatuste logi

Siin peetakse kuupäevade kaupa lühikest logi projekti olulistest muudatustest, otsustest ja ülevaatuseks esitatud ettepanekutest. Logikirje märgib ka, kas töö on alles PR-is või juba põhiharusse ühendatud.

## 2026-10-21

- **Jahirežiimi kaardinuppude nähtavad sildid** — muudatuses `src/main.tsx`, `src/style.css` ja `tests/minimal-ui.test.mjs`: aluskaart näitab valitud tüüpi; külgriba ümmarguste ikoonnuppude all on lühikesed sildid. Üldmõõtmine jääb jahimeestevaheliste vahemaade tööriistast eraldi. Sildid mahuvad nupu laiusesse ja alumine silt on keritav. PR #81 ülevaatusel; pole veel põhiharusse ühendatud. Kontroll: 53 testi läbis, 3 välise kaarditeenuse testi jäid vahele; build läbis.

- **`SECURITY DEFINER` funktsioonide lähteinventuur** — dokumenteerib praeguse `main` haru autentitud RPC-de, privaatsete teostusfunktsioonide ja triggerite õigused, rollikontrollid, testiviited ning kontrollimata osad. Ainult koodivaatus; tootmiskatalooge ega andmeid ei kontrollitud. PR #80 ühendati põhiharusse 21.10.2026.

## 2026-10-19

- **Võrguvaba kaardi valmisoleku selgem olek** — kandidaat muudatuses `src/main.tsx`: eristab rakenduse valmisoleku kaardipaketi seisust, kuvab allalaadimise edenemist ning annab võrguühenduseta olekus märku, et jahiinfo võib olla aegunud. Ühendati PR #79-s 19.10.2026. Kontroll: 52 testi läbis, 3 välise kaarditeenuse testi jäid vahele; tootmisbuild läbis.
- **Asukohaprivaatsuse telefonitest** — iPhone Safari ja Android Chrome’i vastuvõtutesti dokumentatsioon esitati eraldi PR-is. Test vajab kahte testkontot ja eraldi testprojekti; tootmisandmeid ei kasutata.
