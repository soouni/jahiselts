# Disainiülevaade: kriitika, tokenite audit ja jahikoodi vaate spetsifikatsioon

Seisuga 2026-11-19. Alus: live-leht https://soouni.github.io/jahiselts/ 375×812 vaates (jahikoodi vaade ja avalik kaart), `src/style.css` ja `src/guest/CodeGate.tsx`. Kontrastisuhted on arvutatud värvikoodidest. Sisselogitud jahijuhi vaadet ja jahipäeva paneele ei ole selles ülevaates ekraanil vaadatud.

**Piirang:** minu brauseriaknas ei laadinud aluskaardi plaadid (võrgupäringuid Maa-ameti serverisse ei tehtud, tõenäoliselt on aken piiratud). Seetõttu ei saa ma hinnata ortofoto ja piirjoone kontrasti. See tuleb kontrollida päris telefonis.

## 1. Disainikriitika

### Üldmuljes
Kaks ekraani, mida nägin, on selged ja kiiresti loetavad: tume roheline kaubamärk, valge kaart, üks põhitegevus. Suurim võimalus on jahipäeva tingimused (päike, kindad, väsimus): kontrasti ja tekstisuuruste varu on kohati väike.

### Kasutatavus
| Leid | Tõsidus | Soovitus |
|---|---|---|
| Koodivälja sisu on hall ••••, mis näeb välja nagu juba sisestatud parool | 🟡 | Pane kohahoidjaks `0000` heledas hallis või kirjuta sildile „4 numbrit"; kontrolli, et ligipääsetav nimi ütleb sama |
| „Ava jaht" on koodi sisestamata hall ja ei ütle, miks | 🟢 | Piisab sildist „4 numbrit" väljal; automaatne avamine neljandal numbril on hea ja jäägu |
| Avaliku kaardi kompass hõivab ~30% laiusest 375 px ekraanil ja jääb piiri kohale | 🟡 | Väiksema kompassi variant kitsal ekraanil või tõsta nurka |
| Alumisel paneelil on neli selget nuppu (Otsi, Sisu, Asukoht, Mõõda) | ✅ | Hoia; 44 px+ puutealad on olemas |
| Ülal paremal domineerib tume „Logi sisse" nupp isegi külalisele | 🟢 | Kui avalikku kaarti vaatab peamiselt külaline, tee nupp teisejärguliseks (kontuurnupp) |

### Visuaalne hierarhia
Esimesena tõmbab pilku pealkiri „Sisesta jahikood" ja seejärel koodiväli, mis on õige. Lugemisvoog üleval-alla on lühike. Avalikul kaardil tõmbab pilku oranž piirjoon, mis on õige.

### Ligipääsetavus
| Element | Mõõdetud | Hinnang |
|---|---|---|
| Põhitekst `--ink` #173e32 valgel | 11,85 : 1 | läbib |
| Hallikas tekst `--muted` #526b5f valgel / taustal #e9eee7 | 5,79 / 4,92 : 1 | läbib (AA 4,5) |
| Tekst #61796b valgel | 4,71 : 1 | läbib napilt |
| Valge tekst rohelisel #278154 | 4,82 : 1 | läbib |
| Valge tekst ohupunasel `--danger` #9b3028 | 7,38 : 1 | läbib |
| **Valge tekst oranžil `--accent` #d97726 (või vastupidi)** | **3,17 : 1** | **ei läbi AA tavatekstil**; läbib ainult suurel tekstil (3 : 1). Kontrolli, kus accent'iga tekst on |
| Puutealad | min-height 44–56 px | läbib |
| Fookus ja liikumine | 5 `:focus-visible` reeglit, `prefers-reduced-motion` olemas | hea |
| Väikseimad tekstid | 8 px (kaubamärgi alamsilt kitsal ekraanil), 10–11 px kokku 19 kohas | 🟡 liiga väikesed välitingimustes |

### Mis töötab hästi
- Üks selge peamine tegevus koodiekraanil ja kontoga sisenemine eraldi nupu taga.
- Välitingimuste mõte on koodis kirjas: peamised juhtnupud on telefonis vähemalt 14 px.
- `role="alert"` veateadetel ja `role="status"` märkustel; fookus naaseb väljale pärast viga.

### Prioriteetsed soovitused
1. **Parandada oranži kontrast** — kui accent'iga on kirjutatud tekst, tumenda tooni (nt #b05813 annab valgel 4,94 : 1; vaata enne kasutuselevõttu, kuidas toon kaardil välja näeb) või kasuta seal tumedat teksti.
2. **Tõsta 8–11 px tekstid vähemalt 12 px peale** — kõige olulisem kitsal ekraanil, kus kaubamärgi alamsilt on 8 px.
3. **Koodivälja kohahoidja** — vältida parooli moodi punkte.

## 2. Disainisüsteemi audit

Süsteem on kirjutatud ühte CSS-faili (220 rida), tokeneid on seitse. Skoor on hinnang, mitte standardne mõõdik.

