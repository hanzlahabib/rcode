# Phase 33 — Sprint Plan Check

**Verdict:** pass-with-fixes
**Checked:** 2026-05-16
**Checker:** rihal-sprint-checker
**Plans:** 33-1, 33-2, 33-3 (3 sequential sprints, 3 waves)

## Result

All 3 SPRINT.md plans verified against the actual codebase. Four issues were found
(2 blockers, 1 warning, 1 evidence tool violation). All were fixed in-plan before
execution. After fixes, `plan validate-evidence` returns ok=true, 11/11 tasks
passed, 0 violations.

The critical concern — whether the allowlist gate breaks existing Run buttons — was
confirmed as a real BLOCKER in the original plan and corrected. The fix changes the
gate discriminant from `body.cmd &&` (which fires for all callers) to
`storyId.startsWith('cmd-')` (which fires only for command-runner sessions).

## Issues found and resolved in-plan

| Severity | Issue | File:line | Resolution |
|----------|-------|-----------|------------|
| BLOCKER | Allowlist gate fires on ALL existing Run buttons. The original guard `if (body.cmd && !COMMAND_ALLOWLIST.has(...))` assumed existing calls omit body.cmd. In reality, `RunBtn` (shared.js:154), `runStory` (orchestrator.js:212), `SprintCard` (shared.js:237), and `PhaseCard` (shared.js:190) all call `runAndOpenTerm(storyId, cmd, title)` which calls `runSession(storyId, cmd)` → POST with body.cmd always present. Commands sent are `/rihal-execute`, `/rihal-execute-sprint <id>`, `/rihal-dev-story <id>` — none in the allowlist. All existing Run buttons would receive HTTP 403 after sprint 33.1. | 33-1-SPRINT.md:99-106 | Changed gate to `if (storyId.startsWith('cmd-') && body.cmd && !COMMAND_ALLOWLIST.has(...))`. Command-runner sessions always set storyId = "cmd-" + slug. Existing dev-run sessions use phase-*, sprint-*, or raw task IDs — never cmd-*. This is the authoritative discriminant. Updated verify block, done section, smoke test (33.1.2), human-verify task (33.1.3), verification block, and success_criteria accordingly. |
| BLOCKER | `loader` icon does not exist in icons.js or icons-client.js. Sprint 33.2.2 and 33.3.2 use `<${Icon} name="loader" .../>` in the Run button busy/running states. The Icon component silently returns an empty SVG for unknown names — the button would show no icon in both states. | 33-2-SPRINT.md:212, 33-3-SPRINT.md:219,221 | Replaced `name="loader"` with `name="hourglass"` in both sprints. `hourglass` exists at icons.js:38 and is semantically correct for a "waiting/running" state. |
| WARNING | `--radius-card` CSS token does not exist in css.js :root block (lines 10-118). Sprint 33.2.3 uses `border-radius: var(--radius-card)` in the .cmd-runner rule, which would silently compute to `border-radius: 0` (undefined variable). | 33-2-SPRINT.md in the cmd-runner CSS block | Changed to `var(--radius-md)` (aliased to `var(--radius-4)` = 8px, line 113). Consistent with other card components in css.js. |
| INFO | Evidence tool violation: task 33.3.3 evidence contained the phrase "phase-32 CSS" which the spot-checker misinterpreted as a grep claim of 32 hits for pattern "phase" (100% drift). | 33-3-SPRINT.md:341 | Rephrased evidence to remove the ambiguous "phase-32 CSS established" sentence. Added explicit `creates:` justification. Re-run: ok=true, 0 violations. |

## Codebase verification summary

All cited file paths exist. Key spot-checks:

- `server/orchestrator.js` — 324 lines. `handleRun()` at line 166. `STORY_ID_RE` at line 52. `const cmd = String(body.cmd || ...)` at line 187. Auth token at line 49. Route dispatcher at lines 295-299. Confirmed.
- `server/orchestrator.js:52` — `STORY_ID_RE = /^[A-Za-z0-9._-]+$/`. "cmd-rihal-init" satisfies this pattern. Confirmed via `node -e`.
- `server/lib/html/client/orchestrator.js` — 220 lines. `runAndOpenTerm()` at lines 165-181. `runSession()` at lines 42-49. `isSessionRunning()` at lines 104-107. `startSessionsPoll()` at lines 138-142. `runStory()` at lines 210-213. `stopStory()` at lines 218-220. Confirmed.
- `server/lib/html/client/views/OrchestrationView.js` — 106 lines. Export at line 81. Import from orchestrator.js at line 15 (`stopSession, openTermPanel`). `useStore` already imported at line 14. `html` imported (no useState) at line 13. Confirmed.
- `server/lib/html/client/components/shared.js` — `showToast()` at lines 18-24. Uses `document.getElementById('toast')` + `.classList.add('show')`. Confirmed. `RunBtn` at lines 151-161 calls `runAndOpenTerm(storyId, cmd, label)` — always supplying cmd.
- `server/lib/html/client/preact.js` — exports `useState` at line 30. Confirmed.
- `server/lib/html/icons.js` — `play` at line 29, `terminal` at line 30, `hourglass` at line 38. No `loader` entry. Confirmed.
- `server/lib/html/css.js` — 2244 lines. `:root` block lines 11-118. `--bg-input` at line 18 (dark) and line 127 (light). `--radius-md` at line 111 (aliased to `var(--radius-4)` = 8px). No `--radius-card` token. Confirmed.
- Existing Run button cmd values: Phase cards → `/rihal-execute`; Sprint cards → `/rihal-execute-sprint <id>`; Story cards → `/rihal-dev-story <id>`. All confirmed via shared.js:190,237,295.
- `server/orchestrator.js` has no `/api/clean-sessions` route (client orchestrator.js:82 calls a non-existent endpoint — pre-existing issue, not introduced by phase 33, not fixed here).

## Critical concern resolution

The BLOCKER concern about the allowlist breaking existing Run buttons was confirmed.
Root cause: The plan comment said "the default composition is not user-supplied" but
in reality `runSession(storyId, cmd)` at client/orchestrator.js:44-48 always sets
`body.cmd` in the POST body — there is no code path that omits it from the client.
The fix (storyId prefix gate) is provably correct: the command-runner helper
`runCommandFromUI()` (added in 33.2.1) always sets `storyId = 'cmd-' + slug`, and
no existing caller ever passes a storyId starting with "cmd-".

## Notes

- `--bg-input` fallback: Sprint 33.2.3 uses `var(--bg-input, var(--bg-sidebar))`. The `--bg-sidebar` fallback is harmless — `--bg-input` IS defined (css.js:18 dark, :127 light). The fallback never fires.
- `useStore` in 33.3.2: OrchestrationView.js already imports `useStore` at line 14. Task 33.3.2 language "update the useStore import" is misleading but the actual code to insert (`const { activeSessions } = useStore()` inside CommandRunner) is correct — it calls the already-imported hook inside a new component scope.
- Line count budgets: client/orchestrator.js is 220 lines before phase 33. Sprint 33.2.1 adds ~35 lines (to ~255, under 260). Sprint 33.3.1 adds ~10 lines (import + rewrite, net ~0 on body, under 280). OrchestrationView.js is 106 lines. Sprint 33.2.2 adds ~40 lines (to ~146, under 200). Sprint 33.3.2 adds ~10 lines (to ~156, under 210). All budgets achievable.
- No new npm dependencies. No new CDN imports. No new dashboard.js endpoints. No build step. All constraints satisfied.
