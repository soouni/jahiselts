# Töökorra juhend

Kellele: projekti omajale ja igaühele, kes kaarti hooldab. Tootmise Supabase'i projekt: `asvbfhbmegmeuvvtgvor` (`https://asvbfhbmegmeuvvtgvor.supabase.co`). Veebileht: https://soouni.github.io/jahiselts/.

## 1. Muudatuse avaldamine

1. Tee muudatus harus ja ava PR `main`ile. CI (`TypeScript, Vite ja testid`) peab olema roheline.
2. Ühenda PR. Töö `Publish hunting map` jooksutab testid, ehitab ja avaldab lehe (umbes 1–2 min).
3. Kui töö on `failure`, lehte ei avaldata ja eelmine versioon jääb. Vaata Actions-lehelt ebaõnnestunud sammu.
4. Brauser võib vana versiooni hoida teenusetöötaja tõttu: värskenda lehte kõvasti.

Sama ajal käivituvad tööd jagavad järjekorda (`pages`): uus käivitus tühistab pooleli oleva. Kui `main`i töö on `cancelled`, käivita see uuesti (Actions → Publish hunting map → Run workflow).

## 2. Andmebaasi migratsioon ja Edge Function

Migratsioonid on ainult edasisuunas. Fail `supabase/migrations/<versioon>_<nimi>.sql` peab tootmises olema sama versiooni ja nimega (`supabase_migrations.schema_migrations`); kui rakendad Supabase'i tööriistaga, mis paneb oma ajatempli, vii versioon pärast repoga kokku, muidu üritab `supabase db push` seda uuesti rakendada.

Edge Function'i (`hunt-code`, `username-login`) uus versioon: juuruta sama sisuga, mis `main`is. `hunt-code` ja `username-login` töötavad ilma JWT-ta (`verify_jwt=false`), sest kasutaja pole veel sisse logitud; nad kontrollivad ise päritolu ja piiravad katseid.

Pärast muudatust kontrolli: Supabase Advisors (security) ei näita uusi hoiatusi peale teadaolevate ja `npm test` on roheline.

**Tagasivõtt.** Migratsiooni ei kustutata: kirjuta uus migratsioon, mis taastab vana funktsiooni sisu. Edge Function'i taasta eelmine versioon, juurutades eelmise kommiti faili. Lehe tagasivõtt: `git revert` PR-i ühendamiskommitil ja ühenda.

## 3. Jahikood

**Jahijuht loob koodi** jahi planeerimisvaates, paneelis „Jahikood osalejatele”: üks kehtiv kood jahi kohta. Uue koodi loomine tühistab eelmise kohe ja avatud vaated sulguvad; „Tühista kood” sulgeb vaated ilma uue koodita. Kehtiv kood on samas paneelis alati nähtav.

**Kood ei sobi.** Põhjused: kood on tühistatud või aegunud (48 h), jaht on lõpetatud (aktiivne või peatatud jaht, mille algus on määratud, lõpeb automaatselt Eesti päeva lõpus; algamata või alguseta jaht ei lõpe ja selle kood kehtib kuni 48 h), või kood trükiti valesti. Lahendus: jahijuht vaatab koodi paneelist või loob uue.

**„Sisenemine on hetkeks suletud”** (`temporarily_locked`). Üle 60 vale koodikatse tunnis kokku sulgeb sisenemise tunniks; ühelt seadmelt 5 valet katset 15 minutis annab teate „sellest seadmest liiga palju katseid”. Mõlemad lõppevad ise. Kui jahipäeval ei saa oodata, kustuta piirangud (Supabase SQL Editor):

```sql
delete from public.hunt_code_limits;
```

Kustutamine avab sisenemise ka ründajale. Kui kahtlustad rünnakut (kümneid valesid katseid kiiresti), oota lukk ära; juba sisse saanud külalised jäävad sisse ja jahijuht saab uue koodi luua.

**Juba sees olevad külalised** ei sõltu piirangutest: nende vaade uueneb 20 s tagant ja sulgub, kui kood tühistatakse või jaht lõpetatakse.

## 4. Varukoopia

Töö `Weekly Supabase backup` jookseb esmaspäeviti ja käsitsi. Kui see ebaõnnestub, vaata Actions-logi.

| Viga | Põhjus | Parandus |
|---|---|---|
| `password authentication failed for user "postgres"` | GitHubi saladus `SUPABASE_DB_URL` sisaldab vana või vale parooli | Supabase → Project Settings → Database → lähtesta või kopeeri parool, uuenda saladus (Settings → Secrets → Actions), käivita töö käsitsi |
| `Varukoopia fail puudub või on tühi` | Päring tagastas tühja väljundi | Kontrolli ühendust ja tabelite olemasolu, käivita uuesti |
| `curl` viga üleslaadimisel | `SUPABASE_SERVICE_ROLE_KEY` või bucket `backups` | Kontrolli võtit ja bucketit |

Taastamine: [varukoopiate juhend](backups.md).

## 5. Kui midagi läheb valesti jahipäeval

1. Jahijuhi kaart töötab ka võrguta salvestatud jahikohaga (konto vaade) ja külalise „Salvesta kaart” nupuga salvestatud kaardiga.
2. Külalise vaade ei lähe katki, kui võrk kaob: ta näitab viimast salvestatud vaadet koos kellaajaga.
3. Muu: Supabase'i olek (https://status.supabase.com) ja Actions-logi; tõrke korral kirjuta projekti omajale.
