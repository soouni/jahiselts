# Pärnjõe Jahiseltsi koduleht (demo)

Avalehe demo aadressile **www.parnjoe.ee**. Jahikaart jääb eraldi aadressile `jaht.parnjoe.ee`.

- `index.html` on iseseisev staatiline leht: üks fail, ei vaja ehitust ega sõltuvusi (v.a Google Fonts).
- Kõik seaded (järgmise jahi aeg, teadete riba, jahihooajad, galerii) on faili lõpus olevas skriptis plokis `Seaded`.
- Kohatäitjad on nurksulgudes, näiteks `[NIMI]`, `[KOOD]`, `[Kohanimi]`.

## Enne avaldamist

1. Täida nurksulgudes kohatäitjad päris andmetega.
2. **Jahihooajad on näidisandmed.** Kontrolli need kehtiva jahieeskirja järgi üle.
3. Jahikoodi kast on praegu demo (kood `1234`). Päriselt kontrollib koodi jahikaardi rakendus. Kas kood suunatakse `jaht.parnjoe.ee`-sse või jäetakse ainult nupp „Ava jaht“, on veel otsustamata.
4. Galerii fotod on kohatäitjad.

## Avaldamine

Selle repo GitHub Pages teenindab juba `jaht.parnjoe.ee` (`public/CNAME`) ja Vite'i ehitus ei võta seda kausta kaasa.
Üks Pages-sait saab kasutada ainult ühte kohandatud domeeni, seega tuleb `www.parnjoe.ee` jaoks luua eraldi repo (nt `soouni/parnjoe.ee`), kopeerida sinna see kaust, lisada `CNAME` failiga `www.parnjoe.ee` ning seadistada DNS.

Lähtekoht: Claude'i disainilõuendi „Demo – elav avaleht“, mis on teisendatud iseseisvaks HTML-iks.
Dekoratiivsed metsasiluetid ja kõrgusjooned genereeritakse brauseris.
