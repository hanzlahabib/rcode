# plan - step 03: Load CONTEXT.md, effort-tier gate, check existing plans, INIT context paths

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

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

[If DISCUSS_MODE is "assumptions":]
1. Gather context (assumptions mode) [recommended] — Analyze codebase and surface assumptions before planning
[If DISCUSS_MODE is "discuss" or unset:]
1. Run discuss-phase first [recommended] — Capture design decisions before planning
2. Continue without context — Plan using research + requirements only; your design preferences will not be in the plan

Enter number:
```

Otherwise use AskUserQuestion:
- header: "No context"
- question: "No CONTEXT.md found for Phase {X}. Plans will use research and requirements only — your design preferences won't be included. Continue or capture context first?"
- options:
  (Recommended option FIRST — rcode was recommending the skip, which is how phases
  got planned with the user's design decisions never captured.)
  If `DISCUSS_MODE` is `"assumptions"`:
  - "Gather context (assumptions mode) (Recommended)" — Analyze codebase and surface assumptions before planning
  If `DISCUSS_MODE` is `"discuss"` (or unset):
  - "Run discuss-phase first (Recommended)" — Capture design decisions before planning
  - "Continue without context" — Plan using research + requirements only; your design preferences will not be in the plan

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

## 4.5. Effort-Tier Pre-Plan Gate (#950)

**Skip entirely if:** `GAPS_MODE=true` or `FROM_STUB_MODE=true` (gap-closure and stub-expansion are already narrow-scoped; the tier gate exists to catch over-processing on ordinary phases, not to add friction to modes that are already lean).

@.rcode/workflows/plan-effort-tier.md

This sets `RISK_KEYWORDS_FOUND` and (unless `--tier` overrides it) may set `EFFORT_TIER_SKIP_RESEARCH=true`, which step 5 below reads as equivalent to `--skip-research` having been passed. It may also end the run early via the Trivial-Tier Pre-Flight Redirect (user chose `/rcode-quick` instead). The Post-Plan Gate section of the same file is NOT applied here — it's read now, applied later at step 9, once `SPRINT_COUNT` is known.

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

Next: Read `.rcode/workflows/plan/steps/04-nyquist-ownership.md` before starting it (skip it if its Read-when condition is false).
