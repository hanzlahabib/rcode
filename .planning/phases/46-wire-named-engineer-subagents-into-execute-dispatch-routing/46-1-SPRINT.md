---
phase: 46-wire-named-engineer-subagents-into-execute-dispatch-routing
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified:
  - rcode/workflows/execute.md
  - rcode/workflows/execute-waves.md
  - .rcode/workflows/execute.md
  - .rcode/workflows/execute-waves.md
requirements: []
must_haves:
  truths:
    - execute.md's <available_agent_types> block lists rcode-hanzla, rcode-yousef, rcode-haitham, and rcode-omar with correct one-line role descriptions, additive to the existing 11 entries
    - execute-waves.md step 3 classifies each plan's files_modified via glob patterns (frontend/backend/full-stack/other) before spawning, falls back to <objective> keyword-matching when ambiguous, and routes frontend→rcode-haitham, backend→rcode-yousef, full-stack→rcode-hanzla, other→rcode-executor
    - The Task() prompt template's worktree_branch_check, parallel_execution locking, execution_context, files_to_read, done_field_protocol, and success_criteria blocks stay byte-identical — only subagent_type= changes, plus exactly one new routing-note line is added near <objective>
    - .rcode/workflows/execute.md mirror receives the identical available_agent_types addition (source and mirror confirmed byte-identical before this phase)
    - .rcode/workflows/execute-waves.md mirror receives the routing/classification addition without altering its pre-existing "Pseudocode quality checklist" divergence (that divergence is unrelated to this phase and must not be touched)
    - rcode/workflows/execute.md (and its .rcode/ mirror) stays at or under the repo's 1000-line CLAUDE.md cap after this phase's edits — the additive allowlist insertion is paired with a same-task whitespace collapse (5 genuinely redundant double/triple blank-line runs, verified pre-existing and content-free) that frees more lines than the insertion adds
  artifacts:
    - rcode/workflows/execute.md — <available_agent_types> block includes the 4 new persona entries, and 5 redundant double/triple blank-line runs are collapsed to single blank lines, netting the file to ≤1000 lines
    - rcode/workflows/execute-waves.md — step 3 includes classification logic, a subagent_type variable, and a routing-note line in the Task() prompt
    - .rcode/workflows/execute.md — mirrored addition (persona entries + blank-line collapse), re-verified identical to source after edit, and ≤1000 lines
    - .rcode/workflows/execute-waves.md — mirrored addition applied via string-anchored edit; pre-existing divergence left untouched
  key_links:
    - rcode/workflows/execute.md lines ~194-209 <available_agent_types> is the allowlist /rcode-execute's orchestrator reads before spawning any Task() agent — an unlisted subagent_type falls back to 'general-purpose'
    - rcode/workflows/execute-waves.md step 3's Task(subagent_type="rcode-executor", ...) block (line ~98-99) is the actual spawn call executed for every plan in a wave — this is the single hardcoded call this phase fixes
    - CLAUDE.md "Maximum file size: 1000 lines — refactor before exceeding" — rcode/workflows/execute.md was 998 lines going into this phase (verified via `wc -l`); Phase 45 (shipped 2026-07-30) exists specifically because execute.md/plan.md had previously drifted over this cap, so any additive edit here must not silently re-break it
---

<objective>
Named engineer subagents (rcode-hanzla, rcode-yousef, rcode-haitham, rcode-omar) exist as
personas with real system prompts (`rcode/agents/rcode-hanzla.md`, `rcode-yousef.md`,
`rcode-haitham.md`, `rcode-omar.md`) but are never wired into the real `/rcode-execute` dispatch
path: `rcode/workflows/execute.md`'s `<available_agent_types>` allowlist never lists them, and
`rcode/workflows/execute-waves.md` step 3 hardcodes every plan's `Task()` spawn to
`subagent_type="rcode-executor"` regardless of what the plan actually builds. Fixes #1003.

