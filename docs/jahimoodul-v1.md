# Jahimoodul V1 – arendusplaan

## Kinnitatud otsused
- Üks jaht sisaldab mitut järjestikust aju, kuid korraga on aktiivne ainult üks aju.
- Igal ajul on oma piirid, kütiliinid, nummerdatud positsioonid ja ülesanded.
- Jahijuht määrab positsioonid; jahi seadistusega võib lubada jahimeestel vabu positsioone ise valida.
- Kohalejõudmine kinnitatakse käsitsi; GPS-kaugus on informatiivne, mitte automaatne tõend.
- Jahijuht, kütt, ajaja ja külaline on jahisisesed rollid, sõltumatud seltsi admin/member/viewer rollist.
- Jahi etapid: planeeritud, käimas, pausil, lõppenud.
- GPS-andmed sisaldavad koordinaate, täpsust ja ajatemplid; aegunud asukohad tuleb eristada.
- Jahi lõpetamine peatab jagamise. Täielikke liikumisjälgi ei säilitata vaikimisi.

## Esimese arendusetapi piir
Esimene etapp lisab tüübistatud domeenimudeli ja puhtad töövoo reeglid, ilma et muudaks olemasolevat kaarti, andmebaasi või avalikku rakendust.

## Järgmine etapp
1. SQL migratsioon eraldi hunts, hunt_drives, hunt_participants, hunt_positions, hunt_messages, hunt_locations ja hunt_events tabelitega.
2. RLS: osalejad näevad ainult lubatud jahiandmeid; kirjutusõigus jahijuhil; enda asukohta uuendab ainult osaleja.
3. Tehinguline serverifunktsioon aju alustamiseks, mis välistab kaks aktiivset aju.
4. Reacti jahijuhi planeerimisvaade ja OpenLayersi ajutine jahikiht.
5. GPS-kinnitused, teated, võrguühenduseta töö ja hiljem Garmin/koerte liidestus.

## Ohutus
GPS ei tõenda, et inimene asub ainult kuvatud punktis. Kaart ei asenda jahijuhi ohutuskorraldusi, sidekontrolli ega vahetut visuaalset tuvastamist. Kõik asukohad peavad kuvama viimase uuenduse aja ja täpsuse.
