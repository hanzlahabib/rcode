# plan - step 02: Initialize, parse/normalize arguments, validate --reviews, validate phase, --gaps mode

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 1. Initialize

Load all context in one call (paths only to minimize orchestrator context):

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init sprint-plan "$PHASE" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi

# Detect UI signals in phase goal + CONTEXT.md to decide whether to load ui-brand.md (254 lines)
PHASE_GOAL_HAS_UI=$(grep -iEl "frontend|ui|component|design|style|brand" \
  .planning/phases/*${PHASE_NUMBER}*/*-CONTEXT.md \
  .planning/ROADMAP.md 2>/dev/null | head -1)
```

If `INIT` is empty, or `INIT.ok` is false or absent (null/undefined — `init sprint-plan` may omit the key), print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

**#949 — no separate `agent-skills` / `config-get context_window` calls.** `init sprint-plan` already returns `agent_skills.researcher`, `agent_skills.planner`, `agent_skills.checker` (the same manifest rows the standalone `agent-skills <id>` command returns) and `context_window`, folded in to avoid 4 extra cold Node starts per plan run. Read `agent_skills.researcher` / `.planner` / `.checker` directly from `$INIT` wherever this doc previously referenced `$AGENT_SKILLS_RESEARCHER` / `$AGENT_SKILLS_PLANNER` / `$AGENT_SKILLS_CHECKER`. `CONTEXT_WINDOW` defaults to `200000` when `context_window` is null (config key absent).

When `CONTEXT_WINDOW >= 500000`, the planner prompt includes prior phase CONTEXT.md files so cross-phase decisions are consistent (e.g., "use library X for all data fetching" from Phase 2 is visible to Phase 5's planner).

Parse JSON for: `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `nyquist_validation_enabled`, `specialist_review_enabled`, `commit_docs`, `text_mode`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_reviews`, `has_plans`, `plan_count`, `phase_status`, `planning_exists`, `roadmap_exists`, `phase_req_ids`, `response_language`, `context_window`, `agent_skills`, `state_digest`.

**If `response_language` is set:** Include `response_language: {value}` in all spawned subagent prompts so any user-facing output stays in the configured language.

**File paths (for <files_to_read> blocks):** `state_path`, `roadmap_path`, `requirements_path`, `context_path`, `research_path`, `verification_path`, `uat_path`, `reviews_path`. These are null if files don't exist.

**If `planning_exists` is false:** Error — run `/rcode-new-project` first.

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS: phase number (integer or decimal like `2.1`), flags (`--research`, `--skip-research`, `--gaps`, `--skip-verify`, `--from-stub`, `--prd <filepath>`, `--reviews`, `--text`, `--no-panel`, `--tier <trivial|small|normal|complex>`).

**Detect effort-tier override (#950):**
```bash
EFFORT_TIER_OVERRIDE=$(echo "$ARGUMENTS" | grep -oE -- '--tier[[:space:]]+[a-z]+' | awk '{print $2}')
EFFORT_TIER_OVERRIDE=${EFFORT_TIER_OVERRIDE:-}
```
Valid values: `trivial`, `small`, `normal`, `complex`. An unrecognized value is ignored (treated as unset) — do not error, this is a low-stakes UX flag. `--tier` sets the SAME flags the workflow already reads (`--skip-research`, `--skip-verify`) — see `plan-effort-tier.md` § Tier Override for the exact mapping. It is not a second code path.

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

Next: Read `.rcode/workflows/plan/steps/03-context-existing-plans.md` before starting it (skip it if its Read-when condition is false).
