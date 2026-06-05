#!/usr/bin/env bash
#
# Determine the correct write contract for toggling a milestone's completion.
#
# ⚠️  This TEMPORARILY changes one milestone, then restores it. It:
#       1. reads your first rock's first milestone (full object),
#       2. flips its Status and PUTs the whole object back,
#       3. reads it back to see what actually changed,
#       4. restores the original Status.
#     Sending the full object (not a partial patch) avoids wiping other fields.
#
# Requires `jq`.  Usage:
#   ./scripts/test-milestone-write.sh
#   BLOOM_TOKEN=xxx ./scripts/test-milestone-write.sh
#
set -uo pipefail
BASE="${BLOOM_API_BASE_URL:-https://app.bloomgrowth.com}"
command -v jq >/dev/null 2>&1 || { echo "✗ this script needs jq (brew install jq)"; exit 1; }

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
JSON=(-H "Content-Type: application/json")

ROCK_ID="$(curl -sS "${AUTH[@]}" "${BASE}/api/v1/rocks/user/mine" | jq -r '.[0].Id // empty')"
[[ -z "$ROCK_ID" ]] && { echo "✗ no rock found"; exit 1; }
MILESTONE="$(curl -sS "${AUTH[@]}" "${BASE}/api/v1/rocks/${ROCK_ID}/milestones" | jq '.[0]')"
[[ "$MILESTONE" == "null" || -z "$MILESTONE" ]] && { echo "✗ rock ${ROCK_ID} has no milestones"; exit 1; }

MID="$(jq -r '.Id' <<<"$MILESTONE")"
ORIG_STATUS="$(jq -r '.Status' <<<"$MILESTONE")"
echo "Testing milestone ${MID} (current Status: ${ORIG_STATUS})"

# Flip to the opposite state.
if [[ "$ORIG_STATUS" == "Done" ]]; then NEW_STATUS="NotDone"; else NEW_STATUS="Done"; fi
FLIPPED="$(jq --arg s "$NEW_STATUS" '.Status = $s' <<<"$MILESTONE")"

read_status() { curl -sS "${AUTH[@]}" "${BASE}/api/v1/rocks/${ROCK_ID}/milestones" | jq -r --arg id "$MID" '.[] | select((.Id|tostring)==$id) | .Status'; }

try_put() {
  local label="$1" path="$2" body="$3"
  echo; echo "── ${label}"; echo "   PUT ${path}"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT "${AUTH[@]}" "${JSON[@]}" -d "$body" "${BASE}${path}")"
  echo "   HTTP ${code} → Status now: $(read_status)"
}

echo "→ Attempting to set Status='${NEW_STATUS}' via full-object PUT…"
try_put "candidate A: /api/v1/milestones/{id}"             "/api/v1/milestones/${MID}"                       "$FLIPPED"
try_put "candidate B: /api/v1/rocks/{rid}/milestones/{id}" "/api/v1/rocks/${ROCK_ID}/milestones/${MID}"      "$FLIPPED"

echo; echo "→ Restoring original Status='${ORIG_STATUS}'…"
ORIG_BODY="$(jq --arg s "$ORIG_STATUS" '.Status = $s' <<<"$MILESTONE")"
curl -sS -o /dev/null -w '   /api/v1/milestones/{id} restore → HTTP %{http_code}\n' \
  -X PUT "${AUTH[@]}" "${JSON[@]}" -d "$ORIG_BODY" "${BASE}/api/v1/milestones/${MID}"
curl -sS -o /dev/null -w '   /rocks/{rid}/milestones/{id} restore → HTTP %{http_code}\n' \
  -X PUT "${AUTH[@]}" "${JSON[@]}" -d "$ORIG_BODY" "${BASE}/api/v1/rocks/${ROCK_ID}/milestones/${MID}"
echo "   Final Status: $(read_status)  (should be ${ORIG_STATUS})"

echo
echo "Report which candidate changed the Status to '${NEW_STATUS}' (HTTP 200/204"
echo "and the read-back reflecting the change). That's the write contract — paste"
echo "it back and I'll wire setMilestoneComplete to exactly that path + body."
echo "If 'Final Status' isn't '${ORIG_STATUS}', tell me and I'll help fix it."
