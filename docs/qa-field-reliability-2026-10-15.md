# Välirežiimi QA parandused — 15.10.2026

## Teostatud

- Sünkroonimise aeg muutub alles eduka andmelaadimise järel. Laadimised on järjestatud, vead ei anna rohelist olekut ning võrgu taastumine ja nähtavale naasmine algatavad värskenduse.
- GPS-i peatamine kustutab senise mõõtmise ja kaardimarkeri. Üle 30 sekundi vana või üle ±50 m ebatäpne mõõtmine ei kinnita saabumist. Värskuse kontroll töötab ka serveris; kliendi saadetud mõõtmisaeg ei ole võltsimiskindel GPS-tõend.
- Tavaline aktiivne osaleja saab võtta vaba koha ja kinnitada enda koha. Üldised UPDATE-õigused jäävad juhile. Kitsad õigustega funktsioonid asuvad API-st eraldatud `hunt_private` skeemis; avalikud ümbrised on SECURITY INVOKER.
- Jahijuhi osaleja paigutamine toimub ühe RPC tehinguga: koht, inimene ja koordinaadid salvestuvad koos.
- Võrguvaba põhivaate valmisolek kontrollib tegelikult failide olemasolu. Ka WMTS XML ja ametlik piir taastuvad vahemälust. Allalaadimise ja salvestusruumi vead on nähtavad; osaline kaart on märgistatud. Hilisem sirvimine ei tõrju valitud paketti vahemälust välja.
- Kasutaja saab selge nupuvajutusega salvestada ainult enda määratud jahikoha 12 tunniks. Koopia on kontopõhine, seda saab kustutada ja väljalogimine eemaldab selle. Teiste osalejate nimed/asukohad ja elus GPS ei lähe koopiasse. Taastatud vaade on eraldi märgistatud ja ei luba serveritoiminguid. Võrguvabalt ei saa kinnitada, et juhataja pole kohta vahepeal muutnud.
- Väikese ekraani ja madala rõhtvaate CSS: keritavad paneelid, murduvad tekstid, nuppude mahtumine. Dialoogidel on pealkirjaga seotud ligipääsetav nimi.
- `qa/layout.html` võimaldab päris rakendust vaadata 320×568, 390×844, 740×360, 768×1024, 1024×768 ja 1366×768 raamides. See ei emuleeri Safari mootorit, mobiiliklaviatuuri ega seadme andureid.

## Kontrollitud

- `LIVE_MAP_TESTS=1 npm test`: 48/48 läbis, 0 vahele jäetud. Sisaldab kolme päris aluskaardipäringut, PostgreSQL-i õiguste käitumist ning teenusetöötaja veastsenaariume.
- `npm run build`: korras.
- `npm audit --omit=dev`: 0 teadaolevat haavatavust.
- Migratsioon `20261015133355_qa_participant_operations.sql` rakendatud tootmises.
- Tootmisandmebaasis tehti tegelike `authenticated` õigustega kontrolltehing: tavaliikme koha võtmine ja kinnitamine õnnestusid, otsene UPDATE oli keelatud, vana GPS lükati tagasi, juhi atomaarne paigutamine õnnestus. Tehing pöörati tervikuna tagasi; testkirjeid ei säilitatud.
- Supabase turvanõustaja: varasemate hoiatuste arv ei suurenenud. Varasemad tahtlike RPC-de SECURITY DEFINER hoiatused ning paroolilekke kaitse hoiatus on eraldi turvaauditis kirjeldatud.

## Piirangud ja füüsiline vastuvõtutest

Täielik eraldi Supabase Auth/PostgREST/Storage API testikomplekt vajab endiselt eraldi aktiivset testprojekti ja testkontosid. SQL õiguste test ei ole sama mis kogu API test. PGlite katsed ei ole mitme PostgreSQL-ühenduse koormustest.

Enne välirežiimi täielikku vastuvõttu tee vähemalt iPhone Safari ja Android Chrome seadmega:

1. Juhataja määrab koha; tavaliige avab selle, käivitab GPS-i ja kompassi ning kinnitab saabumise. Võõrast kohta ei saa muuta. Kaks osalejat proovivad sama vaba kohta: ainult üks peab saama selle.
2. Keela GPS-luba, luba uuesti; kontrolli aegunud ja ebatäpset mõõtmist. Lukusta ekraan 2 minutiks ja naase. Vana asukohta ei tohi esitada värskena.
3. Salvesta oma koht ning laadi aluskaart alla. Lülita lennurežiim sisse, laadi leht uuesti ja ava salvestatud koht. GPS võib töötada, kuid jagamine ja kinnitamine ei tohi teeselda serveriedu.
4. Taasta ühendus ja ava elus jaht uuesti. Muuda juhataja seadmes kohta; teine telefon peab nägema uut kohta ja eduka sünkroonimise aega.
5. Kontrolli püsti/külili vaadet, otsingu klaviatuuri, suurendatud teksti ja paneelide kerimist. Ükski oluline nupp ei tohi jääda kättesaamatuks.
6. Lõpeta asukoha jagamine ja logi välja. Salvestatud oma koha avamise võimalus peab kaduma. Kontrolli ka teise kontoga sisselogimist.
