#!/usr/bin/env bash
#
# Discover where Bloom serves To-Dos and Issues. Earlier probes showed
# /api/v1/todos and /api/v1/issues return the SPA's HTML (the routes don't
# exist), so to-dos/issues are likely scoped to a meeting (Weekly/L10).
#
# This finds your meeting(s), then probes to-do/issue paths — and classifies
# every response as JSON or HTML so real endpoints are obvious.
#
# Usage:
#   ./scripts/test-discover.sh
#   BLOOM_TOKEN=xxx ./scripts/test-discover.sh
#
set -uo pipefail
BASE="${BLOOM_API_BASE_URL:-https://app.bloomgrowth.com}"
have_jq() { command -v jq >/dev/null 2>&1; }

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

# Probe a path; classify body as JSON (real API) or HTML (SPA fallback).
# Echoes a captured JSON body to stdout via the global REPLY_BODY.
REPLY_BODY=""
probe() {
  local path="$1"
  local body code first kind
  body="$(curl -sS "${AUTH[@]}" -w $'\n%{http_code}' "${BASE}${path}")"
  code="$(printf '%s' "$body" | tail -n1)"; body="$(printf '%s' "$body" | sed '$d')"
  first="$(printf '%s' "$body" | sed -e 's/^[[:space:]]*//' | cut -c1)"
  if [[ "$first" == "[" || "$first" == "{" ]]; then kind="JSON ✅"; REPLY_BODY="$body"; else kind="HTML/SPA ✗"; REPLY_BODY=""; fi
  printf '  %-50s HTTP %s  %s\n' "$path" "$code" "$kind"
}

dump() { if have_jq; then printf '%s' "$1" | jq -C '.' 2>/dev/null | head -n 30; else printf '%s\n' "${1:0:800}"; fi; }

echo; echo "### Find meetings (L10) ###"
MEETING_ID=""
for p in \
  "/api/v1/L10/user/mine" \
  "/api/v1/L10/mine" \
  "/api/v1/meetings/user/mine" \
  "/api/v1/meetings/mine" \
  "/api/v1/users/mine/meetings" \
  "/api/v1/L10" ; do
  probe "$p"
  if [[ -n "$REPLY_BODY" && -z "$MEETING_ID" ]] && have_jq; then
    MEETING_ID="$(printf '%s' "$REPLY_BODY" | jq -r 'if type=="array" then .[0].Id else .Id end // empty' 2>/dev/null)"
    [[ -n "$MEETING_ID" ]] && { echo "    → found meeting Id: ${MEETING_ID}"; echo "    sample:"; dump "$REPLY_BODY"; }
  fi
done

echo; echo "### To-Do paths ###"
TODO_CANDIDATES=(
  "/api/v1/todos/user/mine"
  "/api/v1/todo/user/mine"
)
[[ -n "$MEETING_ID" ]] && TODO_CANDIDATES+=(
  "/api/v1/L10/${MEETING_ID}/todos"
  "/api/v1/meetings/${MEETING_ID}/todos"
)
for p in "${TODO_CANDIDATES[@]}"; do
  probe "$p"; [[ -n "$REPLY_BODY" ]] && { echo "    sample:"; dump "$REPLY_BODY"; }
done

echo; echo "### Issue (IDS) paths ###"
ISSUE_CANDIDATES=( "/api/v1/issues/user/mine" )
[[ -n "$MEETING_ID" ]] && ISSUE_CANDIDATES+=(
  "/api/v1/L10/${MEETING_ID}/issues"
  "/api/v1/meetings/${MEETING_ID}/issues"
)
for p in "${ISSUE_CANDIDATES[@]}"; do
  probe "$p"; [[ -n "$REPLY_BODY" ]] && { echo "    sample:"; dump "$REPLY_BODY"; }
done

echo; echo "──────────────────────────────────────────────"
echo "Paths marked 'JSON ✅' are real. Paste this whole output; I'll wire the"
echo "app to the JSON ones and map their fields."