| Kategooria | Defineeritud | Käsitsi kirjutatud |
|---|---|---|
| Värvid | 7 tokenit (`--ink`, `--muted`, `--surface`, `--soft`, `--accent`, `--danger`, `--shadow`) | `#fff` 24 kohas, rohelised toonid #173e32 (7), #61796b (5), #e4ebe6 (4), #e4ebe3 (4), #dce3df (4) jt; mitu peaaegu samasugust halli-rohelist |
| Raadius | 1 token (`--radius` 16 px) | 8, 10, 12 (20 kohta), 14, 20 px ja 50% |
| Tekstisuurused | puudub | 10, 11, 12, 13, 14, 15, 16, 18, 20 px (9 erinevat) |
| Vahed | puudub | käsitsi |
| Murdepunktid | puudub | 760 (11 korda), 720, 700, 600, 375, 360; kõrguse põhised 520 |

Tähelepanekud:
- Tokenid olemas ja kasutusel (`--muted` 28, `--ink` 22 korda), kuid `#fff` ja peaaegu identsed rohelised on tokenist mööda.
- Murdepunkte on kuus lähedast väärtust (600/700/720/760); kõige tavalisem on 760, seega sobiks üks kitsa ekraani punkt.
- Komponendid on kirjeldatud klassinimedena (`.primary`, `.subtle`, `.notice`, `.code-gate-*`), dokumentatsiooni ei ole.

### Prioriteetsed tegevused
1. Lisa tokenid: `--white`, `--line` (üks hall-roheline joon) ja kolm tekstisuurust (`--text-sm` 12, `--text-md` 14, `--text-lg` 16); asenda `#fff` ja lähedased toonid järk-järgult.
2. Vähenda raadiused kolmele (8, 12, 20 px) ja murdepunktid ühele (760 px).
3. Dokumenteeri kolm komponenti, millest sõltub kõik: `.primary`, `.subtle`, `.notice`.

Ära tee kõike korraga: muudatus ilma visuaalse testita võib kaardi paigutust rikkuda. Tee sama PR-iga ainult tokenid ja kontrolli kõik ekraanid (`qa/layout.html` kuuel suurusel).

## 3. Üleandmise spetsifikatsioon: jahikoodi vaade (`CodeGate`)

### Ülevaade
Külaline sisestab neljakohalise jahikoodi ja näeb oma paigutust. Kontoga sisenemine ja avalik kaart on eraldi nupud.

### Paigutus
Keskel kaart `min(420px, 100%)`, polster 26 / 22 px, raadius 20 px, vari `--shadow`. Taust #e9eee7, külgedel 16 px ja all 24 px + `env(safe-area-inset-bottom)`. Korpus: ikoon + „Pärnjõe / JAHISELTSI KAART", pealkiri, selgitus, väli, nupp, kaks tekstilinki joone all.

### Väli
| Omadus | Väärtus |
|---|---|
| Sisend | ainult numbrid (muu eemaldatakse), maksimaalselt 4 |
| Klaviatuur | `inputMode="numeric"`, `pattern="[0-9]{4}"` |
| Automaattäide | `autoComplete="one-time-code"` |
| Automaatne esitamine | kohe 4. numbril |
| Fookus | `autoFocus` avamisel; pärast vigast katset naaseb fookus väljale (alles kui väli pole enam keelatud) |

### Olekud
| Olek | Nähtav | Käitumine |
|---|---|---|
| Algne | väli tühi, nupp keelatud (läbipaistvus 0,45) | — |
| Sisestamisel (1–3 numbrit) | numbrid väljal | nupp endiselt keelatud |
| 4 numbrit | — | esitatakse automaatselt; nupp aktiivne |
| Töös | nupul keerlev ikoon | väli ja nupp keelatud, topeltesitust ei tehta |
| Viga | punane teade (`role="alert"`) | väli tühjendatakse, fookus tagasi väljale |
| Märkus | `role="status"` teade üleval | nt aegunud seanss |
| Andmebaas ühendamata | märkus nupu kohal | — |

Veateated tulevad funktsioonist `guestProblem(code)`; selle ülevaate jaoks ei ole kõiki tekste üle vaadatud.

### Äärejuhud
- **Piirang (throttled / locked):** sama viga kuvatakse, aga uus katse ei tohi tulla enne, kui server lubab. Teksti peab eristama „vale kood" ja „proovi hiljem".
- **Kleebitud tekst:** kaks tühikut ja tähed eemaldatakse, jääb kuni 4 numbrit.
- **Aegunud kood (48 h):** sama „vale kood" tekst, et ei paljastaks, mis koodi on olemas.
- **Aeglane võrk:** töös-olek peab jääma nähtavaks kuni vastuseni; ära katkesta ajapiiranguga.

### Ligipääsetavus
- Silt „Jahikood" on seotud väljaga ja veateade on väljaga seotud (`aria-describedby="code-gate-error"` seatakse vea korral).
- Fookusjärjekord: väli → „Ava jaht" → „Jahijuht või admin: logi sisse" → „Vaata avalikku jahiala kaarti".
- Puutealad vähemalt 44 px; kontrasti arvud vt punkt 1.

### Liikumine
Ainult keerlev ikoon; `prefers-reduced-motion` lülitab selle `animation:none` abil välja (üldreegel failis).
