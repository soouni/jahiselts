# Pärnjõe jahiseltsi kaart

Mobiilis kasutatav jahikaart: ametlik Pärnjõe jahipiirkond JAH1000125, aluskaardid, kohanimed, vaatlused, ulukimärgid, otsing ja mõõtmine.

## Veebis avaldamine

Eeldatav veebiaadress pärast GitHub Pagesi aktiveerimist: https://soouni.github.io/jahiselts/

1. Ava hoidlas Settings → Pages → Build and deployment → Source ja vali **GitHub Actions**.
2. Ava Actions → Publish hunting map → Run workflow (main), kui esimene käivitus ei õnnestunud enne Pagesi aktiveerimist.
3. Eduka avaldamise järel ava ülaltoodud veebiaadress. ChatGPT ega GitHubi kontot kaardi kasutamiseks vaja ei ole.

## Sisselogimise aadress

Supabase'i olemasolevas projektis ava Authentication → URL Configuration.
- Site URL: `https://soouni.github.io/jahiselts/`
- Lisa Redirect URLs loendisse täpselt `https://soouni.github.io/jahiselts/`.
- Olemasoleva kaardi tagasisuunamise aadress võib ülemineku ajal alles jääda.

Parooliga sisselogimine kasutab samu olemasolevaid kasutajakontosid. Uues veebiaadressis tuleb esimesel korral uuesti sisse logida. E-kirja kinnituslingid vajavad ülaltoodud aadressiseadistust.

Uue liikme jaoks lisa esmalt kaardi adminivaates tema e-post ja õigused. Konto esimene kinnitamine võib vajada e-kirja. Supabase'i vaikimisi saatja on piiratud projekti meeskonna aadressidega: kogu seltsi esmaste kinnituskirjade jaoks tuleb seadistada sobiv SMTP-saatja. Liikmetele ei tohi selleks anda Supabase'i projekti administraatoriõigusi. Olemasoleva kinnitatud konto ja parooliga saab siseneda ilma iga kord kirja saatmata.

## Andmed ja ligipääs

Hoidla sisaldab rakenduse lähtekoodi ning ametlikku avalikku geomeetriat. Seltsi objektid, vaatlused, jäljed, kasutajad ja fotod jäävad olemasolevasse Supabase'i projekti. Neid ei ekspordita GitHubi. Avalik aluskaart on nähtav kõigile; seltsi andmeid kaitsevad liikmelisuse kontroll ja andmebaasi õigused.

`src/backend-config.json` sisaldab brauserile mõeldud avalikku Supabase'i võtit, mitte administraatori võtit. Salajasi võtmeid ega kasutajate paroole ei tohi siia lisada. Olemasolevat andmebaasi ei tule uuesti luua ega migratsioone uuesti käivitada.

## Arendus

Node.js 22. `npm ci`, `npm run dev`, `npm run build`.
Vite baasrada on `/jahiselts/`. Kui hoidla nimi või domeen muutub, tuleb muuta baasrada ja Supabase'i tagasisuunamise aadresse. Iga main-haru muudatus avaldatakse GitHub Actionsi kaudu.

## Allikad

Ametlik piir: EELIS, Keskkonnaagentuur, JAH1000125, CC BY 4.0; ametlikust WFS-ist saadud väljavõte 13.09.2026. Aluskaardid: Maa- ja Ruumiamet. Kaardil on allikaviited. Jahiseltsi objektid on eraldi andmekihis.

## Kasutajanimi või e-post

Parooliga sisenemisel võib kasutada e-posti või enda valitud kasutajanime. Kasutajanime määrab kinnitatud aktiivne liige konto vaates. Vorm lubab 3–30 märki (a–z, numbrid, punkt, alakriips, sidekriips), eristamata suur- ja väiketähti. Nimi peab olema unikaalne. Enne nime määramist saab kasutada e-posti. Sama Supabase Auth konto ja parool jäävad alles; e-kirjade SMTP seadistamine on endiselt vajalik esmaseks kinnitamiseks ja parooli taastamiseks.

Backend rollout: `supabase/username-login.sql` on lisav SQL, mis on olemasolevas projektis rakendatud. Seda ei tule seal uuesti käivitada. `supabase/functions/username-login/index.ts` on avaldatud Edge Function `username-login` all, verify_jwt=false, sest see autentib kasutajanime ja parooli Supabase Authi kaudu. Funktsioon ei väljasta kasutajanime ja e-posti vastavust; väljastab sessioonitokenid alles eduka autentimise järel. Salajased võtmed loetakse ainult serveri keskkonnast. Sisselogimiskatsete loendur kasutab HMAC-räsisid, 15 minuti piiranguid ning ainult service_role ligipääsu. RLS keelab kõigi teiste ligipääsu loenduritabelile; poliitika puudumine seal on tahtlik. Uusi SECURITY DEFINER funktsioone ei lisatud.

Kontrollid: frontend koostamine; Edge Functioni testid tuntud/tundmatu kasutaja, vale parooli, konto mittevastavuse, võõra päritolu ja katsete piirangu kohta; live anonüümsed veavastused; andmebaasi tehingus oma kasutajanime muutmine, teise kasutaja muutmise ning rolli tõstmise keeld ja katsete piirang. Tehingu testandmed tühistati. Olemasoleva liikme päris parooliga edukas sisenemine vajab kasutaja proovimist. Turvanõustaja olemasolevad 10 SECURITY DEFINER hoiatust ja väljalülitatud lekkinud paroolide kontroll ei ole selle muudatusega parandatud.
