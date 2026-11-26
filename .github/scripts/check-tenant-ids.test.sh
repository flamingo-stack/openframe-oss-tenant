#!/usr/bin/env bash
# Tests for check-tenant-ids.sh. Run: bash .github/scripts/check-tenant-ids.test.sh
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/check-tenant-ids.sh"
LISTED_ID="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
LISTED_PREFIX="abcdef12"
failures=0

fail() { echo "FAIL: $1"; failures=$((failures + 1)); }
pass() { echo "ok: $1"; }

# make_repo <file> <content>... : a git repo with the given tracked files, path printed
make_repo() {
  local dir
  dir="$(mktemp -d)"
  git -C "$dir" init -q
  while [ "$#" -gt 1 ]; do
    mkdir -p "$dir/$(dirname "$1")"
    printf '%s\n' "$2" > "$dir/$1"
    shift 2
  done
  git -C "$dir" add -A
  echo "$dir"
}

denylist() {
  local file
  file="$(mktemp)"
  printf '%s\n' "$@" > "$file"
  echo "$file"
}

run() { output="$(bash "$SCRIPT" "$@" 2>&1)"; status=$?; }

list="$(denylist "$LISTED_ID" "$LISTED_PREFIX")"

# T3: a listed id fails with file:line and never prints the id
repo="$(make_repo src/Test.java "class T {
  String id = \"$LISTED_ID\";
}")"
run "$list" "$repo"
if [ "$status" -ne 1 ]; then fail "T3 listed id: expected exit 1, got $status"
elif ! grep -q 'src/Test.java:2' <<<"$output"; then fail "T3 listed id: no file:line in output: $output"
elif grep -qi "$LISTED_ID" <<<"$output"; then fail "T3 listed id: output leaks the id"
else pass "T3 listed id fails with file:line, id not printed"; fi

# T4: a clean tree passes
repo="$(make_repo src/Clean.java 'String id = "00000000-0000-0000-0000-000000000001";')"
run "$list" "$repo"
if [ "$status" -ne 0 ]; then fail "T4 clean tree: expected exit 0, got $status: $output"
else pass "T4 clean tree passes"; fi

# T5: upper case and an 8-char prefix are caught
upper="$(tr '[:lower:]' '[:upper:]' <<<"$LISTED_ID")"
repo="$(make_repo a.ts "const x = '$upper';" b.ts "const y = '$LISTED_PREFIX-0000-0000-0000-000000000000';")"
run "$list" "$repo"
if [ "$status" -ne 1 ]; then fail "T5 case/prefix: expected exit 1, got $status"
elif ! grep -q 'a.ts:1' <<<"$output" || ! grep -q 'b.ts:1' <<<"$output"; then fail "T5 case/prefix: both files expected: $output"
else pass "T5 upper case and prefix are caught"; fi

# T6: an empty or missing denylist fails closed
repo="$(make_repo src/Clean.java 'class C {}')"
run "$(denylist "" "   ")" "$repo"
if [ "$status" -ne 1 ]; then fail "T6 empty denylist: expected exit 1, got $status"
else pass "T6 empty denylist fails"; fi
run "/nonexistent/denylist" "$repo"
if [ "$status" -ne 1 ]; then fail "T6 missing denylist: expected exit 1, got $status"
else pass "T6 missing denylist fails"; fi

# T10: CRLF line endings and spaces around values still match (a hand-filled secret)
crlf="$(mktemp)"
printf '  %s  \r\n' "$LISTED_ID" "$LISTED_PREFIX" > "$crlf"
repo="$(make_repo src/Test.java "String id = \"$LISTED_ID\";")"
run "$crlf" "$repo"
if [ "$status" -ne 1 ]; then fail "T10 CRLF denylist: expected exit 1, got $status"
else pass "T10 CRLF denylist still matches"; fi

# T11: a git grep error fails the check instead of reading as "no matches"
run "$list" "$(mktemp -d)"
if [ "$status" -ne 1 ]; then fail "T11 not a git repo: expected exit 1, got $status"
else pass "T11 git grep error fails"; fi

[ "$failures" -eq 0 ] && echo "all passed" || { echo "$failures failed"; exit 1; }
