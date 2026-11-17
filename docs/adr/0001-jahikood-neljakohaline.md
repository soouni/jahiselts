# ADR-0001: Külalise sisenemine neljakohalise jahikoodiga

**Staatus:** Vastu võetud
**Kuupäev:** 2026-11-17
**Otsustaja:** Martti Ojamaa

## Kontekst

Jahil osalevad külalised (naabrid, kutsutud jahimehed) peavad nägema jahi kaarti ja oma kohta ilma kontota. Jahijuht jagab koodi suuliselt või sõnumiga, tihti metsas ja nõrga levi korral. Konto loomine külalisele on liiga aeglane ja takistab sisenemist.

Piirangud: kood peab olema lihtne sisestada telefonis kinnastega; kaart näitab osalejate asukohti, seega juhuslik pealtvaatamine on soovimatu; hooldaja on üks inimene.

## Otsus

Külaline siseneb **4-kohalise jahikoodiga**, mille kaitseks on serveripoolsed piirangud (Edge Function `hunt-code` ja RPC `redeem_hunt_access_code`):

- kood kehtib 48 tundi ja jahi kohta on korraga üks kehtiv kood;
- üks seade (IP, IPv6 puhul /64) saab 5 valet katset 15 minuti jooksul;
- kogu süsteemis lubatakse 60 valet katset tunnis, edasi sisenemine sulgub tunniks;
- kood tühistatakse jahi lõppedes (Eesti päeva lõpus) või jahijuhi käsul;
- külalise vaadet kontrollitakse serveris iga 20 sekundi järel.

## Vaadeldud variandid

| Variant | Keerukus | Kasutus väljas | Kaitse arvamise vastu |
|---|---|---|---|
| A. 4 numbrit + piirangud (valitud) | madal | väga hea | piisav, kuid mitte tugev |
| B. 6 numbrit + piirangud | madal | hea | tugev |
| C. Pikk lingi-token (QR või link) | keskmine | hea, kui link jõuab kohale | väga tugev |
| D. Külalise konto (e-post) | kõrge | halb | väga tugev |

Variant B lükati kasutaja otsusega tagasi: 6 numbrit on suuliselt jagades ja metsas sisestades tüütum. Variant C on hea täiendus hilisemaks, kuid vajab jagamiskanalit, mis ei ole alati olemas. Variant D ei sobi külalise kogemuseks.

## Kompromiss

4 numbrit annab 10 000 võimalust. Piirangutega on arvamine aeglane, kuid mitte võimatu: kui ründaja hoiab globaalse piiri tunniti täis, on 48 tunni jooksul umbes 2 900 katset ehk ligikaudu 25% võimalus ühe kehtiva koodi leidmiseks (hinnang, eeldab pidevat rünnakut). Selline rünnak tekitaks samal ajal sisenemise lukud, mida jahijuht märkaks.

Teine kompromiss: kolm erinevat IP-d suudavad kogu sisenemise tunniks sulgeda. Seda peeti vastuvõetavaks, sest juba sisse saanud külalised jäävad sisse ja jahijuht saab koodi uuesti jagada.

## Tagajärjed

- Lihtsam jahipäev: ühe koodiga saavad kõik sisse.
- Sisenemise lukk on teadaolev tõrge ja on kirjas töökorra juhendis (`docs/runbook.md`).
- Kaardil olevad asukohad on kaitstud ainult koodi ja piirangutega, seega tundlikke andmeid külalisele ei näidata.

## Millal otsus üle vaadata

- sisenemise lukk on kordunud ilma selge põhjuseta (rünnaku märk);
- jahtide arv kasvab nii, et korraga kehtib mitu koodi (arvamise võimalus kasvab samas mahus);
- külalisele hakatakse näitama tundlikumaid andmeid.

Esimene samm on siis variant B (6 numbrit), teine variant C (QR või link).

## Tegevused

1. [ ] Jälgi lukkude esinemist jahihooajal (Supabase logid, `hunt-code`).
2. [ ] Otsusta variant B või C, kui mõni ülaltoodud tingimus täitub.
