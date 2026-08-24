<purpose>
Create executable phase prompts (SPRINT.md files) for a roadmap phase with integrated research and verification. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates rcode-phase-researcher, rcode-planner, and rcode-sprint-checker agents with a revision loop (max 3 iterations).
</purpose>

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PLANNING PHASE {NN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

TaskCreate at start:
- TaskCreate: "Load phase scope and context"
- TaskCreate: "Research phase (if enabled)"
- TaskCreate: "Spawn rcode-planner → SPRINT.md"
- TaskCreate: "Run rcode-sprint-checker verification"
- TaskCreate: "Revise plan (up to 3 iterations)" — only if checker flags issues
- TaskCreate: "Commit SPRINT.md + update state"

Spawning indicators:
```
◆ Spawning rcode-phase-researcher...
✓ Research complete: RESEARCH.md ({N} lines)

◆ Spawning rcode-planner...
✓ Planner complete: SPRINT.md ({N} stories, {M} points)

◆ Spawning rcode-sprint-checker...
✓ Check complete: {PASS|PARTIAL|FAIL} — see CHECK.md
```

Closure:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PLAN READY ✓  ({N} stories, {M} points)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
End with Next Up routing to /rcode-execute.
</output_format>

<required_reading>
@.rcode/references/auto-init-guard.md
@.rcode/references/output-format.md
Read all files referenced by the invoking prompt's execution_context before starting.

<!-- ui-brand.md (254 lines): only load when phase goal/CONTEXT.md contains UI signals (frontend|ui|component|design|style|brand) -->
${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}
@.rcode/references/karpathy-guidelines.md
<!-- Read .rcode/references/agent-contracts.md only if defining or debugging agent contracts -->
<!-- Read .rcode/references/gates.md only if implementing or troubleshooting gate logic; thinking-models-planning.md (127 lines) only if features.thinking_partner is enabled -->
${THINKING_PARTNER_ENABLED === 'true' ? '@.rcode/references/thinking-models-planning.md' : ''}
</required_reading>

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-phase-researcher — Researches technical approaches for a phase
- rcode-planner — Creates detailed plans from phase scope
- rcode-sprint-checker — Reviews plan quality before execution
</available_agent_types>

<process>

## --from-stub mode

When `--from-stub` is passed:
1. Check for existing `PLAN.md` in the phase directory
2. If found: read it as the planning skeleton — do NOT re-derive phase goals or re-research the phase
3. Expand the stub into full SPRINT.md files using the stories already listed in PLAN.md
4. If no PLAN.md exists: fall back to standard planning mode (derive from ROADMAP + RESEARCH.md)

This mode exists to skip expensive re-derivation when a human or prior agent has already produced a planning skeleton.

## 0. Project-Status Preflight

```bash
PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null || echo uninitialized)
```

If `PROJECT_STATUS` is `uninstalled`, `uninitialized`, or `stub`:

```
Project not initialized for planning. Run /rcode-new-project (full roadmap) or /rcode-add-phase (if you just want to add one phase), then return here.
```

Stop. Do not proceed until `project-status` returns `real`.

## 0.6. Detect Frontend Keywords and Suggest UI Safety Gate

```bash
FRONTEND_KEYWORDS=$(node .rcode/bin/rcode-tools.cjs classify-tech --keywords "react,next.js,vue,tailwind,css,ui,component,design,frontend" "$ARGUMENTS")
```

**If `FRONTEND_KEYWORDS.has_frontend == true` AND `.rcode/UI-SPEC.md` is missing:**

Check `config.yaml` for `workflow.ui_safety_gate` (default `true`). If enabled, print:

```
⚠ Frontend project detected. Before planning, create a design contract:

/rcode-ui-phase

This ensures consistent UI patterns, accessibility, and design tokens across all components.
```

Offer via AskUserQuestion:
```
header: "UI Safety Gate"
question: "Should we define UI-SPEC.md before planning component development?"
options:
  - "Yes, run /rcode-ui-phase first"
  - "Skip for now, continue planning"
```

If "Yes, run /rcode-ui-phase first": run `/rcode-ui-phase`, then return here and continue at Step 1. If skipped, or `ui_safety_gate` is disabled, or no frontend keywords detected: proceed directly to Step 1.

See `rcode/workflows/ui-phase.md` Step 4 for the source of this step — this is the applied instance of that one-time setup instruction.

## 1. Initialize

Load all context in one call (paths only to minimize orchestrator context):

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init sprint-plan "$PHASE" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-phase-researcher 2>/dev/null || echo "")
AGENT_SKILLS_PLANNER=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-planner 2>/dev/null || echo "")
AGENT_SKILLS_CHECKER=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-sprint-checker 2>/dev/null || echo "")
CONTEXT_WINDOW=$(node ".rcode/bin/rcode-tools.cjs" config-get context_window 2>/dev/null)
CONTEXT_WINDOW=${CONTEXT_WINDOW:-200000}  # config-get exits 0 with empty output when key absent; || fallback won't fire

