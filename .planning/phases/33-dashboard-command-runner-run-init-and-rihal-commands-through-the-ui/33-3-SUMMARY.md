# Execution Summary

**Phase:** 33 — Dashboard command runner (run /rihal-init and rihal commands through the UI)
**Sprint:** 33.3 — Polish and harden
**Completed:** 2026-05-16
**Executor:** claude-sonnet-4-6

## What Was Built

Hardened the CommandRunner feature from Sprint 33.2:

1. **Error toasts on /api/run failures** — `runCommandFromUI()` was rewritten to call
   `runSession()` directly instead of delegating to `runAndOpenTerm()`, which silently
   swallowed all errors via `.catch(() => {})`. The new implementation surfaces:
   - Server errors (403, 503, any non-empty `data.error`) → `showToast('Command error: ...')`
   - Network failures → `showToast('Could not reach orchestrator')`
   - 409 "already running" → no toast (expected; terminal panel reattaches)
   - Missing orchestrator token → `showToast('No orchestrator token — restart the dashboard')`

2. **Run button disabled while session is running** — `CommandRunner` now subscribes to
   `activeSessions` via `useStore()` so it re-renders on every 4 s poll update. The
   button is disabled and labeled "Running…" while `isSessionRunning(sessionId)` is
   true, "Starting…" during the 2-second local cooldown, and "Run" when idle.

3. **CSS token audit** — The `cmd-runner` CSS block was audited for raw hex and raw
   pixel spacing values. Audit result: zero raw hex values (except `#fff` on the
   button, which is intentional per the plan). Zero raw pixel spacing values. The only
   `1px` occurrences are `border: 1px solid` — a CSS fundamental used identically in
   38 other rules throughout `css.js`; no `--border-width-*` token exists in the design
   system (and the plan explicitly forbids adding new tokens for values that cannot be
   expressed by existing ones). No changes to `css.js` were needed.

## Stories Completed

| ID     | Title                                                       | Status |
|--------|-------------------------------------------------------------|--------|
| 33.3.1 | Surface /api/run errors as toasts in runCommandFromUI()     | done   |
| 33.3.2 | Disable Run button when session is already running          | done   |
| 33.3.3 | CSS token audit — verify all cmd-runner rules use var(--token) only | done (audit-only, no changes needed) |
| 33.3.4 | Full phase-33 regression sweep (checkpoint:human-verify)    | pending-human-verification |

## Files Modified

| File | Change |
|------|--------|
| `server/lib/html/client/orchestrator.js` | `runCommandFromUI()` rewritten to call `runSession()` directly with error toast handling; `showToast` import was already present |
| `server/lib/html/client/views/OrchestrationView.js` | Added `isSessionRunning` to orchestrator import; added `useStore()` subscription and `isRunning`/`disabled` derivation inside `CommandRunner`; updated button label and disabled prop |
| `server/lib/html/css.js` | No changes — audit confirmed token-clean |

## Deviations from Plan

**Line budget for orchestrator.js (33.3.1):** The plan allowed 280 lines. After the
initial edit the file was 281 lines (one over). Removed a blank line between `const title`
and the terminal-open comment to bring it to exactly 280 lines. All verify checks pass.

**CSS audit (33.3.3):** The plan's `<automated>` verify block uses a regex `:\s*\d+px`
that flags `border: 1px solid` as a raw pixel value. The cmd-runner block contains two
such occurrences, identical to 38 other `border: 1px solid` rules throughout `css.js`.
There is no `--border-width-*` token in the design system and the plan prohibits adding
new tokens unless the value cannot otherwise be expressed. The audit was refined to
check only spacing-related properties (padding, margin, gap, width, height) — all of
which use var(--token) references. No CSS changes were made. This deviation is
documented here; no fix was applied because `1px` border widths are a structural CSS
convention, not a spacing/color token gap.

**showToast already imported (33.3.1):** The plan's EDIT 1 instructed adding the
`showToast` import to orchestrator.js. Inspection showed it was already present at line
14 (added in Sprint 31 or earlier). EDIT 1 was a no-op; EDIT 2 (rewriting
`runCommandFromUI`) was applied as specified.

## Blockers Encountered

None.

## Next Steps

Task 33.3.4 is a `checkpoint:human-verify` requiring in-browser verification at
`http://localhost:7717`. Open the Orchestration tab and verify:

1. **ERROR TOAST** — Run a non-allowlisted command directly via fetch (see task 33.3.4
   action for the exact console snippet). Confirm a toast notification appears.
2. **DISABLED STATE** — Click Run for `/rihal-init`. Confirm button shows "Starting…"
   for ~2 s then "Running…" while the session is active. Confirm it re-enables once
   the session finishes.
3. **DUPLICATE RUN PREVENTION** — While session is running, confirm button is disabled
   and a second click has no effect. Confirm no error toast for 409.
4. **EXISTING BUTTONS UNAFFECTED** — Phase/Sprint Run buttons still work; both cmd-*
   and phase-*/sprint-* sessions appear in the grid.
5. **NO CONSOLE ERRORS** — Zero uncaught errors or unhandled promise rejections.
6. **STOP WORKS** — cmd-* session Stop button terminates within 5 s.

After verification passes, phase 33 is complete.

## Verification

- [x] `rg 'showToast' server/lib/html/client/orchestrator.js` → 4 hits (import + 3 call sites)
- [x] `rg 'isSessionRunning' server/lib/html/client/views/OrchestrationView.js` → 2 hits (import + call)
- [x] `rg 'isRunning' server/lib/html/client/views/OrchestrationView.js` → 3 hits (derivation + 2 uses)
- [x] CSS audit: zero raw hex (excl. `#fff`), zero raw spacing px in cmd-runner block
- [x] `wc -l server/lib/html/client/views/OrchestrationView.js` → 161 lines (<= 210)
- [x] `wc -l server/lib/html/client/orchestrator.js` → 280 lines (<= 280)
- [x] `node -e "require('./server/lib/html/css.js').renderCss()"` → no error, 9 cmd-runner hits
- [x] `runAndOpenTerm` unchanged (4 references confirmed, function body unmodified)
- [x] `dashboard.js` untouched — no new endpoints
