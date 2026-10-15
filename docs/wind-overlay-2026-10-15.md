# Tuulekiht kaardil

„Tuul” nupp lülitab üle kaardi hõreda noolekihi ja nupu kõrval oleva kiirusnäidu. Suur tuulepaneel on eemaldatud. Kiht jääb sisse ka positsiooni või osalejate paneeli avamisel ning seda saab sulgeda sama nupu . Jahirežiimist väljumine lülitab tuulekihi välja.

Nooled näitavad tuule liikumissuunda: ilmaandmete lähtesuunale lisatakse 180°. Näiteks põhjast puhuva tuule nool osutab lõunasse. Kaardi pööramine pöörab ka nooli, telefoni kompass nende suunda ei muuda. Sama piirkondlik mudelnäit kordub üle kogu vaate; see ei ole iga metsapunkti eraldi mõõtmine.

Säilib Open-Meteo päring ümardatud koordinaatidega ja m/s ühikuga. Andmeid uuendatakse 15 minuti järel ning ühenduse taastumisel. Päringu asukoha muutudes puhastatakse vana näit. Puuduvate, vigaste, üle 30 minuti tagasi laaditud või vea saanud andmete korral nooli ei näidata. Alla 0,3 m/s puhul kuvatakse ainult kiirus ilma suunanoolteta. Nupu kõrval on ainult kiirus m/s; Open-Meteo allikas, 10 m tuule tähis, andmete aeg ja kohalike erinevuste märkus on näidu title-tekstis. Puuduvad andmed tähistatakse kriipsuga, laadimine kolme punktiga. Nooltel puudub pointer-events, seega kaart jääb liigutatavaks ja markerid vajutatavaks.

Kontrollid: TypeScript/Vite build ning 55/55 testi koos väliste kaarditeenuste kontrolliga. Uued testid katavad nelja ilmakaare liikumissuuna, kaardi pööramise, nurga normaliseerimise ja vigaste/aegunud andmete tagasilükkamise. Päris telefoni visuaal- ja pööramiskatse tuleb teha seadmes; kohalik arendusserver ei ole eraldatud testbrauserist kättesaadav.

Andmete dokumentatsioon: https://open-meteo.com/en/docs
