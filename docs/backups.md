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
