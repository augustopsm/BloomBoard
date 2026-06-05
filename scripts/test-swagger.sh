#!/usr/bin/env bash
#
# Fetch the Bloom Swagger/OpenAPI spec (which lists EVERY endpoint) and print
# the real paths — focusing on to-dos, issues, meetings, headlines, rocks.
# This ends the guessing: the spec is the source of truth.
#
# Usage:
#   ./scripts/test-swagger.sh
#   BLOOM_TOKEN=xxx ./scripts/test-swagger.sh
#
set -uo pipefail
BASE="${BLOOM_API_BASE_URL:-https://app.bloomgrowth.com}"
command -v jq >/dev/null 2>&1 || { echo "✗ needs jq (brew install jq)"; exit 1; }

if [[ -z "${BLOOM_TOKEN:-}" ]]; then
  read -r -p "Bloom email: " EMAIL
  read -r -s -p "Bloom password: " PASSWORD; echo
  BLOOM_TOKEN="$(curl -sS -X POST -H 'Content-Type: application/x-www-form-urlencoded' -H 'Accept: application/json' \
    --data-urlencode "grant_type=password" --data-urlencode "userName=${EMAIL}" --data-urlencode "password=${PASSWORD}" \
    "${BASE}/Token" | jq -r '.access_token // empty')"
  [[ -z "$BLOOM_TOKEN" ]] && { echo "✗ no token"; exit 1; }
  echo "✓ token ok"
fi
AUTH=(-H "Authorization: Bearer ${BLOOM_TOKEN}" -H "Accept: application/json")

SPEC=""
for url in \
  "/swagger/v1/swagger.json" \
  "/swagger/docs/v1" \
  "/swagger/swagger.json" \
  "/swagger/v1/swagger.yaml" \
  "/api/swagger/v1/swagger.json" ; do
  body="$(curl -sS "${AUTH[@]}" "${BASE}${url}")"
  first="$(printf '%s' "$body" | sed -e 's/^[[:space:]]*//' | cut -c1)"
  if [[ "$first" == "{" ]] && printf '%s' "$body" | jq -e '.paths' >/dev/null 2>&1; then
    echo "✓ spec found at: ${url}"
    SPEC="$body"
    break
  else
    echo "✗ not a spec: ${url}"
  fi
done

[[ -z "$SPEC" ]] && {
  echo
  echo "Couldn't find the spec JSON automatically. Open this in your browser"
  echo "while logged in and tell me the URL it loads in the Network tab:"
  echo "  ${BASE}/swagger/index.html"
  exit 1
}

echo
echo "### Total endpoints in spec ###"
printf '%s' "$SPEC" | jq -r '.paths | keys | length'

echo
echo "### Paths matching todo / issue / meeting / l10 / headline ###"
printf '%s' "$SPEC" | jq -r '.paths | keys[]' | grep -iE 'todo|issue|meeting|l10|headline' || echo "(none matched)"

echo
echo "### ALL paths (for reference) ###"
printf '%s' "$SPEC" | jq -r '.paths | keys[]'

echo
echo "Paste the matching paths (and ideally the full list). That's the truth —"
echo "I'll wire the app exactly to those."