# Detect UI signals in phase goal + CONTEXT.md to decide whether to load ui-brand.md (254 lines)
PHASE_GOAL_HAS_UI=$(grep -iEl "frontend|ui|component|design|style|brand" \
  .planning/phases/*${PHASE_NUMBER}*/*-CONTEXT.md \
  .planning/ROADMAP.md 2>/dev/null | head -1)
```

If `INIT` is empty, or `INIT.ok` is false or absent (null/undefined — `init sprint-plan` may omit the key), print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

When `CONTEXT_WINDOW >= 500000`, the planner prompt includes prior phase CONTEXT.md files so cross-phase decisions are consistent (e.g., "use library X for all data fetching" from Phase 2 is visible to Phase 5's planner).

Parse JSON for: `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `nyquist_validation_enabled`, `specialist_review_enabled`, `commit_docs`, `text_mode`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_reviews`, `has_plans`, `plan_count`, `phase_status`, `planning_exists`, `roadmap_exists`, `phase_req_ids`, `response_language`.

**If `response_language` is set:** Include `response_language: {value}` in all spawned subagent prompts so any user-facing output stays in the configured language.

**File paths (for <files_to_read> blocks):** `state_path`, `roadmap_path`, `requirements_path`, `context_path`, `research_path`, `verification_path`, `uat_path`, `reviews_path`. These are null if files don't exist.

**If `planning_exists` is false:** Error — run `/rcode-new-project` first.

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS: phase number (integer or decimal like `2.1`), flags (`--research`, `--skip-research`, `--gaps`, `--skip-verify`, `--from-stub`, `--prd <filepath>`, `--reviews`, `--text`, `--no-panel`).

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

**Detect from-stub mode:**
```bash
if [[ "$ARGUMENTS" =~ (^|[[:space:]])--from-stub($|[[:space:]]) ]]; then
  FROM_STUB_MODE=true
else
  FROM_STUB_MODE=false
