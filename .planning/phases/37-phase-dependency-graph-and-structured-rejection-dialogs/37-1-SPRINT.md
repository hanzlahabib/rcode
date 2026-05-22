---
phase: 37-phase-dependency-graph-and-structured-rejection-dialogs
plan_number: 1
sprint: 37.1
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [DSH-6]
files_modified:
  - server/lib/scanner.js
  - server/lib/html/client/views/RoadmapView.js
  - server/lib/html/css.js
must_haves:
  truths:
    - User opens the Roadmap view and sees the milestone's phases drawn as an SVG node graph laid out left-to-right by dependency wave.
    - A phase that depends on another phase sits in a later column than the phase it depends on, with a connecting edge drawn between them.
    - The graph renders with no graph library and no build step — pure inline SVG inside a Preact component.
  artifacts:
    - server/lib/scanner.js exposes a per-phase depends_on array on every phaseTree entry.
    - server/lib/html/client/views/RoadmapView.js contains a PhaseGraph component that renders an <svg> element.
  key_links:
    - scanner.js buildPhaseTree aggregates each phase's sprint-level depends_on (from SPRINT.md frontmatter) into a phase-level depends_on, resolving sprint IDs to parent phase IDs.
    - RoadmapView PhaseGraph reads phase.depends_on from the store-provided phaseTree to compute wave columns.
---

<objective>
Render the milestone's phases as a hand-rolled inline-SVG dependency graph in the Roadmap view, laid out by `depends_on` wave.
Purpose: DSH-6 — give the user a visual map of which phases block which, derived from real `depends_on` data already present in SPRINT.md frontmatter.
Output: a `depends_on` array on every `phaseTree` phase (scanner.js), a `PhaseGraph` Preact/SVG component in RoadmapView.js, and supporting CSS.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
</context>

<grounding_notes>
Verified before planning:
- `grep -rn "depends_on" server/` → ZERO hits. scanner.js does NOT parse depends_on today; it must be added.
- Phase records in `.rcode/state.json` have keys `id, number, name, slug, goal, status, created, started, completed, plan_count, sprints` — NO `depends_on` key. Phase-level depends_on does not exist as data.
- `depends_on` exists only in SPRINT.md frontmatter as a YAML array, e.g. `depends_on: []` (verified in 30-1-SPRINT.md, 31.1, 32.1). Phase-level dependency must be DERIVED by aggregating sprint depends_on and mapping sprint IDs (`NN.S`) back to phase IDs (`NN`).
- `scanner.js` `buildPhaseTree` (lines 46-119) already reads every `*-SPRINT.md` file and runs `parseSimpleYaml` on its frontmatter (line 73). `parseSimpleYaml` (lines 24-32) only handles scalar `key: value` lines — it drops `depends_on: [a, b]` because the value is an array. An array-aware extraction is needed.
- RoadmapView.js reads `S.phases` from the store (line 156); `App.js` `fetchAndRerender` sets `phases` from `newState.phaseTree` (App.js:139). So adding `depends_on` to phaseTree entries flows to the view with no client wiring change.
- icons-client.js icon names available: home, activity, map, target, layers, zap, checkSquare, kanban, file, users, scale, database, play, terminal, square, minimize, maximize, clock, eye, filePen, hourglass, building, link, brain, flag, monitor, copy, lightbulb, moon, sun. No `git-branch` icon — use `layers` for the graph section header.
</grounding_notes>

<tasks>

<task id="37.1.1" type="auto">
<title>Parse sprint-level depends_on in scanner.js and derive a phase-level depends_on</title>
<read_first>
- server/lib/scanner.js (lines 24-119 — parseSimpleYaml and buildPhaseTree)
</read_first>
<files>
server/lib/scanner.js
</files>
<interfaces>
- `function parseSimpleYaml(text)` — current signature, returns `{ [key]: string }`. Scalar-only today.
- `function buildPhaseTree(projectDir, rawPhases)` — returns `Array` of phases each with a `sprints` array. Each sprint object currently `{ id, number, goal, status, stories }`.
- Sprint frontmatter shape (verified): `depends_on: []` or `depends_on: [31.1, 31.2]` — a YAML inline array of sprint IDs in `NN.S` form.
</interfaces>
<action>
1. Add a helper `parseYamlList(text, key)` to scanner.js (place it directly after `parseSimpleYaml`, ~line 33):
   - Match a line `^${key}:\s*\[(.*)\]\s*$` for inline arrays — split the captured group on `,`, trim each item, strip surrounding quotes, drop empties. Return `string[]`.
   - Also match a block list: `^${key}:\s*$` followed by consecutive `^\s*-\s*(.+)$` lines. Return those trimmed values.
   - If `key` is absent, return `[]`.
