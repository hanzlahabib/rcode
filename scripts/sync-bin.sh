#!/usr/bin/env bash
# scripts/sync-bin.sh — sync rcode/bin/ → .rcode/bin/ for self-development.
#
# .rcode/bin/ is gitignored and normally seeded by `rcode install`. When
# developing rcode itself, edits to rcode/bin/ (the source) don't auto-
# propagate to .rcode/bin/ (the runtime copy that workflows call), so changes
# silently don't take effect. Run this after editing anything under rcode/bin/.
#
# Detected automatically by scripts/dogfood-check.sh — if drift exists, that
# gate fails until you run this.

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -d .rcode/bin ]; then
  echo "✗ .rcode/bin/ doesn't exist — run rcode install first."
  exit 1
fi

cp -r rcode/bin/. .rcode/bin/
echo "✓ Synced rcode/bin/ → .rcode/bin/"