fi
```

When `FROM_STUB_MODE=true`, the workflow reads an existing stub `SPRINT.md` (or any `*-SPRINT.md`) already present in the phase directory and treats it as the authoritative task list — the researcher and CONTEXT.md gating are skipped. The stub is passed to the planner as `existing_stub_content` so it can refine, expand, and add implementation detail without rewriting the structure. This is the correct flow when a user has partially sketched a plan by hand or a prior workflow run created a skeleton.

**From-stub resolution:**
```bash
if [[ "$FROM_STUB_MODE" == "true" ]]; then
  STUB_FILE=$(ls "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null | head -1)
  if [[ -z "$STUB_FILE" ]]; then
    echo "Error: --from-stub requires an existing SPRINT.md in the phase directory."
    echo "Found: ${PHASE_DIR}"
    echo "  (create a stub manually then re-run with --from-stub)"
    exit 1
  fi
  STUB_CONTENT=$(cat "$STUB_FILE")
  echo "◆ From-stub mode: using $(basename $STUB_FILE) as planner input"
fi
```

When `FROM_STUB_MODE=true`: skip steps 4 (CONTEXT.md), 5 (Research), 5.5 (Validation strategy). Jump directly to step 8 (Spawn rcode-planner). Pass `STUB_CONTENT` and `STUB_FILE` to the planner prompt so it refines rather than replaces the stub.

**If no phase number:** Detect next unplanned phase from roadmap.

**If `phase_found` is false:** Validate phase exists in ROADMAP.md. If valid, create the directory using `phase_slug` and `padded_phase` from init:
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

**Existing artifacts from init:** `has_research`, `has_plans`, `plan_count`.

**TASKS.md ingestion.** If the phase directory contains a `TASKS.md` file (typically auto-extracted by `/rcode-add-phase` from a bulk `/rcode-quick` or `/rcode-do` route), read it now:

```bash
TASKS_FILE=".planning/phases/${padded_phase}-${phase_slug}/TASKS.md"
HAS_TASKS=$([ -f "$TASKS_FILE" ] && echo true || echo false)
```

When `HAS_TASKS=true`:
- Pass the TASKS.md content to the planner agent as authoritative phase scope. The planner uses it as the input list — each entry becomes a candidate sprint task in SPRINT.md.
- Surface this in the opening banner: *"Phase scope source: TASKS.md ({N} entries auto-extracted from bulk route on {date})"*.
- Do NOT re-prompt the user for scope when TASKS.md is present — they already provided the list once at the /rcode-quick or /rcode-do entry point. The whole point of the auto-route chain is that the user doesn't paste the same content multiple times.

## 2.5. Validate `--reviews` Prerequisite

**Skip if:** No `--reviews` flag.

**If `--reviews` AND `--gaps`:** Error — cannot combine `--reviews` with `--gaps`. These are conflicting modes.

**If `--reviews` AND `has_reviews` is false (no REVIEWS.md in phase dir):**

Error:
```
No REVIEWS.md found for Phase {N}. Run reviews first:

/rcode-review --phase {N}

Then re-run /rcode-plan {N} --reviews
```
Exit workflow.

## 3. Validate Phase

```bash
# Stub-ROADMAP guard — emit a warning if ROADMAP.md has no real phase headings.
ROADMAP_PHASE_COUNT=$(grep -c "^## Phase " "${ROADMAP_PATH}" 2>/dev/null || echo 0)
if [ "${ROADMAP_PHASE_COUNT}" -eq 0 ]; then
  echo "⚠ WARN: ROADMAP.md appears to be a stub — add real ## Phase headings before running plan."
  exit 1
fi
PHASE_INFO=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}")
```

**If `found` is false:** Error with available phases. **If `found` is true:** Extract `phase_number`, `phase_name`, `goal` from JSON.


@.rcode/workflows/plan-prd-express.md


## 3.6. Handle `--gaps` Mode

**Skip unless:** `GAPS_MODE=true`. When active, read the full gap-closure procedure below (extracted to keep this file within AGENTS.md's 1000-line cap for the common, non-gaps-mode path).

${GAPS_MODE === 'true' ? '@.rcode/references/plan-gaps-mode.md' : ''}

## 4. Load CONTEXT.md

**Skip if:** PRD express path was used (CONTEXT.md already created in step 3.5) OR `GAPS_MODE=true` (gap closure is grounded in VERIFICATION.md, not CONTEXT.md).

Check `context_path` from init JSON.

If `context_path` is not null, display: `Using phase context from: ${context_path}`

**If `context_path` is null (no CONTEXT.md exists):**

Read discuss mode for context gate label:
```bash
DISCUSS_MODE=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.discuss_mode 2>/dev/null)
DISCUSS_MODE=${DISCUSS_MODE:-discuss}  # config-get exits 0 with empty output when key absent
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
  does not work correctly in nested subcontexts. Instead, display the command
  and exit so the user runs it as a top-level command:
  ```
  Run this command first, then re-run /rcode-plan {X} ${RCODE_WS}:

  /rcode-discuss-phase {X} ${RCODE_WS}
  ```
  **Exit the sprint-plan workflow. Do not continue.**


@.rcode/workflows/plan-research-validation.md


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

**If user picks option 1 (Add more plans):**

This is **NOT** a license to hand-write a new SPRINT.md inline. Continue down the
normal pipeline exactly as if no plans existed yet:

1. Proceed to Step 7 (context-paths) and Step 7.5 (Nyquist verification) as normal.
2. Spawn `rcode-planner` via `@.rcode/workflows/plan-spawn-planner.md` (Step 8). The
   planner subagent is mandatory — the orchestrator must NOT write SPRINT.md
   directly via the `Write` tool. Pass the existing plan list to the planner so
   it picks the next plan number and avoids re-covering shipped tasks.
