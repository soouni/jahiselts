#!/usr/bin/env bash
# Jahikoodi piirangute võidujooksu kontroll päris Postgresis (PGlite on üheühenduseline
# ega saa seda näidata). Eeldab andmebaasi, kuhu on rakendatud kõik migratsioonid, ning
# `psql` ja `pgbench` olemasolu. EI KÄIVITA tootmisandmebaasi vastu: skript kustutab
# tabeli hunt_code_limits sisu ja lisab ajutise tabeli race_log.
#
#   PGURL=postgresql://postgres@localhost:5432/proov tests/integration/hunt-code-race.sh
#
# Eeldatud tulemus: ühelt aadressilt täpselt 5 `invalid` ja ülejäänud `throttled`;
# 15 aadressilt kokku täpselt 60 `invalid` (üldpiir); õige kood ei kuluta katseid.
set -euo pipefail
: "${PGURL:?Anna PGURL}"
case "$PGURL" in *supabase.co*|*pooler*) echo "Keeldun: see näeb välja nagu tootmisandmebaas."; exit 2;; esac
q() { psql "$PGURL" -Atq -v ON_ERROR_STOP=1 "$@"; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
q -c "create table if not exists race_log(status text)"
q -c "select 1 from hunt_access_codes where code='4827' and revoked_at is null" | grep -q 1 \
  || { echo "Lisa enne jahikood 4827 (hunt_access_codes), muidu õige koodi kontroll ei tööta."; exit 2; }
run() { q -c "delete from hunt_code_limits; truncate race_log"; pgbench -n -f "$1" -c 64 -j 8 -t "$2" "$PGURL" >/dev/null 2>&1; q -c "select status||': '||count(*) from race_log group by status order by 1"; }
echo "insert into race_log select public.redeem_hunt_access_code('0000', repeat('a',64))->>'status';" > "$tmp/one.sql"
printf '\\set n random(1,15)\ninsert into race_log select public.redeem_hunt_access_code(%s, repeat(to_hex(:n),64))->>%s;\n' "'0000'" "'status'" > "$tmp/many.sql"
echo "insert into race_log select public.redeem_hunt_access_code('4827', repeat('d',64))->>'status';" > "$tmp/ok.sql"
echo "Üks aadress, 192 samaaegset valet katset:"; r=$(run "$tmp/one.sql" 3); echo "$r"; echo "$r" | grep -qx "invalid: 5" || { echo "VIGA: piir ei hoia"; exit 1; }
echo "15 aadressi, üldpiir:"; r=$(run "$tmp/many.sql" 5); echo "$r"; echo "$r" | grep -qx "invalid: 60" || { echo "VIGA: üldpiir ei hoia"; exit 1; }
echo "Õige kood samaaegselt:"; r=$(run "$tmp/ok.sql" 3); echo "$r"; echo "$r" | grep -qx "ok: 192" || { echo "VIGA: õige kood"; exit 1; }
left=$(q -c "select coalesce(sum(attempts),0) from hunt_code_limits"); [ "$left" = 0 ] || { echo "VIGA: loendurid jäid $left"; exit 1; }
echo "OK"
