#!/usr/bin/env bash
# scripts/sync-bin.sh — sync rihal/bin/ → .rihal/bin/ for self-development.
#
# .rihal/bin/ is gitignored and normally seeded by `rihal-code install`. When
# developing rihal-code itself, edits to rihal/bin/ (the source) don't auto-
# propagate to .rihal/bin/ (the runtime copy that workflows call), so changes
# silently don't take effect. Run this after editing anything under rihal/bin/.
#
# Detected automatically by scripts/dogfood-check.sh — if drift exists, that
# gate fails until you run this.

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -d .rihal/bin ]; then
  echo "✗ .rihal/bin/ doesn't exist — run rihal-code install first."
  exit 1
fi

cp -r rihal/bin/. .rihal/bin/
echo "✓ Synced rihal/bin/ → .rihal/bin/"
