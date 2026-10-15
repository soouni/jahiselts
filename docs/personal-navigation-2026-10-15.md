# Isiklik teejuhatus ja auto asukoht

Oma jahikoha vaates avaneb „Juhata positsioonile”: autoga lähemale suunab positsiooni Google Mapsi autosõidu sihtkohana; jalgsi valik käivitab vajadusel GPS-i ning kuvab suuna ja linnulennukauguse. Kõnnijuhised saab avada Google Mapsis. Jahijuht ligipääsu ega parkimist ei määra. Teede läbitavust, lubatud ligipääsu ja metsaradade olemasolu ei tuletata automaatselt.

„Jätsin auto siia” salvestab ainult kasutaja enda seadmesse tema kontoga seotud asukoha 48 tunniks. GPS peab olema kuni 30 sekundi vanune ja täpsusega kuni ±50 m. Salvestusviga kuvatakse kasutajale. Aju vahetamine ei kustuta autot. Võimalik on asukohta uuendada, kustutada, kaardil näidata ning valida „Juhata autoni”. Auto kaart kasutab eraldi markerit ega asenda elusat GPS-i. Väljalogimine eemaldab salvestuse.

Kaardilink ei määra lähtepunkti; selle valib kaardirakendus. Google saab sihtkoordinaadid alles kasutaja lingivajutusega. Oma kaardi suuna/kauguse arvutus ja auto salvestus ei vaja võrku; väline marsruut sõltub Google Mapsi ühendusest ja allalaaditud kaartidest. Võrguvaba taaskäivitamise jaoks tuleb oma jahikoht ja kaart eelnevalt salvestada.

Kontroll: 53/53 testi läbis koos väliste kaarditeenuste kontrollidega; TypeScript/Vite build läbis. Uued testid katavad koordinaatide järjekorra, sõidu/kõnni marsruudirežiimi, kontode eraldatuse, 48 h aegumise, kustutamise, vigase/aegunud/ebatäpse GPS-i ja salvestusruumi vea. Kohalik brauseri visuaalkontroll oli keskkondade võrgu eraldatuse tõttu blokeeritud; päris iOS/Androidi rakenduse avamine, kompass, GPS ja offline taaskäivitus jäävad füüsilisteks katseteks.

Google Maps URL spetsifikatsioon: https://developers.google.com/maps/documentation/urls/get-started
