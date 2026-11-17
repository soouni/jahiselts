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
- `SUPABASE_URL` - projekti URL, näiteks `https://pipwbfmgmuiisrvnnnmw.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Ära pane neid väärtusi koodi ega README faili.

## Taastamine

Laadi `database.dump` privaatsest `backups` bucketist alla.

Taastamine uude andmebaasi:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$SUPABASE_DB_URL" database.dump

## Kui töö ebaõnnestub

Töö kontrollib nüüd iga faili sisu ega lae tühja või liiga väikest varukoopiat üles. Levinuim viga on vana andmebaasi parool saladuses `SUPABASE_DB_URL` (`password authentication failed`); sammud ja tabel on [töökorra juhendis](runbook.md#4-varukoopia).
