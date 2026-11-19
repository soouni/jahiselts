# Oma domeen: www.parnjoe.ee

Rakendus avaneb aadressil `https://www.parnjoe.ee/`. Vana `https://soouni.github.io/jahiselts/` suunab pärast domeeni aktiveerimist GitHubi poolt automaatselt uuele aadressile.

## DNS (veebimajutus.ee)

| Nimi | Tüüp | Väärtus |
|---|---|---|
| `www` | CNAME | `soouni.github.io` |
| `@` (parnjoe.ee) | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |

Kustuta samal nimel olevad vanad A/AAAA/CNAME kirjed (nt majutuse vaikelehe kirje), muidu tekib konflikt.

## GitHub

Repo → Settings → Pages → Custom domain: `www.parnjoe.ee` → Save. Kui DNS-kontroll läbib, märgi „Enforce HTTPS" (sertifikaat valmib kuni tunniga). Apex `parnjoe.ee` suunatakse GitHubi poolt automaatselt `www`-le.

## Supabase

Authentication → URL Configuration: Site URL `https://www.parnjoe.ee`, Redirect URLs lisa `https://www.parnjoe.ee/**` (vana jäta alles). Edge Functionite (`hunt-code`, `username-login`) lubatud päritolud sisaldavad uut domeeni.

## Järjekord

1. DNS, 2. GitHub Pages custom domain, 3. Supabase URL-id, 4. selle PR-i ühendamine (baasitee `/` töötab ainult domeeni all), 5. kontroll telefonis: leht, sisselogimine, jahikood.

Tagasipööramine: eemalda GitHubist custom domain ja pööra `vite.config.ts` baas tagasi `/jahiselts/`.
