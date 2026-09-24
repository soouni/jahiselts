# Rollipõhised Supabase API testid

`rls-api.mjs` kontrollib admini, liikme, vaataja ja deaktiveeritud liikme andmebaasiõigusi ning fotode ligipääsu. Test loob kaardiobjekte, vaatlusi, auditikirjeid ja foto testfaili, seejärel pehme kustutab testkirjed. Käivita seda ainult eraldi projektis `pipwbfmgmuiisrvnnnmw`.

## Testkasutajate loomine

`bootstrap-test-users.mjs` loob kordumatud Auth kontod, seob rollid rakenduse `join_club()` kaudu ning lisab kutseridad Supabase CLI ajutise migratsiooniga. Skript peatub, kui projektiviide või URL ei klapi kinnitatud testprojektiga. See vajab Node.js-i, projektikaustas tehtud `supabase login` ja `supabase link` samme ning testprojekti Supabase Secret/service_role võtit.

1. Leia testprojekti URL, publishable key ja serveri Secret key Dashboardi **Project Settings → API Keys** alt. Kasuta ainult projekti `pipwbfmgmuiisrvnnnmw` võtmeid. Secret/service_role võtit ei tohi panna Gitiga jälgitavasse faili ega siia vestlusse.
2. Projektikausta terminalis määra väärtused ainult selle terminali seansiks:

   ```bash
   export RLS_TEST_URL='https://pipwbfmgmuiisrvnnnmw.supabase.co'
   export RLS_TEST_PUBLISHABLE_KEY='TESTPROJEKTI_PUBLISHABLE_KEY'
   export RLS_TEST_SECRET_KEY='TESTPROJEKTI_SECRET_KEY'
   export RLS_TEST_ACK='I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT'
   ```

3. Käivita loomine:

   ```bash
   node tests/integration/bootstrap-test-users.mjs
   ```

   Skript salvestab kordumatud kontode e-posti aadressid ja paroolid ainult ignoreeritud faili `tests/integration/.test-users.env`, mille õigused on ainult sinu kasutajale. Secret key faili ei salvestata.

4. Käivita RLS-testid:

   ```bash
   npm run test:rls
   ```

Ära kopeeri ega kuva `.test-users.env` faili sisu. Kui fail on juba olemas, skript peatub, et mitte paroole üle kirjutada. Testprojekti saab pärast kontrolli Supabase Dashboardist eemaldada.
