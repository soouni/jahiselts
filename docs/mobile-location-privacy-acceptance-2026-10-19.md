# iPhone Safari ja Android Chrome'i asukohaprivaatsuse vastuvõtutest

**Staatus: tegemata.** See on füüsiliste seadmete kontrollnimekiri, mitte testitulemus. Täida iga rida eraldi iPhone Safari ja Android Chrome'iga ning salvesta kuupäev, OS-i versioon, brauseri versioon ja tulemus. Testi ainult seltsi eraldi testkeskkonnas testkontodega; ära kasuta päris liikmete kontosid ega päris jahil osalejate asukohti.

## Eesmärk ja ulatus

Kontrollida, mida kasutaja ja teine aktiivse jahi osaleja näevad, kui kasutaja lubab või peatab GPS-i/asukoha jagamise, kaotab võrgu, naaseb võrku või logib välja. See juhend täiendab [välirežiimi QA raportit](qa-field-reliability-2026-10-15.md): automaattestid ja 15.10.2026 testprojekti Auth/PostgREST/RLS läbivtestid ei simuleeri iOS-i ega Androidi asukohaõigusi, brauseri taustale jäämist ega telefoni väljalogimise kasutusvoogu.

Asukoht on tundlik isikuandmestik. Katse tehakse kokkulepitud testpunktidega ning testi vaatleja on teine testkonto samas aktiivses testjahis. Märgi üles ainult tulemus ja veakood/sõnum; ära lisa raportisse täpseid koordinaate, ekraanipilte inimeste asukohtadest ega paroole.

## Ettevalmistus

Enne kumbagi platvormi:

- [ ] Kasuta eraldi Supabase'i testprojekti ja kahte testkontot: **A** asukohta jagav osaleja ning **B** teine sama aktiivse jahi osaleja/vaatleja.
- [ ] Loo testjaht, kus A ja B on osalejad ning A-le on määratud koht. Veendu, et mõlemad kontod pääsevad testjahile ligi.
- [ ] Vali kokkulepitud ohutu testpunkt. Ära testi päris jahi ajal ega võõra inimese liikumist jälgides.
- [ ] Hoia B vaade eraldi telefonis või brauseris nähtaval, et kontrollida teisele osalejale nähtavat serveriandmestikku rakenduse tavavaate kaudu.
- [ ] Pane kirja seadme mudel, iOS-i/Androidi versioon, brauseri versioon, testija ja kuupäev.
- [ ] Anna mõlemale telefonile töö alguses võrguühendus. Testi võrgu katkestust ainult selle kontrollnimekirja võrgujuhtumis.

## Testjuhtumid

### 1. Asukohaloa keeldumine ja lubamine

- [ ] Ava jahikoht kontoga A ja käivita GPS. Kui brauser küsib asukoha luba, vali **Keela**.
- [ ] Oodatav: rakendus ütleb selgelt, et GPS puudub või luba pole antud; uut asukohta ei kuvata värskena ega saadeta teistele osalejatele. Asukoha jagamist ei saa ekslikult edukaks lugeda.
- [ ] Ava telefoni/brauseri saidiõigused, luba asukoht ja proovi GPS uuesti käivitada.
- [ ] Oodatav: rakendus saab uue mõõtmise pärast loa andmist. Varasem keeldumine ei tohiks kuvada vananenud mõõtmist värskena.
- Tulemus / märkused: ______________________________

### 2. Jagamise alustamine ja lõpetamine võrgus

- [ ] Kontoga A käivita GPS, oota värsket ja piisava täpsusega mõõtmist ning vali **Jaga asukohta jahiseltsiga**.
- [ ] Kontoga B kontrolli, et näha on ainult kasutaja A jagatud asukoht ning rakendus näitab sünkroonimise õnnestumist.
- [ ] Kontoga A vali **Lõpeta asukoha jagamine**.
- [ ] Kontoga B värskenda jahi vaadet. Oodatav: A aktiivne jagatud asukoht eemaldub; B ei näe enam A asukoha jagamise markerit. Kontoga A peab jagamise olek olema väljas.
- [ ] Lülita A GPS uuesti sisse, kuid ära luba jagamist. Oodatav: B ei näe uut A asukohta.
- Tulemus / märkused: ______________________________

### 3. GPS-i loa tühistamine või GPS-i peatamine jagamise ajal

- [ ] Alusta kontoga A asukoha jagamist ja veendu, et B näeb seda.
- [ ] Tühista telefoni/brauseri seadetes saidi asukohaluba või peata A rakenduses GPS.
- [ ] Oodatav: A ei esita enam uut mõõtmist värskena. Rakenduses kuvatakse GPS-i/jagamise tõrge arusaadavalt.
- [ ] Kontrolli B vaates, kas viimane serverisse jõudnud asukoht jääb nähtavaks või eemaldatakse. Märgi tegelik käitumine; ära eelda, et GPS-loa tühistamine kustutab juba serverisse salvestatud punkti.
- [ ] Taasta luba ja kontrolli, et jagamine taastub ainult kasutaja selge tegevuse või rakenduse kirjeldatud käitumise järel, mitte eksitava rohelise oleku põhjal.
- Tulemus / märkused: ______________________________

