# discuss-phase - step 02: Process start, initialize, blocking antipatterns, check existing CONTEXT.md

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<process>

**Express path available:** If you already have a PRD or acceptance criteria document, use `/rcode-plan {phase} --prd path/to/prd.md` to skip this discussion and go straight to planning.

<step name="initialize" priority="first">
Phase number from argument (required).

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init phase-op "${PHASE}" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_ADVISOR=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-advisor-researcher 2>/dev/null || echo "")
```

If `INIT` is empty or `INIT.ok` is false, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Parse JSON for: `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_plans`, `has_verification`, `plan_count`, `roadmap_exists`, `planning_exists`, `response_language`.

**If `response_language` is set:** All user-facing questions, prompts, and explanations in this workflow MUST be presented in `{response_language}`. This includes AskUserQuestion labels, option text, gray area descriptions, and discussion summaries. Technical terms, code, and file paths remain in English. Subagent prompts stay in English — only user-facing output is translated.

**If `phase_found` is false:**
```
Phase [X] not found in roadmap.

Use /rcode-progress ${RCODE_WS} to see available phases.
```
Exit workflow.

**If `phase_found` is true:** Continue to check_existing.

**Power mode** — If `--power` is present in ARGUMENTS:
- Skip interactive questioning entirely
- Read and execute @.rcode/workflows/discuss-phase-power.md end-to-end
- Do not continue with the steps below

**Auto mode** — If `--auto` is present in ARGUMENTS:
- In `check_existing`: auto-select "Skip" (if context exists) or continue without prompting (if no context/plans)
- In `present_gray_areas`: auto-select ALL gray areas without asking the user
- In `discuss_areas`: for each discussion question, choose the recommended option (first option, or the one marked "recommended") without using AskUserQuestion
- Log each auto-selected choice inline so the user can review decisions in the context file
- After discussion completes, auto-advance to plan (existing behavior)

**Chain mode** — If `--chain` is present in ARGUMENTS:
- Discussion is fully interactive (questions, gray area selection — same as default mode)
- After discussion completes, auto-advance to plan → execute-phase (same as `--auto`)
- This is the middle ground: user controls the discuss decisions, then plan+execute run autonomously
</step>

<step name="check_blocking_antipatterns" priority="first">
**MANDATORY — Check for blocking anti-patterns before any other work.**

Look for a `.continue-here.md` in the current phase directory:

```bash
ls ${phase_dir}/.continue-here.md 2>/dev/null || true
```

If `.continue-here.md` exists, parse its "Critical Anti-Patterns" table for rows with `severity` = `blocking`.

**If one or more `blocking` anti-patterns are found:**

This step cannot be skipped. Before proceeding to `check_existing` or any other step, the agent must demonstrate understanding of each blocking anti-pattern by answering all three questions for each one:

1. **What is this anti-pattern?** — Describe it in your own words, not by quoting the handoff.
2. **How did it manifest?** — Explain the specific failure that caused it to be recorded.
3. **What structural mechanism (not acknowledgment) prevents it?** — Name the concrete step, checklist item, or enforcement mechanism that stops recurrence.

Write these answers inline before continuing. If a blocking anti-pattern cannot be answered from the context in `.continue-here.md`, stop and ask the user for clarification.

**If no `.continue-here.md` exists, or no `blocking` rows are found:** Proceed directly to `check_existing`.
</step>

<step name="check_existing">
Check if CONTEXT.md already exists using `has_context` from init.

```bash
ls ${phase_dir}/*-CONTEXT.md 2>/dev/null || true
```

**If exists:**

**If `--auto`:** Auto-select "Update it" — load existing context and continue to analyze_phase. Log: `[auto] Context exists — updating with auto-selected decisions.`

**Otherwise:** Use AskUserQuestion:
- header: "Context"
- question: "Phase [X] already has context. What do you want to do?"
- options:
  - "Update it" — Review and revise existing context
  - "View it" — Show me what's there
  - "Skip" — Use existing context as-is

If "Update": Load existing, continue to analyze_phase
If "View": Display CONTEXT.md, then offer update/skip
If "Skip": Exit workflow

**If doesn't exist:**

**Check for interrupted discussion checkpoint:**

```bash
ls ${phase_dir}/*-DISCUSS-CHECKPOINT.json 2>/dev/null || true
```

If a checkpoint file exists (previous session was interrupted before CONTEXT.md was written):

**If `--auto`:** Auto-select "Resume" — load checkpoint and continue from last completed area.

**Otherwise:** Use AskUserQuestion:
- header: "Resume"
- question: "Found interrupted discussion checkpoint ({N} areas completed out of {M}). Resume from where you left off?"
- options:
  - "Resume" — Load checkpoint, skip completed areas, continue discussion
  - "Start fresh" — Delete checkpoint, start discussion from scratch

If "Resume": Parse the checkpoint JSON. Load `decisions` into the internal accumulator. Set `areas_completed` to skip those areas. Continue to `present_gray_areas` with only the remaining areas.
If "Start fresh": Delete the checkpoint file. Continue as if no checkpoint existed.

Check `has_plans` and `plan_count` from init. **If `has_plans` is true:**

**If `--auto`:** Auto-select "Continue and replan after". Log: `[auto] Plans exist — continuing with context capture, will replan after.`

**Otherwise:** Use AskUserQuestion:
- header: "Plans exist"
- question: "Phase [X] already has {plan_count} plan(s) created without user context. Your decisions here won't affect existing plans unless you replan."
- options:
  - "Continue and replan after" — Capture context, then run /rcode-plan {X} ${RCODE_WS} to replan
  - "View existing plans" — Show plans before deciding
  - "Cancel" — Skip discuss-phase

If "Continue and replan after": Continue to analyze_phase.
If "View existing plans": Display plan files, then offer "Continue" / "Cancel".
If "Cancel": Exit workflow.

**If `has_plans` is false:** Continue to load_prior_context.
</step>

Next: Read `.rcode/workflows/discuss-phase/steps/03-prior-context-scout.md` before starting it (skip it if its Read-when condition is false).
