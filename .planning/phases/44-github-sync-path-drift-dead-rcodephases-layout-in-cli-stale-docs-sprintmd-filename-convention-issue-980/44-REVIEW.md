---
status: issues_found
phase: 44
critical: 0
high: 1
medium: 2
low: 3
generated: 2026-07-29T09:34:33Z
---

# Phase 44 Code Review — GitHub sync path drift (issue #980)

Branch reviewed: `44-1-github-sync-path-drift` vs `main`. Files in scope per the phase brief:
`cli/lib/github-sync-discover.cjs` (new), `cli/github-sync.js`, `test/github-sync.test.cjs`,
`docs/METHODOLOGY.md`, `docs/USP.md`, `rcode/workflows/sprint-planning.md`.

Verification performed: `node --check` on both CLI files (clean), `node --test
test/github-sync.test.cjs` (28/28 pass), full `npm run test:ci` (592/592 pass, including
`test/scope-history-parity.test.cjs` and `test/scope-list-parity.test.cjs`), and a targeted
grep sweep for `.rcode/phases` and bare `SPRINT.md` across the target files (all clean, matches
the SPRINT.md's own `<verification>` block).

Pattern check: the new `parseSprintTasks()` in `cli/lib/github-sync-discover.cjs` mirrors
`server/lib/scanner.js:156-179`'s `<task id="" title="">` parser attribute-then-nested-tag
precedence exactly, as the plan required — confirmed by direct comparison of both regexes and
fallback order. Good instance of Read-existing-first.

---

## High

### 1. `AGENTS.md` and `CONTRIBUTING.md` were edited on this branch, contradicting the phase's own scope and its checked-in SUMMARY

- **Files:** `AGENTS.md:27`, `CONTRIBUTING.md:285,315` (commit `42c216d`, "chore(scopes): add
  github-sync and rcode to allowed scope lists")
- **Description:** Neither file appears in `44-1-SPRINT.md`'s `files_modified` list (only the 6
  files named in the phase brief are listed). `44-1-SUMMARY.md` (committed 4 minutes earlier, at
  `708790e`) explicitly documents the scope-list mismatch as a **blocker requiring a human
  decision**, and states: *"Left as-is, un-actioned, and flagged here rather than silently
  working around it... AGENTS.md is a meta-rules file; this repo's own CLAUDE.md flags 'About to
  edit AGENTS.md... stop and confirm' as a hard red-flag requiring explicit human sign-off, even
  in autonomous/yolo mode."* The very next commit on the same branch then does exactly the thing
  the SUMMARY says was left un-actioned pending human sign-off, with no update to the SUMMARY
  reflecting that the blocker was resolved. The checked-in `44-1-SUMMARY.md` is now stale/
  inaccurate about what the branch actually contains — a maintainer reading the SUMMARY today
  would believe AGENTS.md is untouched and a decision is still pending, when in fact it was
  already edited three commits later.
- **Why this matters:** This is the exact scenario CLAUDE.md's Red Flags section calls out
  ("About to edit AGENTS.md... stop and confirm") and the exact "comments lie, read the code"
  failure mode from the user's own guidelines — the narrative document (SUMMARY) and the actual
  git history disagree, and nothing in the diff flags that disagreement.
- **Recommended fix:** Either (a) revert the AGENTS.md/CONTRIBUTING.md scope-list change and get
  explicit human sign-off per the SUMMARY's own stated options, or (b) if the human already
  approved it out-of-band, amend `44-1-SUMMARY.md`'s "Blockers Encountered" section to record that
  the blocker was resolved by commit `42c216d`, so the SUMMARY stops contradicting the branch it
  documents. This is a documentation-integrity fix, not a code fix — route the scope-list
  decision itself to the project owner if not already settled.

---

## Medium

### 2. `cli/github-sync.js`'s own usage docstring gives filter examples that no longer match the id formats this phase's rewrite produces

- **File:** `cli/github-sync.js:14-17`
- **Description:** The header comment still reads:
  ```
  --phase=phase-02          push one phase (all its epics + stories)
  --sprint=sprint-01        push stories belonging to one sprint
  --epic=epic-1-auth        push one epic and its child stories
  --story=story-1-1-login   push one story
  ```
  Task 44.1.3 (this same phase) changed what these four filters actually match against:
  `--phase` now matches a full slug directory name or a bare numeric prefix (e.g. `44` or
  `44-github-sync-...`, see `cli/github-sync.js:279`); `--sprint` matches ids like `44.1` or
  `44-1` (`cli/lib/github-sync-discover.cjs`'s `applyGranularFilters`); `--epic` matches
  case-sensitive `EPIC-01`-style ids (`cli/lib/github-sync-discover.cjs`'s
  `discoverEpicTrackPhase`); `--story` matches sprint-track task ids (e.g. `44.1.1`) or
  epic-track story ids (e.g. `1.1`). None of the four documented examples are valid inputs
  against the new discovery module's actual id shapes.
- **Why this matters:** `e.id === opts.epic` and `s.id === opts.story` are case-sensitive
  string-equality filters (`cli/lib/github-sync-discover.cjs`, `applyGranularFilters`) — a
  developer who copies `--epic=epic-1-auth` verbatim from this comment gets a silent
  zero-results filter, not an error, because real epic ids are `EPIC-01` (uppercase, zero-padded,
  no title suffix). This is exactly the kind of "code compiled/tests pass but does the wrong
  thing" gap the user's own guidelines call the worst class of bug, applied to documentation
  instead of logic — it will cost the next developer a debugging cycle for no reason.
- **Recommended fix:** Update lines 14-17 to real examples that match current discovery output,
  e.g. `--phase=44` / `--sprint=44.1` / `--epic=EPIC-01` / `--story=44.1.1` (or the epic-track
  equivalent `--story=1.1`).

### 3. No track/phase namespacing on the sync-map keys — cross-track story-id collision risk introduced by combining two tracks in one `discoverPhases()`

- **Files:** `cli/github-sync.js:370-398,571,612,627` (keys `syncMap.stories[s.id]` /
  `syncMap.epics[e.id]` globally, no phase/track prefix); `cli/lib/github-sync-discover.cjs`
  (epic-track story ids are 2-segment `{epicNum}.{storyNum}`, e.g. `"1.1"`; sprint-track task ids
  are whatever the `<task id="">` attribute contains, un-enforced format, commonly 3-segment
  `{phase}.{plan}.{task}` per current planner output but not guaranteed by the parser)
- **Description:** Before this phase, `discoverPhases()` only ever returned one track
  (dead-path directory scan). This phase's `discoverPhases()` now merges sprint-track and
  epic-track results into a single flat array that both flow into the same global
  `syncMap.stories{}` / `syncMap.epics{}` keyed by bare `id`. If a project's sprint-track ever
  produces a task id shaped like an epic-track story id (e.g. a 2-segment `"1.1"`, which is not
  prevented by the `<task id="">` parser — the id comes straight from the XML attribute with no
  track-specific format check), the two unrelated items will collide on the same sync-map entry
  and silently overwrite each other's `issue_number`/`content_hash` on the next sync, causing one
  track's issue updates to land on the other track's GitHub issue.
- **Why this matters:** This is a new failure mode introduced specifically by combining the two
  tracks in this phase (each track was previously synced in isolation, dead-path only). It is
  narrow — depends on a project reusing 2-segment ids in the sprint-track — but it is silent
  (no error, no test catches it) and the blast radius is "wrong GitHub issue gets updated."
- **Recommended fix:** Namespace sync-map keys by track (or by phase id) — e.g.
  `${trackPrefix}:${id}` — or, at minimum, add a regression test that constructs one sprint-track
  phase and one epic-track phase with an intentionally colliding id and asserts they don't
  clobber each other's `syncMap` entry, so this stays a known/tested boundary rather than an
  undocumented assumption.

---

## Low

### 4. Lexicographic (not numeric) sort of SPRINT.md filenames within a phase

- **File:** `cli/lib/github-sync-discover.cjs` — `discoverSprintTrackPhases()`, the
  `.filter((f) => /-SPRINT\.md$/i.test(f)).sort()` line
- **Description:** `Array.prototype.sort()` with no comparator sorts filenames as strings, so for
  a phase with 10+ sprint plans, `"44-10-SPRINT.md"` sorts before `"44-2-SPRINT.md"`. Confirmed:
  `['44-1-SPRINT.md','44-2-SPRINT.md','44-10-SPRINT.md','44-9-SPRINT.md'].sort()` returns
  `44-1, 44-10, 44-2, 44-9`.
- **Why this matters:** Only affects the order tasks are discovered/synced within one phase
  (cosmetic — issue creation order, not data correctness), but will surprise whoever notices
  issues created "out of sprint order" on a long-running phase.
- **Recommended fix:** Sort by the numeric plan segment, e.g.
  `.sort((a, b) => parseInt(a.match(/-(\d+)-SPRINT\.md$/i)?.[1] || 0, 10) - parseInt(b.match(/-(\d+)-SPRINT\.md$/i)?.[1] || 0, 10))`.

### 5. `docs/adr/0001-github-sync-as-cli.md` still describes the dead `.rcode/phases/` layout — read as context for this phase's plan, left unfixed

- **File:** `docs/adr/0001-github-sync-as-cli.md:12,17`
- **Description:** Lines 12 and 17 still say `rcode produces project artifacts under
  .rcode/phases/` and describe the CLI as walking `.rcode/phases/`. This file was `@`-referenced
  in `44-1-SPRINT.md`'s `<context>` block (read by the planner/executor) but is not in
  `files_modified`, and task 44.1.5's `<interfaces>` note explicitly scoped the docs fix to the
  literal substring `.rcode/phases` in `METHODOLOGY.md`/`USP.md` only, naming ADR/`decisions`
  paths as "a different, unverified, out-of-scope concern not named in GitHub issue #980."
- **Why this matters:** This is the same class of drift issue #980 is about (docs disagreeing
  with the real artifact layout), left as a residual gap. Not a regression from this phase and
  explicitly out of its stated scope — flagging for a follow-up ticket, not as a defect in this
  diff.
- **Recommended fix:** File a follow-up issue to correct `docs/adr/0001-github-sync-as-cli.md`'s
  `.rcode/phases/` and `.rcode/integrations/github-map.json` references to the current paths.

### 6. Unguarded id collision between a sprint-track phase literally named `epics` and the synthetic `id: 'epics'` phase

- **File:** `cli/lib/github-sync-discover.cjs` — `discoverEpicTrackPhase()`'s return object
  (`id: 'epics'`) vs `discoverSprintTrackPhases()`'s `id: entry.name`
- **Description:** If a `.planning/phases/` directory were ever literally named `epics` (no
  numeric prefix), its discovered phase object and the synthetic epic-track phase object would
  share `id: 'epics'`, and `discoverPhases()`'s `phases.push(epicPhase)` would produce two array
  entries with the same id with no de-duplication or warning.
- **Why this matters:** Cosmetic edge case — the repo's own phase-directory convention is always
  `{n}-{slug}` (numeric prefix required), so a bare `epics` directory name is very unlikely in
  practice. Noting for completeness, not blocking.
- **Recommended fix:** None required now; if it ever surfaces, prefix the synthetic phase id
  (e.g. `__epics__`) to guarantee no collision with a real directory name.

---

## Summary

Pattern check: new discovery module correctly mirrors the proven `scanner.js` parser, keeps
`extractFrontmatter`/`extractTitle`/`applyGranularFilters` verbatim per the plan, and the
sprint-id dash/dot normalization is tested. Docs and workflow filename fixes match their acceptance
criteria exactly. Test coverage for the 6 named files is solid (28/28 new/updated tests, full
592/592 suite green).

The one high-severity finding is not in the 6 named files at all — it's a governance/process
issue on the same branch (AGENTS.md/CONTRIBUTING.md edited past the phase's stated scope, and the
checked-in SUMMARY now contradicts what the branch actually contains). That should go to the human
for a decision, per the SUMMARY's own request, before this branch merges.
