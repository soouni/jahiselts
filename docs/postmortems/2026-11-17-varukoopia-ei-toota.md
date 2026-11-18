# Järelanalüüs: nädalane varukoopia pole kunagi õnnestunud

**Kuupäev:** 2026-11-17 | **Kestus:** 55 päeva (2026-09-24 kuni esimene õnnestunud varukoopia 2026-11-18 13:09 UTC) | **Tõsidus:** SEV3 (andmekadu ei ole juhtunud, kuid väline varukoopia puudus)
**Autor:** Claude koos Martti Ojamaaga | **Staatus:** Lahendatud (varukoopia töötab, taastamise proov on veel tegemata)

Süüd ei otsita: järelanalüüs vaatab süsteemi ja protsessi.

## Kokkuvõte

GitHub Actions töö „Weekly Supabase backup" ebaõnnestus **kõigil 13 korral** alates 24. septembrist (esimene õnnestunud jooks oli 2026-11-18). Põhjused olid kolm korraga: salvestuskoht `backups` puudus Supabase'is (selle migratsioonifail repos oli tühi), saladus `SUPABASE_URL` viitas projektile, kus bucketit pole, ja saladuse `SUPABASE_SERVICE_ROLE_KEY` väärtus ei olnud kehtiv Supabase'i võti. Keegi ei märganud seda enne 17. novembrit, sest ebaõnnestumisest ei teatatud kuhugi, kus seda näeks.

## Mõju

- Väljaspool Supabase'i pole ühtegi varukoopiat kaardiobjektidest, vaatlustest ega jahiandmetest. Supabase'i enda platvormipõhiste varukoopiate olemasolu sõltub plaanist ja seda ei ole kontrollitud.
- Andmekadu ei ole teadaolevalt juhtunud. Mõju on risk, mitte tekkinud kahju.

## Ajajoon (UTC)

