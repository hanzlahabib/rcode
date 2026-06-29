---
sprint: 42.3
status: complete
commit: 1040e57
ref: "#892"
---

# Sprint 42.3 Summary — Activate prompt-router + session-start hooks (dogfood)

## What shipped

**Story 42.3.01 — Merge UserPromptSubmit + SessionStart into `.claude/settings.json`** (5 pts, done)

Additive idempotent merge. The two existing dev hooks were preserved verbatim:
- `PreToolUse` → `.claude/hooks/block-unregistered-phase-writes.sh` (unchanged)
- `PostToolUse` → `.claude/hooks/sync-bin-on-edit.sh` (unchanged)

Two new hook types were added:
- `UserPromptSubmit` → `node .rcode/bin/rcode-hooks.cjs prompt-router`
- `SessionStart` → `node .rcode/bin/rcode-hooks.cjs session-start`

`$comment` updated to reference hooks (3) and (4) at #892/#947.

**Story 42.3.02 — Add `prompt_nudge` discovery stub to `.rcode/config.yaml`** (2 pts, done)

Appended four-line comment block at end of file. No active YAML keys added. Default behavior (`every`) unchanged since the key remains commented out.

**Story 42.3.03 — Smoke-test** (1 pt, done)

All three automated verify blocks passed:
- `session-start` exits 0, emits `{"systemMessage":"📍 Phase 35 executing · 0/2 sprints done · next: /rcode-execute"}`
- `prompt-router` exits 0 with planning prompt
- `Object.keys(j.hooks)` → `['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'SessionStart']`

## Deviation discovered and resolved

**Gap:** `.rcode/data/intent-table.json` was missing. The `INTENT_TABLE` constant in `rcode-hooks.cjs` is loaded at module level — without this file, ALL subcommands crash with `ENOENT` on invocation (exit 1). The `sync-bin-on-edit.sh` hook only syncs `rcode/bin/` to `.rcode/bin/`; no equivalent sync existed for `rcode/data/` → `.rcode/data/`.

**Fix:** Created `.rcode/data/` and copied `intent-table.json` from `rcode/data/`. Committed separately as `chore(bin)` at `1059a70`.

## Files changed

| File | Change |
|------|--------|
| `.claude/settings.json` | Added `UserPromptSubmit` and `SessionStart` blocks; updated `$comment` |
| `.rcode/config.yaml` | Appended commented `prompt_nudge` discovery stub |
| `.rcode/data/intent-table.json` | New — required by module-level INTENT_TABLE load in rcode-hooks.cjs |
| `.rcode/bin/rcode-hooks.cjs` | Auto-synced from rcode/bin (sprint 42.2 additions, now committed) |
| `.rcode/bin/rcode-tools.cjs` | Auto-synced from rcode/bin (sprint 42.2 additions, now committed) |

## Commits

| Hash | Message |
|------|---------|
| `1059a70` | chore(bin): sync .rcode/bin runtime copies and add intent-table data file (#892) |
| `1040e57` | feat(sprint): activate prompt-router + session-start hooks in dogfood repo (#892) |

## Verify results

```
all hooks present, dev hooks preserved          ✓  (story 42.3.01 automated check)
prompt_nudge stub present in config.yaml        ✓  (story 42.3.02 automated check)
session-start exits 0                           ✓  (story 42.3.03 automated check)
prompt-router exits 0                           ✓  (story 42.3.03 automated check)
OK: [ 'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'SessionStart' ]  ✓
```
