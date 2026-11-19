# Süsteemi ülevaade ja kitsaskohad

Seisuga 2026-11-19. Dokument kirjeldab, kuidas Pärnjõe jahiselts kaart on ehitatud, mida see eeldab ja mida tasub järgmisena vaadata. Täpsemad otsused: [ADR 0001](adr/0001-jahikood-neljakohaline.md), töökord: [runbook](runbook.md), varukoopia: [backups](backups.md).

## 1. Nõuded

Funktsionaalsed: liikmed planeerivad jahte, märgivad ajad, ajamialad ja jahimeeste liinid kaardil ning näevad jahipäeval üksteise asukohti. Külaline (nt kutsutud jahimees) vaatab jahti ilma kontota, 4-kohalise jahikoodiga.

Mittefunktsionaalsed: väike kasutajaskond (kümmekond liiget, jahipäeval mõnikümmend külalist), vilets levi metsas, ainsa haldajana üks inimene, kulu praktiliselt null. Seega loevad tähtsuse järjekorras: andmete kadumatus, külalise koodi kaitse väänamise vastu, lihtne hooldus. Skaleeritavus ei ole praegu probleem.

## 2. Ülesehitus

```
 Brauser (liige)              Brauser (külaline)
 React + OpenLayers           sama rakendus, koodivärav
        |                            |
        | Supabase Auth + RLS        | POST hunt-code (redeem/view)
        v                            v
 +--------------------------------------------+
 | Supabase: Postgres + PostGIS + Storage     |
 |  - RLS tabelitel (liikmed näevad oma jahte)|
 |  - RPC-d (security invoker, õigused kitsad)|
 |  - Edge Function hunt-code (service_role)  |
 +--------------------------------------------+
        ^
        | pg_dump + GeoJSON, nädalas
 GitHub Actions: weekly-backup -> Storage 'backups'
                 restore-test (käsitsi), kontrollib taastatavust
 GitHub Pages: staatiline rakendus (Vite build)
```

Hosting: GitHub Pages teenindab staatilist rakendust, kogu loogika ja andmed on Supabase'is. Eraldi serverit ei ole.

## 3. Andmevoog: külaline

1. Jahijuht loob koodi (üks elus kood jahi kohta, kehtib 48 tundi).
2. Külaline sisestab 4 numbrit. Edge Function kutsub RPC-d `redeem_hunt_access_code`, mis loendab valesid katseid IP kohta (5 / 15 min) ja kogu süsteemis (60 / tund) ning vastab invalid, throttled, locked või ok.
3. Õige koodi korral saab külaline allkirjastatud tokeni `v1.<codeId>.<aegub>.<hmac>`.
4. Vaade küsib andmeid iga 20 s uuesti ja kontrollib sama päringuga, et kood on veel kehtiv (tühistamine jõuab külalisteni kuni 20 s viivitusega).

Võtmeotsus (ADR 0001): 4 numbrit on nõrk saladus, seega kaitse tuleb piirangutest, mitte koodi entroopiast. Hind: vale-koodi lukk (60 / tund) võib ühe ründaja korral blokeerida ka ausad külalised. See on teadlik kompromiss: lukk lõpeb tunniga, jahijuht saab uue koodi.

## 4. Mahu hinnang

| Näitaja | Hinnang | Märkus |
|---|---|---|
| Külalisi korraga | kuni ~30 | oletus, mitte mõõtmine |
| Päringuid külalistelt | ~30 × 3 / min = ~90 / min | 20 s küsitlus |
| Andmehulk | 116 kaardiobjekti, 10 jahti | varukoopia ~330 KB |

Koormus on mitu suurusjärku alla seda, mida Supabase'i väikseim pakett kannab. Skaleerimine ei vaja otsuseid enne, kui külalisi on sadu.

## 5. Kitsaskohad ja riskid

| # | Risk | Mõju | Otsustusreegel / samm |
|---|---|---|---|
| 1 | Jahipäeval puudub levi | kaart ei uuene, külalise vaade jääb viimase seisu peale | `offlineSummary` on olemas; päris telefoniga proov metsas on tegemata |
| 2 | Üks haldaja (bus factor) | kui Martti pole kättesaadav, ei oska keegi parandada | runbook on olemas; lisa teine GitHubi/Supabase'i omanik |
| 3 | Supabase'i tasuta projekt võib tegevusetuse korral pausile jääda | rakendus lakkab tööle | kontrolli Supabase'i seadetest/dokumentatsioonist, kas nädalane varukoopia loeb tegevuseks; ära eelda |
| 4 | Varukoopia asub samas Supabase'i projektis | projekti kaotus viib ka varukoopia | kopeeri kord kuus fail väljapoole (nt oma arvutisse); vt backups.md |
| 5 | Ebaõnnestumise teade (issue) on proovimata päris rikkega | vaikne rike võib jääda märkamata | esimene päris rike näitab; soovi korral testiv lüliti |
| 6 | Vale-koodi lukk on globaalne | ründaja saab külalised välja lukustada | vaata Edge Function'i logist 429-sid; kui sagedased, lisa lukk jahi kohta |
| 7 | `main` pole kaitstud | otse-push või katkine ühendamine | luba GitHubis branch protection (tasuta) |

## 6. Mida tasub tulevikus uuesti vaadata

- Kui külalisi on üle ~200 või küsitlus tekitab märgatavat koormust: asenda 20 s küsitlus Realtime'iga, aga arvesta, et siis tühistamine ja aegumine tuleb teisiti lahendada.
- Kui jahte on mitmes klubis: praegune mudel on ühe klubi oma; mitme klubi korral vaja klubi tasandit RLS-is.
- Kui koodi pikkust tahetakse kasvatada: ADR 0001 selgitab, miks 4 numbrit valiti; muutmine puudutab koodi genereerimist, piiranguid ja CodeGate'i.
- Kui hosting vahetub: Edge Function'i CORS-lubatud allikad (soouni.github.io, parnjoe-jahikaart.ojamaa.chatgpt.site) tuleb uuendada.

## 7. Eeldused (kontrollimata)

Külaliste arv, jahipäeva levi ja Supabase'i paketi piirangud on hinnangud. Neid ei ole selle dokumendi jaoks mõõdetud.