| Aeg | Sündmus |
|---|---|
| 2026-09-24 20:58–21:28 | Neli käsitsi käivitust, kõik ebaõnnestuvad. Põhjust ei uuritud (logid pole säilinud selles analüüsis). |
| 2026-09-24 20:24 | Migratsioon `private_backup_bucket` registreeritakse Supabase'is, `statements` on tühi. Repo fail `20260924202458_private_backup_bucket.sql` on 0 baiti. |
| 2026-09-28 – 2026-11-16 | Kaheksa ajastatud jooksu (iga esmaspäev), kõik ebaõnnestuvad. |
| 2026-11-16 11:12 | Viimane ajastatud jooks ebaõnnestub: `password authentication failed for user "postgres"`. |
| 2026-11-17 | Hooldusel avastatakse, et jooksud on punased. Töösse lisatakse failide sisukontroll. |
| 2026-11-17 ~14:20 | Martti lähtestab andmebaasi parooli ja uuendab GitHubi saladuse `SUPABASE_DB_URL`. |
| 2026-11-17 14:28 | Käsitsi käivitus: `pg_dump`, skeem ja GeoJSON õnnestuvad, failikontrollid läbitud, arhiiv tehtud. Üleslaadimine Storage'i annab `544 DatabaseTimeout`. |
| 2026-11-17 | Kontroll: `storage.buckets` ei sisalda kirjet `backups`, `storage.objects` on `backups` jaoks tühi. |
| 2026-11-17 15:26 | Tootmises luuakse privaatne bucket `backups` (migratsioon `20261117152659_create_backups_bucket`). |
| 2026-11-17 15:43 | Käsitsi käivitus: `404 Bucket not found`, kuigi bucket on tootmises olemas. Järeldus: `SUPABASE_URL` viitab teisele projektile (docs näitas näitena testprojekti aadressi). |
| 2026-11-17 16:29 | Pärast `SUPABASE_URL` parandamist: `403 Invalid Compact JWS`. Töö saatis võtme `Authorization: Bearer` päises. |
| 2026-11-18 09:16 | Parandatud päisega jooks: sama viga. |
| 2026-11-18 11:02 | Diagnostikaga jooks (PR #115): URL host on õige, võtme tüüp „tundmatu kuju", pikkus 44, st mitte Secret key. |
| 2026-11-18 13:09 | Pärast õige Secret key'i kopeerimist esimene õnnestunud varukoopia: `backup-20261118T130558Z.tar.gz`, 328 887 baiti, `application/gzip`. |

## Põhjused

Kinnitatud: (1) andmebaasi parool saladuses oli vananenud; (2) `backups` bucket puudus ja migratsioonifail oli tühi; (3) saladuse `SUPABASE_SERVICE_ROLE_KEY` väärtus ei olnud Secret key (logis „tundmatu kuju", 44 märki); (4) ebaõnnestumisest ei antud teada.

Järeldatud, mitte otse nähtud: `SUPABASE_URL` viitas enne parandust teisele projektile (`404 Bucket not found`, kuigi bucket tootmises oli). Saladuse väärtust ei saa lugeda. Ka `docs/backups.md` näitas näiteks testprojekti aadressi.

Kinnitamata: kas `544 DatabaseTimeout` oli ajutine häire või seotud vale URL-iga. Seda viga ei korratud. Varasemate (24. sept – 16. nov) jooksude täpsed põhjused on teadmata.

### 5 Miks

1. Miks varukoopiat pole? → Töö ebaõnnestub igal korral.
2. Miks ebaõnnestub? → Vana andmebaasi parool, puuduv bucket ning vale URL ja võti saladustes.
3. Miks bucket puudub? → Migratsioon registreeriti tühjana, seega ei loonud midagi, ja keegi ei kontrollinud tulemust.
4. Miks ei tuvastatud seda 54 päeva? → Töö ebaõnnestumine ei saada teadet ja punast tööd pole keegi regulaarselt vaadanud. Töö õnnestumist ei kontrollitud kunagi tulemuse (fail olemas) järgi.
5. Miks pole tulemuse kontrolli? → Varukoopia loeti valmis, kui töö oli kirjutatud ja ajastatud, ega proovitud kordagi taastada.

## Mis läks hästi

- Töö ise on tehtud nii, et tühja või liiga väikest faili ei lae üles (sisukontroll lisati 2026-11-17).
- Võtme tüübi diagnostika (PR #115, ei avalda võtit) tegi vale saladuse ühe jooksuga nähtavaks.
- `pg_dump`, skeemi ja GeoJSON osa töötab (kinnitatud 2026-11-17).
- Probleem avastati ja põhjused eristati logist, mitte oletuste põhjal.

## Mis läks halvasti

- Kaheksa nädalat punaseid jookse ilma teateta.
- Tühi migratsioon läbis ülevaatuse ja testid, sest testid ei kontrolli, et migratsioon midagi teeb.
- Varukoopiat pole kunagi proovitud taastada.
- Dokumentatsioon näitas näites testprojekti URL-i ja saladuste õigeid väärtusi polnud kuskil kirjas.

## Tegevused

| Tegevus | Omanik | Prioriteet | Tähtaeg |
|---|---|---|---|
| Loo privaatne bucket `backups` ja lisa selle tegelik migratsioon repo | Claude | P0 | tehtud 2026-11-17 (PR #114) |
| Paranda saladused `SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY`, käivita töö ja kontrolli, et objekt ilmub `storage.objects` tabelisse | Martti | P0 | tehtud 2026-11-18 |
| Parandada `docs/backups.md` (tootmise URL, õige võtme tüüp) ja töö (`sb_` võtmed ainult `apikey` päisega, tüübi diagnostika) | Claude | P0 | tehtud (PR #114, #115) |
| Proovi taastada viimane dump ajutisse andmebaasi (`pg_restore`) ja dokumenteeri tulemus | Claude | P1 | 2026-11-24 |
| Ebaõnnestunud töö loob GitHubi issue (või saadab e-kirja), et teade jõuaks kohale | Claude | P1 | 2026-11-24 |
| Nädalane kontroll: viimane objekt `backups` bucketis on vähem kui 8 päeva vana | Claude | P2 | 2026-12-01 |
| Test, mis ebaõnnestub tühja migratsioonifaili korral | Claude | P2 | 2026-12-01 |
| Kontrolli, kas Supabase'i plaan sisaldab platvormipõhist varukoopiat ja dokumenteeri see | Martti | P1 | 2026-11-24 |

## Õppetunnid

Varukoopia on olemas alles siis, kui selle taastamine on proovitud. „Töö on ajastatud" ja „töö on roheline" ei ole sama mis „fail on olemas ja avaneb". Ebaõnnestumisest peab teatama kanalisse, mida inimene niikuinii vaatab.
