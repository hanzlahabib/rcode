<purpose>
Create executable phase prompts (SPRINT.md files) for a roadmap phase with integrated research and verification. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates rihal-phase-researcher, rihal-planner, and rihal-sprint-checker agents with a revision loop (max 3 iterations).
</purpose>

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► PLANNING PHASE {NN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

TaskCreate at start:
- TaskCreate: "Load phase scope and context"
- TaskCreate: "Research phase (if enabled)"
- TaskCreate: "Spawn rihal-planner → SPRINT.md"
- TaskCreate: "Run rihal-sprint-checker verification"
- TaskCreate: "Revise plan (up to 3 iterations)" — only if checker flags issues
- TaskCreate: "Commit SPRINT.md + update state"

Spawning indicators:
```
◆ Spawning rihal-phase-researcher...
✓ Research complete: RESEARCH.md ({N} lines)

◆ Spawning rihal-planner...
✓ Planner complete: SPRINT.md ({N} stories, {M} points)

◆ Spawning rihal-sprint-checker...
✓ Check complete: {PASS|PARTIAL|FAIL} — see CHECK.md
```

Closure:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► PLAN READY ✓  ({N} stories, {M} points)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
End with Next Up routing to /rihal-execute.
</output_format>

<required_reading>
@.rihal/references/auto-init-guard.md
@.rihal/references/output-format.md
Read all files referenced by the invoking prompt's execution_context before starting.

<!-- ui-brand.md (254 lines): only load when phase goal/CONTEXT.md contains UI signals (frontend|ui|component|design|style|brand) -->
${PHASE_GOAL_HAS_UI ? '@.rihal/references/ui-brand.md' : ''}
@.rihal/references/revision-loop.md
@.rihal/references/gate-prompts.md
@.rihal/references/agent-contracts.md
@.rihal/references/gates.md
@.rihal/references/karpathy-guidelines.md
@.rihal/references/thinking-models-planning.md
</required_reading>

<available_agent_types>
Valid Rihal subagent types (use exact names — do not fall back to 'general-purpose'):
- rihal-phase-researcher — Researches technical approaches for a phase
- rihal-planner — Creates detailed plans from phase scope
- rihal-sprint-checker — Reviews plan quality before execution
</available_agent_types>

<process>

## 1. Initialize

Load all context in one call (paths only to minimize orchestrator context):

```bash
INIT=$(node ".rihal/bin/rihal-tools.cjs" init sprint-plan "$PHASE")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node ".rihal/bin/rihal-tools.cjs" agent-skills rihal-phase-researcher 2>/dev/null)
AGENT_SKILLS_PLANNER=$(node ".rihal/bin/rihal-tools.cjs" agent-skills rihal-planner 2>/dev/null)
AGENT_SKILLS_CHECKER=$(node ".rihal/bin/rihal-tools.cjs" agent-skills rihal-sprint-checker 2>/dev/null)
CONTEXT_WINDOW=$(node ".rihal/bin/rihal-tools.cjs" config-get context_window 2>/dev/null || echo "200000")

# Detect UI signals in phase goal + CONTEXT.md to decide whether to load ui-brand.md (254 lines)
PHASE_GOAL_HAS_UI=$(grep -iEl "frontend|ui|component|design|style|brand" \
  .planning/phases/*${PHASE_NUMBER}*/*-CONTEXT.md \
  .planning/ROADMAP.md 2>/dev/null | head -1)
```

When `CONTEXT_WINDOW >= 500000`, the planner prompt includes prior phase CONTEXT.md files so cross-phase decisions are consistent (e.g., "use library X for all data fetching" from Phase 2 is visible to Phase 5's planner).

Parse JSON for: `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `nyquist_validation_enabled`, `commit_docs`, `text_mode`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_reviews`, `has_plans`, `plan_count`, `phase_status`, `planning_exists`, `roadmap_exists`, `phase_req_ids`, `response_language`.

**If `response_language` is set:** Include `response_language: {value}` in all spawned subagent prompts so any user-facing output stays in the configured language.

**File paths (for <files_to_read> blocks):** `state_path`, `roadmap_path`, `requirements_path`, `context_path`, `research_path`, `verification_path`, `uat_path`, `reviews_path`. These are null if files don't exist.

**If `planning_exists` is false:** Error — run `/rihal-new-project` first.

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS: phase number (integer or decimal like `2.1`), flags (`--research`, `--skip-research`, `--gaps`, `--skip-verify`, `--prd <filepath>`, `--reviews`, `--text`).

Set `TEXT_MODE=true` if `--text` is present in $ARGUMENTS OR `text_mode` from init JSON is `true`. When `TEXT_MODE` is active, replace every `AskUserQuestion` call with a plain-text numbered list and ask the user to type their choice number. This is required for Claude Code remote sessions (`/rc` mode) where TUI menus don't work through the Claude App.

Extract `--prd <filepath>` from $ARGUMENTS. If present, set PRD_FILE to the filepath.

**Detect gaps mode:**
```bash
if [[ "$ARGUMENTS" =~ (^|[[:space:]])--gaps($|[[:space:]]) ]]; then
  GAPS_MODE=true
else
  GAPS_MODE=false
fi
```

When `GAPS_MODE=true`, the workflow switches to **gap-closure planning**: read the phase's VERIFICATION.md, extract verification gaps classified `gap_found` or `partial`, and produce a single new numbered plan file (`NNN-NN-SPRINT.md`) that closes them. Research, CONTEXT.md gating, and VALIDATION.md creation are skipped — gaps are grounded in already-shipped code, not new design work.

**If no phase number:** Detect next unplanned phase from roadmap.

**If `phase_found` is false:** Validate phase exists in ROADMAP.md. If valid, create the directory using `phase_slug` and `padded_phase` from init:
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

**Existing artifacts from init:** `has_research`, `has_plans`, `plan_count`.

**TASKS.md ingestion (#385 chain).** If the phase directory contains a `TASKS.md` file (typically auto-extracted by `/rihal-add-phase` from a bulk `/rihal-quick` or `/rihal-do` route), read it now:

```bash
TASKS_FILE=".planning/phases/${padded_phase}-${phase_slug}/TASKS.md"
HAS_TASKS=$([ -f "$TASKS_FILE" ] && echo true || echo false)
```

When `HAS_TASKS=true`:
- Pass the TASKS.md content to the planner agent as authoritative phase scope. The planner uses it as the input list — each entry becomes a candidate sprint task in SPRINT.md.
- Surface this in the opening banner: *"Phase scope source: TASKS.md ({N} entries auto-extracted from bulk route on {date})"*.
- Do NOT re-prompt the user for scope when TASKS.md is present — they already provided the list once at the /rihal-quick or /rihal-do entry point. The whole point of the auto-route chain is that the user doesn't paste the same content multiple times.

## 2.5. Validate `--reviews` Prerequisite

**Skip if:** No `--reviews` flag.

**If `--reviews` AND `--gaps`:** Error — cannot combine `--reviews` with `--gaps`. These are conflicting modes.

**If `--reviews` AND `has_reviews` is false (no REVIEWS.md in phase dir):**

Error:
```
No REVIEWS.md found for Phase {N}. Run reviews first:

/rihal-review --phase {N}

Then re-run /rihal-sprint-plan {N} --reviews
```
Exit workflow.

## 3. Validate Phase

```bash
PHASE_INFO=$(node ".rihal/bin/rihal-tools.cjs" roadmap get-phase "${PHASE}")
```

**If `found` is false:** Error with available phases. **If `found` is true:** Extract `phase_number`, `phase_name`, `goal` from JSON.


@rihal/workflows/plan-prd-express.md


## 3.6. Handle `--gaps` Mode

**Skip unless:** `GAPS_MODE=true`.

**Purpose:** Read `NNN-VERIFICATION.md`, extract failing/partial gaps, count existing plan files, and prepare a `gap_list` payload to feed the planner. On completion, control flow continues at step 8 (skipping CONTEXT.md gating, research, and validation-strategy creation).

**Step 1: Locate VERIFICATION.md**

```bash
PHASE_DIR=$(node ".rihal/bin/rihal-tools.cjs" roadmap get-phase "${PHASE}" --pick dir 2>/dev/null || echo "")
# Fallback if --pick dir not supported. TODO(#118): expose roadmap --pick dir cleanly.
if [[ -z "$PHASE_DIR" ]]; then
  PHASE_DIR=$(ls -d .planning/phases/${padded_phase}-* 2>/dev/null | head -1)
fi

VERIFICATION_FILE=$(ls "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1)
```

**If `VERIFICATION_FILE` is empty:**
```
Error: No VERIFICATION.md found for Phase {X}. Gap-closure planning requires the phase to have run through the verifier first.

Try:
  /rihal-execute {X} ${Rihal_WS}      # run or re-run execution + verification
```
Exit workflow.

**Step 2: Extract gaps from VERIFICATION.md**

Parse the file for gap entries with `status: gap_found` or `status: partial`. Inspect these sections:
- `## Automated Gap` (or `## Automated Gaps`)
- `## Human Verification Required`
- Any findings block that includes a `status:` field set to `gap_found` or `partial`

Collect into `GAP_LIST` (an ordered list where each entry has: id, title, expected, actual, status, source_section, severity if present).

If `GAP_LIST` is empty, display:
```
Phase {X} VERIFICATION.md contains no gap_found or partial items — nothing to close.
Report: {VERIFICATION_FILE}
```
Exit workflow.

**Step 3: Determine next plan number**

```bash
EXISTING_PLAN_COUNT=$(ls "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null | wc -l | tr -d ' ')
# Issue #652 — no leading zeros in planning artifacts. Phase 8 not 08, plan 2 not 02.
NEXT_PLAN_NUMBER=$((EXISTING_PLAN_COUNT + 1))
PADDED_PHASE="${PHASE}"
GAP_PLAN_FILENAME="${PADDED_PHASE}-${NEXT_PLAN_NUMBER}-SPRINT.md"
GAP_PLAN_PATH="${PHASE_DIR}/${GAP_PLAN_FILENAME}"
```

If `EXISTING_PLAN_COUNT == 0`, there is no prior execution to reference. Display a warning but proceed — the planner can still close verification gaps.

**Step 4: Gather prior plans for planner context**

```bash
EXISTING_PLAN_FILES=$(ls "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null | tr '\n' ' ')
EXISTING_SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null | tr '\n' ' ')
```

**Step 5: Display banner**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► GAP-CLOSURE PLANNING — Phase {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verification report: {VERIFICATION_FILE}
Gaps to close:       {count(GAP_LIST)}
Existing plans:      {EXISTING_PLAN_COUNT}
New plan file:       {GAP_PLAN_FILENAME}
```

**Step 6: Skip ahead**

Control flow jumps directly to step 8 (Spawn rihal-planner). Steps 4 (CONTEXT.md), 5 (Research), and 5.5 (Validation) are ALL skipped when `GAPS_MODE=true`.

Step 8 will consume these variables when filling the planner prompt:
- `GAP_LIST` — serialized list of gaps (id, title, expected, actual, status)
- `GAP_PLAN_PATH` — exact output path the planner must write
- `EXISTING_PLAN_FILES` / `EXISTING_SUMMARY_FILES` — prior phase context
- `VERIFICATION_FILE` — authoritative source-of-truth

After the planner returns, the existing plan-checker / revision loop (step 10 onward) runs unchanged — gap plans are verified just like normal plans.

## 4. Load CONTEXT.md

**Skip if:** PRD express path was used (CONTEXT.md already created in step 3.5) OR `GAPS_MODE=true` (gap closure is grounded in VERIFICATION.md, not CONTEXT.md).

Check `context_path` from init JSON.

If `context_path` is not null, display: `Using phase context from: ${context_path}`

**If `context_path` is null (no CONTEXT.md exists):**

Read discuss mode for context gate label:
```bash
DISCUSS_MODE=$(node ".rihal/bin/rihal-tools.cjs" config-get workflow.discuss_mode 2>/dev/null || echo "discuss")
```

If `TEXT_MODE` is true, present as a plain-text numbered list:
```
No CONTEXT.md found for Phase {X}. Plans will use research and requirements only — your design preferences won't be included.

1. Continue without context — Plan using research + requirements only
[If DISCUSS_MODE is "assumptions":]
2. Gather context (assumptions mode) — Analyze codebase and surface assumptions before planning
[If DISCUSS_MODE is "discuss" or unset:]
2. Run discuss-phase first — Capture design decisions before planning

Enter number:
```

Otherwise use AskUserQuestion:
- header: "No context"
- question: "No CONTEXT.md found for Phase {X}. Plans will use research and requirements only — your design preferences won't be included. Continue or capture context first?"
- options:
  - "Continue without context" — Plan using research + requirements only
  If `DISCUSS_MODE` is `"assumptions"`:
  - "Gather context (assumptions mode)" — Analyze codebase and surface assumptions before planning
  If `DISCUSS_MODE` is `"discuss"` (or unset):
  - "Run discuss-phase first" — Capture design decisions before planning

If "Continue without context": Proceed to step 5.
If "Run discuss-phase first":
  **IMPORTANT:** Do NOT invoke discuss-phase as a nested Skill/Task call — AskUserQuestion
  does not work correctly in nested subcontexts (#1009). Instead, display the command
  and exit so the user runs it as a top-level command:
  ```
  Run this command first, then re-run /rihal-sprint-plan {X} ${Rihal_WS}:

  /rihal-discuss-phase {X} ${Rihal_WS}
  ```
  **Exit the sprint-plan workflow. Do not continue.**


@rihal/workflows/plan-research-validation.md


## 6. Check Existing Plans

```bash
ls "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null || true
```

**If exists AND `--reviews` flag:** Skip prompt — go straight to replanning (the purpose of `--reviews` is to replan with review feedback).

**If exists AND no `--reviews` flag:** Ask the user what they'd like to do. Tailor the message to context — do NOT say "as per the workflow" or expose implementation details. Examples:

- If `phase_status` is `complete` or `executed`:
  > "Phase {N} ({name}) already shipped {plan_count} plans and is marked {status}. Do you want to review those plans, add more, or replan from scratch?"

- If `phase_status` is `in_progress` or `planned` (or null):
  > "Phase {N} ({name}) already has {plan_count} plan(s). Want to add more, review what's there, or start fresh?"

Always offer exactly three numbered options:
1. Add more plans
2. View existing plans
3. Replan from scratch

Wait for the user's choice before proceeding. Do not auto-select.

**If user picks option 1 (Add more plans) — issue #650:**

This is **NOT** a license to hand-write a new SPRINT.md inline. Continue down the
normal pipeline exactly as if no plans existed yet:

1. Proceed to Step 7 (context-paths) and Step 7.5 (Nyquist verification) as normal.
2. Spawn `rihal-planner` via `@rihal/workflows/plan-spawn-planner.md` (Step 8). The
   planner subagent is mandatory — the orchestrator must NOT write SPRINT.md
   directly via the `Write` tool. Pass the existing plan list to the planner so
   it picks the next plan number and avoids re-covering shipped tasks.
3. After the planner returns, run sprint-checker (Step 10) the same as a
   first-time plan. The "PLANNED ✓" banner is gated on a passing CHECK.md.

A run that emits a SPRINT.md without a corresponding planner Task() invocation
in the same turn is a malfunction — see issue #650. Stop and report instead of
shipping a hand-rolled plan.

**If user picks option 3 (Replan from scratch):**

Same as option 1, but pass the existing plans to the planner with a `replace:
true` directive. Existing PLAN.md files are renamed to `*-SUPERSEDED.md` (do
not delete) before the planner writes the new ones. Subagent invocation is
still mandatory.

**If user picks option 2 (View existing plans):**

Display a sprint summary table (sprint id → one-line goal).

Then run a **best-effort codebase overlap check** before showing the execute prompt — Closes #596.

**This check is always informational. It never blocks, never errors, never fails the workflow.** If any step below cannot complete for any reason, skip it silently and proceed straight to the execute prompt.

1. Read the SPRINT.md files for this phase (they are already on disk — no tool calls needed beyond `Read`).
2. From each sprint's `files_modified:` frontmatter list, note which paths already exist on disk vs. which are new.
3. Separately, look at the sprint *goals* and compare against modules/components the codebase already has. Use your knowledge from any files already read this session; do NOT spawn new reads just for this check.
4. Report what you found — one compact block:

```
Codebase overlap check (best-effort):
  ✓ N files already exist — plans will extend them
  + M files are new — will be created
  ⚠ Possible overlap: [file A] in the codebase may already cover [sprint X goal] — worth checking before executing
```

If nothing notable: one line — `No obvious conflicts detected.`

**Hard rules (dead-ends — nothing here can cause failure):**
- If a SPRINT.md can't be read → skip it, don't error
- If files_modified is empty or absent → skip the file check, move on
- If you're uncertain whether an overlap is real → don't mention it (false positives are noise)
- If the whole check produces nothing → omit the block entirely, go straight to execute prompt
- **Never ask a follow-up question about the overlap** — state it and move on
- **Never refuse to show the execute prompt** because of an overlap finding

Only after showing overlap results (or skipping them), show the execute prompt.

## 7. Use Context Paths from INIT

Extract from INIT JSON:

```bash
_rihal_field() { node -e "const o=JSON.parse(process.argv[1]); const v=o[process.argv[2]]; process.stdout.write(v==null?'':String(v))" "$1" "$2"; }
STATE_PATH=$(_rihal_field "$INIT" state_path)
ROADMAP_PATH=$(_rihal_field "$INIT" roadmap_path)
REQUIREMENTS_PATH=$(_rihal_field "$INIT" requirements_path)
RESEARCH_PATH=$(_rihal_field "$INIT" research_path)
VERIFICATION_PATH=$(_rihal_field "$INIT" verification_path)
UAT_PATH=$(_rihal_field "$INIT" uat_path)
CONTEXT_PATH=$(_rihal_field "$INIT" context_path)
REVIEWS_PATH=$(_rihal_field "$INIT" reviews_path)
```

## 7.5. Verify Nyquist Artifacts

Skip if `nyquist_validation_enabled` is false OR `research_enabled` is false.

Also skip if all of the following are true:
- `research_enabled` is false
- `has_research` is false
- no `--research` flag was provided

In that no-research path, Nyquist artifacts are **not required** for this run.

```bash
VALIDATION_EXISTS=$(ls "${PHASE_DIR}"/*-VALIDATION.md 2>/dev/null | head -1)
```

If missing and Nyquist is still enabled/applicable — ask user:
1. Re-run: `/rihal-sprint-plan {PHASE} --research ${Rihal_WS}`
2. Disable Nyquist with the exact command:
   `node ".rihal/bin/rihal-tools.cjs" config-set workflow.nyquist_validation false`
3. Continue anyway (plans fail Dimension 8)

Proceed to Step 8 only if user selects 2 or 3.


@rihal/workflows/plan-spawn-planner.md

## 9. Handle Planner Return

- **`## PLANNING COMPLETE`:** Display plan count. If `--skip-verify` or `plan_checker_enabled` is false (from init): skip to step 13. Otherwise: step 10.
- **`## PHASE SPLIT RECOMMENDED`:** The planner determined the phase is too complex to implement all user decisions without simplifying them. Handle in step 9b.
- **`## CHECKPOINT REACHED`:** Present to user, get response, spawn continuation (step 12)
- **`## PLANNING INCONCLUSIVE`:** Show attempts, offer: Add context / Retry / Manual

**Sprint count guard (token cost protection — closes #584):**

After planner returns `## PLANNING COMPLETE`, immediately count sprint files:

```bash
MAX_SPRINTS=$($TOOL config-get workflow.max_sprints_per_phase 2>/dev/null || echo "4")
SPRINT_COUNT=$(find "${PHASE_DIR}" -maxdepth 1 -name "*-SPRINT.md" | wc -l | tr -d ' ')
```

If `SPRINT_COUNT > MAX_SPRINTS`:

```
⚠ Phase {N}: Planner created {SPRINT_COUNT} sprint files (limit: {MAX_SPRINTS}).
  This phase is too large — the sprint-checker will be expensive and revision
  loops will multiply the cost.

  Recommended: split this phase into two using /rihal-plan --split {N}

Options:
  1. Split phase now (recommended)
  2. Continue anyway (accept higher token cost)
  3. Re-plan with explicit 4-sprint limit
```

In `mode: yolo` / autonomous: auto-select option 3 (re-plan with limit). Do not halt or ask.

Re-plan prompt appended: `"IMPORTANT: Create at most {MAX_SPRINTS} SPRINT.md files. Merge smaller tasks into the nearest related sprint instead of creating new ones."`

## 9b. Handle Phase Split Recommendation

When the planner returns `## PHASE SPLIT RECOMMENDED`, it means the phase has too many decisions to implement at full fidelity within the plan budget. The planner proposes groupings.

**Extract from planner return:**
- Proposed sub-phases (e.g., "17a: processing core (D-01 to D-19)", "17b: billing + config UX (D-20 to D-27)")
- Which D-XX decisions go in each sub-phase
- Why the split is necessary (decision count, complexity estimate)

**Present to user:**
```
## Phase {X} is too complex for full-fidelity implementation

The planner found {N} decisions that cannot all be implemented without
simplifying some. Instead of reducing your decisions, we recommend splitting:

**Option 1: Split into sub-phases**
- Phase {X}a: {name} — {D-XX to D-YY} ({N} decisions)
- Phase {X}b: {name} — {D-XX to D-YY} ({M} decisions)

**Option 2: Proceed anyway** (planner will attempt all, quality may degrade)

**Option 3: Prioritize** — you choose which decisions to implement now,
rest become a follow-up phase
```

Use AskUserQuestion with these 3 options.

**If "Split":** Use `/rihal-insert-phase` to create the sub-phases, then replan each.
**If "Proceed":** Return to planner with instruction to attempt all decisions at full fidelity, accepting more plans/tasks.
**If "Prioritize":** Use AskUserQuestion (multiSelect) to let user pick which D-XX are "now" vs "later". Create CONTEXT.md for each sub-phase with the selected decisions.

## 10. Spawn rihal-sprint-checker Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan checker...
```

Checker prompt:

```markdown
<verification_context>
**Phase:** {phase_number}
**Phase Goal:** {goal from ROADMAP}

<files_to_read>
- {PHASE_DIR}/*-SPRINT.md (Plans to verify)
- {roadmap_path} (Roadmap)
- {requirements_path} (Requirements)
- {context_path} (USER DECISIONS from /rihal-discuss-phase)
- {research_path} (Technical Research — includes Validation Architecture)
</files_to_read>

${AGENT_SKILLS_CHECKER}

**Phase requirement IDs (MUST ALL be covered):** {phase_req_ids}

**Project instructions:** Read ./CLAUDE.md if exists — verify plans honor project guidelines
**Project skills:** Check .claude/skills/ or .agents/skills/ directory (if either exists) — verify plans account for project skill rules
</verification_context>

<expected_output>
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="rihal-sprint-checker",
  model="{model}",
  model="{checker_model}",
  description="Verify Phase {phase} plans"
)
```

## 11. Handle Checker Return

- **`## VERIFICATION PASSED`:** Display confirmation, proceed to step 13.
- **`## ISSUES FOUND`:** Display issues, check iteration count, proceed to step 12.

**Thinking partner for architectural tradeoffs (conditional):**
If `features.thinking_partner` is enabled, scan the checker's issues for architectural tradeoff keywords
("architecture", "approach", "strategy", "pattern", "vs", "alternative"). If found:

```
The sprint-checker flagged an architectural decision point:
{issue description}

Brief analysis:
- Option A: {approach_from_plan} — {pros/cons}
- Option B: {alternative_approach} — {pros/cons}
- Recommendation: {choice} aligned with {phase_goal}

Apply this to the revision? [Yes] / [No, I'll decide]
```

If yes: include the recommendation in the revision prompt. If no: proceed to revision loop as normal.
If thinking_partner disabled: skip this block entirely.

## 12. Revision Loop (Max 3 Iterations, 1 in autonomous/yolo mode)

**Mode-based iteration cap (token cost protection — closes #585):**

```bash
MAX_ITERATIONS=$($TOOL config-get workflow.max_checker_iterations 2>/dev/null || echo "")
if [ -z "$MAX_ITERATIONS" ]; then
  # Default: 1 in yolo/autonomous, 3 in guided
  [ "$MODE" = "yolo" ] || [ -n "$AUTONOMOUS" ] && MAX_ITERATIONS=1 || MAX_ITERATIONS=3
fi
```

Track `iteration_count` (starts at 1 after initial plan + check).
Track `prev_issue_count` (initialized to `Infinity` before the loop begins).
Track `stall_reentry_count` (starts at 0; incremented each time "Adjust approach" re-enters step 8).

**If iteration_count < MAX_ITERATIONS:**

**Sprint-checker malfunction guard (BLOCKER-class — added in v3.1.0 after #440):**

Before parsing issues, verify the checker actually invoked tools. The checker MUST exhibit at least one of these evidence markers in its return:

- A YAML `issues:` block (even an empty one — `issues: []`)
- A YAML `verified_files:` block listing files it read
- At least one `path:` field in any block (e.g. `path: src/components/Foo.tsx:42`)
- A summary line of the form `Verified N of M files` or `Checked N symbols`

If NONE of these evidence markers are present, the checker malfunctioned (returned narrative without invoking tools — see #440). BLOCK execution:

```
Display: "Sprint-checker returned without evidence of tool use — likely
         malfunctioned (cf. issue #440). Refusing to advance the plan
         on unverified output. Re-run /rihal-plan or inspect the agent."
Halt the workflow with a non-zero exit signal.
```

Do NOT treat empty / narrative-only checker output as "plan approved". An empty checker output is a malfunction, not a pass.

Parse issue count from checker return: count BLOCKER + WARNING entries in the YAML issues block (structured output from rihal-sprint-checker). If the checker's return contains a populated YAML issues block with `issues: []` (i.e., the plan was approved with no issues AFTER actual checking), treat `issue_count` as 0 and skip the stall check — the plan passed. Proceed to step 13.

Display: `Revision iteration {N}/3 -- {blocker_count} blockers, {warning_count} warnings`

**Stall detection:** If `issue_count >= prev_issue_count`:
  Display: `Revision loop stalled — issue count not decreasing ({issue_count} issues remain after {N} iterations)`

  **If `stall_reentry_count < 2`:**
    Ask user:
      Question: "Issues remain after {N} revision attempts with no progress. Proceed with current output?"
      Options: "Proceed anyway" | "Adjust approach"
    If "Proceed anyway": accept current plans and continue to step 13.
    If "Adjust approach": increment `stall_reentry_count`, open freeform discussion, then re-enter step 8 (full replanning). Note: re-entry resets `iteration_count` and `prev_issue_count` but `stall_reentry_count` persists across re-entries and is capped at 2.

  **If `stall_reentry_count >= 2`:**
    Display: `Stall persists after 2 re-planning attempts. The following issues could not be resolved automatically:`
    List the remaining issues from the checker.
    Suggest: "Consider resolving these issues manually or running `/rihal-debug` to investigate root causes."
    Options: "Proceed anyway" | "Abandon"
    If "Proceed anyway": accept current plans and continue to step 13.
    If "Abandon": stop workflow.

Set `prev_issue_count = issue_count`.

Revision prompt:

```markdown
<revision_context>
**Phase:** {phase_number}
**Mode:** revision

<files_to_read>
- {PHASE_DIR}/*-SPRINT.md (Existing plans)
- {context_path} (USER DECISIONS from /rihal-discuss-phase)
</files_to_read>

${AGENT_SKILLS_PLANNER}

**Checker issues:** {structured_issues_from_checker}
</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>
```

```
Task(
  prompt=revision_prompt,
  subagent_type="rihal-planner",
  model="{model}",
  model="{planner_model}",
  description="Revise Phase {phase} plans"
)
```

After planner returns -> spawn checker again (step 10), increment iteration_count.

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:` + issue list

Offer: 1) Force proceed, 2) Provide guidance and retry, 3) Abandon

## 12.5. Wave Parallelism File-Overlap Check (added in v3.1.0 after #442)

Before declaring plans ready, validate the wave-parallelism rule the planner declares: **same wave + overlapping `files_modified` = sequential, not parallel**. If two plans share `depends_on` (same wave) and both list the same file in `files_modified`, the planner should have marked the later one `sequential: true`. Catch the cases where it didn't.

```bash
# For every pair of plans (A, B) with the same depends_on:
#   if files_modified(A) ∩ files_modified(B) is non-empty:
#     - the later plan (by sprint id) MUST declare sequential: true
#     - and must list the conflicting files in its frontmatter

node ".rihal/bin/rihal-tools.cjs" plan check-wave-overlaps "${PHASE_NUMBER}"
```

The CLI helper returns a JSON report:

```json
{
  "conflicts": [
    {
      "wave": 2,
      "plan_a": "96.2",
      "plan_b": "96.3",
      "shared_files": ["src/components/LeadDetailPanel.tsx", "src/styles/inbox.css"],
      "plan_b_sequential": false
    }
  ]
}
```

**If `conflicts` is non-empty:**

1. For each conflict, edit the later plan's SPRINT.md frontmatter to add:
   ```yaml
   sequential: true
   sequential_after: <plan_a id>
   conflicting_files: [<shared_files...>]
   ```
2. Recompute waves: the formerly-parallel plan now depends on the earlier one, so its wave is `max(waves of dependencies) + 1`.
3. Re-run the checker to confirm the updated frontmatter.
4. Display: `Wave parallelism: {N} conflict(s) auto-corrected to sequential.`

**If `conflicts` is empty:** Display `Wave parallelism: ✓ no file-overlap conflicts.` and proceed.

This closes the gap from #442 — the rule was stated in `rihal-planner.md` but not enforced. Now it's enforced automatically.

## 13. Requirements Coverage Gate

After plans pass the checker (or checker is skipped), verify that all phase requirements are covered by at least one plan.

**Skip if:** `phase_req_ids` is null or TBD (no requirements mapped to this phase).

**Step 1: Extract requirement IDs claimed by plans**
```bash
# Collect all requirement IDs from plan frontmatter
PLAN_REQS=$(grep -h "requirements_addressed\|requirements:" ${PHASE_DIR}/*-SPRINT.md 2>/dev/null | tr -d '[]' | tr ',' '\n' | sed 's/^[[:space:]]*//' | sort -u)
```

**Step 2: Compare against phase requirements from ROADMAP**

For each REQ-ID in `phase_req_ids`:
- If REQ-ID appears in `PLAN_REQS` → covered ✓
- If REQ-ID does NOT appear in any plan → uncovered ✗

**Step 3: Check CONTEXT.md features against plan objectives**

Read CONTEXT.md `<decisions>` section. Extract feature/capability names. Check each against plan `<objective>` blocks. Features not mentioned in any plan objective → potentially dropped.

**Step 4: Report**

If all requirements covered and no dropped features:
```
✓ Requirements coverage: {N}/{N} REQ-IDs covered by plans
```
→ Proceed to step 14.

If gaps found:
```
## ⚠ Requirements Coverage Gap

{M} of {N} phase requirements are not assigned to any plan:

| REQ-ID | Description | Plans |
|--------|-------------|-------|
| {id} | {from REQUIREMENTS.md} | None |

{K} CONTEXT.md features not found in plan objectives:
- {feature_name} — described in CONTEXT.md but no plan covers it

Options:
1. Re-plan to include missing requirements (recommended)
2. Move uncovered requirements to next phase
3. Proceed anyway — accept coverage gaps
```

If `TEXT_MODE` is true, present as a plain-text numbered list (options already shown in the block above). Otherwise use AskUserQuestion to present the options.

## 13b. Record Planning Completion in STATE.md

After plans pass all gates, record that planning is complete so STATE.md reflects the new phase status:

```bash
node ".rihal/bin/rihal-tools.cjs" state planned-phase --phase "${PHASE_NUMBER}" --name "${PHASE_NAME}" --plans "${PLAN_COUNT}"
```

This updates STATUS to "Ready to execute", sets the correct plan count, and timestamps Last Activity.

## 14. Present Final Status

Route to `<offer_next>` OR `auto_advance` depending on flags/config.

## 15. Auto-Advance Check

Check for auto-advance trigger:

1. Parse `--auto` and `--chain` flags from $ARGUMENTS
2. **Sync chain flag with intent** — if user invoked manually (no `--auto` and no `--chain`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference):
   ```bash
   if [[ ! "$ARGUMENTS" =~ --auto ]] && [[ ! "$ARGUMENTS" =~ --chain ]]; then
     node ".rihal/bin/rihal-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
   fi
   ```
3. Read both the chain flag and user preference:
   ```bash
   AUTO_CHAIN=$(node ".rihal/bin/rihal-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node ".rihal/bin/rihal-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` or `--chain` flag present AND `AUTO_CHAIN` is not true:** Persist chain flag to config (handles direct invocation without prior discuss-phase):
```bash
if ([[ "$ARGUMENTS" =~ --auto ]] || [[ "$ARGUMENTS" =~ --chain ]]) && [[ "$AUTO_CHAIN" != "true" ]]; then
  node ".rihal/bin/rihal-tools.cjs" config-set workflow._auto_chain_active true
fi
```

**If `--auto` or `--chain` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► AUTO-ADVANCING TO EXECUTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans ready. Launching execute-phase...
```

Launch execute-phase using the Skill tool to avoid nested Task sessions (which cause runtime freezes due to deep agent nesting):
```
Skill(skill="rihal-execute", args="${PHASE} --auto --no-transition ${Rihal_WS}")
```

The `--no-transition` flag tells execute-phase to return status after verification instead of chaining further. This keeps the auto-advance chain flat — each phase runs at the same nesting level rather than spawning deeper Task agents.

**Handle execute-phase return:**
- **PHASE COMPLETE** → Display final summary:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Rihal ► PHASE ${PHASE} COMPLETE ✓
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Auto-advance pipeline finished.

  Next: /rihal-discuss-phase ${NEXT_PHASE} --auto ${Rihal_WS}
  ```
- **GAPS FOUND / VERIFICATION FAILED** → Display result, stop chain:
  ```
  Auto-advance stopped: Execution needs review.

  Review the output above and continue manually:
  /rihal-execute ${PHASE} ${Rihal_WS}
  ```

**If neither `--auto` nor config enabled:**
Route to `<offer_next>` (existing behavior).

</process>

<banner_emission_gate>
Issue #655 — the success banner is gated on real verification, not vibes.
Before emitting `PLANNED ✓`, confirm one of these is true:

1. A passing CHECK.md exists at `${PHASE_DIR}/*-CHECK.md` from rihal-sprint-checker
   in this run AND its overall verdict is `pass` (or `pass-with-cautions`).
2. The user has explicitly said "skip verification" / "override" this run AND that
   override is recorded in the offer-next output's `Verification:` field as
   `Passed with override`.
3. `plan_checker_enabled` is false in config — recorded as `Verification: Skipped
   (config-disabled)`.

If none of the three holds (sprint-checker was never spawned, or it returned a
fail verdict, or its CHECK.md is missing) — DO NOT emit `PLANNED ✓`. Emit:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► PHASE {X} PLANNED ⚠ (gates skipped)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans were written but rihal-sprint-checker did not return a passing
CHECK.md. Run /rihal-plan {X} --reviews to gate the plans before
executing, or pass --skip-verify if you accept the risk.
```

The same rule applies to `VERIFIED ✓` (after /rihal-verify-phase) and
`DONE ✓` (after /rihal-execute) — the success-tick is reserved for
gate-passed states.
</banner_emission_gate>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/clear then:

/rihal-execute {X} ${Rihal_WS}

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase-dir}/*-SPRINT.md — review plans
- /rihal-sprint-plan {X} --research — re-research first
- /rihal-review --phase {X} --all — peer review plans with external AIs
- /rihal-sprint-plan {X} --reviews — replan incorporating review feedback

───────────────────────────────────────────────────────────────
</offer_next>

<windows_troubleshooting>
**Windows users:** If sprint-plan freezes during agent spawning (common on Windows due to
stdio deadlocks with MCP servers — see Claude Code issue anthropics/claude-code#28126):

1. **Force-kill:** Close the terminal (Ctrl+C may not work)
2. **Clean up orphaned processes:**
   ```powershell
   # Kill orphaned node processes from stale MCP servers
   Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.StartTime -lt (Get-Date).AddHours(-1)} | Stop-Process -Force
   ```
3. **Clean up stale task directories:**
   ```powershell
   # Remove stale subagent task dirs (Claude Code never cleans these on crash)
   Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\tasks\*" -ErrorAction SilentlyContinue
   ```
4. **Reduce MCP server count:** Temporarily disable non-essential MCP servers in settings.json
5. **Retry:** Restart Claude Code and run `/rihal-sprint-plan` again

If freezes persist, try `--skip-research` to reduce the agent chain from 3 to 2 agents:
```
/rihal-sprint-plan N --skip-research
```
</windows_troubleshooting>

<success_criteria>
- [ ] .planning/ directory validated
- [ ] Phase validated against roadmap
- [ ] Phase directory created if needed
- [ ] CONTEXT.md loaded early (step 4) and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] rihal-phase-researcher spawned with CONTEXT.md
- [ ] Existing plans checked
- [ ] rihal-planner spawned with CONTEXT.md + RESEARCH.md
- [ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)
- [ ] rihal-sprint-checker spawned with CONTEXT.md
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps
</success_criteria>
