# AUDIT — Schema Drift (docs/workflows/CLI vs. actual current output)

**Scope:** Directory-layout, file-schema, and path claims in `rcode/`, `docs/`, `server/`, `cli/` that no longer match what the real writer (planner/executor/scanner/CLI) currently produces or reads. Diagnosis only — nothing in this repo was modified to produce this report.

**Method:** Grepped for path-like literals (`.rcode/`, `.planning/`, `.claude/`, `<task`, `<title>`, `title="`, `planning_artifacts`) across `rcode/`, `docs/`, `server/`, `cli/`, then cross-checked each candidate against the actual writer/reader code (`server/lib/scanner.js`) and ~34 real `*-SPRINT.md` files under `.planning/`.

**Correction to the task brief:** the brief describes `cli/github-sync.js` as "fixed today." That is not accurate as of this audit — `git log --oneline -- cli/github-sync.js` shows its last change was commit `74937ba` (an older, unrelated fix); the file at HEAD (line 200: `path.join(cwd, '.rcode/phases')`) is unchanged. Commit `15c45d0` ("chore(rcode): plan phase 44 — github-sync path drift fix (#980)") only wrote a *plan* (`.planning/phases/44-.../44-1-SPRINT.md`, `current_sprint: "44.1"` in `.rcode/state.json`) — no `44-1-SUMMARY.md` exists, so the plan has not been executed. This bug is still live. Ranked #1 below accordingly.

---

## 1. `cli/github-sync.js` still hardcodes the dead `.rcode/phases/` layout — NOT fixed, only planned

**Status:** Live bug, currently shipping. A plan to fix it exists but has not run.

- `cli/github-sync.js:200` — `const phasesDir = path.join(cwd, '.rcode/phases');`
- `cli/github-sync.js:484` — `` `ℹ  No phases found in .rcode/phases/ — nothing to sync.` ``
- `cli/github-sync.js:705,788,895,906,940,951` — issue-body `Source:` lines templated as `` .rcode/phases/${epic.phase}/tasks/${epic.file} `` / `stories/${story.file}`
- `cli/github-sync.js:160` — docstring: "Parse `.rcode/phases/{phase}/sprints.md`"

**Actual current layout** (confirmed via `.planning/ROADMAP.md`, `.planning/STATE.md`, `server/lib/scanner.js:132`, and 34 real `*-SPRINT.md` files): sprint-track artifacts live at `.planning/phases/{phase-slug}/{phase}-{plan}-SPRINT.md` with `<task>` XML; epic-track artifacts live at `.planning/epics/` (confirmed current in `docs/REFERENCE.md:183,285`). `.rcode/phases/` has not existed since the v4.0 rebrand (commit `4da7c1e`).

**Why this ranks #1:** `github-sync` is a CLI tool an agent or human runs directly (`rcode github-sync`) expecting it to sync real project state to GitHub. Right now it silently reports "no phases found" against a directory that has never existed post-rebrand and syncs nothing — a planner/executor has no way to discover this without reading the source, since the tool exits cleanly (exit 0, per the fix in `74937ba` for a *different* issue) rather than erroring.

**Already tracked:** `.planning/phases/44-github-sync-path-drift.../44-1-SPRINT.md` (tasks 44.1.1–44.1.6), issue #980. Plan is written, well-evidenced, and correctly scoped — it just hasn't been executed yet.

---

## 2. `rcode/workflows/sprint-planning.md` still writes a bare `SPRINT.md` — invisible to the scanner

**Status:** Live bug. A fix is planned (task 44.1.6 in the same phase-44 sprint above) but not executed.

- `rcode/workflows/sprint-planning.md:180` — "Write SPRINT.md to `.planning/phases/{phase_slug}/SPRINT.md`"
- Same bare-filename pattern repeated at lines 55, 206, 212.

