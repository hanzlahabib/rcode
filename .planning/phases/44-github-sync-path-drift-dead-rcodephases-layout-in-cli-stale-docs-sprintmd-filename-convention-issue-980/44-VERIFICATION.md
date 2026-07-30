---
status: passed
phase: 44
verified: 2026-07-30
verifier: rcode-verifier
---

# Phase 44 Verification — GitHub sync path drift (issue #980)

## Goal

Fix `cli/github-sync.js` to read the current sprint-track
(`.planning/phases/*/*-SPRINT.md` with `<task>` XML) and epic-track
(`.planning/epics/stories/*.md`) formats instead of the dead
`.rcode/phases/{N}/tasks|stories/` layout; correct `docs/METHODOLOGY.md` and
`docs/USP.md`; fix `rcode/workflows/sprint-planning.md`'s bare `SPRINT.md`
filename convention.

`phase_req_ids`: confirmed empty in `.planning/REQUIREMENTS.md` — this is an
unmapped repo-maintenance phase (issue #980), not tied to a numbered
requirement. ROADMAP.md Phase 44 entry matches the phase-brief goal verbatim.

## Method

Re-verified the **current** working tree (post commit `5faae12`), not the
SUMMARY/REVIEW narrative. Ran greps, `node --check`, the full test suite, and
read the diffs of the fix commit plus the two commits it references
(`42c216d` scope-list fix, issue `#1002` deferred-finding filing) directly
against git history and `gh issue view`, rather than trusting the SUMMARY's
account of them.

## Verification Results

### 1. Dead path elimination — PASS
```
grep -rn "\.rcode/phases" cli/github-sync.js cli/lib/github-sync-discover.cjs \
  test/github-sync.test.cjs docs/METHODOLOGY.md docs/USP.md
```
→ zero matches (exit 1) across all 5 target files.

### 2. New discovery module — PASS
`cli/lib/github-sync-discover.cjs` exists, `node --check` clean, exports
`discoverSprintTrackPhases`, `discoverEpicTrackPhase`, `discoverPhases`,
`applyGranularFilters`, `extractFrontmatter`, `extractTitle`. Sprint-track
parser reads `.planning/phases/*/*-SPRINT.md`, matches `<task id="" title="">`
XML with nested-`<title>` and heading-fallback parsing (mirrors
`server/lib/scanner.js`). Epic-track parser reads `.planning/epics/EPIC-*.md`
+ `.planning/epics/stories/*.md`, numeric-matches epic↔story ids tolerant of
zero-padding.

### 3. CLI rewiring — PASS
`cli/github-sync.js:48` requires `./lib/github-sync-discover.cjs`. Confirmed
by direct grep: `noMilestone` (line 370, milestone filter), `sourcePath`
(lines 521, 604, 711, 722, 756, 767 — all "Source:" body-template lines now
use the discovery module's per-item path instead of a hardcoded
`.rcode/phases/...` string), `numericId` (line 279, `--phase` filter). The
"no phases" message (line 300) now names `.planning/phases/` and
`.planning/epics/`, not the dead path. File is 843 lines (was 1027),
under the repo's 1000-line cap.

### 4. Docs corrected — PASS
`docs/METHODOLOGY.md` line 143 now reads `.planning/epics/EPIC-{n}.md`; line
405 reads `.planning/phases/{n}-{slug}/{n}-{plan}-SPRINT.md`. `docs/USP.md`
line 128 reads `no PRD exists in \`.planning/\``. Zero `.rcode/phases`
references remain in either file.

### 5. Workflow filename convention — PASS
`rcode/workflows/sprint-planning.md`: zero occurrences of the bare
`{phase_slug}/SPRINT.md` or `{phase}/SPRINT.md` path forms; 4 occurrences of
the correct `{phase}-{plan}-SPRINT.md` path form (lines 32, 157, 183, 189).
Remaining bare "SPRINT.md" mentions (lines 4, 6, 13, 30, 197) are prose/verb
phrases ("write a SPRINT.md", "Write SPRINT.md to `<full path>`"), not
competing path literals — the acceptance criteria's target pattern
(`{phase_slug}/SPRINT.md` as a literal path suffix) is fully eliminated.

### 6. Tests — PASS
`node --test test/github-sync.test.cjs`: 28/28 pass, including the 8 new
tests named in the plan (sprint-track attribute/nested-title/heading-fallback
parsing, empty-dir handling, epic-track parsing + numeric-padding-tolerant
linking, empty-epics-dir handling, combined `discoverPhases`, and
dash/dot-normalizing `--sprint` filter).

Full suite: `npm run test:ci` → **593/593 pass**, 0 failures. This includes
`test/scope-history-parity.test.cjs` and `test/scope-list-parity.test.cjs`,
which the phase's own SUMMARY had flagged as a blocker (`github-sync`/`rcode`
scopes missing from `AGENTS.md`). Verified independently: commit `42c216d`
("chore(scopes): add github-sync and rcode to allowed scope lists") is a real
commit on the branch, predates the merge to main, and both scopes are present
in `AGENTS.md:27`'s allowed-scopes list today. The full suite passing
confirms this is not just a documentation claim — the test that would fail
if the scopes were missing is green.

