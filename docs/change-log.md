# Muudatuste logi

Siin peetakse kuupäevade kaupa lühikest logi projekti olulistest muudatustest, otsustest ja ülevaatuseks esitatud ettepanekutest. Logikirje märgib ka, kas töö on alles PR-is või juba põhiharusse ühendatud.

## 2026-10-21

- **`SECURITY DEFINER` funktsioonide lähteinventuur** — dokumenteerib praeguse `main` haru autentitud RPC-de, privaatsete teostusfunktsioonide ja triggerite õigused, rollikontrollid, testiviited ning kontrollimata osad. Ainult koodivaatus; tootmiskatalooge ega andmeid ei kontrollitud. Eraldi PR #80-s; pole veel põhiharusse ühendatud.

## 2026-10-19

- **Võrguvaba kaardi valmisoleku selgem olek** — kandidaat muudatuses `src/main.tsx`: eristab rakenduse valmisoleku kaardipaketi seisust, kuvab allalaadimise edenemist ning annab võrguühenduseta olekus märku, et jahiinfo võib olla aegunud. Ülevaatuseks eraldi PR-is; pole veel põhiharusse ühendatud. Kontroll: 52 testi läbis, 3 välise kaarditeenuse testi jäid vahele; tootmisbuild läbis.
- **Asukohaprivaatsuse telefonitest** — iPhone Safari ja Android Chrome’i vastuvõtutesti dokumentatsioon esitati eraldi PR-is. Test vajab kahte testkontot ja eraldi testprojekti; tootmisandmeid ei kasutata.