2. In `buildPhaseTree`, inside the `sprintFiles.map(f => { ... })` callback (currently lines 67-114): after computing `fm` (the frontmatter object at line 73), extract `const dependsOn = parseYamlList((text.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '', 'depends_on');` and include `dependsOn` on the returned sprint object: `return { id: sid, number: num, goal: ..., status, stories, dependsOn };`.
3. After the `sprints` array is built (before `return { ...p, sprints };` at line 117), compute the phase-level depends_on:
   - Collect every sprint's `dependsOn` entry across all sprints in this phase.
   - For each entry (a sprint ID like `31.2`), take the integer part before `.` as the dependency phase ID (`31`).
   - Drop any dependency equal to this phase's own `intId` (a sprint depending on a sibling sprint in the same phase is NOT a cross-phase dependency).
   - Deduplicate. Result is `phaseDependsOn` — a `string[]` of phase IDs.
   - Return `{ ...p, sprints, dependsOn: phaseDependsOn }`.
4. Do not touch the `scanState` phase mapping (lines 164-229) — `phaseTree` (line 290) is the object the Roadmap consumes; that is the only one that needs `dependsOn`.
Keep the file pure Node stdlib — no new requires.
</action>
<acceptance_criteria>
- `grep -q "function parseYamlList" server/lib/scanner.js` exits 0.
- `grep -q "dependsOn" server/lib/scanner.js` exits 0.
- `node --check server/lib/scanner.js` exits 0.
- Running `node -e "const{scanState}=require('./server/lib/scanner.js');const s=scanState(require('path').resolve('.rcode'));const pt=s.phaseTree||[];console.log(pt.every(p=>Array.isArray(p.dependsOn)))"` prints `true`.
</acceptance_criteria>
<verify>
<automated>
node --check server/lib/scanner.js && grep -q "function parseYamlList" server/lib/scanner.js && grep -q "dependsOn" server/lib/scanner.js && node -e "const{scanState}=require('./server/lib/scanner.js');const s=scanState(require('path').resolve('.rcode'));const pt=s.phaseTree||[];if(!pt.every(p=>Array.isArray(p.dependsOn)))process.exit(1)"
</automated>
</verify>
<done>Every phase in the dashboard's phaseTree carries a derived `dependsOn` array of phase IDs aggregated from its sprints' SPRINT.md frontmatter.</done>
</task>

<task id="37.1.2" type="auto">
<title>Add a hand-rolled SVG PhaseGraph component to RoadmapView.js</title>
<read_first>
- server/lib/html/client/views/RoadmapView.js (full file — RoadmapView function at lines 154-238, imports at 15-21)
- server/lib/html/client/components/shared.js (Chip component, lines 31-34)
</read_first>
<files>
server/lib/html/client/views/RoadmapView.js
</files>
<interfaces>
- `useStore()` returns `{ phases, milestone, ... }`. After task 37.1.1, each `phases[i]` has `{ id, name, status, sprints, dependsOn }`.
- `Chip` from shared.js: `<${Chip} status=${status}/>`.
- `Icon` from icons-client.js: `<${Icon} name="layers" size=${14}/>` — `layers` is a verified icon name.
- htm/Preact via `import { html, useState } from '../preact.js'` (already imported at line 15).
</interfaces>
<action>
1. Add a `PhaseGraph({ phases })` component near the top of RoadmapView.js (after the existing `TreeNode` helper, ~line 47).
2. Wave computation (pure function `computeWaves(phases)` inside the module):
   - Build a map `id -> phase`. For each phase, `wave = 0` if `dependsOn` is empty or none of its deps resolve to a known phase; else `wave = 1 + max(wave of each resolved dependency)`.
   - Compute iteratively (repeat passes until no wave value changes, max `phases.length` passes — guards against a dependency cycle).
   - Return `phases` annotated with a numeric `wave`.
3. Layout (no graph library — plain arithmetic):
   - Group phases by `wave`. Column `x = 24 + wave * 200`. Within a column, `y = 24 + index * 72`.
   - Node box: `width 168`, `height 52`, rounded rect (`rx="8"`).
   - SVG `width = 24 + (maxWave + 1) * 200`, `height = 24 + maxRows * 72`. Set `viewBox` to match; the `<svg>` element gets `class="phase-graph-svg"`.
4. Render order inside `<svg>`:
   - Edges FIRST (so nodes paint over them): for each phase with a dep, draw a `<line>` (or `<path>` cubic) from the right-center of the dependency node to the left-center of the dependent node, `class="phase-graph-edge"`, with `marker-end` referencing an arrowhead `<marker>` defined in `<defs>`.
   - Then a `<g>` per phase: `<rect class=${'phase-graph-node phase-graph-' + statusSlug}>`, a `<text>` with `P{id}`, and a second `<text>` with a truncated name (slice to ~18 chars). Wrap each node `<g>` in an `onClick` that sets `location.hash = 'phases/' + p.id`, plus `style="cursor:pointer"`.
   - Status color comes from a CSS class (`phase-graph-complete`, `phase-graph-in_progress`, `phase-graph-planned`) — see task 37.1.3. Do NOT use inline `style` for fill colors.
