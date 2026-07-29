---
phase: 45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified:
  - rcode/agents/rules/planner/task-templates.md
  - rcode/templates/sprint.md
  - rcode/agents/rcode-planner.md
  - rcode/references/planner-playbook.md
  - rcode/workflows/sprint-planning.md
  - rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md
  - rcode/bin/rcode-tools.cjs
requirements: []
must_haves:
  truths:
    - task-templates.md's Standard/TDD task templates use <task id="..."> + nested <title> (matching scanner.js's primary parse path), not the unsupported <name> child tag
    - rcode/templates/sprint.md's Stories section shows a real <task id title read_first action verify done evidence> XML example instead of a markdown table scanner.js cannot parse
    - rcode/references/planner-playbook.md's "Plan Structure" example matches the actual SPRINT.md schema (frontmatter + <tasks><task id title>...) instead of the old PLAN.md/SUMMARY.md shape
    - rcode/references/planner-playbook.md's <execution_context> template references execute-sprint.md, not the 1000+ line orchestrator file execute.md
    - rcode/workflows/sprint-planning.md's <purpose> block and the rcode-sprint-planning skill's Output Format section stop claiming the skill produces a SPRINT.md when its workflow.md actually produces a different artifact (sprint-status.yaml)
  artifacts:
    - rcode/templates/sprint.md — Stories section replaced with a working <task> XML example
    - rcode/agents/rules/planner/task-templates.md — Standard + TDD templates corrected to <task id> + <title>
  key_links:
    - server/lib/scanner.js lines 156-165 (buildPhaseTree's <task> parser) is the reference implementation every corrected template must match
    - 32/34 real *-SPRINT.md files under .planning/phases/ use <task id="X.Y.Z" type="auto"><title>...</title> — the corrected templates must match this observed real usage, not invent a new format
---

<objective>
Fix GitHub issues #981, #982, #983, #984, #993 — the planner's own output-schema documentation
contradicts itself in three places (task-templates.md, sprint.md template, planner-playbook.md's
Plan Structure example) and none of the three matches what scanner.js actually parses or what 32/34
real SPRINT.md files actually contain (`<task id="X.Y.Z" type="auto"><title>...</title>`). A planner
today gets the right answer only by pattern-matching prior sprint files it happens to read via
`<context>`, not by following its own instructions — this is fragile and the audit (AUDIT-schema-drift.md
findings #3-#5) flags it as one incident away from reproducing the exact `v4.7.3` task-title bug via a
different code path. Also fixes the `<execution_context>` template's dead reference to the 1000+ line
orchestrator file `execute.md` (should be `execute-sprint.md`, the file actually written for the
executor subagent — AUDIT-token-cost.md finding 1), and corrects the `rcode-sprint-planning` workflow's
self-contradicting claim that its "authoritative" skill produces a SPRINT.md when the skill's own
workflow.md produces a structurally different sprint-status.yaml tracker (AUDIT-redundant-work.md
finding 1, Path C).

This is a repo-maintenance/bugfix phase — no numbered requirement IDs apply (`requirements: []`).
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/audits/AUDIT-schema-drift.md
@.planning/audits/AUDIT-token-cost.md
@.planning/audits/AUDIT-redundant-work.md
</context>

<tasks>

<task id="45.1.1" type="auto">
<title>Unify the planner's task-output schema across task-templates.md, sprint.md, and planner-playbook.md</title>
<read_first>
- rcode/agents/rules/planner/task-templates.md lines 1-262 (the WHOLE file — 11 templates total, ALL use the unsupported `<name>` child tag and lack an `id=` attribute: Standard, TDD, Checkpoint: Human Verify, Checkpoint: Decision, Checkpoint: Human Action, Database Migration, API Endpoint, UI Component, Configuration, Documentation, Refactoring — this task's own verify gate greps the whole file, so all 11 must be fixed, not just Standard/TDD)
- rcode/templates/sprint.md lines 14-18 (Stories section is a markdown table scanner.js's taskRe/headRe cannot match at all)
- rcode/references/planner-playbook.md lines 159-199 (Plan Structure example — shows the old PLAN.md/SUMMARY.md shape: `<tasks>[2-3 tasks max]</tasks>`, `<output>Create .../SUMMARY.md</output>` — contradicts rcode-planner.md:29's "Write SPRINT.md (not PLAN.md)")
- server/lib/scanner.js lines 156-165 (the real parser: `const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;` then `tm[1].match(/id="([^"]+)"/)` and `tm[2].match(/<title>([\s\S]*?)<\/title>/)`)
- .planning/phases/44-github-sync-path-drift-dead-rcodephases-layout-in-cli-stale-docs-sprintmd-filename-convention-issue-980/44-1-SPRINT.md lines 57-58 (real working example: `<task id="44.1.1" type="auto">` followed by `<title>...</title>`)
</read_first>
<files>rcode/agents/rules/planner/task-templates.md, rcode/templates/sprint.md, rcode/references/planner-playbook.md</files>
<action>
Re-grep each literal snippet below before editing (line numbers may have shifted since this task was written).

1. `rcode/agents/rules/planner/task-templates.md` — this task's own automated verify gate runs a WHOLE-FILE `grep -q '<name>'` check, so EVERY template in the file that uses the unsupported `<name>` child tag must be fixed, not just Standard/TDD. There are 11 such templates total: Standard Task Template (lines 3-15), TDD Task Template (lines 19-38), Checkpoint: Human Verify Template (lines 42-59), Checkpoint: Decision Template (lines 63-88), Checkpoint: Human Action Template (lines 92-111), Database Migration Task Template (lines 115-132), API Endpoint Task Template (lines 136-163), UI Component Task Template (lines 167-191), Configuration Task Template (lines 195-215), Documentation Task Template (lines 219-238), and Refactoring Task Template (lines 242-262). For EACH of these 11 templates:
   - Change the opening `<task ...>` tag to add an `id="{sprint-id}.{NN}"` attribute (the `id=` attribute scanner.js's `idM` regex requires), preserving whatever `type=`/`gate=`/`tdd=` attributes that template already has (e.g. `<task id="{sprint-id}.{NN}" type="checkpoint:human-verify" gate="blocking">` for the three checkpoint templates, `<task id="{sprint-id}.{NN}" type="auto" tdd="true">` for the TDD template, `<task id="{sprint-id}.{NN}" type="auto">` for the rest).
   - Change that template's `<name>...</name>` child tag to a `<title>...</title>` child tag with the same inner text (nested tag, matching scanner.js's `titleTagM` and the real usage in 32/34 SPRINT.md files — not the unsupported `<name>` tag scanner.js never reads).
   - Add ONE one-line comment above the first template in the file (Standard Task Template), covering the whole file: `<!-- id= and <title> are REQUIRED across every template below — this is what server/lib/scanner.js's buildPhaseTree actually parses. Do not use <name> or a bare title attribute; both are legacy/unsupported paths. -->`

2. `rcode/templates/sprint.md` — replace the `## Stories` markdown table (lines 14-18) with:
   ```markdown
   ## Stories

   <!-- One <task> block per story. id= and <title> are REQUIRED (scanner.js's primary parse path) -->
   <tasks>
   <task id="{sprint_id}.{NN}" type="auto">
   <title>{story title}</title>
   <read_first>{files + line ranges the executor must read before writing}</read_first>
   <files>{exact paths this task creates/modifies}</files>
   <action>{specific implementation instructions}</action>
   <verify>
     <automated>{command < 60 sec}</automated>
   </verify>
   <done>{measurable acceptance criteria}</done>
   <evidence>{grep/lines/creates evidence per issue #649}</evidence>
   </task>
   </tasks>
   ```
   Keep the Capacity/Dependencies/Risks/Files Touched/Sprint Review/Retrospective sections as-is (lines 20-69) — those are legitimately human-facing markdown, not parsed by scanner.js, and are not part of this fix.

3. `rcode/references/planner-playbook.md` — replace the "## Plan Structure" fenced example (lines 159-199) with the actual current SPRINT.md schema:
   ```markdown
   ---
   phase: {phase}
   plan_number: {N}
   wave: {N}
   depends_on: []
   autonomous: true|false
   files_modified: [...]
   requirements: [...]
   must_haves: {truths, artifacts, key_links}
   ---

   <objective>...</objective>
   <execution_context>
   @.rcode/workflows/execute-sprint.md
   @.rcode/templates/summary.md
   </execution_context>
   <context>...</context>
   <tasks>
   <task id="{phase}.{plan}.{N}" type="auto">
   <title>...</title>
   <read_first>...</read_first>
   <files>...</files>
   <action>...</action>
   <verify><automated>...</automated></verify>
   <done>...</done>
   <evidence>...</evidence>
   </task>
   </tasks>
   <verification>...</verification>
   <success_criteria>...</success_criteria>
   <output>Create `.planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md`</output>
   ```
   This removes the stale `<tasks>[2-3 tasks max, each 15-60 min]</tasks>` / SUMMARY.md-only framing that contradicted `rcode-planner.md:29`'s "Write SPRINT.md (not PLAN.md)" instruction.
</action>
<acceptance_criteria>
- `grep -q '<name>' rcode/agents/rules/planner/task-templates.md` returns no match (exit 1)
- `grep -c 'id="' rcode/agents/rules/planner/task-templates.md` returns at least 11 (all 11 templates in the file now show `id=`, not just Standard/TDD)
- `grep -q '<task' rcode/templates/sprint.md` succeeds (the Stories section now contains a `<task>` example)
- `grep -q 'SUMMARY.md' rcode/references/planner-playbook.md` (the corrected Plan Structure example still ends in a `{phase}-{plan}-SUMMARY.md` output, matching rcode-planner.md's actual output contract)
</acceptance_criteria>
<verify>
<automated>
! grep -q '<name>' rcode/agents/rules/planner/task-templates.md && \
[ "$(grep -c 'id=\"' rcode/agents/rules/planner/task-templates.md)" -ge 11 ] && \
grep -q '<task' rcode/templates/sprint.md && \
echo PASS
</automated>
</verify>
<done>task-templates.md (all 11 templates, not just Standard/TDD), sprint.md, and planner-playbook.md all show the same schema (`<task id title>...`), matching server/lib/scanner.js's real parser and 32/34 real SPRINT.md files — zero remaining references to the unsupported `<name>` tag or the old PLAN.md/SUMMARY.md-only structure.</done>
<evidence>AUDIT-schema-drift.md findings #3, #4, #5 (task-templates.md:6-14 `<name>` tag never supported by scanner.js:156-165; rcode/templates/sprint.md:14-18 markdown table matches neither scanner.js's `<task>` path nor its `### Story` heading fallback; planner-playbook.md:159-199's Plan Structure example is the pre-SPRINT.md PLAN.md/SUMMARY.md shape). Confirmed via direct read this session — real 44-1-SPRINT.md:57-58 uses `<task id="44.1.1" type="auto">` + nested `<title>`. Scope note: task-templates.md contains 11 templates using `<name>`, not just Standard/TDD (9 more: both Checkpoint templates x3, Database Migration, API Endpoint, UI Component, Configuration, Documentation, Refactoring) — this task's whole-file `grep -q '<name>'` verify gate requires all 11 to be fixed for the gate to be an honest check.</evidence>
</task>

<task id="45.1.2" type="auto">
<title>Fix planner-playbook.md's execution_context template to reference execute-sprint.md, not execute.md</title>
<read_first>
- rcode/references/planner-playbook.md lines 172-175 (`<execution_context>@.rcode/workflows/execute.md@.rcode/templates/summary.md</execution_context>` — the template every SPRINT.md's execution_context block is copied from)
- rcode/workflows/execute-sprint.md line 1 (confirm this file exists and is the executor's actual per-plan recipe, not the orchestrator)
</read_first>
<files>rcode/references/planner-playbook.md</files>
<action>
Re-grep `@.rcode/workflows/execute.md` inside the `<execution_context>` block (near the Plan Structure section touched by task 45.1.1) before editing — the line number may have shifted after task 45.1.1's edit.

Change:
```
<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>
```
to:
```
<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>
```
`execute.md` is the 1000+ line top-level orchestrator (wave dispatch, worktree merge/cleanup, webhook notifications, code-review-gate spawn template) — none of that is executor-relevant. `execute-sprint.md` (663 lines) is the file actually written as the executor subagent's per-plan recipe. This is a template-only fix; it does not retroactively change already-written SPRINT.md files.
</action>
<acceptance_criteria>
- `grep -q '@.rcode/workflows/execute-sprint.md' rcode/references/planner-playbook.md` succeeds
- `grep -c '@.rcode/workflows/execute.md' rcode/references/planner-playbook.md` returns `0`
</acceptance_criteria>
<verify>
<automated>
grep -q '@.rcode/workflows/execute-sprint.md' rcode/references/planner-playbook.md && \
[ "$(grep -c '@.rcode/workflows/execute.md' rcode/references/planner-playbook.md)" -eq 0 ] && \
echo PASS
</automated>
</verify>
<done>planner-playbook.md's execution_context template points future SPRINT.md files at execute-sprint.md; zero remaining references to the orchestrator file execute.md inside that template.</done>
<evidence>AUDIT-token-cost.md finding 1: "Every SPRINT.md the planner writes hard-codes @.rcode/workflows/execute.md as its execution context... concretely present in 44-1-SPRINT.md:45-48" — traced to the source template at planner-playbook.md:171-174 (confirmed via `grep -n "execution_context" rcode/references/planner-playbook.md` this session → lines 172-175).</evidence>
</task>

<task id="45.1.3" type="auto">
<title>Correct the rcode-sprint-planning workflow's self-contradicting "authoritative skill" claim</title>
<read_first>
- rcode/workflows/sprint-planning.md lines 1-13 (`<purpose>` block: "Authoritative implementation lives in the rcode-sprint-planning skill... the in-line steps below are a fallback summary... NOT the authoritative behaviour")
- rcode/skills/actions/4-implementation/rcode-sprint-planning/workflow.md lines 1-10 (the skill's actual job: "Generate sprint status tracking from epics... producing a structured sprint-status.yaml file" — not a SPRINT.md)
- rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md lines 41-44 (`## Output Format`: "Output: .rcode/phases/{phase}/sprint-{N}.md" — a 4th, different path/schema that matches neither the workflow's own sprint-status.yaml output nor SPRINT.md)
- rcode/bin/rcode-tools.cjs lines 1522-1560 (`state sprint add` — sets `entry.sprints[]`) and lines 3152-3169 (`planned-phase` — sets `entry.plans` as a plain count) — two disjoint fields on the same `state.phases[]` object, populated by two code paths that never read each other
</read_first>
<files>rcode/workflows/sprint-planning.md, rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md, rcode/bin/rcode-tools.cjs</files>
<action>
Re-grep each literal snippet before editing — do not touch lines 52-55, 177-180, or 203-212 of sprint-planning.md (the bare-`SPRINT.md`-filename fix is phase 44's scope, issue #980, tracked separately on branch `44-1-github-sync-path-drift`; this task's edits are confined to the `<purpose>`/`<delegate_to_skill>` block at the top of the file, a disjoint line range).

1. `rcode/workflows/sprint-planning.md` lines 1-13 — rewrite the `<purpose>` block to stop claiming the skill is authoritative when its own workflow.md produces a structurally different artifact. Replace with:
   ```
   <purpose>
   Plan the next sprint and write a SPRINT.md. The in-line steps below ARE the
   authoritative path for this — this project's own history confirms it: 54/54
   real *-SPRINT.md files under .planning/phases/ were produced by this in-line
   flow, none by the rcode-sprint-planning skill.

   The `rcode-sprint-planning` skill (`.rcode/skills/rcode-sprint-planning/`)
   is a SEPARATE tool: it generates `sprint-status.yaml` from `.planning/epics/`
   files (epic/story status tracking: backlog -> ready-for-dev -> in-progress ->
   review -> done), not a SPRINT.md. Do not delegate to it expecting a SPRINT.md
   output.
   </purpose>
   ```
   Remove or correct the `<delegate_to_skill>` block (originally lines 15-37) so it no longer instructs "the skill MUST be loaded before the in-line steps below run" for producing a SPRINT.md — that instruction is what caused the contradiction.

2. `rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md` lines 41-44 — fix `## Output Format` to match what `workflow.md` actually produces:
   ```
   ## Output Format

   - Output: sprint-status.yaml (path from {status_file}, per workflow.md step 4) — an epic/story status tracker, NOT a SPRINT.md
   - Fixed structure: generated/last_updated/project metadata + development_status (epic -> stories -> retrospective, ordered)
   - Distinct from `/rcode-sprint-planning` the slash command (`rcode/workflows/sprint-planning.md`), which writes a SPRINT.md via a separate in-line flow
   ```

3. `rcode/bin/rcode-tools.cjs` — add a one-line comment (no behavior change) directly above line 1522 (`if (sub === 'sprint' && subArgs[1] === 'add') {`):
   ```javascript
   // NOTE: this populates entry.sprints[] (an array). A separate code path,
   // 'planned-phase' below (~line 3152), populates entry.plans (a plain count).
   // These two fields are never reconciled with each other — see AUDIT-redundant-work.md
   // finding 1 cross-check. Do not assume one implies the other is populated.
   ```
   And directly above the `planned-phase` handler (`if (sub === 'planned-phase') {`):
   ```javascript
   // NOTE: entry.plans (a count) is disjoint from entry.sprints[] (an array,
   // set by 'sprint add' above) — see the comment there. Known schema divergence,
   // not yet unified; do not read one as evidence the other is in sync.
   ```
</action>
<acceptance_criteria>
- `! grep -q "Authoritative implementation lives in the" rcode/workflows/sprint-planning.md`
- `grep -q "sprint-status.yaml" rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md`
- `grep -q "entry.sprints\[\] (an array)" rcode/bin/rcode-tools.cjs`
</acceptance_criteria>
<verify>
<automated>
! grep -q "Authoritative implementation lives in the" rcode/workflows/sprint-planning.md && \
grep -q "sprint-status.yaml" rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md && \
grep -q "entry.sprints\[\] (an array)" rcode/bin/rcode-tools.cjs && \
echo PASS
</automated>
</verify>
<done>rcode/workflows/sprint-planning.md no longer claims a skill it doesn't accurately delegate to is "authoritative"; the skill's own Output Format section matches what its workflow.md actually produces; the state.json entry.plans/entry.sprints divergence is documented in-code for future maintainers.</done>
<evidence>AUDIT-redundant-work.md finding 1 (Path C): "the skill it delegates to... does not produce a SPRINT.md at all. It generates {implementation_artifacts}/sprint-status.yaml... The same skill's own SKILL.md:43 claims yet a FOURTH path... which matches none of what its own workflow.md actually does." Cross-check: "entry.plans (a count)... and entry.sprints (an array)... are two disjoint fields on the same state.phases[] object, populated by two code paths that never read each other." Confirmed via direct read this session (workflow.md:1-10, SKILL.md:41-44, rcode-tools.cjs:1522,3166).</evidence>
</task>

</tasks>

<verification>
- `node --check rcode/bin/rcode-tools.cjs` passes (comment-only edit, no syntax break)
- `grep -rn "<name>" rcode/agents/rules/planner/task-templates.md` returns nothing
- `grep -q "<task" rcode/templates/sprint.md` succeeds
- `grep -c "@.rcode/workflows/execute.md" rcode/references/planner-playbook.md` returns 0
- `grep -q "Authoritative implementation lives in the" rcode/workflows/sprint-planning.md` fails (line removed)
</verification>

<success_criteria>
- A planner reading task-templates.md, sprint.md, and planner-playbook.md now finds one consistent schema (`<task id title>...`), matching what scanner.js parses and what 32/34 real SPRINT.md files contain
- Future SPRINT.md files' execution_context points executors at execute-sprint.md, not the 1000+ line orchestrator file
- rcode-sprint-planning's workflow.md and SKILL.md no longer disagree with each other or with `sprint-planning.md` about which path is authoritative or what it outputs
</success_criteria>

<output>
Create `.planning/phases/45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001/45-1-SUMMARY.md`
</output>

## Files Touched

**Creates:**
<!-- none -->

**Modifies:**
- `rcode/agents/rules/planner/task-templates.md` — `<name>` → `<title>`, add `id=` attribute to both templates
- `rcode/templates/sprint.md` — Stories section replaced with working `<task>` XML example
- `rcode/references/planner-playbook.md` — Plan Structure example corrected to real SPRINT.md schema; execution_context template fixed to execute-sprint.md
- `rcode/workflows/sprint-planning.md` — `<purpose>`/`<delegate_to_skill>` block (lines 1-13 only, disjoint from phase 44's scope) corrected to stop claiming false skill authority
- `rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md` — Output Format section corrected to match workflow.md's real sprint-status.yaml output
- `rcode/bin/rcode-tools.cjs` — two comment-only notes documenting the entry.plans/entry.sprints schema divergence

**Tests:**
<!-- none — documentation/template-schema fix, no test file exists for planner output templates -->