3. After the planner returns, run sprint-checker (Step 10) the same as a
   first-time plan. The "PLANNED ✓" banner is gated on a passing CHECK.md.

A run that emits a SPRINT.md without a corresponding planner Task() invocation
in the same turn is a malfunction. Stop and report instead of shipping a hand-rolled plan.

**If user picks option 3 (Replan from scratch):**

Same as option 1, but pass the existing plans to the planner with a `replace:
true` directive. Existing PLAN.md files are renamed to `*-SUPERSEDED.md` (do
not delete) before the planner writes the new ones. Subagent invocation is
still mandatory.

**If user picks option 2 (View existing plans):**

Display a sprint summary table (sprint id → one-line goal).

Then run a **best-effort codebase overlap check** before showing the execute prompt.

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
_rcode_field() { node -e "const o=JSON.parse(process.argv[1]); const v=o[process.argv[2]]; process.stdout.write(v==null?'':String(v))" "$1" "$2"; }
STATE_PATH=$(_rcode_field "$INIT" state_path)
ROADMAP_PATH=$(_rcode_field "$INIT" roadmap_path)
REQUIREMENTS_PATH=$(_rcode_field "$INIT" requirements_path)
RESEARCH_PATH=$(_rcode_field "$INIT" research_path)
VERIFICATION_PATH=$(_rcode_field "$INIT" verification_path)
UAT_PATH=$(_rcode_field "$INIT" uat_path)
CONTEXT_PATH=$(_rcode_field "$INIT" context_path)
REVIEWS_PATH=$(_rcode_field "$INIT" reviews_path)
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
1. Re-run: `/rcode-plan {PHASE} --research ${RCODE_WS}`
2. Disable Nyquist with the exact command:
   `node ".rcode/bin/rcode-tools.cjs" config-set workflow.nyquist_validation false`
3. Continue anyway (plans fail Dimension 8)

Proceed to Step 8 only if user selects 2 or 3.


@.rcode/workflows/plan-spawn-planner.md

## 8.5. File-Ownership & Conflict-Avoidance

After the planner returns SPRINT.md files, run these checks before advancing to step 9.
These rules were added after overnight parallel builds exposed silent merge-time data loss
(calorie-calculator-ai, 2026-05-26). The wave-overlap CLI check in step 12.5 catches
same-wave/same-file issues mechanically; this step catches plan-level ownership gaps earlier.

**Step 1 — Build the cross-sprint file manifest.**

Read each SPRINT.md produced this run and collect its `files_modified:` frontmatter list.
Produce a de-duplicated map: `file → [sprint_ids that touch it]`.

```bash
# Quick grep of frontmatter to build the manifest
grep -A 50 "^files_modified:" "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null
```

**Step 2 — Flag collisions.**

For each file that appears in 2+ sprint lists:

| Type | Rule |
|------|------|
| Two sprints **create** the same file | Plan defect — merge tasks or sequence; only one sprint may create a file |
| Two same-wave sprints **modify** the same file | Later sprint MUST have `sequential: true` + `sequential_after:` in frontmatter |
| An aggregator file touched by multiple sprints | Each sprint's `<action>` must use append-only `Edit`, not `Write` |

Aggregator patterns (known high-collision targets):
- `**/index.ts`, `**/index.tsx` (barrel exports)
- `**/store/index.ts`, `**/store/index.js`
- `**/types/index.ts`, `**/types.ts`
- `main.py`, `app.py`, `router/__init__.py`, `**/__init__.py`
- `package.json` (scripts / deps blocks)

**Step 3 — Verify-command accuracy.**

Scan every `<verify><automated>` block for raw tool invocations (`tsc --noEmit`, `eslint .`,
`jest`, `vitest`). If found, check `package.json` scripts and replace with the `pnpm run <script>`
equivalent. Mismatch example from overnight build: plan wrote `tsc --noEmit` but the project's
script was named `type-check`.

**Step 4 — Report and gate.**

