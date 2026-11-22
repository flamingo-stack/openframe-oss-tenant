#!/usr/bin/env bash
# Fails when a tracked file under <dir> contains a value from <denylist> (one per line, case-insensitive).
# Prints file:line only, never the matched value. An empty or missing denylist fails.
# Usage: check-tenant-ids.sh <denylist> <dir>
set -euo pipefail

denylist="$1"
dir="$2"

patterns="$(mktemp)"
trap 'rm -f "$patterns"' EXIT
if [ -r "$denylist" ]; then
  tr -d '\r' < "$denylist" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | { grep -v '^$' || true; } > "$patterns"
fi

if [ ! -s "$patterns" ]; then
  echo "::error::Tenant id denylist is empty or missing (org secret TENANT_ID_DENYLIST)"
  exit 1
fi

status=0
found="$(git -C "$dir" grep -I -n -i -F -f "$patterns")" || status=$?
[ "$status" -le 1 ] || { echo "::error::git grep failed in $dir (exit $status)"; exit 1; }
if [ -n "$found" ]; then
  matches="$(cut -d: -f1,2 <<<"$found")"
  while IFS=: read -r file line; do
    echo "::error file=$file,line=$line::Real tenant id found: $file:$line. Use a fake id such as 00000000-0000-0000-0000-000000000001."
  done <<<"$matches"
  exit 1
fi
echo "No real tenant ids found."
