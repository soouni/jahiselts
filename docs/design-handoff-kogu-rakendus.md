# Üleandmise spetsifikatsioon: kogu rakendus

Seisuga 2026-11-19. Kirjeldab, kuidas Pärnjõe jahiseltsi kaart praegu on ehitatud ja käitub, nii et uue disaini või uue arendaja töö saaks sellest lähtuda. Allikas on kood (`src/App.tsx`, `src/style.css`, `src/ui/`, `src/guest/`, `src/hunt/`) ja live-lehe käsitsi vaatlus (https://soouni.github.io/jahiselts/, 375 px, 800 px ja 1366 px laiusega, sisselogitud omanikuna). Täpsem jahikoodi vaate spetsifikatsioon on dokumendis [disain-ulevaade-2026-11-19.md](disain-ulevaade-2026-11-19.md).

**Mida see dokument ei kata:** kõiki sisselogitud ja jahipäeva ekraane ei ole vaadatud päris telefonis ega GPS-iga; jahirežiimi, külalise kaardivaate ja võrguvaba käitumise kirjeldus tuleb koodist ja on märgitud „koodist". Mis on vaadatud, on märgitud „vaadatud".

## 1. Üldpõhimõtted

1. **Telefon enne.** Peamine kasutus on metsas, ühe käega, päikese käes, kindad käes. Seetõttu on puutealad vähemalt 44 px (enamasti 48), peamised nupud 14 px ja üle.
2. **Kaart on alati taustaks.** Kõik tööriistad on kaardi peal ujuvad paneelid või paneelid alt-üles lehena; kaart ei vaheta lehte.
3. **Roll määrab, mida näed.** Külaline näeb ainult oma koha ja naabreid; vaataja näeb admini lubatud kihte; liige lisab; admin ja omanik haldavad.
4. **Võrguta peab põhi töötama.** Jahirežiimis ja külalise vaates on salvestatud kaardi ja viimase vaate varuvariant, ja oleku näitaja ütleb ausalt, kui andmed on vanad.
5. **Keel:** eesti keel, hääldatavad terminid („kütt", „ajaja", „koeramees", „aju" nagu jahikeeles). Ingliskeelseid sõnu liideses ei ole.

## 2. Rollid ja õigused

| Roll | Allikas | Mida näeb ja teeb |
|---|---|---|
| Külaline | 4-kohaline jahikood | Vaatab ühe jahi paigutust: oma koht, naabrid; ei saa midagi muuta |
| Avalik (sisselogimata) | — | Ametlik piir, aluskaardid, otsing, mõõtmine, oma asukoht |
| Vaataja | konto | Kõik eelmine + admini lubatud kihid |
| Liige | konto | Lisab vaatlusi ja jälgi; muudab oma kirjeid |
| Jahijuht | jahil määratud liige | Haldab oma jahti: osalejad, positsioonid, koodid |
| Admin | konto | Kõik liikme omad + oluline koht, siht/joon, ala; jahtide loomine; kasutajate haldus; prügikast; ajalugu |
| Omanik | konto | Admini õigused + jahi lõplik kustutamine |

## 3. Tokenid ja stiilid

### Värvid (`:root` muutujad ja lähtepunktid)
| Token | Väärtus | Kasutus |
|---|---|---|
| `--ink` | #173e32 | peamine tekst, peamine nupp (`.primary` #173f32) |
| `--muted` | #526b5f | teisejärguline tekst |
| `--surface` | #fff | paneelid, kaardid |
| `--soft` | #edf4ef | pehme taust |
| `--accent` | #d97726 | märkpunkt (`.bottomnav i`), legendijoon; ainult mittetekst |
| `--danger` | #9b3028 | kustutamine, vead |
| `--shadow` | 0 6px 30px #173e3235 | ujuvad paneelid |
| `--radius` | 16px | kaardi nurgad |
| taust | #e9eee7 | leht, koodivärav |

Tokeniks tõstmata, kuid korduvad: roheline #278154 / #17663e (aktiivne jaht ja edukus), hoiatus #fff8e9 taustal tekst #71400c (aluskaardi viga), jooned #e5eae2 / #e8eee7 / #dce3df.

### Tüpograafia
Süsteemifont (`system-ui`), baas 16 px. Lehe pealkiri `h2` 20 px, `h3` 17 px, tekst 14 px (`.sheet p`), peamised nupud 14 px, väike tekst 12 px. Alla 12 px on kaubamärgi alamsilt (10 px; mobiilis 10 px pärast parandust) ja mõned silt-tekstid.

### Kujundus
Raadius 8 / 10 / 12 / 14 / 16 / 20 px, ring 50%. Ujuvad paneelid valgel, vari `--shadow`. Aluskaardi vahetaja ja jahirežiimi nupp on ümmargused 60 px (56/44 px väiksemates vaadetes).

### Murdepunktid
Põhimurre `max-width: 760px` (11 reeglit): mobiil. Lisaks 720, 700, 600, 375, 360 ja kõrgusepõhine `max-height: 520px` (rõhtvaade telefonil). `min-width: 761px` desktopi variandid.

### Liikumine
Üks üleminek (`transform .2s ease-out`) ja üks pöörlev ikoon (`spin` 1 s). `prefers-reduced-motion: reduce` lülitab animatsioonid välja.

### Virnastamine (z-index)
Kaart taga; ujuvad nupud 8–10; alumine tööriistariba 30; jahirežiimi olekuriba ja paneelid 18–24; klaviatuurijuhis kaardil 21; `<dialog>` lehed kasutavad brauseri ülemist kihti.

## 4. Põhikomponendid

| Komponent | Fail | Omadused ja käitumine |
|---|---|---|
| **Leht (Modal)** | `ui/Modal.tsx` | Natiivne `<dialog>`; päis kleepuv (pealkiri `h2` + „Sulge" nupp); Esc sulgeb; fookus naaseb avanud elemendile (`dialogFocus`); `aria-labelledby` seotud pealkirjaga. Desktopil keskel `min(520px, 100vw − 32px)`, kõrgus ≤ 90 dvh; mobiilis täislaiuses alt üles, ülemised nurgad 20 px, kõrgus ≤ 88 dvh, all `env(safe-area-inset-bottom)` |
| **Väli (Field)** | `ui/Modal.tsx` | Silt + kontroll `<label>` sees |
| **Alumine tööriistariba** | `ui/ActionDocks.tsx` | Keskel, 56 px alt, valge 20 px nurgaga; nupud min-laius 76 px, silt 14 px. Tavarežiimis: Otsi, Sisu (täpp kui filter aktiivne), Lisa (liige+) või Asukoht (vaataja), Mõõda. Jahirežiimis: Osalejad, GPS (näitab kaugust või positsiooni), Mõõda; `aria-pressed` näitab avatud paneeli |
| **Aluskaardi vahetaja** | `App.tsx` | Ümmargune nupp vasakul üleval; silt näitab praegust aluskaarti (Hübriid → Kaart → Ortofoto → …); `aria-label` „Aluskaart: X. Vajuta kaardi vahetamiseks." |
| **Kompass** | `MapCompass.tsx` | Parempoolne ring; PÕHI, IDA, LÕUNA, LÄÄS |
| **Mõõtmisriist** | `MeasureTool.tsx` | Pikkus, pindala, ring; „Jooksev lõik", „Kogupikkus", „Viimane lõik"; Tagasi, Uuesti, Lõpeta; „Vähenda" voldib paneeli; ajutine, ei salvestata |
| **Legend** | `MapLegend.tsx` | Märkide loendus ja ala/joone värvid; ainult liikmetele |
| **Värvivalija** | `ObjectColorPicker.tsx` | 4 veergu, `min-height` 78 px nupud, 2 px ääris valitud värvil |
| **Teade (toast)** | `ToastContext` | Näidatakse lehe sisu kohal; `role="status"` |

## 5. Vaated ja olekud

### 5.1 Sisenemine
| Ekraan | Sisu | Olekud |
|---|---|---|
| **Koodivärav** (vaadatud) | Kaubamärk, „Sisesta jahikood", väli, „Ava jaht", „Jahijuht või admin: logi sisse", „Vaata avalikku jahiala kaarti" | vt disain-ulevaade punkt 3 |
| **Sisselogimine** (`login`, koodist) | „Seltsi kaardile sisenemine"; viis „Parooliga" / „E-kirjaga"; e-post → link või kood; „Muuda aadressi või saada uus kood"; „Mul on jahikood · sisesta kood" | andmebaas ühendamata: selgitus, et saab uurida ametlikku jahiala |
| **Parool** | „Määra või muuda parool" | — |

### 5.2 Tavakaart (sisselogitud ja avalik)
- **Kaubamärk** üleval vasakul (avab kaardi info), **konto** (ümmargune täht) üleval paremal; sisselogimata asemel „Logi sisse".
- **Ametlik piir** oranž; metsatukad helesinine; sihid ja jooned kollane/roheline (valitavad).
- **Info** (`info`): „Pärnjõe jahipiirkond", EELIS-kood, pindala ligikaudu 8 676 ha, allikalingid, hoiatus, et kaart ei näita maaomanike kokkuleppeid.
- **Otsi** (`search`, vaadatud): kaks sakki „Seltsi kaardilt" ja „Aluskaardilt"; otsinguväli; tulemused ikooni, nime ja liigiga; avab objekti kaardi ja suumib.
- **Sisu** (`layers`, vaadatud): lülitid ametlik piir, metsatukad, sihid ja jooned, kohad, vaatlused, jäljed ja ulukimärgid (keelatud liigid hallid: „Admini poolt peidetud" / „Seltsi liikmetele"); kokkuvolditud „Vaatluste filter" (liik, vaatlused/jäljed, ajavahemik 24 h / 7 p / 30 p / kogu aeg / kuupäevad, jälje vanus, „Taasta vaikimisi valikud"); lahtivolditav „Kaardimärkide legend".
- **Objekti kaart** (`detail`, vaadatud): märk (liik), väljad tüüp, loomade arv, sündmuse aeg, sugu, vanus, tegevus, märkmed, kirjeldus, ulukimärk, jälje vanus, suund, vaatleja, väljaspool jahiala; fotod; „Lisaja / Lisatud / Muudetud"; „Muuda" ja „Kustuta" (ainult kui õigus). Kustuta avab kinnitusdialoogi „Kustutan selle kirje?" ja toob kirje 30 päevaks prügikasti.
- **Lisa** (`add`, vaadatud): „Vali, mida lisad. Seejärel märgid asukoha kaardil ja lisad andmed." Viis tüüpi: Loomavaatlus, Jälg või ulukimärk (liige+); Oluline koht, Siht või muu joon, Metsatukk või ala (ainult admin/omanik).
- **Joonistamisriba** (`drawbar`, koodist): pealkiri tüübi järgi, vihje „Puuduta kaarti, et lisada punkt/tippe.", GPS-nupp, „Võta viimane punkt tagasi", Lõpeta, Tühista, Edasi.
- **Kirje vorm** (`editor`, koodist): Nimi *, Alternatiivne nimi, Tüüp, Kirjeldus; vaatlusel Loomaliik * (Põder, Metssiga, Metskits, …), Liigi täpsustus *, Loomade arv *, Kuupäev ja kellaaeg (Eesti aeg) *, Sugu, Vanuseklass, Tegevus, Märkmed, Foto (valikuline); jäljel Ulukimärgi tüüp, Hinnatud vanus, Liikumissuund. Hoiatus väljaspool jahiala: salvestamine siiski lubatud.
- **Ilmateade** (`weather`, vaadatud): Open-Meteo, järgmised 6 tundi, tabel kell / ilm °C / sadu mm / tuul m/s + suund / puhang m/s; „Uuenda"; allikas ja laadimise aeg.
- **Konto** (`account`, vaadatud, parandatud 2026-11-19): nimi, e-post · roll, kasutajanimi (valikuline, 3–30 märki), rühmad **Jahipäev** (Jaht, Ilmateade), **Konto** (parool), **Eksport** (Garmini GPX), **Haldus** (admin/omanik: Kasutajad ja vaatajate õigused, GeoJSON-eksport, Prügikast, Muudatuste ajalugu), Logi välja.
- **Haldus** (`admin`, koodist): „Vaatajale nähtavad kihid"; kasutajate loend rolliga Admin / Omanik / Liige / Vaataja; „Lisa kasutaja" (nimi, e-post, roll); „See tegevus ei saada talle kirja."
- **Prügikast** (`trash`): kustutatud kirjed „Taasta" nupuga; tühi olek „Prügikast on tühi."
- **Muudatuste ajalugu** (`audit`): viimased 100 sündmust; tühi olek „Muudatusi veel ei ole."

### 5.3 Jahi planeerimine (`hunt`, vaadatud 800 ja 1366 px)
Vertikaalne lehekoost:
1. Teade kui aktiivset jahti ei ole.
2. **Lisa inimene ilma e-postita**: nimi, roll (Kütt jt), „Lisa püsivasse nimekirja".
3. Püsiv nimekiri (arv), „Osalejate valimiseks ava jaht."
4. **Uus jaht**: Jahi nimi, Jahiliik (Ajujaht jt), „Luba jahimeestel ise vaba positsiooni valida", Järjestikused ajud (Aju 1 …, „Lisa järgmine aju", „Eemalda"), „Salvesta jaht".
5. **Salvestatud jahid**: aktiivne/peatatud/planeeritud ees; lõpetatud kokkuvolditud („Lõpetatud jahid (N)"). Rea nupud: Ava jaht, Uus samade osalejatega, **Kustuta jaht** (ainult omanik, mitte aktiivsele; kinnitus ja audit).
6. Valitud jahi sektsioonid: jahijuhi valik, ajude olek, positsioonide kaart, küttide järjestuse kinnitamine (`HuntOrderPanel`: eelvaade, „Pööra järjestus ümber", „Kinnita küttide järjestus"), jahikood (`HuntAccessCodePanel`), „Alusta jahti" / „Lõpeta jaht".

### 5.4 Jahirežiim (kontoga osaleja, koodist)
- **Olekuriba**: Sünkroonitud / Ühendan… / Võrguühendus puudub / Sünkroonimise tõrge / Salvestatud jahikoht · ei uuene.
- **Tööriistad**: „Jaht sees" nupp, Vahemaad (jahimeeste vahemaad), Tuulekiht (kiiruse legend; võrguta ei uuene), Seaded.
- **Osalejad**: rühmad Kütid, Ajajad, Koeramehed; „paigutatud" loendur; jahijuht/admin „Paiguta".
- **Positsioon**: „Vaba positsioon" või jahimehe nimi; „Vabasta positsioon", „Muuda asukohta kaardil" (puuduta uut asukohta, Tühista).
- **Seaded**: „Salvesta minu jahikoht 12 tunniks", „Kustuta salvestatud jahikoht", „Kontrolli rakenduse võrguvaba valmisolekut", „Laadi selle jahi ala alla", „Uuenda olekut", „Kustuta võrguvaba kaart", „Lõpeta jahirežiim".
- **Isiklik suund** (`PersonalNavigation`): „Teejuhised ja minu auto", „Juhata positsioonile", „Autoga lähemale ↗", „Jalgsi positsioonile", „Jätsin auto siia" (GPS täpsus ≤ ±50 m), „Juhata autoni", „Näita autot kaardil", „Kustuta"; auto asukoht ainult selles seadmes 48 h.

### 5.5 Külaliste vaade (`GuestHunt`, koodist)
- **Päis**: „Pärnjõe · JAHIVAADE", „Välju" (kinnitus „Sulgeda jahivaade? Uuesti avamiseks on vaja jahikoodi."), olek „Ainult vaatamine" või „Salvestatud vaade · hh:mm".
- **Tööriistad**: aluskaart (Hübriid/Kaart/Ortofoto), Tuul, Vahemaad, Ilm, „Salvesta kaart" (võrguta kasutamiseks), GPS-lüliti.
- **Lehed**: Paigutus (nimekiri, „Vali oma nimi"), Minu koht („Vaata kaardil", „Vali nimi", naabrid Vasakul/Paremal või Ühel pool/Teisel pool, „Autoga lähemale ↗", „Jalgsi ↗"), Ilmateade.
- **Valikuküsimus**: „See olen mina" / „See ei ole minu koht".
- **Tühi olek**: „Paigutus puudub. Jahijuht ei ole selles ajus veel kedagi kaardile paigutanud. Vaade uueneb ise."
- **Märkus**: „Kaart ei asenda jahijuhi ohutusjuhiseid."

## 6. Ajastus ja andmevoog

| Mis | Intervall |
|---|---|
| Külalise vaade ja jahikoodi kehtivuse kontroll | iga 20 s |
| Külalise ilmateate värskendus | iga 10 min |
| Kontoga jahirežiimi taaskontroll | iga 15 min; GPS-i vanuse arvestus iga 1 s |
| Jahikood | kehtib 48 h või kuni jahi lõpuni; üks kehtiv kood jahi kohta |
| Isiklik jahikoht seadmes | 12 h; auto 48 h |

## 7. Äärejuhud

| Olukord | Praegune käitumine |
|---|---|
| Levi kaob | olekuriba/-chip muutub; viimane vaade jääb koos kellaajaga; värskendus jätkub levi taastudes |
| Aluskaardi plaadid ei lae | hoiatus „basemap-error" (kollakas kaart) |
| GPS keelatud või ebatäpne | selge tekst; täpsus üle ±50 m ei kinnita saabumist |
| Vale/aegunud kood | üks üldine veateade, väli tühjeneb, fookus naaseb väljale |
| Liiga palju valesid katseid | piirang (5 / 15 min IP kohta; 60 / h kokku) |
| Asukoht väljaspool jahiala | hoiatus, salvestamine lubatud |
| Aktiivne jaht | ei saa kustutada |
| Tühjad loendid | „Jahte veel ei ole.", „Prügikast on tühi.", „Muudatusi veel ei ole.", „Paigutus puudub." |

## 8. Ligipääsetavus

- `<dialog>` lehed: Esc, fookuse tagastus, nimega seotud.
- `role="alert"` ja `role="status"` veateadetel ja märkustel; `aria-pressed` jahirežiimi tööriistadel.
- Kaardil: nooleklahvid liigutavad, + ja − suumivad (varjatud abitekst; nähtav fookuse korral), fookusring #dd8d38.
- Puutealad: tööriistariba nupud ≥ 44 px, tavanupud ≥ 48 px.
- Kontrastid: vt disain-ulevaade punkt 1 (kõik tekstid ≥ 4,5 : 1; oranž ainult märgina).
- Teadaolev puudus: alla 12 px tekstid mõnes silditekstis; ikoonnuppudel vaja kontrollida, et kõigil oleks tekstiline nimi (ligipääsetav silt on olemas aluskaardi nupul, kompassil ja dokiriba nuppudel).

## 9. Avatud küsimused ja leitud tähelepanekud

1. **„Asukoht" puudub liikme põhiriba seest.** Vaatajal on alumisel ribal „Asukoht", aga liikme ja admini rida asendab selle nupuga „Lisa". Oma asukohta saab siis ainult joonistamise ajal (GPS-nupp) või jahirežiimis. Otsus: kas lisada eraldi ümmargune asukohanupp kaardile (nagu aluskaardi vahetaja)?
2. **Jahtide rea nupud on kitsal ekraanil ja 520 px lehel kokku surutud** (kuni neli nuppu ühes reas, 11–12 px silt). Vaadatud 800 ja 1366 px laiusel: nupud murduvad kitsaks. Soovitus: rea nupud teise rea alla või „⋯" menüü.
3. **Konto menüüs on „Jaht" ja „Ilmateade" eri tüüpi kirjed** (esimene avab planeerimise, teine teabe). Võiks olla ilmateade põhiriba lähedal, sest seda vajab ka külaline.
4. **Disainisüsteem:** vt disain-ulevaade punkt 2 (tokenid, kolm raadiust, üks murdepunkt).
5. **Testimata:** päris GPS, jahi alustamine, külalise koodi loomine ja päris jahipäeva paneelid; vaata neid testjahil.