5. In `RoadmapView`, render `PhaseGraph` between the `view-title` and the `filter-bar` (~line 204), inside a collapsible `<details class="phase-graph-wrap">` with a `<summary>` reading `<${Icon} name="layers" size=${14}/> Dependency Graph` so it does not crowd the tree. Default the `<details>` open.
6. If `phases.length === 0`, `PhaseGraph` returns `null`.
Do NOT add any import from a CDN or graph library. Do NOT use the `style` attribute for anything other than `cursor:pointer` (allowed — it is not a color/layout token).
</action>
<acceptance_criteria>
- `grep -q "function PhaseGraph" server/lib/html/client/views/RoadmapView.js` exits 0.
- `grep -q "computeWaves" server/lib/html/client/views/RoadmapView.js` exits 0.
- `grep -q "<svg" server/lib/html/client/views/RoadmapView.js` exits 0.
- `grep -Eq "xyflow|dagre|d3" server/lib/html/client/views/RoadmapView.js` exits 1 (NO graph library import).
- `node --input-type=module --check < server/lib/html/client/views/RoadmapView.js` exits 0.
</acceptance_criteria>
<verify>
<automated>
node --input-type=module --check < server/lib/html/client/views/RoadmapView.js && grep -q "function PhaseGraph" server/lib/html/client/views/RoadmapView.js && grep -q "computeWaves" server/lib/html/client/views/RoadmapView.js && grep -q "<svg" server/lib/html/client/views/RoadmapView.js && ! grep -Eq "xyflow|dagre|d3" server/lib/html/client/views/RoadmapView.js
</automated>
</verify>
<done>The Roadmap view shows a collapsible inline-SVG graph of phases positioned in dependency-wave columns with connecting edges.</done>
</task>

<task id="37.1.3" type="auto">
<title>Add design-token CSS for the phase dependency graph</title>
<read_first>
- server/lib/html/css.js (lines 1020-1041 — Toast block, for the class-block style convention; lines 250-262 — overlay/token usage)
</read_first>
<files>
server/lib/html/css.js
</files>
<action>
Append a `/* ── Phase dependency graph ── */` block to the CSS string in css.js. Add rules for:
- `.phase-graph-wrap` — `margin-bottom: var(--space-4)`; `summary` styled like the existing `.cmd-hints summary` (reuse cursor/padding/color tokens).
- `.phase-graph-svg` — `max-width: 100%`; `display: block`; `overflow: visible`.
- `.phase-graph-node` — `fill: var(--bg-elev-2)`; `stroke: var(--border)`; `stroke-width: 1`.
- `.phase-graph-node:hover` — `stroke: var(--accent-blue)`.
- `.phase-graph-complete` — `stroke: var(--accent-green)`.
- `.phase-graph-in_progress` — `stroke: var(--accent-amber)`.
- `.phase-graph-planned` — `stroke: var(--border)`.
- `.phase-graph-edge` — `stroke: var(--text-tertiary)`; `stroke-width: 1.5`; `fill: none`.
- `.phase-graph-label` — `fill: var(--text-primary)`; `font-size: var(--text-xs)`; `font-weight: 600`.
- `.phase-graph-sublabel` — `fill: var(--text-secondary)`; `font-size: 10px`.
- An arrowhead marker style: `.phase-graph-arrow { fill: var(--text-tertiary); }`.
Use ONLY existing CSS custom properties — verify each token name exists elsewhere in css.js before using it (`grep -n "<token>" server/lib/html/css.js`). If a token does not exist, fall back to the closest existing one rather than inventing a name.
</action>
<acceptance_criteria>
- `grep -q "phase-graph-svg" server/lib/html/css.js` exits 0.
- `grep -q "phase-graph-edge" server/lib/html/css.js` exits 0.
- `node --check server/lib/html/css.js` exits 0.
- `node server/dashboard.js` boots without throwing (kill after start).
</acceptance_criteria>
<verify>
<automated>
node --check server/lib/html/css.js && grep -q "phase-graph-svg" server/lib/html/css.js && grep -q "phase-graph-edge" server/lib/html/css.js && timeout 4 node server/dashboard.js >/dev/null 2>&1 & sleep 2 && curl -s localhost:7717 >/dev/null && echo BOOT_OK
</automated>
</verify>
<done>The phase graph nodes and edges render with theme-consistent colors driven entirely by design tokens.</done>
</task>

</tasks>

<verification>
- `node --check server/lib/scanner.js` and `node --input-type=module --check < server/lib/html/client/views/RoadmapView.js` both exit 0.
- `node server/dashboard.js` starts clean on :7717.
- The Roadmap view shows an SVG dependency graph; phases with a `dependsOn` entry sit in a later wave column than their dependency, joined by an edge.
- No `@xyflow`, `@dagrejs/dagre`, or `d3` import anywhere — `grep -rE "xyflow|dagre" server/lib/html/client` returns nothing.
</verification>

<success_criteria>
- DSH-6 satisfied: user views the milestone's phases as an SVG graph laid out by `depends_on` waves.
- `depends_on` is real data sourced from SPRINT.md frontmatter, aggregated to phase level in scanner.js — not invented.
- No new build step, no new dependency, `dashboard.js` unchanged (view-only boundary intact).
</success_criteria>

<output>
Create `.planning/phases/37-phase-dependency-graph-and-structured-rejection-dialogs/37-1-SUMMARY.md`
</output>
