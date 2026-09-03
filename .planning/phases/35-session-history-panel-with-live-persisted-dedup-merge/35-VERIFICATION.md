---
status: passed
phase: 35
generated: 2026-09-03T00:00:00Z
human_uat_pending: true
---

# Phase 35 Verification — Session History Panel with Live/Persisted Dedup-Merge

**Verifier:** rcode-verifier (goal-backward audit, manual — code + state.json were out of sync)
**Scope:** server/orchestrator.js, server/lib/html/client/store.js, server/lib/html/client/orchestrator.js, server/lib/html/client/views/OrchestrationView.js, server/lib/html/icons.js, server/lib/html/client/icons-client.js, server/lib/html/css.js
**Baseline (first phase-35 commit):** 01d42319
**HEAD at verification:** a93d4a48 (fast-forwarded from worktree base 1b87da2c)

---

## Goal Statement (restated for backward tracing)

Persist every orchestration run that ends (done/exited/stopped/error) to a JSON
file on the orchestrator service and expose `GET /api/history` (HIST-1/HIST-2
server half — 35-1-SPRINT.md), then surface that persisted history in the
Orchestration view as a panel grouped by status and date, merged with the live
session poll so a run present in both renders exactly once (HIST-1/HIST-2/HIST-3
client half — 35-2-SPRINT.md).

## Situation found

`.rcode/state.json` had phase 35 stuck at `status: "planned"` with both sprints
`"planned"`, and no `35-VERIFICATION.md` existed — but `35-1-SUMMARY.md`,
`35-2-SUMMARY.md`, and a full `35-REVIEW.md` (2 HIGH / 2 MEDIUM / 2 LOW findings)
were all present, and the commits referenced in those summaries (`01d42319`,
`9add71d2`) are reachable from `main`. Same bug class as #1040/#1043, and the
same pattern phase 34 just went through — confirmed genuine by reading the code
directly, not assumed.

Unlike phase 34 (which had a `34-REVIEW-FIX.md` showing both HIGH findings
fixed), **phase 35 had no `35-REVIEW-FIX.md` at all** — a real, material
difference from the phase-34 precedent. Direct code inspection confirmed both
HIGH findings from `35-REVIEW.md` were genuinely still present and unfixed:

- **H1** — `handleStop` (server/orchestrator.js, was lines 703-712) killed the
  PTY and set status to `'stopped'` but never called `persistRun`. The only
  `persistRun` call was inside `proc.onExit`. If `proc.kill()` throws (silently
  swallowed by an empty `catch {}`) or the process was already dead, `onExit`
  could fail to fire and the stopped run would never be written to
  `orch-history.json` — a genuine gap against HIST-1/HIST-2's persistence
  promise for exactly the "user clicks Stop" path.
- **H2** — `persistRun` appended every entry unconditionally
  (`history.push(entry)`), so re-running the same `storyId` N times stored N
  entries in `orch-history.json`, while the client's `mergeSessionsAndHistory`
  (keyed on storyId via a `Map`) only ever surfaces the last one — a
  cardinality mismatch between server storage and client display, and the
  `HISTORY_MAX=200` cap becomes effectively lower in distinct visible runs
  than advertised.

Both are HIGH-severity, well-specified by the review (which included exact
recommended fixes), directly touch the phase's own persistence must-haves, and
were small/targeted — so per this task's instructions ("fix the specific gap
with a small, targeted fix... not a rewrite") they were fixed rather than
silently accepted, unlike phase 34's MEDIUM/LOW leftovers which were
legitimately out of scope of that phase's must-haves.

**Fixes applied (this verification pass, server/orchestrator.js only):**

1. Added `s.historyPersisted` guard: `persistRun` is now called from whichever
   path fires first — `handleStop` (immediately, so a manual stop is never
   lost even if `onExit` never fires) or `proc.onExit` (the normal path) —
   and the guard prevents a double-write when both fire.
2. `persistRun` now replaces an existing `history` entry for the same
   `storyId` (`history.findIndex(h => h.storyId === storyId)`) instead of
   always appending, matching option (a) from `35-REVIEW.md`'s own
   recommendation ("simpler and matches the current client UI").

Also noted, not fixed (out of scope, does not block HIST-1/2/3):

- **M1** (4s poll always re-fetches `/api/history` even when nothing ended) —
  a network-efficiency concern, not a correctness gap.
- **M2** (`HistoryRow`'s inert `key=` on the inner `<div>`, real key is
  correctly at the call site) — cosmetic dead code, review itself confirms
  the functional key is present and correct.
- **L1** (`persistRun` write is not atomic temp-then-rename) — a durability
  hardening item; `loadHistory()` already fails safe (`[]` on parse error).
- **L2** (unrelated pre-existing icon-comment drift, "sprint 36.1" on the
  `search` icon) — explicitly not a phase-35 change per the review itself.