**Code that actually reads sprint files — `server/lib/scanner.js:132`:**
```js
const sprintFiles = files.filter(f => /-SPRINT\.md$/i.test(f)).sort();
```
This regex requires a **hyphen immediately before** `SPRINT.md` (i.e. `{phase}-{plan}-SPRINT.md`, e.g. `44-1-SPRINT.md`). A bare `SPRINT.md` has no leading hyphen and **does not match** — `sprintFiles` would be empty for that phase, so `p.sprints` stays unset and every story in that sprint silently vanishes from the dashboard. This is a stricter failure than the "Task 1/2/3" bug fixed today: it drops the entire sprint, not just its titles.

**Contradicts its own house style:** `rcode/workflows/plan-spawn-planner.md:5-12` (`<filename_convention>`) is unambiguous: "Every SPRINT.md... uses the sequence-numbered form `{phase}-{plan}-SPRINT.md`... Do NOT emit a bare `{phase}-SPRINT.md`." Two workflows that both spawn/produce sprint plans disagree with each other on the output filename.

**Why this ranks #2:** `/rcode-sprint-planning` is a live, reachable slash command (`rcode/commands/sprint-planning.md` → `rcode/workflows/sprint-planning.md`). Any planner agent that follows this workflow literally produces a file the dashboard's own discovery regex cannot see at all.

---

## 3. The on-demand task-template file the planner is explicitly told to consult uses a schema scanner.js has never supported

**Status:** Live bug risk — would reproduce the exact bug fixed in `v4.7.3` today, via a different code path.

- `rcode/references/planner-playbook.md:53-58` ("On-Demand Rule Files" table) tells the planner: "Task templates by type | Read `.rcode/agents-rules/planner/task-templates.md`" — this is the authoritative, explicitly-pointed-to reference for **what a `<task>` block should look like**.
- `rcode/agents/rules/planner/task-templates.md:6-14` (mirrored at `.rcode/agents-rules/planner/task-templates.md:6-14`):
```xml
<task type="auto">
  <name>Task: [Action-oriented name]</name>
  <files>path/to/file.ext, path/to/another.ts</files>
  <action>...</action>
  ...
</task>
```
Note: **no `id="..."` attribute on `<task>`, and the title lives in a `<name>` child tag** — not `title="..."` and not `<title>`.

**Scanner code — `server/lib/scanner.js:156-165`:**
```js
const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;
...
const idM        = tm[1].match(/id="([^"]+)"/);
const titleAttrM = tm[1].match(/title="([^"]*)"/);
const titleTagM  = tm[2].match(/<title>([\s\S]*?)<\/title>/);
```
Neither `titleAttrM` nor `titleTagM` matches a `<name>` child tag. A task block written per `task-templates.md` would fall straight back to the placeholder `` `Task ${stories.length + 1}` `` (line 165) — the identical symptom `CHANGELOG.md`'s v4.7.3 entry says was just fixed, produced by a template the fix never touched. It would also have no `id`, breaking `ov[story.id]` status-override lookups (line 168) and the wave/dependency machinery that keys off task/story IDs elsewhere in the pipeline.