### 4. Ekraani lukustamine ja taustale viimine

- [ ] Alusta A asukoha jagamist, lukusta ekraan või vii Safari/Chrome taustale kaheks minutiks.
- [ ] Ava rakendus uuesti. Oodatav: vana GPS-mõõtmist ei esitata uue ega värskena; rakendus ootab uut mõõtmist ja sünkroonib ainult selle olemasolul.
- [ ] Kontrolli B vaates, kas viimane serverisse salvestatud asukoht jäi alles. Pane kirja ajatempel ja kas A kasutajaliides eristab vana punkti värskest mõõtmisest.
- [ ] Kui uus GPS-mõõtmine ei saabu, kontrolli, et kasutajale näidatakse oote-/veaolekut ning saabumise kinnitamist ei saa teha aegunud mõõtmisega.
- Tulemus / märkused: ______________________________

### 5. Võrgu kadumine jagamise lõpetamisel

- [ ] Alusta A-ga jagamist ja veendu B kaudu, et serveris on A asukoht nähtav.
- [ ] Pane telefon lennurežiimi või katkesta võrk ning vali A-s **Lõpeta asukoha jagamine**.
- [ ] Oodatav: rakendus ei väida, et serveris olev asukoht on kustutatud, kui serverikustutuse päring ebaõnnestus. Kasutajale peab jääma arusaadav teade, et kustutamine vajab ühendust või kordamist.
- [ ] Taasta ühendus. Kasutaja kordab lõpetamist, kui seda nõutakse. Kontrolli B-ga pärast edukat sünkroonimist, et A serveris olev asukoht on eemaldatud.
- [ ] Märgi eraldi, kas rakendus pakub võrgu taastumisel piisavat võimalust kustutamine lõpuni viia. Ära märgi testi edukaks ainult selle põhjal, et A nupu olek muutus.
- Tulemus / märkused: ______________________________

### 6. Väljalogimine ja teise konto kasutamine

- [ ] Alusta A-ga asukoha jagamist ja kontrolli B vaates, et A asukoht on nähtav.
- [ ] Logi A-st välja ilma eelnevalt jagamist käsitsi lõpetamata.
- [ ] Oodatav: väljalogimine lõpetab A asukoha jagamise ja eemaldab tema aktiivse serveriasukoha. Kontrolli B vaates; kui punkt jääb alles, testi tulemus on ebaõnnestunud ning see tuleb registreerida parandamist vajava leiuna.
- [ ] Logi samas seadmes sisse kontoga B. Oodatav: B-le ei kuvata A kohalikke salvestatud jahikoha ega auto asukoha andmeid.
- [ ] Logi B-st välja ja kontrolli, et väljalogimise järel ei saa A kohalikke salvestatud koordinaate anonüümselt avada.
- Tulemus / märkused: ______________________________

### 7. Võrguvaba oma koha koopia

- [ ] Kontoga A salvesta selgesõnaliselt oma määratud jahikoht rakenduse võrguvaba kasutuse jaoks.
- [ ] Lülita võrk välja, laadi leht uuesti ja ava salvestatud koht. Oodatav: vaade on märgitud salvestatud koopiaks, teiste osalejate asukohti ei näidata ning serveritoiminguid ei saa teeselda õnnestunuks.
- [ ] Logi võrguta välja või taasta ühendus ja vaheta kontole B. Kontrolli, et A koopia pole B kontole nähtav.
- [ ] Taasta võrk ning logi A-ga sisse. Kontrolli, et serveri hetkeseis laaditakse uuesti enne elusa jahi töö jätkamist.
- Tulemus / märkused: ______________________________

## Tulemuste kokkuvõte

| Platvorm | Seade ja OS | Brauseri versioon | Läbitud juhtumid | Ebaõnnestunud / blokeeritud | Testija ja kuupäev |
|---|---|---|---|---|---|
| iPhone Safari |  |  |  |  |  |
| Android Chrome |  |  |  |  |  |

**Vastuvõtuotsus:** ☐ vastu võetud mõlemal platvormil ☐ vastu võetud märkustega ☐ ei ole vastu võetud

**Leitud probleemid ja järeltegevused:**

- 

## Testi piirangud

- See dokument ei kinnita, et testid on juba läbitud; tulemustabel täidetakse päris seadmetel.
- Brauseri GPS täpsus sõltub asukohaloast, seadme anduritest, võrgust ja keskkonnast. Testpunkti koordinaat pole GPS-i turvalisuse tõend.
- Jagamise peatamine, loa tühistamine ja väljalogimine on eraldi sündmused. Ühe toimingu tulemust ei tohi järeldada teisest.
- QA raporti järgi on võrguvaba oma jahikoha koopia kohalik, konto järgi eraldatud ja väljalogimisel eemaldatav; see ei taasta serveriõigusi. Kontrolli seda siin uuesti telefonis, kuid ära kuva salvestatud testkoordinaate raportis.
- Kui serverisse jäänud asukoht või kasutajaliidese olek on ebaselge, testi tulemus on **ebaõnnestunud või blokeeritud**, kuni käitumine on selgitatud ja uuesti kontrollitud.