If any creation collision found → **BLOCK plan acceptance**. Edit the colliding sprint to remove
the duplicate creation task (have the second sprint import/extend from the first sprint's output).

If any modify-collision found in the same wave → edit the later sprint's frontmatter immediately:
```yaml
sequential: true
sequential_after: <earlier_sprint_id>
conflicting_files: [<shared_files...>]
```

Display a summary:
```
File-Ownership Check:
  ✓ N files with single owner
  ⚠ M aggregator files — append-only instructions verified
  ✗ K creation collisions (blocked — fixed inline)
  ~ J sequential flags added
```

If no issues: `File-Ownership Check: ✓ no collisions.`

**This check is informational for warnings and blocking for creation collisions.**
It never silently passes a plan where two sprints create the same file.

## 9. Handle Planner Return

- **`## PLANNING COMPLETE`:** Display plan count. If `--skip-verify` or `plan_checker_enabled` is false (from init): skip to step 13. Otherwise: step 10.
- **`## PHASE SPLIT RECOMMENDED`:** The planner determined the phase is too complex to implement all user decisions without simplifying them. Handle in step 9b.
- **`## CHECKPOINT REACHED`:** Present to user, get response, spawn continuation (step 12)
- **`## PLANNING INCONCLUSIVE`:** Show attempts, offer: Add context / Retry / Manual

**Sprint count guard (token cost protection):**

After planner returns `## PLANNING COMPLETE`, immediately count sprint files:

```bash
MAX_SPRINTS=$($TOOL config-get workflow.max_sprints_per_phase 2>/dev/null)
MAX_SPRINTS=${MAX_SPRINTS:-4}  # config-get exits 0 with empty output when key absent
SPRINT_COUNT=$(find "${PHASE_DIR}" -maxdepth 1 -name "*-SPRINT.md" | wc -l | tr -d ' ')
```

If `SPRINT_COUNT > MAX_SPRINTS`:

```
⚠ Phase {N}: Planner created {SPRINT_COUNT} sprint files (limit: {MAX_SPRINTS}).
  This phase is too large — the sprint-checker will be expensive and revision
  loops will multiply the cost.

  Recommended: split this phase into two using /rcode-plan --split {N}

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

**If "Split":** Use `/rcode-insert-phase` to create the sub-phases, then replan each.
**If "Proceed":** Return to planner with instruction to attempt all decisions at full fidelity, accepting more plans/tasks.
**If "Prioritize":** Use AskUserQuestion (multiSelect) to let user pick which D-XX are "now" vs "later". Create CONTEXT.md for each sub-phase with the selected decisions.

## 9.5. Specialist Review Panel (domain-routed)

**Why this step exists.** Until now one generalist (`rcode-planner`) produced the
entire plan and one generalist (`rcode-sprint-checker`) graded it against the
phase goal. Nobody asked *"is this design wrong"* or *"what will this guard
miss"*. Confirmed live on a real project: nine phases planned and shipped this
way, and the first hour of specialist review found an inert RLS backstop, an
authorization mutation with no relationship check, a core feature whose only
importer was its own test, and real personal data committed to the repo. The
sprint-checker missed all four because none of them is a goal-coverage question.

**Skip only if:** `specialist_review_enabled` from the INIT JSON is `false`
(set `workflow.specialist_review: false` in `.rcode/config.yaml`; absent key =
enabled), or `--no-panel` was passed. In
autonomous/yolo mode this step is **NOT skippable** — yolo removes the human
mid-loop check, so plan-time review is the only review left.

### 9.5a — Pick the panel

Read the `routing:` section of `.rcode/team.yaml`. Match the phase goal +
CONTEXT.md decisions against the routing domains (`codebase`, `frontend`,
`performance`, `ml`, `design`, `release`, …) by keyword, exactly as
`/rcode-council` does — do not invent a second routing mechanism.

Panel composition:

- **Always include `rcode-waleed`** (architecture lens) — the "is this design
  wrong" seat. Every phase gets it.
- **Always include `rcode-fatima`** (quality lens) — the "what will this guard
  miss" seat. Every phase gets it.
- **Plus 1-2 domain agents** from the matched `routing:` entry (e.g. a backend
  phase adds `rcode-yousef`, a frontend phase adds `rcode-haitham`).

Cap the panel at 4. If no domain matches, the two standing seats are the panel.

### 9.5b — Run the panel in parallel

Spawn all panel members in a single message so they run concurrently. Each gets
the same narrow contract:

```
You are reviewing SPRINT plans BEFORE execution, through your lens only.

Read: {PHASE_DIR}/*-SPRINT.md, {PHASE_DIR}/CONTEXT.md, ROADMAP.md phase {N}.

Return ONLY blocking issues — things that would make the executed phase wrong,
unsafe, or unverifiable. Not style, not preferences, not "consider also".
For each issue: what is wrong, the file:line or task id it lives in, and the
specific change that fixes it.

Two questions you MUST answer explicitly, even if the answer is "none":
  1. Which task in this plan enumerates a LOCATION where it should derive from a
     PROPERTY? (a glob, a single filename, one role, one directory) — that shape
     is how a guard ends up green while pointing where the problem is not.
  2. Which delivered module would have no production importer after this phase
     executes — reachable only from its own test?

If you have no blocking issues, return exactly: NO BLOCKING ISSUES.
Do not restate the plan. Do not summarize. {response_language pass-through}
```

### 9.5c — Handle panel return

- All members return `NO BLOCKING ISSUES` → proceed to step 10.
- Any blocking issue → feed it into the **existing revision loop (step 12)**
  alongside the checker's issues. Do not build a second revision mechanism.
- Panel issues and checker issues are deduped by task id before re-spawning the
  planner.

Report to the user which agents sat on the panel and what each blocked on — a
silent panel is indistinguishable from a skipped one.

## 10. Spawn rcode-sprint-checker Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► VERIFYING PLANS
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
- {context_path} (USER DECISIONS from /rcode-discuss-phase)
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
  subagent_type="rcode-sprint-checker",
  model="{checker_model}",
  description="Verify Phase {phase} plans"
)
```

## 11. Handle Checker Return

- **`## VERIFICATION PASSED`:** Display confirmation, proceed to step 13.
- **`## ISSUES FOUND`:** Display issues, check iteration count, proceed to step 12.

**Thinking partner for architectural tradeoffs (default ON in guided mode, OFF in yolo/autonomous):**
```bash
THINKING_PARTNER_CONFIG=$(node ".rcode/bin/rcode-tools.cjs" config-get features.thinking_partner 2>/dev/null || echo "")
if [ -n "$THINKING_PARTNER_CONFIG" ]; then
  THINKING_PARTNER_ENABLED="$THINKING_PARTNER_CONFIG"
elif [ "$MODE" = "yolo" ] || [ -n "$AUTONOMOUS" ]; then
  THINKING_PARTNER_ENABLED="false"
else
  THINKING_PARTNER_ENABLED="true"
fi
```
${THINKING_PARTNER_ENABLED === 'true' ? '@.rcode/references/plan-thinking-partner.md' : ''}
If `THINKING_PARTNER_ENABLED` is `false`: skip this block entirely. An explicit
`features.thinking_partner` in config.yaml always wins over the mode-based
default (set it `false` to silence even in guided mode, or `true` to keep it
on during autonomous runs if you want that). The check itself is cheap — a
keyword scan over the checker's existing issues, not a new agent spawn —
which is why it defaults on for guided/interactive planning: a second-opinion
sanity check on architectural tradeoffs is exactly the kind of thing "does
this actually get built right" needs, and it only activates when the checker
already flagged a tradeoff-shaped issue.

## 12. Revision Loop (Max 3 Iterations, 1 in autonomous/yolo mode)

**Mode-based iteration cap (token cost protection):**

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

**Sprint-checker malfunction guard (BLOCKER-class):**

Before parsing issues, verify the checker actually invoked tools. The checker MUST exhibit at least one of these evidence markers in its return:

- A YAML `issues:` block (even an empty one — `issues: []`)
- A YAML `verified_files:` block listing files it read
- At least one `path:` field in any block (e.g. `path: src/components/Foo.tsx:42`)
- A summary line of the form `Verified N of M files` or `Checked N symbols`

If NONE of these evidence markers are present, the checker malfunctioned (returned narrative without invoking tools). BLOCK execution:

```
Display: "Sprint-checker returned without evidence of tool use — likely
         malfunctioned (returned narrative without tool use). Refusing to advance the plan
         on unverified output. Re-run /rcode-plan or inspect the agent."
Halt the workflow with a non-zero exit signal.
```

Do NOT treat empty / narrative-only checker output as "plan approved". An empty checker output is a malfunction, not a pass.

Parse issue count from checker return: count BLOCKER + WARNING entries in the YAML issues block (structured output from rcode-sprint-checker). If the checker's return contains a populated YAML issues block with `issues: []` (i.e., the plan was approved with no issues AFTER actual checking), treat `issue_count` as 0 and skip the stall check — the plan passed. Proceed to step 13.

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
    Suggest: "Consider resolving these issues manually or running `/rcode-debug` to investigate root causes."
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
- {context_path} (USER DECISIONS from /rcode-discuss-phase)
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
  subagent_type="rcode-planner",
  model="{planner_model}",
  description="Revise Phase {phase} plans"
)
```

After planner returns -> spawn checker again (step 10), increment iteration_count.

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:` + issue list

Offer: 1) Force proceed, 2) Provide guidance and retry, 3) Abandon

## 12.5. Wave Parallelism File-Overlap Check

Before declaring plans ready, validate the wave-parallelism rule the planner declares: **same wave + overlapping `files_modified` = sequential, not parallel**. If two plans share `depends_on` (same wave) and both list the same file in `files_modified`, the planner should have marked the later one `sequential: true`. Catch the cases where it didn't.

```bash
# Skip if plan_count == 1 (from INIT JSON): with exactly one plan in the phase,
# there is no second plan to overlap with — a conflict is structurally impossible.
if [[ "${plan_count}" -eq 1 ]]; then
  echo "Wave parallelism: skipped (single plan, overlap structurally impossible)."
else
  # For every pair of plans (A, B) with the same depends_on, if files_modified(A)
  # ∩ files_modified(B) is non-empty, the later plan (by sprint id) MUST declare
  # sequential: true and list the conflicting files in its frontmatter.
  node ".rcode/bin/rcode-tools.cjs" plan check-wave-overlaps "${PHASE_NUMBER}"
fi
```
Returns (else branch only):
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

**If `conflicts` is empty:** Display `Wave parallelism: ✓ no file-overlap conflicts.` and proceed. (This closes the wave-overlap gap — the rule was stated in `rcode-planner.md` but not enforced until now.)

## 13. Requirements Coverage Gate

After plans pass the checker (or checker is skipped), verify that all phase requirements are covered by at least one plan.

**Skip if:** `phase_req_ids` is null, `TBD`, or an empty array/list (no requirements mapped to this phase) — `[[ -z "$phase_req_ids" || "$phase_req_ids" == "TBD" || "$phase_req_ids" == "[]" || "$phase_req_ids" == "null" ]]` — proceed to step 14.

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
node ".rcode/bin/rcode-tools.cjs" state planned-phase --phase "${PHASE_NUMBER}" --name "${PHASE_NAME}" --plans "${PLAN_COUNT}"
```

This updates STATUS to "Ready to execute", sets the correct plan count, and timestamps Last Activity.

## 13c. Milestone-health nudge (#942)

After recording completion, check whether the milestone has accumulated too many
open phases — so planning the Nth phase of a sprawling milestone guides the user
toward closing it instead of silently growing the roadmap:

```bash
HEALTH=$(node ".rcode/bin/rcode-tools.cjs" milestone-health 2>/dev/null)
REC=$(echo "$HEALTH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).recommendation||'')}catch{console.log('')}})")
OPEN=$(echo "$HEALTH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).open_phases||0)}catch{console.log(0)}})")
```

- If `REC` is `should-close` (≥12 open): surface a hard nudge recommending
  `/rcode-complete-milestone` then `/rcode-new-milestone`.
- If `REC` is `consider-closing` (8–11 open): softer nudge.
- If `healthy`: say nothing.

## 14. Present Final Status

Route to `<offer_next>` OR `auto_advance` depending on flags/config.

## 15. Auto-Advance Check

Check for auto-advance trigger:

1. Parse `--auto` and `--chain` flags from $ARGUMENTS
2. **Sync chain flag with intent** — if user invoked manually (no `--auto` and no `--chain`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference):
   ```bash
   if [[ ! "$ARGUMENTS" =~ --auto ]] && [[ ! "$ARGUMENTS" =~ --chain ]]; then
     node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
   fi
   ```
3. Read both the chain flag and user preference:
   ```bash
   AUTO_CHAIN=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` or `--chain` flag present AND `AUTO_CHAIN` is not true:** Persist chain flag to config (handles direct invocation without prior discuss-phase):
```bash
if ([[ "$ARGUMENTS" =~ --auto ]] || [[ "$ARGUMENTS" =~ --chain ]]) && [[ "$AUTO_CHAIN" != "true" ]]; then
  node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active true
fi
```

**If `--auto` or `--chain` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTO-ADVANCING TO EXECUTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans ready. Launching execute-phase...
```

Launch execute-phase using the Skill tool to avoid nested Task sessions (which cause runtime freezes due to deep agent nesting). Skill() keeps execute.md running in this same context — set `AUTO_CHAINED_FROM_PLAN=true` so execute.md's required_reading doesn't re-read files this context already loaded (see AUDIT-workflow-complexity.md finding 3):
```
AUTO_CHAINED_FROM_PLAN=true
Skill(skill="rcode-execute", args="${PHASE} --auto --no-transition ${RCODE_WS}")
```

The `--no-transition` flag tells execute-phase to return status after verification instead of chaining further. This keeps the auto-advance chain flat — each phase runs at the same nesting level rather than spawning deeper Task agents.

**Handle execute-phase return:**
- **PHASE COMPLETE** → Display final summary:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   rcode ► PHASE ${PHASE} COMPLETE ✓
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Auto-advance pipeline finished.

  Next: /rcode-discuss-phase ${NEXT_PHASE} --auto ${RCODE_WS}
  ```
- **GAPS FOUND / VERIFICATION FAILED** → Display result, stop chain:
  ```
  Auto-advance stopped: Execution needs review.

  Review the output above and continue manually:
  /rcode-execute ${PHASE} ${RCODE_WS}
  ```

**If neither `--auto` nor config enabled:**
Route to `<offer_next>` (existing behavior).

</process>

<banner_emission_gate>
The success banner is gated on real verification, not vibes.
Before emitting `PLANNED ✓`, confirm one of these is true:

1. A passing CHECK.md exists at `${PHASE_DIR}/*-CHECK.md` from rcode-sprint-checker
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
 rcode ► PHASE {X} PLANNED ⚠ (gates skipped)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans were written but rcode-sprint-checker did not return a passing
CHECK.md. Run /rcode-plan {X} --reviews to gate the plans before
executing, or pass --skip-verify if you accept the risk.
```

The same rule applies to `VERIFIED ✓` (after /rcode-verify-phase) and
`DONE ✓` (after /rcode-execute) — the success-tick is reserved for
gate-passed states.
</banner_emission_gate>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PHASE {X} PLANNED ✓
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

/rcode-execute {X} ${RCODE_WS}

**Next step — paste this to execute:**
> /rcode-execute {X}

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase-dir}/*-SPRINT.md — review plans
- /rcode-plan {X} --research — re-research first
- /rcode-review --phase {X} --all — peer review plans with external AIs
- /rcode-plan {X} --reviews — replan incorporating review feedback

───────────────────────────────────────────────────────────────
</offer_next>

<windows_troubleshooting>
```bash
# Windows-only content (stdio deadlock recovery) — skip the read on other platforms.
WINDOWS=$([[ "$(uname -s 2>/dev/null)" == MINGW* || "$(uname -s 2>/dev/null)" == CYGWIN* || -n "$WINDIR" ]] && echo true || echo false)
```
${WINDOWS === 'true' ? '@.rcode/references/plan-windows-troubleshooting.md' : ''}
</windows_troubleshooting>

<success_criteria>
- [ ] .planning/ directory validated
- [ ] Phase validated against roadmap
- [ ] Phase directory created if needed
- [ ] CONTEXT.md loaded early (step 4) and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] Specialist review panel spawned (Waleed + Fatima + domain agents) and its blocking issues fed into the revision loop, or `workflow.specialist_review: false` recorded
- [ ] rcode-phase-researcher spawned with CONTEXT.md
- [ ] Existing plans checked
- [ ] rcode-planner spawned with CONTEXT.md + RESEARCH.md
- [ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)
- [ ] rcode-sprint-checker spawned with CONTEXT.md
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps
</success_criteria>

## Next Up

- `/rcode-execute` — execute the SPRINT.md plans the planner produced
- `/rcode-discuss-phase` — revisit decisions if the sprint-checker flagged grey areas
- `/rcode-research-phase` — run deeper research if RESEARCH.md was skipped