### 7. Post-review fix commit (5faae12) — verified genuine, not just claimed
- **High #1** (stale SUMMARY contradicting branch history): SUMMARY.md now
  has a "Resolution (post-review)" paragraph correctly citing `42c216d` —
  cross-checked against actual git log, accurate.
- **Medium #2** (docstring examples didn't match new id formats): confirmed
  via diff — `cli/github-sync.js:14-17` now reads `--phase=44` / `--sprint=44.1`
  / `--epic=EPIC-01` / `--story=44.1.1`, all of which are real id shapes the
  rewritten discovery module produces (cross-checked against
  `discoverSprintTrackPhases`/`discoverEpicTrackPhase` output shapes).
- **Medium #4 / Low #4** (lexicographic sort bug): confirmed via diff —
  `discoverSprintTrackPhases()`'s `.sort()` now has a numeric comparator
  keyed on the `-(\d+)-SPRINT\.md$` plan segment, fixing the `44-10` before
  `44-2` ordering bug. `node --check` clean, existing 28 tests still pass
  (no test explicitly exercised 10+ plans, but the fix doesn't touch parsing
  logic, only sort order, and is a straightforward comparator swap).
- **Medium #3** (sync-map cross-track collision): deliberately deferred, not
  fixed. Verified issue **#1002 is genuinely filed** (`gh issue view 1002` —
  open, correct title, full repro detail citing the exact file/line numbers
  and the phase-44 REVIEW). This is an honest deferral with a real tracking
  ticket, not a swept-under-the-rug gap — reasonable given the finding's own
  severity (medium, narrow precondition) and the recommendation to give a
  ~6-call-site fix its own reviewed pass rather than force it into an
  autonomous-loop patch.
- **Low #5** (`docs/adr/0001-github-sync-as-cli.md` still stale): correctly
  out of scope per the original plan's explicit interfaces note (scoped to
  `METHODOLOGY.md`/`USP.md` only) — not part of this phase's must_haves.
  Confirmed still present but was never claimed fixed.
- **Low #6** (id collision if a phase dir were literally named `epics`):
  correctly left as a documented, non-blocking edge case — no real
  `.planning/phases/epics` directory exists in this repo.

## must_haves Truths Verification (from 44-1-SPRINT.md frontmatter)

| Truth | Status |
|---|---|
| `discoverPhases()` reads sprint-track `*-SPRINT.md` `<task>` XML and epic-track `.planning/epics/`, never `.rcode/phases/` | ✅ confirmed by code read + passing tests |
| `cli/github-sync.js` contains zero references to literal `.rcode/phases` | ✅ grep confirms |
| `docs/METHODOLOGY.md`/`docs/USP.md` contain zero references to `.rcode/phases/` as current path | ✅ grep confirms |
| `rcode/workflows/sprint-planning.md` writes `{phase}-{plan}-SPRINT.md`, never bare `SPRINT.md` | ✅ confirmed, 4/4 path occurrences fixed |

## Artifacts Verification

- `cli/lib/github-sync-discover.cjs` — exists, owns discovery for both tracks, importable — ✅
- `test/github-sync.test.cjs` — imports the module directly (`require('../cli/lib/github-sync-discover.cjs')`), no re-implemented parsing logic — ✅

## Key Links Verification

- `cli/github-sync.js` requires `cli/lib/github-sync-discover.cjs` for `discoverPhases`/`applyGranularFilters` — ✅ (line 48; `extractFrontmatter`/`extractTitle` correctly stay internal to the lib per the plan's own interfaces note, not re-exposed to the CLI)
- `server/lib/scanner.js`'s `<task>` parsing is the mirrored reference implementation — ✅ confirmed by REVIEW's direct regex comparison and independently by reading both files' task-tag regexes

## Verdict

**PASSED.** All 4 must_haves truths hold, both required artifacts exist and
are correctly wired, all 6 named target files are clean of the dead path,
593/593 tests pass (up from the 591/592 reported mid-sprint — the scope-list
gate that was failing is now green), and the 3 post-review fix claims in
commit `5faae12` were independently re-verified against the actual diff, not
just the commit message. The one deliberately-deferred finding (Medium #3,
sync-map cross-track collision) has a real tracking issue (#1002) and is a
reasonable, disclosed scope boundary rather than a hidden gap — it does not
block this phase's goal, which was fixing the dead-path read, not
hardening the sync-map's key schema (a pre-existing design, not introduced
as broken by this phase, merely exposed to a new narrow risk by combining
two tracks).

No further action needed on Phase 44 itself. Issue #1002 remains open as
separate, correctly-scoped follow-up work.
