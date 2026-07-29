---
phase: 44-github-sync-path-drift-dead-rcodephases-layout-in-cli-stale-docs-sprintmd-filename-convention-issue-980
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified:
  - cli/lib/github-sync-discover.cjs
  - cli/github-sync.js
  - test/github-sync.test.cjs
  - docs/METHODOLOGY.md
  - docs/USP.md
  - rcode/workflows/sprint-planning.md
requirements: []
must_haves:
  truths:
    - discoverPhases() reads .planning/phases/*/*-SPRINT.md (sprint-track, <task> XML) and .planning/epics/ (epic-track, EPIC-NN.md + stories/N.M.md) — never .rcode/phases/
    - cli/github-sync.js contains zero references to the literal path .rcode/phases
    - docs/METHODOLOGY.md and docs/USP.md contain zero references to the literal path .rcode/phases/ as a current path
    - rcode/workflows/sprint-planning.md writes {phase}-{plan}-SPRINT.md, never a bare SPRINT.md, matching plan-spawn-planner.md's filename_convention
  artifacts:
    - cli/lib/github-sync-discover.cjs — new module owning phase/epic/story discovery for both tracks, importable by tests without duplication
    - test/github-sync.test.cjs — imports cli/lib/github-sync-discover.cjs directly instead of re-implementing parsing logic inline
  key_links:
    - cli/github-sync.js requires cli/lib/github-sync-discover.cjs for discoverPhases/applyGranularFilters/extractFrontmatter/extractTitle
    - server/lib/scanner.js's buildPhaseTree <task> parsing (lines 113-222) is the reference implementation the new sprint-track parser mirrors
---

<objective>
Fix GitHub issue #980: `cli/github-sync.js` still targets the dead `.rcode/phases/{N}/tasks|stories/`
directory layout instead of the two real artifact tracks this project now produces —
sprint-track (`.planning/phases/{slug}/{phase}-{plan}-SPRINT.md` with `<task id="" title="">`
XML blocks) and epic-track (`.planning/epics/EPIC-{NN}.md` + `.planning/epics/stories/{N}.{M}.md`).
Extract discovery into a new testable module, rewire the CLI to use it, remove every remaining
`.rcode/phases` string literal from the CLI's user-facing messages and issue-body templates,
correct the two docs files that still describe the dead path as current, and fix the one-line
SPRINT.md filename convention drift in `rcode/workflows/sprint-planning.md`.

This is a repo-maintenance/bugfix phase — no numbered requirement IDs apply (`requirements: []`).
The three sub-fixes (CLI+tests, docs, workflow) are independent (different file types, zero
cross-dependency) but total only 6 stories, well under the 8-story single-sprint cap — no
initiative-level resharding needed.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/adr/0001-github-sync-as-cli.md
</context>

<tasks>

<task id="44.1.1" type="auto">
<title>Create cli/lib/github-sync-discover.cjs — sprint-track phase/task discovery</title>
<read_first>
- cli/github-sync.js lines 148-282 (extractFrontmatter, parseSprintsFile, discoverPhases — the dead `.rcode/phases` code this task extracts and replaces)
- cli/github-sync.js lines 336-339 (extractTitle — moves verbatim, no logic change)
- server/lib/scanner.js lines 113-222 (buildPhaseTree — the `<task id="" title="">` + nested `<title>` + `### Story|Task` heading-fallback parsing to mirror; this is the reference implementation, do not reinvent it)
- cli/lib/github.cjs lines 360-377 (module.exports style convention to follow)
</read_first>
<files>
cli/lib/github-sync-discover.cjs
</files>
<interfaces>
New module exports (CommonJS, matching cli/lib/github.cjs's `module.exports = { ... }` style):
extractFrontmatter(content), extractTitle(markdown), discoverSprintTrackPhases(cwd),
discoverPhases(cwd) (combines sprint-track + epic-track — epic-track wired in task 44.1.2),
applyGranularFilters(phases, opts).

Each phase object shape (parity with the old discoverPhases output so cli/github-sync.js's
plan-building code needs no further changes beyond what task 44.1.3 makes):
{ id, numericId, brief: null, sprints: null, sprintMap: {}, stories: [], epics: [], noMilestone: false }.

Each story object shape: { id, file, content, title, parentEpic, sprintId, frontmatter, sourcePath }.
sourcePath is new — the project-relative path to cite in issue-body "Source:" lines
(e.g. .planning/phases/44-.../44-1-SPRINT.md), replacing the old hardcoded
.rcode/phases/${phase}/stories/${file} string construction that lived inline in
cli/github-sync.js's body templates.
</interfaces>
<action>
Create `cli/lib/github-sync-discover.cjs`. Add a header comment stating it owns phase/epic/story
discovery for BOTH artifact tracks and is required by both `cli/github-sync.js` and
`test/github-sync.test.cjs` (no more duplicated parsing logic in tests).

1. Copy `extractFrontmatter` and `extractTitle` from cli/github-sync.js verbatim (no logic
   change) — `require('fs')`/`require('path')` at top.
2. Do NOT copy `parseSprintsFile` — it parsed the dead `.rcode/phases/{phase}/sprints.md`
   legacy format and has no current use; it is deleted, not moved.
3. Write `discoverSprintTrackPhases(cwd)`:
   - `phasesDir = path.join(cwd, '.planning', 'phases')`. Return `[]` if it doesn't exist
     (mirrors the old `.rcode/phases` existence guard, just pointed at the real directory).
   - For each directory entry under `phasesDir`: extract `numericId` via
     `entry.name.match(/^(\d+)-/)` (the leading integer prefix before the first `-`, e.g. "44"
     from "44-github-sync-..."; null if no match).
   - List files matching `/-SPRINT\.md$/i` in that phase directory, sorted.
   - For each SPRINT.md file, read its text and derive `sprintId`: match the filename against
     `/^(\d+)-(\d+)-SPRINT\.md$/i` and build `${phase}.${plan}` (e.g. "44.1"); if the filename
     doesn't match that pattern, fall back to the file's frontmatter `sprint:` key (via
     `extractFrontmatter`), then to the filename with `-SPRINT.md` stripped.
   - Parse tasks from the SPRINT.md text with a helper `parseSprintTasks(text, sprintId, file,
     sourcePathPrefix)`:
     - Primary path: `const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;` — for each match,
       `id` from `tm[1].match(/id="([^"]+)"/)` (fallback `${sprintId}-task-${n}`), `title` from
       `tm[1].match(/title="([^"]*)"/)` OR `tm[2].match(/<title>([\s\S]*?)<\/title>/)` (mirror
       scanner.js's attribute-then-nested-tag precedence exactly), `content` = the FULL matched
       `tm[0]` (the whole `<task>...</task>` block — not the whole file, so each GitHub issue
       body gets just its own task, not the entire sprint).
     - Fallback path (only when zero `<task>` matches): mirror scanner.js's
       `### Story|Task {id} — {title}` heading regex
       (`/^#{2,4}\s+(?:Story|Task)\s+([^\s—–-]+)\s*[—–-]\s*(.+?)\s*$/gm`); `content` for this
       fallback path may be just the matched heading line (acceptable reduced fidelity — the
       primary `<task>` path is what current planner output produces and carries full content).
     - Each parsed item becomes `{ id, file, content, title, parentEpic: null, sprintId,
       frontmatter: {}, sourcePath: \`${sourcePathPrefix}/${file}\` }` (no epic level exists
       in the sprint-track — a task IS the story-equivalent synced as a GitHub issue; the
       existing `sprintRefLine` in cli/github-sync.js's story body template already renders
       `**Sprint:** \`{sprintId}\`` so the sprint grouping is visible in the issue body without
       a separate epic issue).
   - Build each phase object: `{ id: entry.name, numericId, brief: null, sprints: null,
     sprintMap: {}, stories: <all tasks from all its SPRINT.md files>, epics: [],
     noMilestone: false }`. Include phase directories even when they have zero SPRINT.md files
     (parity with old behavior of returning every discovered phase dir regardless of content).
4. Write a temporary stub `discoverEpicTrackPhase(cwd) { return null; }` (task 44.1.2 replaces
   this with the real epic-track parser) and `discoverPhases(cwd) { const phases =
   discoverSprintTrackPhases(cwd); const epicPhase = discoverEpicTrackPhase(cwd); if
   (epicPhase) phases.push(epicPhase); return phases; }`.
5. Move `applyGranularFilters` from cli/github-sync.js verbatim, with one addition: when
   `opts.sprint` is set, normalize both sides before comparing so `--sprint=44-1` and
   `--sprint=44.1` both match a stored `sprintId` of `"44.1"` — compare against
   `opts.sprint.replace(/-/g, '.')` as well as the raw value.
6. `module.exports = { extractFrontmatter, extractTitle, discoverSprintTrackPhases,
   discoverEpicTrackPhase, discoverPhases, applyGranularFilters };`
</action>
<acceptance_criteria>
- `test -f cli/lib/github-sync-discover.cjs` exits 0
- `node --check cli/lib/github-sync-discover.cjs` exits 0
- `grep -q "module.exports = {" cli/lib/github-sync-discover.cjs`
- `grep -q "discoverSprintTrackPhases" cli/lib/github-sync-discover.cjs`
- `grep -q "applyGranularFilters" cli/lib/github-sync-discover.cjs`
- `! grep -q "parseSprintsFile" cli/lib/github-sync-discover.cjs`
- `! grep -q "\.rcode/phases" cli/lib/github-sync-discover.cjs`
- `grep -q "<task" cli/lib/github-sync-discover.cjs` (the primary task-tag regex is present)
</acceptance_criteria>
<verify>
<automated>
test -f cli/lib/github-sync-discover.cjs && \
node --check cli/lib/github-sync-discover.cjs && \
grep -q "module.exports = {" cli/lib/github-sync-discover.cjs && \
grep -q "discoverSprintTrackPhases" cli/lib/github-sync-discover.cjs && \
grep -q "applyGranularFilters" cli/lib/github-sync-discover.cjs && \
! grep -q "parseSprintsFile" cli/lib/github-sync-discover.cjs && \
! grep -q "\.rcode/phases" cli/lib/github-sync-discover.cjs && \
node -e "
const d = require('./cli/lib/github-sync-discover.cjs');
const fs = require('fs'), os = require('os'), path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghs-'));
const dir = path.join(tmp, '.planning', 'phases', '44-test-phase');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, '44-1-SPRINT.md'), '<tasks><task id=\"44.1.1\" type=\"auto\"><title>Do the thing</title></task></tasks>');
const phases = d.discoverSprintTrackPhases(tmp);
if (phases.length !== 1) throw new Error('expected 1 phase, got ' + phases.length);
if (phases[0].stories.length !== 1) throw new Error('expected 1 story, got ' + phases[0].stories.length);
if (phases[0].stories[0].id !== '44.1.1') throw new Error('id mismatch: ' + phases[0].stories[0].id);
if (phases[0].stories[0].title !== 'Do the thing') throw new Error('title mismatch: ' + phases[0].stories[0].title);
if (phases[0].stories[0].sprintId !== '44.1') throw new Error('sprintId mismatch: ' + phases[0].stories[0].sprintId);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('PASS');
"
</automated>
</verify>
<done>cli/lib/github-sync-discover.cjs exists, exports discoverSprintTrackPhases/applyGranularFilters/discoverPhases, correctly parses a real `<task id="" title="">` SPRINT.md fixture into a story with the right id/title/sprintId, and contains zero references to `.rcode/phases`.</done>
<evidence>cli/github-sync.js:200-201 hardcodes `path.join(cwd, '.rcode/phases')` — that directory has not existed since the v4.0 rebrand (commit 4da7c1e) moved live artifacts to `.planning/`. server/lib/scanner.js:156-179 is the proven-working reference parser for the current `<task>` format this task mirrors.</evidence>
</task>

<task id="44.1.2" type="auto">
<title>Implement epic-track discovery and wire it into discoverPhases()</title>
<read_first>
- cli/lib/github-sync-discover.cjs (the file created in task 44.1.1 — discoverEpicTrackPhase stub and discoverPhases combiner)
- rcode/workflows/create-epics-and-stories.md lines 226-301 (the exact epic/story file layout and field format this task parses: `.planning/epics/EPIC-{NN}.md` lean summaries, `.planning/epics/stories/{N}.{M}.md` story files with bold `**Epic:** EPIC-{N} — {title}` fields — NOT YAML frontmatter)
</read_first>
<files>
cli/lib/github-sync-discover.cjs
</files>
<interfaces>
Epic-track story files use bold Markdown fields, not `---` YAML frontmatter (confirmed by
reading the actual template in create-epics-and-stories.md step 4) — `extractFrontmatter`
(which requires a leading `---` block) correctly returns `{}` for these files and must NOT be
relied on here; parse the `**Epic:**` line with a direct regex instead.

Epic file names are zero-padded (`EPIC-01.md`, `EPIC-02.md` per the "Layout" example) but a
story's `**Epic:** EPIC-{N}` field is unpadded per the JSON schema example (`"number": 1`).
Match epic↔story by NUMERIC value, not string equality, so padding differences never break
the parent link.
</interfaces>
<action>
Replace the `discoverEpicTrackPhase` stub in `cli/lib/github-sync-discover.cjs`:

1. `epicsDir = path.join(cwd, '.planning', 'epics')`. Return `null` if it doesn't exist.
2. Read files matching `/^EPIC-\d+\.md$/i` directly under `epicsDir`. For each: extract
   `epicNumber` (parseInt of the digits in the filename), `id` = filename minus `.md`
   (e.g. `"EPIC-01"`), `title` via `extractTitle(content)` (falls back to `id`), `content` =
   full file text, `sourcePath` = `.planning/epics/${file}`.
3. Read files directly under `epicsDir/stories/` (skip if that subdirectory doesn't exist)
   matching `/^[\d.]+\.md$/` (e.g. `"1.1.md"`). For each: `id` = filename minus `.md`
   (e.g. `"1.1"`), `content` = full file text, `title` via `extractTitle(content)`. Extract the
   parent epic number with `content.match(/\*\*Epic:\*\*\s*EPIC-(\d+)/i)`; look up the epic
   whose `epicNumber` matches that integer and set `parentEpic` to that epic's `id` string (or
   `null` if no match or no `**Epic:**` line present). `sprintId: null` (epic-track has no
   sprint concept). `sourcePath` = `.planning/epics/stories/${file}`.
4. Return `null` if both the epics list and stories list end up empty (nothing to sync — don't
   emit a spurious empty phase). Otherwise return one synthetic phase object:
   `{ id: 'epics', numericId: null, brief: null, sprints: null, sprintMap: {}, stories, epics,
   noMilestone: true }`. `noMilestone: true` signals this synthetic phase has no numbered-phase
   milestone to attach to on GitHub (epic-track is a deliberately phase-agnostic PRD→epics→
   stories chain per docs/adr/0001, distinct from the numbered `.planning/phases/` milestones).
5. Update `discoverPhases(cwd)` to call the real `discoverEpicTrackPhase(cwd)` (already wired
   in task 44.1.1's stub version — no further change needed there beyond the stub being
   replaced by this real implementation).
</action>
<acceptance_criteria>
- `node --check cli/lib/github-sync-discover.cjs` exits 0
- `grep -q "noMilestone" cli/lib/github-sync-discover.cjs`
- `grep -q "epicNumber" cli/lib/github-sync-discover.cjs`
- Inline node smoke test (below) confirms numeric epic↔story matching survives padding mismatch
</acceptance_criteria>
<verify>
<automated>
node --check cli/lib/github-sync-discover.cjs && \
grep -q "noMilestone" cli/lib/github-sync-discover.cjs && \
grep -q "epicNumber" cli/lib/github-sync-discover.cjs && \
node -e "
const d = require('./cli/lib/github-sync-discover.cjs');
const fs = require('fs'), os = require('os'), path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghs-epic-'));
const epicsDir = path.join(tmp, '.planning', 'epics');
const storiesDir = path.join(epicsDir, 'stories');
fs.mkdirSync(storiesDir, { recursive: true });
fs.writeFileSync(path.join(epicsDir, 'EPIC-01.md'), '# Epic 1: Auth\n\n**Phase:** implementation\n');
fs.writeFileSync(path.join(storiesDir, '1.1.md'), '# Story 1.1: Login flow\n\n**Epic:** EPIC-1 — Auth\n**Status:** todo\n');
const phase = d.discoverEpicTrackPhase(tmp);
if (!phase) throw new Error('expected a synthetic epics phase, got null');
if (phase.noMilestone !== true) throw new Error('noMilestone must be true');
if (phase.epics.length !== 1) throw new Error('expected 1 epic, got ' + phase.epics.length);
if (phase.stories.length !== 1) throw new Error('expected 1 story, got ' + phase.stories.length);
if (phase.stories[0].parentEpic !== 'EPIC-01') throw new Error('parentEpic mismatch (padding-tolerant match failed): ' + phase.stories[0].parentEpic);
const combined = d.discoverPhases(tmp);
if (!combined.some(p => p.id === 'epics')) throw new Error('discoverPhases did not include the epic-track phase');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('PASS');
"
</automated>
</verify>
<done>discoverEpicTrackPhase parses EPIC-NN.md + stories/N.M.md, links a story to its epic by numeric value even when the story references an unpadded epic number, and discoverPhases() includes the synthetic 'epics' phase alongside sprint-track phases.</done>
<evidence>rcode/workflows/create-epics-and-stories.md:246-301 is the authoritative template for this file layout — story files use bold `**Epic:**` fields (line 273), not YAML frontmatter, confirmed by reading the actual template text rather than assuming.</evidence>
</task>

<task id="44.1.3" type="auto">
<title>Rewire cli/github-sync.js onto the new discovery module and remove all remaining .rcode/phases references</title>
<read_first>
- cli/github-sync.js lines 1-56 (top-of-file requires, to add the new require)
- cli/github-sync.js lines 148-339 (extractFrontmatter/parseSprintsFile/discoverPhases/applyGranularFilters/extractTitle — all deleted from this file, replaced by a single require)
- cli/github-sync.js lines 461-492 (main(): discoverPhases() call, --phase filter, "No phases found in .rcode/phases/" message — line 484)
- cli/github-sync.js lines 554-560 (plan.milestones filter — needs `!p.noMilestone`)
- cli/github-sync.js lines 690-743 (epic creation body template — `.rcode/phases/${epic.phase}/tasks/${epic.file}` at line 705)
- cli/github-sync.js lines 748-832 (story creation body template — `.rcode/phases/${story.phase}/stories/${story.file}` at line 788)
- cli/github-sync.js lines 883-926 (update-epic body template — lines 895, 906)
- cli/github-sync.js lines 928-971 (update-story body template — lines 940, 951)
</read_first>
<files>
cli/github-sync.js
</files>
<interfaces>
`require('./lib/github-sync-discover.cjs')` exposes `{ discoverPhases, applyGranularFilters }`
(main() only needs these two — extractFrontmatter/extractTitle stay internal to the lib now
that nothing in github-sync.js calls them directly).
</interfaces>
<action>
1. Add `const { discoverPhases, applyGranularFilters } = require('./lib/github-sync-discover.cjs');`
   near the other `require(...)` lines at the top of cli/github-sync.js.
2. Delete `extractFrontmatter`, `parseSprintsFile`, `discoverPhases`, `applyGranularFilters`,
   `extractTitle` function definitions from cli/github-sync.js (all now live in
   cli/lib/github-sync-discover.cjs).
3. In main()'s `--phase` filter, match either the full directory id OR the numeric prefix so
   `--phase=44` and `--phase=44-github-sync-...` both work (the ROADMAP acceptance criterion
   uses the bare-number form `--phase <N>`):
   `phases = phases.filter((p) => p.id === opts.phase || p.numericId === opts.phase);`
4. Update the "no phases" message (previously "No phases found in .rcode/phases/ — nothing to
   sync." / "Run 'rcode init' or create a phase to get started.") to reference the real paths:
   "No phases found in .planning/phases/ or epics in .planning/epics/ — nothing to sync." /
   "Run /rcode-plan or /rcode-create-epics-and-stories to get started."
5. In the plan-building block, change `milestones: phases.filter((p) => !syncMap.phases[p.id]),`
   to `milestones: phases.filter((p) => !p.noMilestone && !syncMap.phases[p.id]),` so the
   synthetic epic-track phase never gets a spurious "epics" milestone created for it.
6. Replace every hardcoded epic/story "Source:" body-template line that currently reads
   `.rcode/phases/${epic.phase}/tasks/${epic.file}` or
   `.rcode/phases/${story.phase}/stories/${story.file}` (create and update templates — 4
   occurrences total, lines ~705, ~788, ~895/906, ~940/951) with `${epic.sourcePath}` /
   `${story.sourcePath}` respectively, using the `sourcePath` field the discovery module now
   attaches to every epic and story object.
7. Search the whole file for any remaining literal occurrences of the substring `.rcode/phases`
   and fix each one the same way (there should be none left after steps 1-6, but re-grep to be
   certain — the issue names lines 200-201, 484, 705, 788, 895, 906, 940, 951 specifically).
</action>
<acceptance_criteria>
- `node --check cli/github-sync.js` exits 0
- `grep -q "require('./lib/github-sync-discover.cjs')" cli/github-sync.js`
- `! grep -q "\.rcode/phases" cli/github-sync.js`
- `! grep -q "function parseSprintsFile" cli/github-sync.js`
- `! grep -q "function discoverPhases" cli/github-sync.js` (moved, not redefined locally)
- `! grep -q "function applyGranularFilters" cli/github-sync.js` (moved, not redefined locally)
- `grep -q "noMilestone" cli/github-sync.js`
- `grep -q "sourcePath" cli/github-sync.js`
- `grep -q "numericId" cli/github-sync.js`
</acceptance_criteria>
<verify>
<automated>
node --check cli/github-sync.js && \
grep -q "require('./lib/github-sync-discover.cjs')" cli/github-sync.js && \
! grep -q "\.rcode/phases" cli/github-sync.js && \
! grep -q "function parseSprintsFile" cli/github-sync.js && \
! grep -q "function discoverPhases" cli/github-sync.js && \
! grep -q "function applyGranularFilters" cli/github-sync.js && \
grep -q "noMilestone" cli/github-sync.js && \
grep -q "sourcePath" cli/github-sync.js && \
grep -q "numericId" cli/github-sync.js && \
echo PASS
</automated>
</verify>
<done>cli/github-sync.js requires cli/lib/github-sync-discover.cjs, contains zero references to .rcode/phases anywhere (messages, body templates, or code), and skips milestone creation for the synthetic epic-track phase.</done>
<evidence>Exact dead-path line numbers confirmed by direct read: cli/github-sync.js:200-201 (`phasesDir = path.join(cwd, '.rcode/phases')`), :484 ("No phases found in .rcode/phases/"), :705 (epic Source line), :788 (story Source line), :895/:906 (update-epic Source lines), :940/:951 (update-story Source lines) — matches the exact line numbers cited in GitHub issue #980.</evidence>
</task>

<task id="44.1.4" type="auto">
<title>Rewrite test/github-sync.test.cjs against the new discovery module and current-schema fixtures</title>
<read_first>
- test/github-sync.test.cjs (full file — currently re-implements parseArgs/extractFrontmatter/parseSprintsFile/extractTitle/loadState/loadSyncMap inline instead of importing, and its discoverPhases-shaped tests only exercise the dead `.rcode/phases/phase-01/stories/*.md` layout)
- cli/lib/github-sync-discover.cjs (the module created in tasks 44.1.1/44.1.2 — import this directly instead of re-implementing)
- test/helpers.cjs (existing tempdir helpers `makeTempDir`/`cleanup`/`registerCleanup` — reuse these instead of the file's own ad hoc `mkTmp`/`rmTmp` where convenient; NOT required to change every existing test, only don't fight the pattern in new tests)
</read_first>
<files>
test/github-sync.test.cjs
</files>
<interfaces>
`require('../cli/lib/github-sync-discover.cjs')` exposes `discoverSprintTrackPhases`,
`discoverEpicTrackPhase`, `discoverPhases`, `applyGranularFilters`, `extractFrontmatter`,
`extractTitle`.
</interfaces>
<action>
1. Add `const discover = require('../cli/lib/github-sync-discover.cjs');` at the top (after the
   existing `node:test`/`node:assert`/fs/os/path requires).
2. Delete the inline re-implementations of `extractFrontmatter` and `extractTitle` (the file's
   own copies) — the "extractFrontmatter" and "extractTitle" test blocks now call
   `discover.extractFrontmatter(...)` / `discover.extractTitle(...)` instead of the local copies.
   `parseArgs`, `contentHash`, `loadState`, `loadSyncMap` stay as local re-implementations exactly
   as they are today (they still live in cli/github-sync.js, unchanged by this phase, and the
   file's existing comment explaining the duplication-as-regression-test rationale still applies
   to them).
3. Delete every `parseSprintsFile` test (the function no longer exists anywhere — it parsed the
   dead `.rcode/phases/{phase}/sprints.md` legacy format).
4. Replace the two `discoverPhases`-flavored tests at the bottom of the file (the ones that
   inline-replicate directory listing against `.rcode/phases/phase-01/...`) with real tests that
   call `discover.discoverSprintTrackPhases(tmpDir)` and `discover.discoverEpicTrackPhase(tmpDir)`
   against fixtures written under `.planning/phases/...` and `.planning/epics/...` respectively:
   - "discoverSprintTrackPhases — parses a `<task id title>` block into a story with the right
     id/title/sprintId" (fixture: `.planning/phases/9-test/9-1-SPRINT.md` containing one
     `<task id="9.1.1" title="Do the thing"></task>`)
   - "discoverSprintTrackPhases — falls back to nested `<title>` tag when no title attribute is
     present" (fixture uses `<task id="9.1.2"><title>Nested title</title></task>`)
   - "discoverSprintTrackPhases — falls back to `### Story N — title` heading format when no
     `<task>` blocks exist" (fixture: a SPRINT.md with only a `### Story 9.1.3 — Legacy heading`
     line)
   - "discoverSprintTrackPhases — returns `[]` when `.planning/phases/` doesn't exist"
   - "discoverEpicTrackPhase — parses EPIC-NN.md + stories/N.M.md and links by numeric epic
     value" (fixture: `EPIC-01.md` + `stories/1.1.md` with `**Epic:** EPIC-1`)
   - "discoverEpicTrackPhase — returns `null` when `.planning/epics/` doesn't exist"
   - "discoverPhases — combines sprint-track phases and the synthetic epics phase when both
     exist"
   - "applyGranularFilters — --sprint filter matches both dash and dot sprint-id forms"
     (`44-1` and `44.1` both select the same story)
5. Every new/kept test must use its own temp directory (via `fs.mkdtempSync` or
   `helpers.makeTempDir`) and clean up in a `finally` block or `t.after()` — no shared mutable
   fixture state between tests (matches the file's existing per-test isolation pattern).
</action>
<acceptance_criteria>
- `node --test test/github-sync.test.cjs` exits 0 with zero failing subtests
- `grep -q "require('../cli/lib/github-sync-discover.cjs')" test/github-sync.test.cjs`
- `! grep -q "parseSprintsFile" test/github-sync.test.cjs`
- `! grep -q "\.rcode/phases" test/github-sync.test.cjs`
- `grep -q "discoverSprintTrackPhases" test/github-sync.test.cjs`
- `grep -q "discoverEpicTrackPhase" test/github-sync.test.cjs`
</acceptance_criteria>
<verify>
<automated>
node --test test/github-sync.test.cjs 2>&1 | tail -20 && \
grep -q "require('../cli/lib/github-sync-discover.cjs')" test/github-sync.test.cjs && \
! grep -q "parseSprintsFile" test/github-sync.test.cjs && \
! grep -q "\.rcode/phases" test/github-sync.test.cjs && \
grep -q "discoverSprintTrackPhases" test/github-sync.test.cjs && \
grep -q "discoverEpicTrackPhase" test/github-sync.test.cjs && \
echo PASS
</automated>
</verify>
<done>test/github-sync.test.cjs imports cli/lib/github-sync-discover.cjs directly, has zero references to the dead .rcode/phases layout, and its discover* tests exercise real current-schema fixtures (sprint-track <task> XML and epic-track EPIC/stories files).</done>
<evidence>Current test/github-sync.test.cjs:345-395 only exercises `.rcode/phases/phase-01/stories/*.md` — the exact dead layout issue #980 reports. discoverPhases itself was never imported/tested at all; only inline replicas of individual lines were asserted.</evidence>
</task>

<task id="44.1.5" type="auto">
<title>Fix stale .rcode/phases/ references in docs/METHODOLOGY.md and docs/USP.md</title>
<read_first>
- docs/METHODOLOGY.md lines 125-150, 390-439 (mermaid diagrams + core-loop listing — the 6 lines containing the literal string `.rcode/phases`: 131, 143, 212, 398, 405, 434)
- docs/USP.md lines 114-132 (the "Upstream-Grounded Workflows" section — line 128 contains the literal string `.rcode/phases/`)
- docs/REFERENCE.md lines 183, 285 (already-correct current paths: `.planning/epics/` — the target these two files should match)
- rcode/workflows/create-epics-and-stories.md lines 1-6, 226-244 (confirms epics live at `.planning/epics/EPIC-{NN}.md` with stories at `.planning/epics/stories/{N}.{M}.md`)
</read_first>
<files>
docs/METHODOLOGY.md
docs/USP.md
</files>
<interfaces>
Scope is strictly the literal substring `.rcode/phases` — do NOT touch nearby `.rcode/decisions/`,
`.rcode/artifacts/`, or `.rcode/context/` references in the same files; those are a different,
unverified, out-of-scope concern not named in GitHub issue #980 or the ROADMAP acceptance
criteria for this phase.
</interfaces>
<action>
In `docs/METHODOLOGY.md`, fix exactly these 6 lines (mechanical string replacement, no other
content on each line changes):
- Line 131: `Check{PRD exists<br/>in .rcode/phases/?}` → `Check{PRD exists<br/>in .planning/?}`
- Line 143: `Write .rcode/phases/{n}/epics.md<br/>with frontmatter citing<br/>inputDocuments` →
  `Write .planning/epics/EPIC-{n}.md<br/>with stories citing<br/>inputDocuments`
- Line 212: `Done([✅ Feature shipped<br/>.rcode/phases/.../stories/])` →
  `Done([✅ Feature shipped<br/>.planning/epics/stories/])`
- Line 398: `→ .rcode/phases/phase-01/brief.md` → `→ .planning/PROJECT.md`
- Line 405: `→ .rcode/phases/phase-{n}/sprints.md` →
  `→ .planning/phases/{n}-{slug}/{n}-{plan}-SPRINT.md`
- Line 434: `Creates/updates milestones, epics, stories from .rcode/phases/` →
  `Creates/updates milestones, epics, stories from .planning/phases/ and .planning/epics/`

In `docs/USP.md`, fix line 128:
`no PRD exists in \`.rcode/phases/\`?` → `no PRD exists in \`.planning/\`?` (keep the rest of the
sentence — the surrounding quote about "Run rcode-create-prd first..." — unchanged).

Line numbers are as of this planning session; re-grep for the literal string before editing in
case the file has shifted since these files were read.
</action>
<acceptance_criteria>
- `! grep -q "\.rcode/phases" docs/METHODOLOGY.md`
- `! grep -q "\.rcode/phases" docs/USP.md`
- `grep -q "\.planning/epics/EPIC-" docs/METHODOLOGY.md`
- `grep -q "\.planning/phases/{n}-{slug}/{n}-{plan}-SPRINT.md" docs/METHODOLOGY.md`
- `grep -q "PRD exists in \`.planning/\`" docs/USP.md`
</acceptance_criteria>
<verify>
<automated>
! grep -q "\.rcode/phases" docs/METHODOLOGY.md && \
! grep -q "\.rcode/phases" docs/USP.md && \
grep -q "\.planning/epics/EPIC-" docs/METHODOLOGY.md && \
grep -q "\.planning/phases/{n}-{slug}/{n}-{plan}-SPRINT.md" docs/METHODOLOGY.md && \
grep -q "PRD exists in \`.planning/\`" docs/USP.md && \
echo PASS
</automated>
</verify>
<done>docs/METHODOLOGY.md and docs/USP.md contain zero references to the literal path .rcode/phases; the 6 corrected METHODOLOGY.md lines and the 1 corrected USP.md line now cite .planning/phases/ or .planning/epics/ as the current REFERENCE.md-matching path.</done>
<evidence>Confirmed via direct grep: docs/METHODOLOGY.md lines 131, 143, 212, 398, 405, 434 and docs/USP.md line 128 are the only occurrences of the literal string `.rcode/phases` in either file. docs/REFERENCE.md:183,285 already correctly say `.planning/epics/` — this task brings the other two docs into agreement, closing the "docs disagree with each other" gap named in issue #980.</evidence>
</task>

<task id="44.1.6" type="auto">
<title>Fix bare SPRINT.md filename references in rcode/workflows/sprint-planning.md</title>
<read_first>
- rcode/workflows/sprint-planning.md lines 46-56, 163-214 (the 4 lines referencing a bare `SPRINT.md` filename: 55, 180, 206, 212)
- rcode/workflows/plan-spawn-planner.md lines 5-12 (the `<filename_convention>` block — the authoritative rule: every SPRINT.md, including the first plan in a phase, uses `{phase}-{plan}-SPRINT.md`, never a bare `{phase}-SPRINT.md`)
</read_first>
<files>
rcode/workflows/sprint-planning.md
</files>
<interfaces>
None — pure text fix, no code interface involved.
</interfaces>
<action>
Fix exactly these 4 lines in `rcode/workflows/sprint-planning.md` — in each, replace the
trailing `/SPRINT.md` with `/{phase}-{plan}-SPRINT.md`, changing nothing else on the line:
- Line 55: `Next Up: \`/rcode-execute .planning/phases/{phase}/SPRINT.md\`` →
  `Next Up: \`/rcode-execute .planning/phases/{phase}/{phase}-{plan}-SPRINT.md\``
- Line 180: `Write SPRINT.md to \`.planning/phases/{phase_slug}/SPRINT.md\`.` →
  `Write SPRINT.md to \`.planning/phases/{phase_slug}/{phase}-{plan}-SPRINT.md\`.`
- Line 206: `/rcode-execute .planning/phases/{phase}/SPRINT.md   ← execute the sprint` →
  `/rcode-execute .planning/phases/{phase}/{phase}-{plan}-SPRINT.md   ← execute the sprint`
- Line 212: `SPRINT.md at \`.planning/phases/{phase_slug}/SPRINT.md\`` →
  `SPRINT.md at \`.planning/phases/{phase_slug}/{phase}-{plan}-SPRINT.md\``

Line numbers are as of this planning session; re-grep for the literal substring
`{phase_slug}/SPRINT.md` and `{phase}/SPRINT.md` before editing in case the file has shifted.
</action>
<acceptance_criteria>
- `! grep -q "{phase_slug}/SPRINT.md" rcode/workflows/sprint-planning.md`
- `! grep -q "{phase}/SPRINT.md" rcode/workflows/sprint-planning.md`
- `grep -c "{phase}-{plan}-SPRINT.md" rcode/workflows/sprint-planning.md` returns at least `4`
</acceptance_criteria>
<verify>
<automated>
! grep -q "{phase_slug}/SPRINT.md" rcode/workflows/sprint-planning.md && \
! grep -q "{phase}/SPRINT.md" rcode/workflows/sprint-planning.md && \
[ "$(grep -c '{phase}-{plan}-SPRINT.md' rcode/workflows/sprint-planning.md)" -ge 4 ] && \
echo PASS
</automated>
</verify>
<done>rcode/workflows/sprint-planning.md writes {phase}-{plan}-SPRINT.md everywhere it names the sprint output file, matching plan-spawn-planner.md's filename_convention block — zero bare SPRINT.md references remain.</done>
<evidence>Confirmed via direct read: lines 55, 180, 206, 212 of rcode/workflows/sprint-planning.md are the only 4 occurrences of a bare `.../SPRINT.md` path. plan-spawn-planner.md:5-12 is the authoritative rule this brings sprint-planning.md into compliance with.</evidence>
</task>

</tasks>

<verification>
- `node --test test/github-sync.test.cjs` passes with zero failures
- `node --check cli/github-sync.js` and `node --check cli/lib/github-sync-discover.cjs` both pass
- `grep -rn "\.rcode/phases" cli/github-sync.js cli/lib/github-sync-discover.cjs test/github-sync.test.cjs docs/METHODOLOGY.md docs/USP.md` returns nothing
- `grep -n "SPRINT.md" rcode/workflows/sprint-planning.md` shows only `{phase}-{plan}-SPRINT.md` forms, no bare `SPRINT.md`
- Manual check (not automatable without a live `gh auth` session): `rcode github-sync --phase <N> --dry-run` run inside a real project with `.planning/phases/{N}-slug/*-SPRINT.md` produces a story preview per `<task>` found, and the same command run inside a project with only `.planning/epics/` content previews epics + stories from that track with no milestone created for the synthetic 'epics' phase
</verification>

<success_criteria>
- `cli/github-sync.js` reads the current sprint-track and epic-track artifact layouts instead of the dead `.rcode/phases/{N}/tasks|stories/` directory split
- `docs/METHODOLOGY.md` and `docs/USP.md` agree with `docs/REFERENCE.md` on the current path convention
- `rcode/workflows/sprint-planning.md` follows the same SPRINT.md filename convention as `rcode/workflows/plan-spawn-planner.md`
- `test/github-sync.test.cjs` regression-tests the new discovery module against real current-schema fixtures, not just the dead layout
</success_criteria>

<output>
Create `.planning/phases/44-github-sync-path-drift-dead-rcodephases-layout-in-cli-stale-docs-sprintmd-filename-convention-issue-980/44-1-SUMMARY.md`
</output>

## Files Touched

**Creates:**
- `cli/lib/github-sync-discover.cjs` — phase/epic/story discovery for both the sprint-track (`.planning/phases/*/*-SPRINT.md`) and epic-track (`.planning/epics/`) artifact layouts

**Modifies:**
- `cli/github-sync.js` — requires the new discovery module, removes all dead `.rcode/phases` code and string literals, skips milestone creation for the synthetic epic-track phase
- `test/github-sync.test.cjs` — imports `cli/lib/github-sync-discover.cjs` directly; replaces dead-layout fixtures with current-schema sprint-track and epic-track fixtures
- `docs/METHODOLOGY.md` — 6 lines corrected from `.rcode/phases/` to `.planning/phases/` or `.planning/epics/`
- `docs/USP.md` — 1 line corrected from `.rcode/phases/` to `.planning/`
- `rcode/workflows/sprint-planning.md` — 4 lines corrected from bare `SPRINT.md` to `{phase}-{plan}-SPRINT.md`

**Tests:**
- `test/github-sync.test.cjs` — new/updated tests for `discoverSprintTrackPhases`, `discoverEpicTrackPhase`, `discoverPhases`, and the sprint-id-normalizing `applyGranularFilters`
