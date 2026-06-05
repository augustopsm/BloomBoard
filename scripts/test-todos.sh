#!/usr/bin/env bash
#
# Find the correct Bloom endpoint for the current user's To-Dos (and Issues).
# /api/v1/todos/user/mine returned an empty body in earlier testing, so this
# tries several variants and prints the raw response for each.
#
# Usage:
#   ./scripts/test-todos.sh                 # prompts for email + password
#   BLOOM_TOKEN=xxx ./scripts/test-todos.sh # reuse a bearer token
#
set -uo pipefail
BASE="${BLOOM_API_BASE_URL:-https://app.bloomgrowth.com}"
have_jq() { command -v jq >/dev/null 2>&1; }
snippet() { if have_jq; then jq -C '.' 2>/dev/null | head -n 25 || head -c 800; else head -c 800; fi; }

if [[ -z "${BLOOM_TOKEN:-}" ]]; then
  read -r -p "Bloom email: " EMAIL
  read -r -s -p "Bloom password: " PASSWORD; echo
  BLOOM_TOKEN="$(curl -sS -X POST -H 'Content-Type: application/x-www-form-urlencoded' -H 'Accept: application/json' \
    --data-urlencode "grant_type=password" --data-urlencode "userName=${EMAIL}" --data-urlencode "password=${PASSWORD}" \
    "${BASE}/Token" | (have_jq && jq -r '.access_token // empty' || sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'))"
  [[ -z "$BLOOM_TOKEN" ]] && { echo "✗ no token"; exit 1; }
  echo "✓ token ok"
fi
AUTH=(-H "Authorization: Bearer ${BLOOM_TOKEN}" -H "Accept: application/json")

# User id, for the /user/{id} variants.
UID_VAL="$(curl -sS "${AUTH[@]}" "${BASE}/api/v1/users/mine" | (have_jq && jq -r '.Id // empty' || sed -n 's/.*"Id":\([0-9]*\).*/\1/p' | head -n1))"
echo "User Id: ${UID_VAL:-<unknown>}"

probe() {
  echo; echo "──────────────────────────────────────────────"
  echo "  GET $1"
  local body code
  body="$(curl -sS "${AUTH[@]}" -w $'\n%{http_code}' "${BASE}$1")"
  code="$(printf '%s' "$body" | tail -n1)"; body="$(printf '%s' "$body" | sed '$d')"
  local len=${#body}
  echo "  HTTP ${code}   (body length: ${len})"
  printf '%s\n' "$body" | snippet
}

echo; echo "### TO-DOS ###"
probe "/api/v1/todos/user/mine"
probe "/api/v1/todos/user/mine?resolved=false"
probe "/api/v1/todos"
[[ -n "${UID_VAL:-}" ]] && probe "/api/v1/todos/user/${UID_VAL}"
probe "/api/v1/users/mine/todos"

echo; echo "### ISSUES (IDS) ###"
probe "/api/v1/issues/user/mine"
[[ -n "${UID_VAL:-}" ]] && probe "/api/v1/issues/user/${UID_VAL}"
probe "/api/v1/issues"

echo; echo "──────────────────────────────────────────────"
echo "Report the path that returns a non-empty array (body length > 2) and what"
echo "the fields are called (Name, Complete/Status, DueDate). I'll point the app"
echo "at it and map the fields."
