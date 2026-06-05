#!/usr/bin/env bash
#
# Dev server that auto-syncs with the remote branch. Run this once and leave it
# open: it starts Next.js (which hot-reloads on file changes) AND polls the
# remote every 15s, fast-forwarding to any new commits. When new code is pushed
# the working tree updates and Next hot-reloads — no manual pull/restart.
#
# Usage:  npm run dev:sync     (or: ./scripts/dev-sync.sh)
#
# Notes:
#   • Only fast-forward merges are applied, so local edits are never clobbered.
#   • Changes to next.config / new dependencies still need a manual restart.
#
set -uo pipefail

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "🔄 Auto-sync enabled on branch: ${BRANCH} (polling every 15s)"

# Background poller: fetch + fast-forward only.
(
  while true; do
    sleep 15
    if git fetch origin "$BRANCH" --quiet 2>/dev/null; then
      LOCAL="$(git rev-parse HEAD)"
      REMOTE="$(git rev-parse "origin/${BRANCH}" 2>/dev/null || echo "$LOCAL")"
      if [[ "$LOCAL" != "$REMOTE" ]]; then
        if git merge --ff-only "origin/${BRANCH}" --quiet 2>/dev/null; then
          echo "✅ [sync] pulled new commits — Next.js will hot-reload"
        else
          echo "⚠️  [sync] can't fast-forward (local commits diverged); skipping"
        fi
      fi
    fi
  done
) &
SYNC_PID=$!

# Make sure the poller dies when the dev server stops (Ctrl+C).
trap 'kill "$SYNC_PID" 2>/dev/null' EXIT INT TERM

# Pull once up front, then hand off to Next.js (foreground).
git merge --ff-only "origin/${BRANCH}" --quiet 2>/dev/null || true
exec npx next dev
