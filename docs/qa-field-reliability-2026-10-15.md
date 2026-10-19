# Välirežiimi QA parandused — 15.10.2026

## Teostatud

- Sünkroonimise aeg muutub alles eduka andmelaadimise järel. Laadimised on järjestatud, vead ei anna rohelist olekut ning võrgu taastumine ja nähtavale naasmine algatavad värskenduse.
- GPS-i peatamine kustutab senise mõõtmise ja kaardimarkeri. Üle 30 sekundi vana või üle ±50 m ebatäpne mõõtmine ei kinnita saabumist. Värskuse kontroll töötab ka serveris; kliendi saadetud mõõtmisaeg ei ole võltsimiskindel GPS-tõend.
- Tavaline aktiivne osaleja saab võtta vaba koha ja kinnitada enda koha. Üldised UPDATE-õigused jäävad juhile. Kitsad õigustega funktsioonid asuvad API-st eraldatud `hunt_private` skeemis; avalikud ümbrised on SECURITY INVOKER.
- Jahijuhi osaleja paigutamine toimub ühe RPC tehinguga: koht, inimene ja koordinaadid salvestuvad koos.
- Võrguvaba põhivaate valmisolek kontrollib tegelikult failide olemasolu. Ka WMTS XML ja ametlik piir taastuvad vahemälust. Allalaadimise ja salvestusruumi vead on nähtavad; osaline kaart on märgistatud. Hilisem sirvimine ei tõrju valitud paketti vahemälust välja.
- Kasutaja saab selge nupuvajutusega salvestada ainult enda määratud jahikoha 12 tunniks. Koopia on kontopõhine, seda saab kustutada ja väljalogimine eemaldab selle. Teiste osalejate nimed/asukohad ja elus GPS ei lähe koopiasse. Taastatud vaade on eraldi märgistatud ja ei luba serveritoiminguid. Võrguta saab viimase selgelt salvestatud oma koha avada ka siis, kui Auth-seanssi ei saa uuendada; see ei taasta serveriõigusi. Võrguvabalt ei saa kinnitada, et juhataja pole kohta vahepeal muutnud.
- Väikese ekraani ja madala rõhtvaate CSS: keritavad paneelid, murduvad tekstid, nuppude mahtumine. Dialoogidel on pealkirjaga seotud ligipääsetav nimi.
- `qa/layout.html` võimaldab päris rakendust vaadata 320×568, 390×844, 740×360, 768×1024, 1024×768 ja 1366×768 raamides. See ei emuleeri Safari mootorit, mobiiliklaviatuuri ega seadme andureid.

Avalehe võrguühendusega laadimine valideerib HTML-i uuesti, et eelmine brauseri HTTP-vahemälu ei peidaks avaldatud uuendust.

## Kontrollitud

- `LIVE_MAP_TESTS=1 npm test`: 49/49 läbis, 0 vahele jäetud. Sisaldab kolme päris aluskaardipäringut, PostgreSQL-i õiguste käitumist ning teenusetöötaja veastsenaariume.
- `npm run build`: korras.
- `npm audit --omit=dev`: 0 teadaolevat haavatavust.
- Migratsioon `20261015133355_qa_participant_operations.sql` rakendatud tootmises.
- Tootmisandmebaasis tehti tegelike `authenticated` õigustega kontrolltehing: tavaliikme koha võtmine ja kinnitamine õnnestusid, otsene UPDATE oli keelatud, vana GPS lükati tagasi, juhi atomaarne paigutamine õnnestus. Tehing pöörati tervikuna tagasi; testkirjeid ei säilitatud.
- Supabase turvanõustaja: varasemate hoiatuste arv ei suurenenud. Varasemad tahtlike RPC-de SECURITY DEFINER hoiatused ning paroolilekke kaitse hoiatus on eraldi turvaauditis kirjeldatud.

## Piirangud ja füüsiline vastuvõtutest

15.10.2026 käivitas Martti eraldi testprojektis `pipwbfmgmuiisrvnnnmw` mõlemad päris Auth/PostgREST/Storage läbivtestide komplektid (`test:rls`, `test:hunt-operations`). Jagatud terminali kuvatõmmisel (19:34:49) on mõlema komplekti PASS-tulemused ja lõppkinnitus „VALMIS: mõlemad läbivtestide komplektid läbisid.” See katab ka tavaliikme positsiooni võtmise/kinnitamise ja reaalajas asukoha õigused. See tõend ei asenda päris telefoni andurikatseid. PGlite katsed ei ole mitme PostgreSQL-ühenduse koormustest.

Füüsilise vastuvõtu sammud ja tulemuste vorm asuvad eraldi juhendis: [iPhone Safari ja Android Chrome'i asukohaprivaatsuse vastuvõtutest](mobile-location-privacy-acceptance-2026-10-19.md). Test on tegemata, kuni mõlema platvormi tulemused on seal kirja pandud. Juhend täiendab seda QA ülevaadet ainult telefoni, GPS-i, asukohajagamise, võrguühenduse ja konto vahetamise kontrollidega; siinsetes automaattestides neid seadmeanduri omadusi ei simuleerita.
