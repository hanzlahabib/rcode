# Phase 31 — Sprint Plan Check

**Verdict:** pass-with-cautions
**Checked:** 2026-05-16
**Checker:** rihal-sprint-checker
**Plans:** 31-1, 31-2, 31-3, 31-4 (4 sequential sprints, 4 waves)

## Result

All 4 SPRINT.md plans verified against the actual codebase — every cited file,
function, and line number confirmed. The 12 dashboard views are all covered
(2 + 5 + 4 + 1 across sprints 1–4), xterm is wrapped not replaced, no build step
is introduced, dependencies are linear, and every task carries
read_first / files / acceptance_criteria / verify-with-automated-child / done.

## Issues found and resolved in-plan

| Severity | Issue | Resolution |
|----------|-------|------------|
| WARNING | Coexistence seam underspecified — what triggers legacy render once App owns the router; Preact re-render could unmount legacy-filled hosts | Added explicit COEXISTENCE-SEAM RULE to task 31.1.4 (stable host nodes, legacy hashchange preserved) + acceptance check #9 to 31.1.6 |
| WARNING | `node --check` is syntax-only — a bad esm.sh version pin would not fail until the human checkpoint | Added automated `curl` HEAD check of every pinned esm.sh URL to task 31.1.2 verify block |
| INFO | Stray quote in acceptance-criteria prose (31.2.4, 31.3.2) | Both fixed |
| INFO | icons.js `window.__ICONS__` claim never wired | Confirmed accurate; fixed by task 31.1.5 (already in plan) |

## Notes

- Sprint 31.4 (orchestration + xterm component) is the heaviest — task 31.4.2
  (WebSocket/SSE lifecycle in XtermPanel) is the riskiest single task.
- No CONTEXT.md existed — plan derived from the ROADMAP Phase 31 entry + read source.
