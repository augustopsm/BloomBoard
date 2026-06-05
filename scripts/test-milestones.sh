#!/usr/bin/env bash
#
# Find where Bloom serves a rock's milestones. Rocks from
# /api/v1/rocks/user/mine do NOT embed a Milestones array, so this probes the
# likely candidates against your first rock.
#
# Usage:
#   ./scripts/test-milestones.sh                  # prompts for email + password
#   BLOOM_TOKEN=xxx ./scripts/test-milestones.sh  # reuse a bearer token
#
set -uo pipefail
BASE="${BLOOM_API_BASE_URL:-https://app.bloomgrowth.com}"
have_jq() { command -v jq >/dev/null 2>&1; }
snippet() { if have_jq; then jq -C '.' 2>/dev/null | head -n 30 || head -c 700; else head -c 700; fi; }

if [[ -z "${BLOOM_TOKEN:-}" ]]; then
  read -r -p "Bloom email: " EMAIL
  read -r -s -p "Bloom password: " PASSWORD; echo
  RESP="$(curl -sS -X POST -H 'Content-Type: application/x-www-form-urlencoded' -H 'Accept: application/json' \
    --data-urlencode "grant_type=password" --data-urlencode "userName=${EMAIL}" --data-urlencode "password=${PASSWORD}" \
    "${BASE}/Token")"
  BLOOM_TOKEN="$(printf '%s' "$RESP" | (have_jq && jq -r '.access_token // empty' || sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'))"
  [[ -z "$BLOOM_TOKEN" ]] && { echo "✗ no token"; printf '%s\n' "$RESP" | snippet; exit 1; }
  echo "✓ token ok"
fi
AUTH=(-H "Authorization: Bearer ${BLOOM_TOKEN}" -H "Accept: application/json")

# Grab the first rock id.
ROCKS="$(curl -sS "${AUTH[@]}" "${BASE}/api/v1/rocks/user/mine")"
if have_jq; then ROCK_ID="$(printf '%s' "$ROCKS" | jq -r '.[0].Id // empty')"
else ROCK_ID="$(printf '%s' "$ROCKS" | sed -n 's/.*"Id":\([0-9]*\).*/\1/p' | head -n1)"; fi
[[ -z "$ROCK_ID" ]] && { echo "✗ couldn't read a rock id"; exit 1; }
echo "Using rock Id: ${ROCK_ID}"

probe() {
  echo; echo "──────────────────────────────────────────────"
  echo "▶ $1"; echo "  GET $2"
  local body code
  body="$(curl -sS "${AUTH[@]}" -w $'\n%{http_code}' "${BASE}$2")"
  code="$(printf '%s' "$body" | tail -n1)"; body="$(printf '%s' "$body" | sed '$d')"
  echo "  HTTP ${code}"
  printf '%s\n' "$body" | snippet
}

probe "Rock detail (may embed Milestones)" "/api/v1/rocks/${ROCK_ID}"
probe "Milestones under rock"               "/api/v1/rocks/${ROCK_ID}/milestones"
probe "My milestones (top-level)"           "/api/v1/milestones/user/mine"

echo; echo "──────────────────────────────────────────────"
echo "Looking for: which path returns a list of milestones (HTTP 200 + array),"
echo "and the field names on a milestone (Name, Complete/Done, DueDate, Owner)."
