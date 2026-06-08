#!/usr/bin/env bash
#
# Verify the Milestone-type-todo filter against the LIVE Bloom API.
#
# Bloom auto-creates a Todo with TodoType=2 ("Milestone") when a milestone is
# un-completed. The board filters these out (see getTodos in service.ts). This
# script fetches your real to-dos and prints the TodoType distribution so you
# can confirm: the count we DROP here should match the phantom "milestone
# clones" you saw on the board before the fix.
#
# Usage:
#   ./scripts/test-todo-types.sh                 # prompts for email + password
#   BLOOM_TOKEN=xxx ./scripts/test-todo-types.sh # reuse a bearer token
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

BODY="$(curl -sS "${AUTH[@]}" "${BASE}/api/v1/todo/users/mine")"
first="$(printf '%s' "$BODY" | sed -e 's/^[[:space:]]*//' | cut -c1)"
[[ "$first" != "[" && "$first" != "{" ]] && { echo "✗ non-JSON response from /api/v1/todo/users/mine"; exit 1; }

echo
echo "### Total to-dos returned by Bloom ###"
printf '%s' "$BODY" | jq 'length'

echo
echo "### Count by TodoType (0=Recurrence, 1=Personal, 2=Milestone) ###"
printf '%s' "$BODY" | jq -r 'group_by(.TodoType)[] | "TodoType=\(.[0].TodoType)  →  \(length)"'

echo
echo "### Milestone-type todos (these are DROPPED from the board) ###"
printf '%s' "$BODY" | jq -r '[.[] | select(.TodoType == 2 or (.TodoType | tostring | ascii_downcase) == "milestone")] | "count: \(length)"'
printf '%s' "$BODY" | jq -r '.[] | select(.TodoType == 2 or (.TodoType | tostring | ascii_downcase) == "milestone") | "  • \(.Name)  (Origin: \(.Origin // "—"))"'

echo
echo "### Real to-dos KEPT on the board ###"
printf '%s' "$BODY" | jq -r '[.[] | select(.TodoType != 2 and (.TodoType | tostring | ascii_downcase) != "milestone")] | "count: \(length)"'

echo
echo "──────────────────────────────────────────────"
echo "If 'DROPPED' count matches the phantom milestone clones you saw, the fix"
echo "is working. The 'KEPT' list is exactly what the board now shows as To-Dos."
