---
sprint: 43.1
status: executed
commit: e07f0ee
branch: 42-ambient-adoption
---

# Sprint 43.1 — SUMMARY

## Outcome

All 4 stories delivered. Two files changed. Commit `e07f0ee` on branch `42-ambient-adoption`.

## Stories

| ID | Title | Result |
|----|-------|--------|
| 43.1.01 | Verify live anchors | Confirmed: bin block ends L1311, filter at L1420, gitignore at L890, sync hook case at L16. `rcode/data/intent-table.json` present at source. |
| 43.1.02 | Add .rcode/data/ copy block to install plan | Done. Block inserted after bin block at L1312–1315. |
| 43.1.03 | Add .rcode/data/ passthrough to module filter and gitignore | Done. Filter passthrough added at L1422. Gitignore entry `'.rcode/data/'` added at L891. |
| 43.1.04 | Extend sync hook to watch rcode/data/ edits | Done. New `*/rcode/data/*` case with `mkdir -p` guard added. |

## Verify Results (all exit 0)

- `node --check cli/install.js` — OK
- `grep -q "SOURCE_ROOT, 'data'" cli/install.js` — copy-block OK
- Node one-liner: plan entry OK: `.rcode/data/intent-table.json`
- `grep -q "'.rcode', 'data'" cli/install.js` — module-filter OK
- `grep -q "'.rcode/data/'" cli/install.js` — gitignore-entry OK
- `bash -n .claude/hooks/sync-bin-on-edit.sh` — syntax OK
- `grep -q 'rcode/data' .claude/hooks/sync-bin-on-edit.sh` — data-case OK
- `grep -q 'mkdir -p' .claude/hooks/sync-bin-on-edit.sh` — mkdir-guard OK
- `grep -q 'set -e' .claude/hooks/sync-bin-on-edit.sh` — set-e OK

## Dry-install confirmation

The node one-liner confirms `.rcode/data/intent-table.json` is produced by the copy block (plan entry `rel: '.rcode/data/intent-table.json'`).

## Sync hook runtime copies

The `.rcode/bin/` runtime copies were not touched by the hook during this sprint (no `rcode/bin/` files were edited). The `rcode-hooks.cjs` and `rcode-tools.cjs` files in `.rcode/bin/` were not modified — consistent with the hard scope constraint.

## Notes

- `rcode-hooks.cjs` was not touched (fail-open wrap from Phase 42 was already in place).
- `cli/update.js` was not touched — it delegates to the same `buildInstallPlan` function, so it inherits the data copy block automatically.
- No `.rcode/*` runtime copies were modified by the sync hook during execution (no `rcode/data/` source edits triggered the case).
