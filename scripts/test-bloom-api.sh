#!/usr/bin/env bash
#
# Probe the Bloom Growth API endpoints that BloomBoard relies on, so we can
# confirm the real paths and payload shapes against your account.
#
# Usage:
#   ./scripts/test-bloom-api.sh                 # prompts for email + password
#   BLOOM_TOKEN=xxx ./scripts/test-bloom-api.sh # reuse an existing bearer token
#
# Nothing is written to disk; the token is only held in a shell variable for
# the duration of the run. Requires: curl, and `jq` for pretty output (falls
# back to head if jq is missing).
#
set -uo pipefail

BASE="${BLOOM_API_BASE_URL:-https://app.bloomgrowth.com}"

# --- pretty printers --------------------------------------------------------
have_jq() { command -v jq >/dev/null 2>&1; }
snippet() {
  # Print a short, readable snippet of a JSON body on stdin.
  if have_jq; then
    jq -C '.' 2>/dev/null | head -n 25 || head -c 500
  else
    head -c 500
  fi
}

# --- get a token ------------------------------------------------------------
if [[ -z "${BLOOM_TOKEN:-}" ]]; then
  read -r -p "Bloom email: " EMAIL
  read -r -s -p "Bloom password: " PASSWORD; echo
  echo "→ POST ${BASE}/Token"
  RESP="$(curl -sS -X POST \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H 'Accept: application/json' \
    --data-urlencode "grant_type=password" \
    --data-urlencode "userName=${EMAIL}" \
    --data-urlencode "password=${PASSWORD}" \
    "${BASE}/Token")"
  BLOOM_TOKEN="$(printf '%s' "$RESP" | (have_jq && jq -r '.access_token // empty' || sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'))"
  if [[ -z "$BLOOM_TOKEN" ]]; then
    echo "✗ Could not get a token. Raw response:"; printf '%s\n' "$RESP" | snippet
    exit 1
  fi
  echo "✓ Got a token (${#BLOOM_TOKEN} chars)."
fi

AUTH=(-H "Authorization: Bearer ${BLOOM_TOKEN}" -H "Accept: application/json")

# --- probe a GET endpoint ---------------------------------------------------
probe() {
  local label="$1" path="$2"
  echo
  echo "──────────────────────────────────────────────────────────────"
  echo "▶ ${label}"
  echo "  GET ${path}"
  local body code
  body="$(curl -sS "${AUTH[@]}" -w $'\n%{http_code}' "${BASE}${path}")"
  code="$(printf '%s' "$body" | tail -n1)"
  body="$(printf '%s' "$body" | sed '$d')"
  echo "  HTTP ${code}"
  printf '%s\n' "$body" | snippet
}

probe "Current user"            "/api/v1/users/mine"
probe "My rocks (+milestones)"  "/api/v1/rocks/user/mine"
probe "My to-dos"               "/api/v1/todos/user/mine"
probe "My issues (IDS)"         "/api/v1/issues/user/mine"
probe "Scorecard (known-good)"  "/api/v1/scorecard/user/mine"

echo
echo "──────────────────────────────────────────────────────────────"
echo "Done. What to look for:"
echo "  • Which paths returned HTTP 200 vs 404 (404 = wrong path)."
echo "  • In 'My rocks', whether each rock has a 'Milestones' array, and"
echo "    what the milestone completion field is called (Complete? Done?)."
echo "  • The casing of fields (PascalCase vs camelCase)."
echo "Paste the output back and I'll lock endpoints.ts to the real shapes."
