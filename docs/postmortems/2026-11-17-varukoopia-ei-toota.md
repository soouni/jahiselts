# Järelanalüüs: nädalane varukoopia pole kunagi õnnestunud

**Kuupäev:** 2026-11-17 | **Kestus:** vähemalt 54 päeva (2026-09-24 kuni 2026-11-17, jätkub) | **Tõsidus:** SEV3 (andmekadu ei ole juhtunud, kuid väline varukoopia puudub)
**Autor:** Claude koos Martti Ojamaaga | **Staatus:** Mustand (varukoopia on endiselt katki)

Süüd ei otsita: järelanalüüs vaatab süsteemi ja protsessi.

## Kokkuvõte

GitHub Actions töö „Weekly Supabase backup" on ebaõnnestunud **kõigil 13 korral** alates 24. septembrist, ühtegi õnnestunud jooksu pole. Salvestuskoht `backups` puudub Supabase'is üldse ja selle loomise migratsioonifail repos on tühi. Keegi ei märganud seda enne 17. novembrit, sest ebaõnnestumisest ei teatatud kuhugi, kus seda näeks.

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

## Põhjused

Kinnitatud: (1) andmebaasi parool saladuses oli vananenud; (2) `backups` bucket puudub; (3) migratsioonifail on tühi; (4) ebaõnnestumisest ei antud teada.

Kinnitamata: kas puuduv bucket põhjustas just `544` vea (tavaliselt annaks puuduv bucket 404). Selgub, kui bucket on loodud ja töö uuesti käivitatud. Varasemate jooksude täpsed põhjused teadmata.

### 5 Miks

1. Miks varukoopiat pole? → Töö ebaõnnestub igal korral.
2. Miks ebaõnnestub? → Vana parool ja puuduv üleslaadimiskoht (bucket).
3. Miks bucket puudub? → Migratsioon registreeriti tühjana, seega ei loonud midagi, ja keegi ei kontrollinud tulemust.
4. Miks ei tuvastatud seda 54 päeva? → Töö ebaõnnestumine ei saada teadet ja punast tööd pole keegi regulaarselt vaadanud. Töö õnnestumist ei kontrollitud kunagi tulemuse (fail olemas) järgi.
5. Miks pole tulemuse kontrolli? → Varukoopia loeti valmis, kui töö oli kirjutatud ja ajastatud, ega proovitud kordagi taastada.

## Mis läks hästi

- Töö ise on tehtud nii, et tühja või liiga väikest faili ei lae üles (sisukontroll lisati 2026-11-17).
- `pg_dump`, skeemi ja GeoJSON osa töötab (kinnitatud 2026-11-17).
- Probleem avastati ja põhjused eristati logist, mitte oletuste põhjal.

## Mis läks halvasti

- Kaheksa nädalat punaseid jookse ilma teateta.
- Tühi migratsioon läbis ülevaatuse ja testid, sest testid ei kontrolli, et migratsioon midagi teeb.
- Varukoopiat pole kunagi proovitud taastada.

## Tegevused

| Tegevus | Omanik | Prioriteet | Tähtaeg |
|---|---|---|---|
| Loo privaatne bucket `backups` ja lisa selle tegelik migratsioon repo tühja faili asemele | Claude (kinnitusega) | P0 | 2026-11-17 |
| Käivita töö uuesti ja kontrolli, et objekt ilmub `storage.objects` tabelisse | Martti | P0 | 2026-11-17 |
| Proovi taastada viimane dump ajutisse andmebaasi (`pg_restore`) ja dokumenteeri tulemus | Claude | P1 | 2026-11-24 |
| Ebaõnnestunud töö loob GitHubi issue (või saadab e-kirja), et teade jõuaks kohale | Claude | P1 | 2026-11-24 |
| Nädalane kontroll: viimane objekt `backups` bucketis on vähem kui 8 päeva vana | Claude | P2 | 2026-12-01 |
| Test, mis ebaõnnestub tühja migratsioonifaili korral | Claude | P2 | 2026-12-01 |
| Kontrolli, kas Supabase'i plaan sisaldab platvormipõhist varukoopiat ja dokumenteeri see | Martti | P1 | 2026-11-24 |

## Õppetunnid

Varukoopia on olemas alles siis, kui selle taastamine on proovitud. „Töö on ajastatud" ja „töö on roheline" ei ole sama mis „fail on olemas ja avaneb". Ebaõnnestumisest peab teatama kanalisse, mida inimene niikuinii vaatab.
