# Audit — Diwan dashboard per-task actions + results (#905)

## Goal
The Diwan dashboard showed task *status* but not **what each task actually did**.
This change adds per-task execution transparency (RuFlo-GOAP-style): each task row
can expand to show the ordered **actions performed** and the **result/outcome**.

## Where the data came from (no new sources, view-only)
Each `<task>` block in `.planning/phases/**/NN-N-SPRINT.md` already contains:
- `<action>` — the ordered, numbered steps the task performs.
- `<done>` — the one-line outcome/result of the task.

The scanner previously parsed only `id`, `title`, `status`, and `acceptance` from
these blocks. This change reads the `<action>` and `<done>` text that was *already
loaded into memory* during the same parse — no new files, no new endpoints, no writes.

## Changes
1. **`server/lib/scanner.js`**
   - Added `parseActionSteps(raw)` — splits a numbered `<action>` block into an
     ordered string[] (one collapsed line per step); falls back to non-empty lines.
   - In `buildPhaseTree`'s `<task>` parse loop, extract `<action>` → `story.actions`
     (string[]) and `<done>` → `story.outcome` (string). Both omitted when absent.
   - These fields flow unchanged through the existing `phaseTree` → `allTasks()`
     path (same path that already surfaces `acceptance`).

2. **`server/lib/html/client/components/shared.js`** (`TaskCard`)
   - In the existing expanded `.task-detail` section, render an "Actions performed"
     ordered list (`t.actions`) and a "Result" callout (`t.outcome`), each guarded so
     tasks without the data render exactly as before.
   - No new deps, no React.FC, no inline `style=` for the new markup (CSS classes only).

3. **`server/lib/html/css.js`**
   - Added `.task-actions`, `.task-actions-title`, `.task-actions-list`,
     `.task-action-step`, `.task-outcome`, `.task-outcome-label`, `.task-outcome-text`
     using existing design tokens (`--space-*`, `--accent-green`, `--bg-elev-2`,
     `--border-subtle`, `--radius-4`).

## Constraints honoured
- View-only: NO write endpoints, NO POST handlers, NO DB code added.
- `server/dashboard.js` untouched; stays pure Node stdlib, dependency-free, single-file.
- Client stays dependency-free Preact. No new deps (`package.json` byte-identical).
- Incremental: existing TaskCard / scanner logic preserved; only additive changes.

## Verification
- `node --input-type=module --check < server/lib/html/client/components/shared.js` → OK.
- `node --check server/lib/scanner.js` → OK.
- Scanner smoke test against this repo's `.planning/`: 170 tasks parsed; 86 carry
  `actions`, 83 carry `outcome` (e.g. task `29.1.1` → 3 steps + outcome).
- `node server/dashboard.js` boots cleanly on port 7717 (orchestrator on 7718),
  no errors; process killed after confirming startup.
- `git status` shows only the 3 intended source files modified; no lockfile or
  `package.json` changes.
</content>
</invoke>