**Cross-check against real output:** of 34 real `*-SPRINT.md` files under `.planning/`, **zero** use `<name>` for a task title; 32 use `<title>...</title>` as a child tag (the format `scanner.js`'s own comment calls "legacy"); only 2 (`32-3-SPRINT.md`, `44-1-SPRINT.md` — both very recent) use `title="..."` as an attribute. `task-templates.md` matches neither real format actually produced.

**Why this ranks #3:** this isn't a stale doc a human might skim past — it's a file `planner-playbook.md` names as the specific, mandatory reference to load "when you need... task templates by type," i.e. it is designed to be read and followed literally by the planner agent mid-task.

---

## 4. `rcode/templates/sprint.md` — the file `rcode-planner.md` names as ITS OWN output template — is a markdown table with zero `<task>` XML

**Status:** Confirmed via direct read; matches the task brief's own description exactly.

- `rcode/agents/rcode-planner.md:29` — "**Output:** Write SPRINT.md (not PLAN.md) using the template at `rcode/templates/sprint.md`."
- `rcode/templates/sprint.md:14-18`:
```markdown
## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| {story_id} | {title} | {points} | {status} | {verifiable_ac} |
```
The entire file (70 lines) contains no `<task>`, `<tasks>`, `<title>`, `<action>`, `<verify>`, `<done>`, or `<acceptance_criteria>` tag — nothing scanner.js's `taskRe` (line 156) or its fallback heading regex (`/^#{2,4}\s+(?:Story|Task)\s+.../gm`, line 183) can match. A planner that filled in this table literally would produce a SPRINT.md scanner.js parses as having **zero stories in every sprint** (`stories.length === 0`, both the primary and fallback loops find nothing) — a stricter failure than #3 above (no placeholder titles at all, just an empty list).

**Not installed in this project:** `.rcode/templates/` (this repo's own dogfood install) has no `sprint.md` at all — only `rcode/workflows/sprint-planning.md:180`'s fallback path ("produce the file inline with these sections... Fill in: Sprint goal / Stories table / Capacity section / Dependencies / Risks") kicks in, which is the *same* table-shaped instruction set as the stale template — so the drift reproduces itself even without the template file present.

**Why this ranks #4 (not higher):** `rcode-planner.md:27`, two lines above, tells the planner to use `### Story {sprint-id}.{NN} — {name}` headings instead — the planner agent's own role text partially self-corrects toward the (still-outdated) heading fallback format rather than the table. It is unclear which instruction a planner run actually follows, which is itself the underlying problem (see #5).

---

## 5. `rcode-planner.md` + its `@`-included playbook disagree with each other and with reality on the output schema — three incompatible formats in one agent's context

**Status:** Internal contradiction, confirmed by direct read of all three sources.

Within the single planner agent's assembled context:
- `rcode/agents/rcode-planner.md:27` — "Hierarchical IDs: Every story must have a hierarchical ID **in its heading**: `### Story {sprint-id}.{NN} — {name}`" → markdown heading format (scanner.js's *legacy fallback*, not its primary path).
- `rcode/agents/rcode-planner.md:29` — "using the template at `rcode/templates/sprint.md`" → pure markdown table, no headings, no XML at all (see #4).
- `rcode/agents/rcode-planner.md:12` `@`-includes `rcode/references/planner-playbook.md`, whose only concrete task-schema example (`## Plan Structure`, lines 159-199) shows a completely different structure — `<objective>`/`<execution_context>`/`<context>`/`<tasks>[2-3 tasks max]</tasks>`/`<verification>`/`<success_criteria>`/`<output>Create .../{phase}-{plan}-SUMMARY.md</output>` — which is the **PLAN.md/SUMMARY.md** shape from the pre-SPRINT.md system, directly contradicting `rcode-planner.md:29`'s explicit "Write SPRINT.md (**not** PLAN.md)."

None of the three sources shows the format 32 of 34 real SPRINT.md files actually use (`<task id="X.Y.Z" type="auto"><title>...</title>...`). A planner assembling its understanding of "what do I output" from its own `@`-included context has no single consistent, correct answer to draw from — it currently produces the right format anyway (evidently by pattern-matching prior sprint files it reads via `<context>`, not by following its own instructions), which is a fragile way to stay correct.

---

## 6. `rcode/agents/rules/verifier/verification-report.md` tells the verifier to write its report to the dead `.rcode/phases/` path

**Status:** Live drift in an operative rule file (not a doc), mirrored in the installed copy.

- `rcode/agents/rules/verifier/verification-report.md:7` — "Create `.rcode/phases/{phase_dir}/{phase_num}-VERIFICATION.md`:"
- `rcode/agents/rules/verifier/verification-report.md:111` — "**Report:** .rcode/phases/{phase_dir}/{phase_num}-VERIFICATION.md"
- Mirrored at the installed path `.rcode/agents-rules/verifier/verification-report.md:7,111` — i.e. this is what actually gets loaded into a live `/rcode-verify-phase` run in this repo today.

**Real location** (per `rcode-verifier` agent description and actual repo layout — `.planning/phases/{phase}/` holds `SPRINT.md`/`SUMMARY.md`/`CHECK.md` siblings): verification artifacts belong under `.planning/phases/{phase-dir}/`, not `.rcode/phases/`.

**Why this matters to an agent, not just a reader:** `rcode-verifier` (Tools: Read, Write, Bash, Grep, Glob) would attempt to `Write` to a nonexistent `.rcode/phases/{phase_dir}/` directory. Depending on how the Write tool handles a missing parent directory, this either fails outright or silently creates an orphaned `.rcode/phases/` tree that no other tool (scanner, dashboard, github-sync) will ever read back — the verification report becomes undiscoverable.

---

## 7. `cli/lib/config.cjs`'s `planning_artifacts` default is the dead `.rcode/phases` path — consumed by ~30 skill files, but those skills appear to be dead code (lower live-risk than it first looks)

**Status:** Confirmed stale default; consumer reachability investigated and is likely low.

- `cli/lib/config.cjs:52` — `planning_artifacts: '.rcode/phases',` (hardcoded default in the 3-level config cascade: hardcoded → `~/.rcode/defaults.json` → `{cwd}/.rcode/config.json`).
- This repo has no `.rcode/config.json` (confirmed: `ls .rcode/*.json` shows only `HANDOFF.json`, `state.json`), so **this repo's own dogfood config resolves `planning_artifacts` to `.rcode/phases`** — a directory that has not existed since the v4.0 rebrand, while its actual planning artifacts live at `.planning/`.
- `{planning_artifacts}` is interpolated across ~30 files under `rcode/skills/actions/{1-analysis,2-plan,3-solutioning,4-implementation}/` — e.g. `rcode-create-prd/workflow.md:3`, `rcode-create-epics-and-stories/steps/step-01-validate-prerequisites.md:163-228`, `rcode-create-architecture/steps/step-01-init.md:98`, `rcode-validate-prd/steps-v/step-v-01-discovery.md:69-82`, `rcode-retrospective/workflow.md:77-81`, `rcode-correct-course/workflow.md:29-39`, and more.

**Mitigating finding — these skills are not wired to any live command:** all 117 files under `rcode/commands/*.md` were checked; **zero** `@`-include anything under `rcode/skills/actions/` or `rcode/skills/core/`. Every live command routes through `rcode/workflows/` instead (e.g. `/rcode-create-prd` → `@.rcode/workflows/create-prd.md`, `/rcode-create-epics-and-stories` → `@.rcode/workflows/create-epics-and-stories.md`, both of which hardcode `.planning/` paths directly and never reference `{planning_artifacts}`). The `rcode/skills/actions/` tree reads like an older BMAD-style import that a slash command no longer reaches — so the dead default is real, but its blast radius (an agent actually executing one of these skill files) looks small under the current command surface. Flagging it regardless because: (a) the default is simply wrong regardless of reachability, (b) if any future command is wired to this tree, or a user manually pastes one of these skill files into a prompt, it inherits the dead path silently, and (c) `cli/lib/config.cjs` is core, actively-maintained CLI infrastructure, not an abandoned file.

**Related, smaller drift in the same vein:** `rcode/workflows/new-project-roadmap.md:6` and `rcode/workflows/new-project-research.md:6` — both *live* (reached from `/rcode-new-project`) — document `{planning_artifacts}` as an "Invariant from parent... Set in new-project.md Steps 1–5.5," but `rcode/workflows/new-project.md` never actually defines or references `planning_artifacts` anywhere in its own text (grep confirms zero hits) — it hardcodes `.planning/...` paths directly throughout instead. The variable is inherited-in-name only; harmless in practice (nothing downstream actually substitutes it) but a dangling/orphaned reference in two live files.

---

## 8. Scattered literal `.rcode/phases/` references in individual live-adjacent skill/rule files

**Status:** Lower severity — mostly inside `rcode/skills/agents/*/SKILL.md` "Examples" sections (illustrative, human-facing sample commands) or the same unreachable `skills/actions/` tree as #7, but two are operative rule files worth flagging on their own:

- `rcode/brain/best-practices/state-sync-rule.md:11` and its mirror `rcode/skills/_shared/state-sync-rule.md:11` — "`.rcode/phases/{phase}/sprint-{N}.md` — sprint commitments" — this is a cross-cutting best-practice file (likely `@`-included by multiple agents given the `_shared` location), citing both a dead directory (`.rcode/phases`) and a dead filename pattern (`sprint-{N}.md` instead of `{phase}-{plan}-SPRINT.md`).
- `rcode/skills/agents/hussain-sm/SKILL.md:111,120` and `rcode/skills/agents/hussain-pm/SKILL.md:145` — instruct these persona agents to read/save `.rcode/phases/{current}/epics.md`, `.rcode/phases/{current}/stories/story-{id}.md`, `.rcode/phases/{current}/prd.md` — same dead path, and these SKILL.md files are more likely to be read literally than the pure BMAD `actions/` tree since agent personas (`rcode-hussain-pm`, routed via `/rcode-council`) are live-reachable.
- `rcode/templates/github/{feature,epic,task}-template.md` (lines 55, 57, 52 respectively) — "Generated by rcode — `.rcode/phases/{{phase}}/...`" footer boilerplate. Grep confirms no code under `cli/` or `server/` actually loads these template files (`github-sync.js` builds its issue bodies from inline template literals, separately) — likely orphaned/unused template files rather than a live output path, but worth a follow-up check before assuming either way.

---

## Lower-priority / already-tracked, not re-litigated here

- `FIXLIST.md:30` already flags "`verify-phase` `.rcode/phases` vs `.planning/phases` discrepancy not confirmed in current code; investigate separately" — finding #6 above is that confirmation.
- `docs/adr/0001-github-sync-as-cli.md:12,17` and `docs/adr/0002-pivot-to-skill-driven-state.md:16` document `.rcode/phases/` as the design at time-of-writing (historical ADRs, not live instructions to an agent) — not re-flagged as an independent finding, but worth a one-line "superseded by `.planning/`" note if these ADRs are ever revised.
- `audit/11-migration-gaps.md:175` is a `sed` migration script from the rihal→rcode rename, operating on `.rihal/phases/` → `.rcode/phases/` — historical migration tooling, not a current schema claim.
- `docs/METHODOLOGY.md` (lines 131,143,212,398,405,434) and `docs/USP.md:128` still contain the dead `.rcode/phases/` path as of this audit — **this is the same unexecuted phase-44 plan as finding #1/#2** (task 44.1.5 targets exactly these lines). Not a new finding; confirming the plan's scope is accurate and still pending.

---

## Summary table (ranked by likelihood of misleading a planner/executor agent, not a human reader)

| # | Location | Claims | Reality | Executed fix? |
|---|---|---|---|---|
| 1 | `cli/github-sync.js:200,484,705+` | `.rcode/phases/` | dead since `4da7c1e` (v4.0) | No — planned only (44.1.1-.4) |
| 2 | `rcode/workflows/sprint-planning.md:55,180,206,212` | bare `SPRINT.md` | scanner regex requires `-SPRINT.md` suffix; bare file is invisible | No — planned only (44.1.6) |
| 3 | `rcode/agents/rules/planner/task-templates.md:6-14` | `<task type="auto"><name>` | scanner reads `title=`/`<title>` only, never `<name>`; no `id=` either | No |
| 4 | `rcode/templates/sprint.md` (whole file) | markdown table, no XML | scanner needs `<task>` or `### Story` heading; table matches neither | No |
| 5 | `rcode/agents/rcode-planner.md:27,29` + `planner-playbook.md:159-199` | 3 mutually-contradictory schemas in one agent's context | 32/34 real files use `<task id><title>` (none of the 3 documented) | No |
| 6 | `rcode/agents/rules/verifier/verification-report.md:7,111` | `.rcode/phases/{phase_dir}/...` | real phase dirs are `.planning/phases/{phase_dir}/` | No |
| 7 | `cli/lib/config.cjs:52` | `planning_artifacts: '.rcode/phases'` | real default should track `.planning/`; consumers mostly unreachable (0/117 commands) | No |
| 8 | `state-sync-rule.md:11`, `hussain-sm/pm SKILL.md`, `templates/github/*.md` | `.rcode/phases/...` | dead path, scattered | No |

**Not fixed today, contrary to the task brief's premise:** #1 and #2 (both part of the still-unexecuted `.planning/phases/44-.../44-1-SPRINT.md` plan). #3–#8 are newly identified in this audit and have no existing plan or issue.