This plan (A) adds the four personas to the `<available_agent_types>` allowlist with one-line
role descriptions, and (B) adds a classification step to execute-waves.md step 3 that reads the
plan's `files_modified` list (already parsed for the intra-wave overlap check — reuse it), glob-
matches frontend/backend/full-stack/other, falls back to `<objective>` keyword-matching when
ambiguous, and routes to the matching persona — falling back to `rcode-executor` for
docs/config/infra plans, which remains the safety net. The Task() prompt template is otherwise
untouched: only `subagent_type=` changes, plus one new routing-note line near `<objective>`. The
identical edits propagate to the `.rcode/` dogfooded mirrors — `.rcode/workflows/execute.md` is
byte-identical to the source today so the same edit applies verbatim; `.rcode/workflows/execute-
waves.md` has one pre-existing, unrelated divergence (a missing 6-line "Pseudocode quality
checklist" block) that this plan must NOT touch — only the routing-related lines are added there,
via string-anchored edits so they land correctly despite the offset.

Because `rcode/workflows/execute.md` is already 998 lines and this repo's CLAUDE.md hard-caps
files at 1000 lines, the allowlist insertion (task 46.1.1) is paired with a same-task whitespace
collapse of 5 pre-existing, genuinely redundant double/triple blank-line runs elsewhere in the
file (verified content-free — pure consecutive blank lines around `@include` directives and
`<step>` tags) so the net file size stays comfortably under the cap. This is not a refactor of
file content, just removal of superfluous blank lines that carry no meaning.

Out of scope (per issue #1003 and team-lead planning context): tool grants for
rcode-hanzla/rcode-yousef/rcode-haitham (tracked separately as #1004/#1006, in flight on branch
`fix-agent-tools` — this plan's routing logic is correct independent of when that lands), any
change to `.rcode/skills/agents/` or `.claude/agents/` agent definitions, and any change to the
sequential-mode branch, commit-lock logic, or steps 4-9 of execute-waves.md.
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

<task id="46.1.1" type="auto">
<title>Add the four named-engineer personas to execute.md's available_agent_types allowlist, and collapse redundant blank-line runs to stay under the 1000-line cap</title>
<read_first>
- rcode/workflows/execute.md lines 194-209 (the `<available_agent_types>` block — 11 existing entries, each one line: `- {agent-name} — {one-line description}`)
- rcode/workflows/execute.md — 5 pre-existing double/triple blank-line runs (verified via direct read + `awk` scan this session, at lines ~400-401, ~403-404, ~712-713, ~715-717, ~719-720 in the current 998-line file): a double blank right before `@rcode/workflows/execute-waves.md`, a double blank right after that include and before `<step name="checkpoint_handling">`, a double blank right before `@rcode/workflows/execute-regression-gates.md`, a TRIPLE blank between that include and `@rcode/workflows/execute-verify-phase-goal.md`, and a double blank right before `<step name="uat_gate" priority="blocker">`. These 5 spots are the ONLY runs of 2+ consecutive blank lines in the entire file (confirmed via `awk 'BEGIN{c=0}/^$/{c++;if(c==2)print NR}!/^$/{c=0}' rcode/workflows/execute.md` — exactly 5 hits) — no other double-blank-line run exists anywhere else, so collapsing every remaining double/triple-blank run in the file to a single blank line is equivalent to collapsing exactly these 5 spots.
</read_first>
<files>rcode/workflows/execute.md</files>
<action>
Do this as two edits, in order, both against `rcode/workflows/execute.md`:

**Edit 1 — additive allowlist insertion.** Re-grep `</available_agent_types>` before editing
(line number may have shifted). Insert 4 new lines immediately before the closing
`</available_agent_types>` tag (after the existing `- rcode-ui-auditor — Audits UI against design
requirements` line), so the block reads:

```
- rcode-executor — Executes plan tasks, commits, creates SUMMARY.md
- rcode-verifier — Verifies phase completion, checks quality gates
- rcode-planner — Creates detailed plans from phase scope
- rcode-phase-researcher — Researches technical approaches for a phase
- rcode-sprint-checker — Reviews plan quality before execution
- rcode-debugger — Diagnoses and fixes issues
- rcode-codebase-mapper — Maps project structure and dependencies
- rcode-integration-checker — Checks cross-phase integration
- rcode-nyquist-auditor — Validates verification coverage
- rcode-ux-designer — Researches UI/UX approaches
- rcode-ui-auditor — Audits UI against design requirements
- rcode-hanzla — Senior Full-Stack Engineer — full-stack plans spanning both frontend and backend
- rcode-yousef — Senior Backend Engineer — backend-only plans (API, DB, services, queues)
- rcode-haitham — Senior Frontend Engineer — frontend-only plans (React/Next.js/Tailwind/CSS/RTL/a11y)
- rcode-omar — Software Engineer (generalist) — fallback for cross-stack or small ambiguous plans when Hanzla isn't the clear fit
</available_agent_types>
```

Do not remove, reorder, or reword any of the 11 existing entries — this is additive only. Do not
touch anything outside the `<available_agent_types>` block (the surrounding `<required_reading>`
and `<process>` sections are out of scope).

**Edit 2 — collapse redundant blank-line runs.** This insertion pushes the file from 998 to 1002
lines, exceeding this repo's CLAUDE.md 1000-line cap. Free up lines by collapsing the 5
pre-existing, content-free double/triple blank-line runs identified in `<read_first>` above — do
NOT re-use the original line numbers from `<read_first>` since Edit 1 shifted everything below
line ~209 by +4; instead locate each spot by its surrounding content (the `@include` line or
`<step>` tag it sits next to) after Edit 1 is applied:

1. The double blank line immediately before `@rcode/workflows/execute-waves.md` → collapse to a
   single blank line.
2. The double blank line immediately after `@rcode/workflows/execute-waves.md` and before
   `<step name="checkpoint_handling">` → collapse to a single blank line.
3. The double blank line immediately before `@rcode/workflows/execute-regression-gates.md` →
   collapse to a single blank line.
4. The triple blank line between `@rcode/workflows/execute-regression-gates.md` and
   `@rcode/workflows/execute-verify-phase-goal.md` → collapse to a single blank line.
5. The double blank line immediately before `<step name="uat_gate" priority="blocker">` →
   collapse to a single blank line.

At each spot, remove only the *extra* blank line(s), leaving exactly one blank line as the
separator (do not remove the separator entirely — a single blank line is real structure between
`@include` directives and `<step>` tags in this file). Do not touch any non-blank content anywhere
in the file. After this edit the file should be ~996 lines (998 + 4 new persona lines − 6 collapsed
blank lines).
</action>
<acceptance_criteria>
- `grep -q 'rcode-hanzla — Senior Full-Stack Engineer — full-stack plans spanning both frontend and backend' rcode/workflows/execute.md`
- `grep -q 'rcode-yousef — Senior Backend Engineer — backend-only plans' rcode/workflows/execute.md`
- `grep -q 'rcode-haitham — Senior Frontend Engineer — frontend-only plans' rcode/workflows/execute.md`
- `grep -q 'rcode-omar — Software Engineer (generalist) — fallback' rcode/workflows/execute.md`
- `[ "$(grep -c '^- rcode-' rcode/workflows/execute.md)" -eq 15 ]` (11 existing + 4 new, none removed)
- `[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ]` (stays under the CLAUDE.md 1000-line cap)
- No run of 2+ consecutive blank lines remains anywhere in the file: `awk 'BEGIN{c=0;bad=0} /^$/{c++; if(c==2) bad++} !/^$/{c=0} END{exit bad==0?0:1}' rcode/workflows/execute.md`
</acceptance_criteria>
<verify>
<automated>
grep -q 'rcode-hanzla — Senior Full-Stack Engineer — full-stack plans spanning both frontend and backend' rcode/workflows/execute.md && \
grep -q 'rcode-yousef — Senior Backend Engineer — backend-only plans' rcode/workflows/execute.md && \
grep -q 'rcode-haitham — Senior Frontend Engineer — frontend-only plans' rcode/workflows/execute.md && \
grep -q 'rcode-omar — Software Engineer (generalist) — fallback' rcode/workflows/execute.md && \
[ "$(grep -c '^- rcode-' rcode/workflows/execute.md)" -eq 15 ] && \
[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ] && \
awk 'BEGIN{c=0;bad=0} /^$/{c++; if(c==2) bad++} !/^$/{c=0} END{exit bad==0?0:1}' rcode/workflows/execute.md && \
echo PASS
</automated>
</verify>
<done>execute.md's `<available_agent_types>` block lists all 15 agents (11 existing + 4 new named engineers) with correct one-line descriptions, nothing outside the block changed, 5 pre-existing redundant double/triple blank-line runs elsewhere in the file are collapsed to single blank lines with no content touched, and the file's total line count stays at or under the 1000-line CLAUDE.md cap (ending at approximately 996 lines).</done>
<evidence>Issue #1003 point 1: "`rcode/workflows/execute.md`'s `<available_agent_types>` block (~line 194-209) never lists rcode-hanzla/rcode-yousef/rcode-haitham/rcode-omar". Confirmed via direct read this session — block spans lines 194-209, 11 entries, no named-engineer entries present before this edit. Blocker from rcode-sprint-checker (this run): the file is verified 998 lines via `wc -l`, and CLAUDE.md's "Maximum file size: 1000 lines — refactor before exceeding" rule (the same rule Phase 45, shipped 2026-07-30, was created to re-enforce after execute.md/plan.md had previously drifted over it) means a 4-line-net-additive-only edit would push the file to 1002 lines and re-break that cap. Verified this session via direct read + `awk` scan that exactly 5 double/triple blank-line runs exist in the file, are pure whitespace with no adjacent content changes needed, and collapsing all 5 to single blank lines frees 6 lines — more than enough to net the file under 1000 lines after the 4-line persona addition.</evidence>
</task>

<task id="46.1.2" type="auto">
<title>Add files_modified/objective classification and persona routing to execute-waves.md step 3</title>
<read_first>
- rcode/workflows/execute-waves.md lines 8-48 (step 1: intra-wave `files_modified` overlap check — this is the ALREADY-PARSED `files_modified` list this task must reuse, not re-read)
- rcode/workflows/execute-waves.md lines 68-99 (step 3 header + worktree-mode preamble, ending at the `Task(` call with `subagent_type="rcode-executor",` on the line after `Task(`)
- rcode/workflows/execute-waves.md lines 103-108 (the `<objective>` block inside the Task() prompt — insertion point for the routing-note line)
</read_first>
<files>rcode/workflows/execute-waves.md</files>
<action>
Re-grep the anchors below in rcode/workflows/execute-waves.md before editing (line numbers may
have shifted) — use string-anchored edits, not line numbers.

1. Immediately before the `**Worktree mode**` sub-heading inside step 3 (i.e. after the paragraph
   ending "...richer context can be passed directly." and before "**Worktree mode** (`USE_WORKTREES`
   is not `false`):"), insert a new classification sub-section:

   ```
   **Classify plan and select subagent_type (BEFORE spawning, once per plan):**

   Reuse the `files_modified` list already parsed in step 1's intra-wave overlap check for this
   plan — do not re-read the plan file to get it again.

   ```
   FRONTEND_GLOBS = ["*.tsx", "*.jsx", "*.css"] + paths containing "client" or "ui"
   BACKEND_GLOBS  = paths containing "api", "server", "db", or "service"

   touches_frontend = any(file matches FRONTEND_GLOBS for file in files_modified)
   touches_backend  = any(file matches BACKEND_GLOBS for file in files_modified)

   if touches_frontend and touches_backend:
     classification = "full-stack"
   elif touches_frontend:
     classification = "frontend"
   elif touches_backend:
     classification = "backend"
   else:
     classification = "other"   # files_modified empty/absent, or no glob matched
   ```

   **If `classification` is `"other"`** (ambiguous, or `files_modified` empty/absent), fall back
   to keyword-matching the plan's `<objective>` text before giving up:
   - Frontend keywords (React, component, UI, CSS, Tailwind, frontend, client-side, accessibility, a11y) → `classification = "frontend"`
   - Backend keywords (API, endpoint, database, schema, service, queue, backend, server-side) → `classification = "backend"`
   - Neither matches (pure docs/config/infra plan) → `classification` stays `"other"`

   **Route to `subagent_type`:**

   | classification | subagent_type |
   |---|---|
   | frontend | rcode-haitham |
   | backend | rcode-yousef |
   | full-stack | rcode-hanzla |
   | other | rcode-executor |

   This decision is computed once per plan, before that plan's Task() spawn(s) below, and the
   resulting `subagent_type` value is used in the Task() call template (worktree and sequential
   modes both reuse this same value — see "Sequential mode" further below).
   ```

2. In the `Task(` call block, change the literal line:
   ```
   Task(
     subagent_type="rcode-executor",
   ```
   to:
   ```
   Task(
     subagent_type="{subagent_type}",
   ```
   (using the `{subagent_type}` value computed in step 1 above — the placeholder style matches the
   file's existing `{plan_number}`/`{phase_number}`/`{phase_name}` template placeholders). Do not
   change any other line of the `Task(` call signature (description=, model=, isolation=).

3. Inside the `<objective>` block of the Task() prompt, add exactly one new line after the existing
   "Do NOT update STATE.md or ROADMAP.md..." line and before the closing `</objective>` tag:
   ```
   <objective>
   Execute plan {plan_number} of phase {phase_number}-{phase_name}.
   Commit each task atomically. Create SUMMARY.md.
   Do NOT update STATE.md or ROADMAP.md — the orchestrator owns those writes after all worktree agents in the wave complete.

   Routing note: this plan touches {classification} paths → dispatched to {subagent_type} (see step 3's classification logic in execute-waves.md).
   </objective>
   ```

Do NOT change `<worktree_branch_check>`, `<parallel_execution>` locking, `<execution_context>`,
`<files_to_read>`, `<done_field_protocol>`, `<success_criteria>`, the sequential-mode block, the
commit-lock logic, or anything in steps 4-9 (wait/validate/failure-handling/cleanup). Do not touch
the "Pseudocode quality checklist" block under step 1 — unrelated to this task.
</action>
<acceptance_criteria>
- `grep -q 'Classify plan and select subagent_type' rcode/workflows/execute-waves.md`
- `grep -q 'rcode-haitham' rcode/workflows/execute-waves.md`
- `grep -q 'rcode-yousef' rcode/workflows/execute-waves.md`
- `grep -q 'rcode-hanzla' rcode/workflows/execute-waves.md`
- `grep -q 'subagent_type="{subagent_type}"' rcode/workflows/execute-waves.md`
- `grep -q 'Routing note: this plan touches' rcode/workflows/execute-waves.md`
- `! grep -q 'subagent_type="rcode-executor"' rcode/workflows/execute-waves.md` (literal hardcode replaced by the variable — rcode-executor still appears as the fallback row in the routing table and elsewhere in prose, just not hardcoded into the Task() call)
- `grep -q '| other | rcode-executor |' rcode/workflows/execute-waves.md` (fallback preserved)
- `grep -q 'Pseudocode quality checklist' rcode/workflows/execute-waves.md` (pre-existing content untouched)
</acceptance_criteria>
<verify>
<automated>
grep -q 'Classify plan and select subagent_type' rcode/workflows/execute-waves.md && \
grep -q 'rcode-haitham' rcode/workflows/execute-waves.md && \
grep -q 'rcode-yousef' rcode/workflows/execute-waves.md && \
grep -q 'rcode-hanzla' rcode/workflows/execute-waves.md && \
grep -q 'subagent_type="{subagent_type}"' rcode/workflows/execute-waves.md && \
grep -q 'Routing note: this plan touches' rcode/workflows/execute-waves.md && \
! grep -q 'subagent_type="rcode-executor"' rcode/workflows/execute-waves.md && \
grep -q '| other | rcode-executor |' rcode/workflows/execute-waves.md && \
grep -q 'Pseudocode quality checklist' rcode/workflows/execute-waves.md && \
echo PASS
</automated>
</verify>
<done>execute-waves.md step 3 classifies each plan's files_modified (with objective-keyword fallback) before spawning, routes to the correct persona via a `{subagent_type}` variable used in the Task() call, adds exactly one routing-note line near `<objective>`, keeps `rcode-executor` as the "other" fallback, and leaves every other part of the Task() prompt template (worktree_branch_check, parallel_execution, execution_context, files_to_read, done_field_protocol, success_criteria, sequential mode, steps 4-9, the pre-existing pseudocode checklist) unchanged.</done>
<evidence>Issue #1003 point 2: "`rcode/workflows/execute-waves.md` step 3 ('Spawn executor agents') hardcodes every plan's `Task()` spawn to `subagent_type='rcode-executor'` regardless of what the plan actually builds." Confirmed via direct read this session — single hardcoded occurrence at the `Task(` call (`subagent_type="rcode-executor",`), step 1 (lines 10-48) already parses `files_modified` for the overlap check, and step 2 (lines 50-52) already reads each plan's `<objective>`, both reusable for classification without re-reading.</evidence>
</task>

<task id="46.1.3" type="auto">
<title>Propagate the available_agent_types addition and blank-line collapse to the .rcode/ dogfooded mirror</title>
<read_first>
- .rcode/workflows/execute.md lines 194-209 (dogfooded mirror of the block edited in task 46.1.1)
</read_first>
<files>.rcode/workflows/execute.md</files>
<action>
First, re-verify at execution time (do not assume the planning-time observation still holds):
```bash
diff rcode/workflows/execute.md .rcode/workflows/execute.md
```
Expect the diff to show exactly the changes made by task 46.1.1 in `rcode/workflows/execute.md`
(the 4 new persona lines added to `<available_agent_types>`, plus the 5 blank-line-run collapses),
present there and absent from `.rcode/workflows/execute.md` (i.e. the two files were byte-identical
before task 46.1.1's edit, and this is the only difference now).

If the diff shows any OTHER difference beyond those changes, STOP and report the unexpected
divergence instead of applying this task's edit — do not blindly overwrite unrelated content.

If the diff matches expectations, apply the identical two edits to `.rcode/workflows/execute.md`:

**Edit 1 — additive allowlist insertion.** Same insertion point: immediately before
`</available_agent_types>`, after the `rcode-ui-auditor` line:

```
- rcode-hanzla — Senior Full-Stack Engineer — full-stack plans spanning both frontend and backend
- rcode-yousef — Senior Backend Engineer — backend-only plans (API, DB, services, queues)
- rcode-haitham — Senior Frontend Engineer — frontend-only plans (React/Next.js/Tailwind/CSS/RTL/a11y)
- rcode-omar — Software Engineer (generalist) — fallback for cross-stack or small ambiguous plans when Hanzla isn't the clear fit
```

**Edit 2 — collapse the same 5 redundant blank-line runs** identified in task 46.1.1 (the double
blank before `@rcode/workflows/execute-waves.md`, the double blank after it and before
`<step name="checkpoint_handling">`, the double blank before
`@rcode/workflows/execute-regression-gates.md`, the triple blank between that include and
`@rcode/workflows/execute-verify-phase-goal.md`, and the double blank before
`<step name="uat_gate" priority="blocker">`) — locate each by surrounding content, not line
numbers, and collapse each to a single blank line, touching no other content.

After editing, re-run `diff rcode/workflows/execute.md .rcode/workflows/execute.md` and confirm it
now produces no output (exit 0 — the two files are byte-identical again).
</action>
<acceptance_criteria>
- `diff -q rcode/workflows/execute.md .rcode/workflows/execute.md` exits 0 (files byte-identical)
- `grep -q 'rcode-hanzla — Senior Full-Stack Engineer' .rcode/workflows/execute.md`
- `grep -q 'rcode-omar — Software Engineer (generalist) — fallback' .rcode/workflows/execute.md`
- `[ "$(wc -l < .rcode/workflows/execute.md)" -le 1000 ]` (mirror stays under the CLAUDE.md 1000-line cap after the edit)
</acceptance_criteria>
<verify>
<automated>
diff -q rcode/workflows/execute.md .rcode/workflows/execute.md && \
grep -q 'rcode-hanzla — Senior Full-Stack Engineer' .rcode/workflows/execute.md && \
grep -q 'rcode-omar — Software Engineer (generalist) — fallback' .rcode/workflows/execute.md && \
[ "$(wc -l < .rcode/workflows/execute.md)" -le 1000 ] && \
echo PASS
</automated>
</verify>
<done>.rcode/workflows/execute.md is byte-identical to rcode/workflows/execute.md again, both now including the 4 named-engineer allowlist entries and the 5 collapsed blank-line runs, and both stay at or under the 1000-line CLAUDE.md cap.</done>
<evidence>Team-lead planning context: ".rcode/workflows/execute.md — dogfooded mirror ... CONFIRMED IDENTICAL to the source (verified via diff, exit 0) as of this planning run." Re-confirmed via `diff` this planning session (see file-read step above) before writing this task. Since task 46.1.1 now also collapses 5 blank-line runs in the source to stay under the 1000-line cap (per rcode-sprint-checker blocker, this run), this mirror task propagates that same change alongside the original allowlist addition so the two files remain byte-identical and both remain within the cap.</evidence>
</task>

<task id="46.1.4" type="auto">
<title>Propagate the classification/routing addition to the .rcode/ execute-waves.md mirror, preserving its pre-existing divergence</title>
<read_first>
- .rcode/workflows/execute-waves.md (full file — confirmed via `diff` to be missing exactly one 6-line "Pseudocode quality checklist" block relative to rcode/workflows/execute-waves.md, under the intra-wave overlap check section; this divergence is pre-existing, unrelated to this phase, and must be left as-is)
- rcode/workflows/execute-waves.md (post-task-46.1.2 state — the source of truth for the exact text to propagate)
</read_first>
<files>.rcode/workflows/execute-waves.md</files>
<action>
First, re-verify at execution time (do not assume the planning-time observation still holds):
```bash
diff rcode/workflows/execute-waves.md .rcode/workflows/execute-waves.md
```
Expect two categories of difference:
1. The pre-existing "Pseudocode quality checklist" 6-line block (present in `rcode/`, absent from
   `.rcode/`) — leave this alone, do not add it to `.rcode/workflows/execute-waves.md`.
2. Everything added by task 46.1.2 (the classification sub-section, the `subagent_type="{subagent_type}"`
   change, and the routing-note line in `<objective>`) — apply these to `.rcode/workflows/execute-
   waves.md`, using string-anchored edits (search for the same surrounding text used in task
   46.1.2, not line numbers — the missing checklist block means line numbers are offset by 6
   relative to the source file).

If the diff shows any difference beyond these two known categories, STOP and report the unexpected
divergence instead of applying this task's edit.

Apply the same three edits described in task 46.1.2's action to `.rcode/workflows/execute-waves.md`:
1. Insert the "Classify plan and select subagent_type" sub-section before "**Worktree mode**".
2. Change `subagent_type="rcode-executor",` to `subagent_type="{subagent_type}",` in the `Task(` call.
3. Add the "Routing note: this plan touches {classification} paths..." line inside `<objective>`.

After editing, confirm the only remaining difference between the two files is the pre-existing
"Pseudocode quality checklist" block (category 1 above) — nothing else.
</action>
<acceptance_criteria>
- `grep -q 'Classify plan and select subagent_type' .rcode/workflows/execute-waves.md`
- `grep -q 'subagent_type="{subagent_type}"' .rcode/workflows/execute-waves.md`
- `grep -q 'Routing note: this plan touches' .rcode/workflows/execute-waves.md`
- `! grep -q 'subagent_type="rcode-executor"' .rcode/workflows/execute-waves.md`
- `! grep -q 'Pseudocode quality checklist' .rcode/workflows/execute-waves.md` (pre-existing divergence NOT backported — confirms this task didn't overreach)
</acceptance_criteria>
<verify>
<automated>
grep -q 'Classify plan and select subagent_type' .rcode/workflows/execute-waves.md && \
grep -q 'subagent_type="{subagent_type}"' .rcode/workflows/execute-waves.md && \
grep -q 'Routing note: this plan touches' .rcode/workflows/execute-waves.md && \
! grep -q 'subagent_type="rcode-executor"' .rcode/workflows/execute-waves.md && \
! grep -q 'Pseudocode quality checklist' .rcode/workflows/execute-waves.md && \
echo PASS
</automated>
</verify>
<done>.rcode/workflows/execute-waves.md carries the same classification/routing logic as rcode/workflows/execute-waves.md, applied via string-anchored edits that landed correctly despite the pre-existing 6-line offset; the pre-existing "Pseudocode quality checklist" divergence remains untouched (not backported, not removed from the source).</done>
<evidence>Team-lead planning context: ".rcode/workflows/execute-waves.md — ... CONFIRMED ALREADY DIVERGED ... missing a 6-line 'Pseudocode quality checklist' block ... This divergence is PRE-EXISTING and UNRELATED to this phase — do NOT attempt to fix it." Re-confirmed via `diff` this planning session before writing this task.</evidence>
</task>

</tasks>

<verification>
- `grep -c '^- rcode-' rcode/workflows/execute.md` returns 15 in both `rcode/workflows/execute.md` and `.rcode/workflows/execute.md`
- `wc -l rcode/workflows/execute.md` and `wc -l .rcode/workflows/execute.md` both return ≤1000 (CLAUDE.md file-size cap respected)
- `diff -q rcode/workflows/execute.md .rcode/workflows/execute.md` exits 0
- `grep -q 'subagent_type="{subagent_type}"' rcode/workflows/execute-waves.md` and the same in `.rcode/workflows/execute-waves.md`
- `! grep -q 'subagent_type="rcode-executor"' rcode/workflows/execute-waves.md` (hardcode removed) and the same in `.rcode/workflows/execute-waves.md`
- `grep -q '| other | rcode-executor |' rcode/workflows/execute-waves.md` (fallback preserved)
- `grep -q 'Pseudocode quality checklist' rcode/workflows/execute-waves.md` present in source, still absent from `.rcode/workflows/execute-waves.md` (pre-existing divergence untouched)
</verification>

<success_criteria>
- `<available_agent_types>` in execute.md (and its `.rcode/` mirror) lists all four named-engineer personas with correct role descriptions, additive to the existing 11 agents
- execute-waves.md (and its `.rcode/` mirror) step 3 classifies each plan before spawning via `files_modified` globs with an `<objective>` keyword fallback, and routes to the matching persona — falling back to `rcode-executor` only for ambiguous/docs/config/infra plans
- The Task() prompt template is otherwise byte-identical to before this phase: only `subagent_type=` and one new routing-note line changed
- The `.rcode/workflows/execute.md` mirror is byte-identical to the source again; the `.rcode/workflows/execute-waves.md` mirror carries the routing addition while its pre-existing, unrelated "Pseudocode quality checklist" divergence is neither fixed nor worsened
- `rcode/workflows/execute.md` and `.rcode/workflows/execute.md` both stay at or under 1000 lines (CLAUDE.md cap), achieved by pairing the additive allowlist entries with a same-task collapse of 5 pre-existing redundant blank-line runs
</success_criteria>

<output>
Create `.planning/phases/46-wire-named-engineer-subagents-into-execute-dispatch-routing/46-1-SUMMARY.md`
</output>

## Files Touched

**Creates:**
<!-- none -->

**Modifies:**
- `rcode/workflows/execute.md` — `<available_agent_types>` block gains 4 named-engineer entries (rcode-hanzla, rcode-yousef, rcode-haitham, rcode-omar); 5 pre-existing redundant double/triple blank-line runs are collapsed to single blank lines to keep the file at or under the 1000-line CLAUDE.md cap (net ~996 lines)
- `rcode/workflows/execute-waves.md` — step 3 gains files_modified/objective classification logic, a `{subagent_type}` routing variable replacing the hardcoded `rcode-executor`, and a one-line routing note in `<objective>`
- `.rcode/workflows/execute.md` — mirrored addition (persona entries + blank-line collapse), re-verified byte-identical to source after edit, and ≤1000 lines
- `.rcode/workflows/execute-waves.md` — mirrored addition via string-anchored edit; pre-existing "Pseudocode quality checklist" divergence left untouched

**Tests:**
<!-- none — this is a markdown workflow-prose edit with no test file; acceptance is grep/diff/wc-verified per task -->
</content>
