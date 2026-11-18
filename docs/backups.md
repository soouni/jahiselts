# Varukoopiad

GitHub Actions workflow `Weekly Supabase backup` teeb varukoopia kord nädalas ja käsitsi käivitamisel.

Varukoopia salvestatakse privaatsesse Supabase Storage bucketisse `backups`.

Varukoopia sisaldab:
- `database.dump` - PostgreSQL custom dump
- `schema.sql` - skeemi SQL
- `map_objects.geojson`
- `observations.geojson`
- `sign_reports.geojson`

## Vajalikud GitHub Secrets väärtused

Repository Settings -> Secrets and variables -> Actions:

- `SUPABASE_DB_URL` - Supabase PostgreSQL connection string
- `SUPABASE_URL` - **tootmise** projekti URL: `https://asvbfhbmegmeuvvtgvor.supabase.co`. Ära kasuta testprojekti `pipwbfmgmuiisrvnnnmw` URL-i: see projekt ei sisalda `backups` bucketit ja üleslaadimine vastab „Bucket not found"
- `SUPABASE_SERVICE_ROLE_KEY` - **sama** (tootmise) projekti Secret key (`sb_secret_…`) või vana service_role võti: Project Settings → API Keys

Ära pane neid väärtusi koodi ega README faili.

## Taastamine

Laadi `database.dump` privaatsest `backups` bucketist alla.

Taastamine uude andmebaasi:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$SUPABASE_DB_URL" database.dump

## Kui töö ebaõnnestub

Töö kontrollib nüüd iga faili sisu ega lae tühja või liiga väikest varukoopiat üles. Levinuim viga on vana andmebaasi parool saladuses `SUPABASE_DB_URL` (`password authentication failed`); sammud ja tabel on [töökorra juhendis](runbook.md#4-varukoopia).

## Ebaõnnestumisest teavitamine

Kui nädalane töö ebaõnnestub, avab see GitHubi issue pealkirjaga „Varukoopia ebaõnnestus” (korduval ebaõnnestumisel lisab kommentaari). Issue'd tulevad GitHubi tavalise märguandena. Töö ise kontrollib enne üleslaadimist, et fail on olemas, ei ole tühi, `database.dump` on loetav ja sisaldab tabelite `hunts`, `memberships`, `map_objects`, `observations` ja `sign_reports` andmeid.

## Taastamise proov

Töö „Varukoopia taastamise proov” (`restore-test.yml`, ainult käsitsi): laeb alla viimase varukoopia, taastab avaliku skeemi ajutisse PostGIS-andmebaasi ja võrdleb tabelite `hunts`, `memberships`, `map_objects`, `observations`, `sign_reports` ja `boundary_versions` ridade arvu tootmisandmebaasiga (tootmisest loetakse ainult ridade arv). Käivita pärast iga suuremat muutust ja vähemalt kord kvartalis: Actions → Varukoopia taastamise proov → Run workflow.

- Oodatud vead: `violates foreign key constraint` seoste kohta tabeliga `auth.users`, sest see on proovis tühi. Andmed ise taastatakse.
- Läbikukkumine tähendab, et mõni tabel jäi taastamata või tuli tühjana, kuigi tootmises on andmeid.
- Töö ei ole seni päris varukoopiaga proovitud; esimene käivitus võib vajada parandusi.