**Additional discrepancy found during this audit, not raised in
`35-REVIEW.md`:** the review's own "Positive observations" section and
35-2-SPRINT.md's `<verification>` block both assert "An exited run renders a
red status dot" (`.term-status-dot.exited { background: #ff4444; }`,
css.js:2252/2319). That was true at the time phase 35 shipped. A **later**
commit (`ad6e740b`, "blocked-session detection, notifications + status
indicators" — reachable from `main`, postdates both phase-35 commits) added a
second `.term-status-dot.exited` rule at css.js:5256 with
`background: var(--text-muted)` (grey), explicitly commented "Overrides the
earlier .term-status-dot palette via cascade (this block loads last)." CSS
cascade order means the grey rule wins today. This is an intentional
supersession by later work, not a phase-35 defect — flagged here rather than
silently accepted, exactly as phase 34 flagged its own review-doc drift.

---

## Must-Haves (from 35-1-SPRINT.md / 35-2-SPRINT.md frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A completed orchestration run survives an orchestrator restart and is still readable | VERIFIED | `loadHistory()` (orchestrator.js:245-253) reads+parses `HISTORY_FILE` at module load into `let history`; `persistRun` writes it on every terminal transition (onExit and, after this pass's fix, handleStop) |
| 2 | `GET /api/history` returns past runs with status, startTime, endTime, and durationMs | VERIFIED | `handleHistory` (orchestrator.js:551-554) returns `{ history: out }` with all `HistoryEntry` fields, sorted newest-first, behind `authed(req)` |
| 3 | The Orchestration view shows a history panel of past runs grouped by status and date | VERIFIED | `HistoryPanel()` in OrchestrationView.js:291+ groups by status then by `humanDate(run.endTime \|\| run.startTime)` |
| 4 | Each past-run row shows its duration and its final status | VERIFIED | `HistoryRow` renders `durationLabel(run.durationMs)` and `.hist-row-status` |
| 5 | A run present in both the live session poll and persisted history renders exactly once | VERIFIED | `mergeSessionsAndHistory` keyed on storyId via `Map`; behavioral test below confirms exactly-once + field-aware duration/endTime fallback |

---

## Artifact Verification (4-Level)

| Artifact | Exists | Substantive | Wired | Data Flows | Status |
|----------|--------|-------------|-------|------------|--------|
| `orch-history.json` persistence (loadHistory/persistRun) | Y | Y (server/orchestrator.js:241-271) | Y (called from proc.onExit and handleStop) | Y (round-trip: written on run end, read at boot) | VERIFIED |
| `GET /api/history` route + handleHistory | Y | Y (server/orchestrator.js:551-554, 847) | Y (registered after `authed(req)` gate, GET-only) | Y (returns `{ history: [...] }`, newest-first) | VERIFIED |
| `fetchHistory()` client fn | Y | Y (orchestrator.js:163-172, token guard + 401 self-heal + `.catch(()=>[])`) | Y (called from `_poll` via `Promise.all`) | Y | VERIFIED |
| `mergeSessionsAndHistory()` | Y | Y (orchestrator.js:180-194, field-aware `??` fallback for durationMs/endTime) | Y (imported and called in OrchestrationView.js) | Y (behavioral test passes — see below) | VERIFIED |
| `history` store field | Y | Y (store.js:62, seeded `[]`) | Y (populated by `_poll` via `setState`) | Y | VERIFIED |
| `HistoryPanel`/`HistoryRow`/`durationLabel` | Y | Y (OrchestrationView.js:259-330+) | Y (`<${HistoryPanel}/>` mounted in OrchestrationView markup) | Y (reads `useStore()`, calls `mergeSessionsAndHistory`) | VERIFIED |
| `history` icon (icons.js + icons-client.js) | Y | Y (identical SVG path string in both files) | Y (`<${Icon} name="history"/>` in HistoryPanel) | Y | VERIFIED |
| `.hist-*` / `.term-status-dot.exited` CSS | Y | Y (css.js:2252, 2753-2765) | Y (class names match component markup) | Y (superseded visually by later commit `ad6e740b` — see discrepancy above; not a phase-35 defect) | VERIFIED |

---

## Static / Behavioral Checks

| Check | Result |
|-------|--------|
| `node --check server/orchestrator.js` | PASS |
| `node --input-type=module --check` on store.js / orchestrator.js (client) / OrchestrationView.js / icons-client.js | PASS |
| `node --check server/lib/html/icons.js`, `server/lib/html/css.js` | PASS |
| `node server/dashboard.js` boots clean, listens on :7717, orchestrator on :7718 | PASS |
| `curl http://localhost:7717/` | HTTP 200 |
| `mergeSessionsAndHistory` exactly-once + field-aware fallback (live wins status, persisted durationMs/endTime preserved) | PASS — one-shot Node assertion, matches 35-2-SPRINT.md's own acceptance script |
| `persistRun` dedup-by-storyId (H2 fix) | PASS — isolated re-implementation test confirms re-running the same storyId replaces rather than appends |
| `node --test` full suite | 660/661 pass — 1 pre-existing unrelated failure (`test/at-ref-parity.test.cjs`, stale `@`-reference in `.rcode/skills/rcode-init/SKILL.md`; also flagged in `34-VERIFICATION.md`, untouched by phase 35) |

---

## Review Finding Resolution

`35-REVIEW.md` findings vs. actual code (re-verified directly; no `35-REVIEW-FIX.md` existed prior to this pass):

| Finding | Severity | Prior state | Action this pass | Evidence |
|---------|----------|--------------|-------------------|----------|
| H1 — `handleStop` never calls `persistRun`; stopped runs can be silently lost from history | HIGH | Unfixed | **Fixed** — `s.historyPersisted` guard added; `handleStop` now persists immediately, `onExit`'s call is a no-op if already persisted | server/orchestrator.js: handleStop and proc.onExit |
| H2 — `history` grows unbounded per re-run of the same storyId; client only ever shows the last one | HIGH | Unfixed | **Fixed** — `persistRun` now replaces the existing entry for `storyId` instead of always appending | server/orchestrator.js:257-271 |
| M1 — `_poll` fetches `/api/history` every 4s regardless of whether history changed | MEDIUM | Present | Not fixed — network-efficiency concern, not a correctness gap, out of scope | server/lib/html/client/orchestrator.js `_poll` |
| M2 — inert `key=` on `HistoryRow`'s inner `<div>` | MEDIUM | Present | Not fixed — cosmetic; the functional key at the call site is correct per the review's own note | OrchestrationView.js |
| L1 — `persistRun` write is not atomic (no temp-then-rename) | LOW | Present | Not fixed — durability hardening, `loadHistory` already fails safe on a corrupt file | server/orchestrator.js:263-268 |
| L2 — unrelated `search` icon comment says "sprint 36.1" | LOW | Present | Not fixed — review itself states this predates and is unrelated to phase 35 | icons.js / icons-client.js |

H1 and H2 (both HIGH findings, and the only ones bearing directly on HIST-1/
HIST-2's persistence-correctness promise) are now genuinely fixed. M1/M2/L1/L2
remain open, real, low-severity items — none block the phase's must-haves.
Recommend a follow-up ticket if they are worth closing.

---

## Anti-Pattern Scan

Scanned all phase-35 files (orchestrator.js server + client, OrchestrationView.js,
store.js, icons.js, icons-client.js, css.js diffs) for `TODO`, `FIXME`,
`placeholder`, hardcoded-empty, stub returns: zero hits.

No `style=` attribute, no `React.FC`, no new dependency, and `server/dashboard.js`
was not touched by phase 35's own commits (confirmed by `35-REVIEW.md`'s own
"Positive observations" — a later, unrelated commit added `/api/agents` to
dashboard.js, not part of phase 35's changeset).

---

## Human UAT Pending

The following cannot be verified by static/structural/behavioral analysis alone:

1. The Run History panel visually renders grouped by status then date in the browser.
2. Duration labels (`Ns` / `Nm Ns` / `Nh Nm`) read correctly for real run durations.
3. Stopping a running session via the UI now shows up in the history panel immediately (H1 fix).
4. No uncaught JS errors in DevTools console when the 4s poll runs with history present.

These are pending human UAT at `http://localhost:7717`.

---

## File Size Check

| File | Lines | Limit | Status |
|------|-------|-------|--------|
| server/orchestrator.js | 930 | 1000 | OK |
| server/lib/html/client/orchestrator.js | 521 | 1000 | OK |
| server/lib/html/client/views/OrchestrationView.js | 390 | 1000 | OK |
| server/lib/html/client/store.js | 236 | 1000 | OK |
| server/lib/html/icons.js | 75 | 1000 | OK |
| server/lib/html/client/icons-client.js | 92 | 1000 | OK |
| server/lib/html/css.js | 5607 | 1000 | OVER — pre-existing, shared across all dashboard phases (same as flagged in 34-VERIFICATION.md); phase 35 appended ~15 lines, not a disproportionate grower |

---

## Overall Verdict

**Status: passed (human UAT pending)**

The codebase genuinely delivers HIST-1, HIST-2, and HIST-3 as promised in
35-1-SPRINT.md / 35-2-SPRINT.md. Unlike phase 34, phase 35's own code review
had left both HIGH findings (H1, H2) unfixed with no `35-REVIEW-FIX.md` — both
were small, well-specified, and directly bore on the phase's persistence
must-haves, so they were fixed as part of this verification pass rather than
silently accepted. `.rcode/state.json` was out of sync with reality (phase/
sprints stuck at `planned` despite complete, reviewed work on `main`) — this
verification corrects that via `rcode-tools.cjs phase complete 35` and
`sprint complete --sprint 35.1` / `35.2`, the real state-mutation CLI. A
CSS-cascade discrepancy (a later, unrelated commit visually overrides the
exited-run status dot from red to grey) is flagged above but is an
intentional supersession by later work, not a phase-35 defect.
