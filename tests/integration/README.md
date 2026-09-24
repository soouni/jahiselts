# Rollipõhised Supabase API testid

`rls-api.mjs` on otsepäringutest ainult eraldi, ajutises Supabase'i testprojektis. Test loob unikaalseid kirjeid ning auditikirjeid; seda ei tohi käivitada tootmisprojektis.

Vajalikud keskkonnamuutujad:

- `RLS_TEST_URL`, `RLS_TEST_PUBLISHABLE_KEY`
- `RLS_TEST_ADMIN_EMAIL`, `RLS_TEST_ADMIN_PASSWORD`
- `RLS_TEST_MEMBER_EMAIL`, `RLS_TEST_MEMBER_PASSWORD`
- `RLS_TEST_VIEWER_EMAIL`, `RLS_TEST_VIEWER_PASSWORD`
- `RLS_TEST_INACTIVE_EMAIL`, `RLS_TEST_INACTIVE_PASSWORD`
- `RLS_TEST_ACK=I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT`

Testikontodel peab olema vastav aktiivne roll, välja arvatud mitteaktiivne konto. Seadista `club_settings.viewer_layers` testis kasutatavate kihtidega ja loo igale testkontole Supabase Authi parool.

Käivita `node tests/integration/rls-api.mjs`. Ära pane testparoolide faili hoidlasse.
