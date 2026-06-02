<purpose>
Execute a phase prompt (SPRINT.md) and create the outcome summary (SUMMARY.md).
</purpose>

<required_reading>
Read STATE.md before any operation to load project context.
Read config.yaml for planning behavior settings.

@.rcode/references/git-integration.md
@.rcode/references/karpathy-guidelines.md
</required_reading>

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-executor — Executes plan tasks, commits, creates SUMMARY.md
</available_agent_types>

<process>

<step name="init_context" priority="first">
Load execution context (paths only to minimize orchestrator context):

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init execute "${PHASE}" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

If `INIT` is empty or `INIT.ok` is false, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Extract from init JSON: `executor_model`, `commit_docs`, `sub_repos`, `phase_dir`, `phase_number`, `plans`, `summaries`, `incomplete_plans`, `state_path`, `config_path`, `response_language`.

**If `response_language` is set:** include `Respond in {response_language}.` in every spawned subagent prompt (executor, debugger, gap-closer). VERIFICATION.md, SUMMARY.md, and any human-facing prose must be written in that language. Code, identifiers, commit messages, and file paths stay English.

If `.planning/` missing: error.
</step>

<step name="identify_plan">
```bash
# Use plans/summaries from INIT JSON, or list files
(ls .planning/phases/XX-name/*-SPRINT.md 2>/dev/null || true) | sort
(ls .planning/phases/XX-name/*-SUMMARY.md 2>/dev/null || true) | sort
```

Find first PLAN without matching SUMMARY. Decimal phases supported (`01.1-hotfix/`):

```bash
PHASE=$(echo "$PLAN_PATH" | grep -oE '[0-9]+(\.[0-9]+)?-[0-9]+')

# Scoped yolo check — closes #739. Honours yolo_scope and yolo_ttl from config.
PHASE_NUMBER=$(echo "$PHASE" | grep -oE '^[0-9]+(\.[0-9]+)?')
YOLO_STATUS=$(node ".rcode/bin/rcode-tools.cjs" config-check-yolo --phase "${PHASE_NUMBER}" --workflow execute-sprint 2>/dev/null || echo '{"active":false}')
YOLO_ACTIVE=$(echo "$YOLO_STATUS" | grep -o '"active":true' | grep -c . || echo 0)
[ "$YOLO_ACTIVE" -gt 0 ] && CONFIG_MODE="yolo" || CONFIG_MODE=$(node ".rcode/bin/rcode-tools.cjs" config-get mode 2>/dev/null || echo "guided")
```

<if mode="yolo">
Auto-approve: `⚡ Execute {phase}-{plan}-SPRINT.md [Plan X of Y for Phase Z]` → parse_segments.
</if>

<if mode="interactive" OR="custom with gates.execute_next_plan true">
Present plan identification, wait for confirmation.
</if>
</step>

<step name="record_start_time">
```bash
PLAN_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_START_EPOCH=$(date +%s)
```
</step>

<step name="create_phase_snapshot">
Create a pre-execution git tag so `/rcode-undo --phase NN --to-snapshot` can restore to this exact state.
Only runs when inside a git repository (skip silently otherwise).

```bash
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  SNAPSHOT_TAG="rcode/snapshot/phase-${PHASE_NUMBER}"
  if git rev-parse --verify "refs/tags/${SNAPSHOT_TAG}" >/dev/null 2>&1; then
    git tag -d "${SNAPSHOT_TAG}" >/dev/null 2>&1
  fi
  git tag -a "${SNAPSHOT_TAG}" -m "Pre-execution snapshot for phase ${PHASE_NUMBER}" HEAD 2>/dev/null \
    && echo "✓ Snapshot: ${SNAPSHOT_TAG} @ $(git rev-parse --short HEAD)" \
    || echo "⚠ Could not create snapshot tag (non-fatal)"
fi
```
</step>

<step name="parse_segments">
```bash
grep -n "type=\"checkpoint" .planning/phases/XX-name/{phase}-{plan}-SPRINT.md
```

**Routing by checkpoint type:**

| Checkpoints | Pattern | Execution |
|-------------|---------|-----------|
| None | A (autonomous) | Single subagent: full plan + SUMMARY + commit |
| Verify-only | B (segmented) | Segments between checkpoints. After none/human-verify → SUBAGENT. After decision/human-action → MAIN |
| Decision | C (main) | Execute entirely in main context |

**Pattern A:** init_agent_tracking → capture `EXPECTED_BASE=$(git rev-parse HEAD)` → spawn Task(subagent_type="rcode-executor", model=executor_model) with prompt: execute plan at [path], autonomous, all tasks + SUMMARY + commit, follow deviation/auth rules, report: plan name, tasks, SUMMARY path, commit hash → track agent_id → wait → update tracking → report. **Include `isolation="worktree"` only if `workflow.use_worktrees` is not `false`** (read via `config-get workflow.use_worktrees`). **When using `isolation="worktree"`, include a `<worktree_branch_check>` block in the prompt** instructing the executor to run `git merge-base HEAD {EXPECTED_BASE}` and, if the result differs from `{EXPECTED_BASE}`, reset the branch base with `git reset --soft {EXPECTED_BASE}` before starting work. This corrects a known issue on Windows where `EnterWorktree` creates branches from `main` instead of the feature branch HEAD.

**Post-install namespace fallback:** If `Task(subagent_type="rcode-executor")` fails with "Agent type not found", the runtime has not yet registered the agent (requires IDE reload after install). Retry with `subagent_type="rihal-executor"`. If that also fails, fall back to Pattern C (execute in main context) and log `[execute-sprint] rcode-executor not available — reload IDE or executing in main context`.

**Pattern B:** Execute segment-by-segment. Autonomous segments: spawn subagent for assigned tasks only (no SUMMARY/commit). Checkpoints: main context. After all segments: aggregate, create SUMMARY, commit. See segment_execution.

**Pattern C:** Execute in main using standard flow (step name="execute").

Fresh context per subagent preserves peak quality. Main context stays lean.
</step>

<step name="init_agent_tracking">
```bash
if [ ! -f .planning/agent-history.json ]; then
  echo '{"version":"1.0","max_entries":50,"entries":[]}' > .planning/agent-history.json
fi
rm -f .planning/current-agent-id.txt
if [ -f .planning/current-agent-id.txt ]; then
  INTERRUPTED_ID=$(cat .planning/current-agent-id.txt)
  echo "Found interrupted agent: $INTERRUPTED_ID"
fi
```

If interrupted: ask user to resume (Task `resume` parameter) or start fresh.

**Tracking protocol:** On spawn: write agent_id to `current-agent-id.txt`, append to agent-history.json: `{"agent_id":"[id]","task_description":"[desc]","phase":"[phase]","plan":"[plan]","segment":[num|null],"timestamp":"[ISO]","status":"spawned","completion_timestamp":null}`. On completion: status → "completed", set completion_timestamp, delete current-agent-id.txt. Prune: if entries > max_entries, remove oldest "completed" (never "spawned").

Run for Pattern A/B before spawning. Pattern C: skip.
</step>

<step name="segment_execution">
Pattern B only (verify-only checkpoints). Skip for A/C.

1. Parse segment map: checkpoint locations and types
2. Per segment:
   - Subagent route: spawn rcode-executor for assigned tasks only. Prompt: task range, plan path, read full plan for context, execute assigned tasks, track deviations, NO SUMMARY/commit. Track via agent protocol.
   - Main route: execute tasks using standard flow (step name="execute")
3. After ALL segments: aggregate files/deviations/decisions → create SUMMARY.md → commit → self-check:
   - Verify key-files.created exist on disk with `[ -f ]`
   - Check `git log --oneline --all --grep="{phase}-{plan}"` returns ≥1 commit
   - Append `## Self-Check: PASSED` or `## Self-Check: FAILED` to SUMMARY

   **Known Claude Code bug (classifyHandoffIfNeeded):** If any segment agent reports "failed" with `classifyHandoffIfNeeded is not defined`, this is a Claude Code runtime bug — not a real failure. Run spot-checks; if they pass, treat as successful.




</step>

<step name="load_prompt">
```bash
cat .planning/phases/XX-name/{phase}-{plan}-SPRINT.md
```
This IS the execution instructions. Follow exactly. If plan references CONTEXT.md: honor user's vision throughout.

**If plan contains `<interfaces>` block:** These are pre-extracted type definitions and contracts. Use them directly — do NOT re-read the source files to discover types. The planner already extracted what you need.
</step>

<step name="previous_phase_check">
```bash
node ".rcode/bin/rcode-tools.cjs" phases list --type summaries --raw
# Extract the second-to-last summary from the JSON result
```
If previous SUMMARY has unresolved "Issues Encountered" or "Next Phase Readiness" blockers: AskUserQuestion(header="Previous Issues", options: "Proceed anyway" | "Address first" | "Review previous").
</step>

<step name="execute">
Deviations are normal — handle via rules below.

1. Read @context files from prompt
2. **MCP tools:** If CLAUDE.md or project instructions reference MCP tools (e.g. jCodeMunch for code navigation), prefer them over Grep/Glob when available. Fall back to Grep/Glob if MCP tools are not accessible.
3. Per task:
   - **MANDATORY read_first gate:** If the task has a `<read_first>` field, you MUST read every listed file BEFORE making any edits. This is not optional. Do not skip files because you "already know" what's in them — read them. The read_first files establish ground truth for the task.
   - `type="auto"`: if `tdd="true"` → TDD execution. Implement with deviation rules + auth gates. Verify done criteria. Commit (see task_commit). Track hash for Summary.
   - `type="checkpoint:*"`: STOP → checkpoint_protocol → wait for user → continue only after confirmation.
   - **Task completion precedence (when signals conflict):**
     1. `<verify><automated>` — machine-executable shell commands. **Highest authority.** If these pass, the task is done. If these fail, the task is NOT done — regardless of what `<acceptance_criteria>` says.
     2. `<done>` — single observable sentence. Use as the human-readable confirmation once automated checks pass.
     3. `<acceptance_criteria>` — prose checklist. **Lowest authority.** Use as a guide during implementation, but automated results override prose judgments.
     - If `<verify><automated>` is absent: fall back to `<done>`, then `<acceptance_criteria>`.
   - **MANDATORY acceptance_criteria check:** After completing each task, if it has `<acceptance_criteria>`, verify EVERY criterion before moving to the next task. Use grep, file reads, or CLI commands to confirm each criterion. If any criterion fails, fix the implementation before proceeding. Do not skip criteria or mark them as "will verify later".
3. Run `<verification>` checks
4. Confirm `<success_criteria>` met
5. Document deviations in Summary
</step>

<authentication_gates>

## Authentication Gates

Auth errors during execution are NOT failures — they're expected interaction points.

**Indicators:** "Not authenticated", "Unauthorized", 401/403, "Please run {tool} login", "Set {ENV_VAR}"

**Protocol:**
1. Recognize auth gate (not a bug)
2. STOP task execution
3. Create dynamic checkpoint:human-action with exact auth steps
4. Wait for user to authenticate
5. Verify credentials work
6. Retry original task
7. Continue normally

**Example:** `vercel --yes` → "Not authenticated" → checkpoint asking user to `vercel login` → verify with `vercel whoami` → retry deploy → continue

**In Summary:** Document as normal flow under "## Authentication Gates", not as deviations.

</authentication_gates>

<deviation_rules>

## Deviation Rules

You WILL discover unplanned work. Apply automatically, track all for Summary.

| Rule | Trigger | Action | Permission |
|------|---------|--------|------------|
| **1: Bug** | Broken behavior, errors, wrong queries, type errors, security vulns, race conditions, leaks | Fix → test → verify → track `[Rule 1 - Bug]` | Auto |
| **2: Missing Critical** | Missing essentials: error handling, validation, auth, CSRF/CORS, rate limiting, indexes, logging | Add → test → verify → track `[Rule 2 - Missing Critical]` | Auto |
| **3: Blocking** | Prevents completion: missing deps, wrong types, broken imports, missing env/config/files, circular deps | Fix blocker → verify proceeds → track `[Rule 3 - Blocking]` | Auto |
| **4: Architectural** | Structural change: new DB table, schema change, new service, switching libs, breaking API, new infra | STOP → present decision (below) → track `[Rule 4 - Architectural]` | Ask user |

**Rule 4 format:**
```
⚠️ Architectural Decision Needed

Current task: [task name]
Discovery: [what prompted this]
Proposed change: [modification]
Why needed: [rationale]
Impact: [what this affects]
Alternatives: [other approaches]

Proceed with proposed change? (yes / different approach / defer)
```

**Priority:** Rule 4 (STOP) > Rules 1-3 (auto) > unsure → Rule 4
**Edge cases:** missing validation → R2 | null crash → R1 | new table → R4 | new column → R1/2
**Heuristic:** Affects correctness/security/completion? → R1-3. Maybe? → R4.

</deviation_rules>

<deviation_documentation>

## Documenting Deviations

Summary MUST include deviations section. None? → `## Deviations from Plan\n\nNone - plan executed exactly as written.`

Per deviation: **[Rule N - Category] Title** — Found during: Task X | Issue | Fix | Files modified | Verification | Commit hash

End with: **Total deviations:** N auto-fixed (breakdown). **Impact:** assessment.

</deviation_documentation>

<tdd_plan_execution>
## TDD Execution

For `type: tdd` plans — RED-GREEN-REFACTOR:

1. **Infrastructure** (first TDD plan only): detect project, install framework, config, verify empty suite
2. **RED:** Read `<behavior>` → failing test(s) → run (MUST fail) → commit: `test({phase}-{plan}): add failing test for [feature]`
3. **GREEN:** Read `<implementation>` → minimal code → run (MUST pass) → commit: `feat({phase}-{plan}): implement [feature]`
4. **REFACTOR:** Clean up → tests MUST pass → commit: `refactor({phase}-{plan}): clean up [feature]`

Errors: RED doesn't fail → investigate test/existing feature. GREEN doesn't pass → debug, iterate. REFACTOR breaks → undo.

See `.rcode/references/tdd.md` for structure.
</tdd_plan_execution>

<precommit_failure_handling>
## Pre-commit Hook Failure Handling

Your commits may trigger pre-commit hooks. Auto-fix hooks handle themselves transparently — files get fixed and re-staged automatically.

**If running as a parallel executor agent (spawned by execute-phase):**
Use `--no-verify` on all commits. Pre-commit hooks cause build lock contention when multiple agents commit simultaneously (e.g., cargo lock fights in Rust projects). The orchestrator validates once after all agents complete.

**If running as the sole executor (sequential mode):**
If a commit is BLOCKED by a hook:

1. The `git commit` command fails with hook error output
2. Read the error — it tells you exactly which hook and what failed
3. Fix the issue (type error, lint violation, secret leak, etc.)
4. `git add` the fixed files
5. Retry the commit
6. Budget 1-2 retry cycles per commit
</precommit_failure_handling>

<task_commit>
## Task Commit Protocol

After each task (verification passed, done criteria met), commit immediately.

**1. Check:** `git status --short`

**2. Stage individually** (NEVER `git add .` or `git add -A`):
```bash
git add src/api/auth.ts
git add src/types/user.ts
```

**3. Commit type:**

| Type | When | Example |
|------|------|---------|
| `feat` | New functionality | feat(08-02): create user registration endpoint |
| `fix` | Bug fix | fix(08-02): correct email validation regex |
| `test` | Test-only (TDD RED) | test(08-02): add failing test for password hashing |
| `refactor` | No behavior change (TDD REFACTOR) | refactor(08-02): extract validation to helper |
| `perf` | Performance | perf(08-02): add database index |
| `docs` | Documentation | docs(08-02): add API docs |
| `style` | Formatting | style(08-02): format auth module |
| `chore` | Config/deps | chore(08-02): add bcrypt dependency |

**4. Format:** `{type}({phase}-{plan}): {description}` with bullet points for key changes.

<sub_repos_commit_flow>
**Sub-repos mode:** If `sub_repos` is configured (non-empty array from init context), use `commit-to-subrepo` instead of standard git commit. This routes files to their correct sub-repo based on path prefix.

```bash
node .rcode/bin/rcode-tools.cjs commit-to-subrepo "{type}({phase}-{plan}): {description}" --files file1 file2 ...
```

The command groups files by sub-repo prefix and commits atomically to each. Returns JSON: `{ committed: true, repos: { "backend": { hash: "abc", files: [...] }, ... } }`.

Record hashes from each repo in the response for SUMMARY tracking.

**If `sub_repos` is empty or not set:** Use standard git commit flow below.
</sub_repos_commit_flow>

**5. Record hash:**
```bash
TASK_COMMIT=$(git rev-parse --short HEAD)
TASK_COMMITS+=("Task ${TASK_NUM}: ${TASK_COMMIT}")
```

**6. Check for untracked generated files:**
```bash
git status --short | grep '^??'
```
If new untracked files appeared after running scripts or tools, decide for each:
- **Commit it** — if it's a source file, config, or intentional artifact
- **Add to .gitignore** — if it's a generated/runtime output (build artifacts, `.env` files, cache files, compiled output)
- Do NOT leave generated files untracked

</task_commit>

<post_step_revert_gate>
## Post-Step Revert Detection Gate

After committing each task, run a diff check to detect accidental reverts. This catches the class of bug where a task's implementation unknowingly undoes work from a previous task or wave.

**When to run:** After every `git commit` that records a task completion (not after TDD RED commits or style-only commits).

**Detection:**
```bash
# Compare current HEAD against the commit that started this plan execution
# PLAN_START_SHA is captured at plan execution start (before first task commit)
PLAN_START_SHA="${PLAN_START_SHA:-$(git rev-parse HEAD~${COMPLETED_TASK_COUNT:-1} 2>/dev/null || echo '')}"

if [[ -n "$PLAN_START_SHA" ]]; then
  REVERTED_FILES=$(git diff --name-only "${PLAN_START_SHA}"..HEAD | xargs -I{} sh -c \
    'git show '"$PLAN_START_SHA"':{} 2>/dev/null | diff - <(git show HEAD:{} 2>/dev/null) >/dev/null 2>&1 && echo {}' 2>/dev/null || true)
fi

# Simpler check: look for net-zero or net-negative line delta on committed source files
STAGED_SUMMARY=$(git diff --stat HEAD~1..HEAD 2>/dev/null | tail -1)
```

**Revert signal heuristics — flag for review if:**
1. A source file that was modified by a *previous* task (visible in `git log --oneline -10 -- <file>`) has FEWER lines now than at `PLAN_START_SHA`.
2. A function or class that was added in a prior task is no longer present in the file at `HEAD`.
3. `git diff --stat HEAD~1..HEAD` shows a large deletion count with no corresponding additions.

**On revert signal detected:**
```
⚠ Revert signal on task {N}: {file} appears to have fewer lines than at plan start.
  Plan start SHA: {PLAN_START_SHA}
  Current HEAD:   {current_hash}

Review with: git diff {PLAN_START_SHA}..HEAD -- {file}

Options:
  a) The reduction is intentional (refactor/simplification) — continue
  b) Work was accidentally overwritten — fix before proceeding
```

Pause and present this to the user. Do NOT auto-continue on a revert signal. If the user confirms it's intentional, continue. If it's an accidental revert, restore the lost work before committing the next task.

**Performance:** Skip this check on tasks with zero deletions (`git diff --stat HEAD~1..HEAD | grep -q ' 0 deletions'`) — deletions are the precursor to a revert; pure additions cannot revert prior work.
</post_step_revert_gate>

<step name="checkpoint_protocol">
On `type="checkpoint:*"`: automate everything possible first. Checkpoints are for verification/decisions only.

Display: `CHECKPOINT: [Type]` box → Progress {X}/{Y} → Task name → type-specific content → `YOUR ACTION: [signal]`

| Type | Content | Resume signal |
|------|---------|---------------|
| human-verify (90%) | What was built + verification steps (commands/URLs) | "approved" or describe issues |
| decision (9%) | Decision needed + context + options with pros/cons | "Select: option-id" |
| human-action (1%) | What was automated + ONE manual step + verification plan | "done" |

After response: verify if specified. Pass → continue. Fail → inform, wait. WAIT for user — do NOT hallucinate completion.

See .rcode/references/checkpoints.md for details.
</step>

<step name="checkpoint_return_for_orchestrator">
When spawned via Task and hitting checkpoint: return structured state (cannot interact with user directly).

**Required return:** 1) Completed Tasks table (hashes + files) 2) Current Task (what's blocking) 3) Checkpoint Details (user-facing content) 4) Awaiting (what's needed from user)

Orchestrator parses → presents to user → spawns fresh continuation with your completed tasks state. You will NOT be resumed. In main context: use checkpoint_protocol above.
</step>

<step name="verification_failure_gate">
If verification fails:

**Check if node repair is enabled** (default: on):
```bash
NODE_REPAIR=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.node_repair 2>/dev/null || echo "true")
```

If `NODE_REPAIR` is `true`: attempt RETRY → DECOMPOSE → PRUNE in that order
within a budget of `workflow.node_repair_budget` (default: 2). Track:

- FAILED_TASK: task number, name, done-criteria
- ERROR: expected vs actual result
- PLAN_CONTEXT: adjacent task names + phase goal
- REPAIR_BUDGET: remaining attempts

Repair strategies:
- **RETRY** — re-run the same task with the failure context as added input.
- **DECOMPOSE** — split into smaller subtasks (only if the original was L/XL).
- **PRUNE** — drop the task from the sprint scope and record under "Issues Encountered" in SUMMARY.

If the budget is exhausted without success: ESCALATE.

If `NODE_REPAIR` is `false` OR repair returns ESCALATE: STOP. Present: "Verification failed for Task [X]: [name]. Expected: [criteria]. Actual: [result]. Repair attempted: [summary of what was tried]." Options: Retry | Skip (mark incomplete) | Stop (investigate). If skipped → SUMMARY "Issues Encountered".
</step>

<step name="record_completion_time">
```bash
PLAN_END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_END_EPOCH=$(date +%s)

DURATION_SEC=$(( PLAN_END_EPOCH - PLAN_START_EPOCH ))
DURATION_MIN=$(( DURATION_SEC / 60 ))

if [[ $DURATION_MIN -ge 60 ]]; then
  HRS=$(( DURATION_MIN / 60 ))
  MIN=$(( DURATION_MIN % 60 ))
  DURATION="${HRS}h ${MIN}m"
else
  DURATION="${DURATION_MIN} min"
fi
```
</step>

<step name="generate_user_setup">
```bash
grep -A 50 "^user_setup:" .planning/phases/XX-name/{phase}-{plan}-SPRINT.md | head -50
```

If user_setup exists: create `{phase}-USER-SETUP.md` using template `.rcode/templates/user-setup.md`. Per service: env vars table, account setup checklist, dashboard config, local dev notes, verification commands. Status "Incomplete". Set `USER_SETUP_CREATED=true`. If empty/missing: skip.
</step>

<step name="create_summary">
Create `{phase}-{plan}-SUMMARY.md` at `.planning/phases/XX-name/`. Use `.rcode/templates/summary.md`.

**Frontmatter:** phase, plan, subsystem, tags | requires/provides/affects | tech-stack.added/patterns | key-files.created/modified | key-decisions | requirements-completed (**MUST** copy `requirements` array from SPRINT.md frontmatter verbatim) | duration ($DURATION), completed ($PLAN_END_TIME date).

Title: `# Phase [X] Plan [Y]: [Name] Summary`

One-liner SUBSTANTIVE: "JWT auth with refresh rotation using jose library" not "Authentication implemented"

Include: duration, start/end times, task count, file count.

**Fill the knowledge-transfer sections (omit any with nothing substantive to say):**

- **Patterns Established** — Any new architectural/coding patterns introduced. Future plans should follow these. Example: "All service errors now wrap in ServiceError(code, message)". If none, omit.
- **Provides** — Specific functions, APIs, models, config keys, or contracts this plan exposes for future plans to build on. Be concrete: function names and file paths.
- **Requires** — What this plan consumed from prior phases. Helps trace dependency chains.
- **Affects** — Later phases or components that may need re-verification because of what changed here.

Next: more plans → "Ready for {next-plan}" | last → "Phase complete, ready for next step".
</step>

<step name="update_current_position">
Update STATE.md using rcode-tools:

```bash
# Advance plan counter (handles last-plan edge case)
node ".rcode/bin/rcode-tools.cjs" state advance-plan

# Recalculate progress bar from disk state
node ".rcode/bin/rcode-tools.cjs" state update-progress

# Record execution metrics
node ".rcode/bin/rcode-tools.cjs" state record-metric \
  --phase "${PHASE}" --plan "${PLAN}" --duration "${DURATION}" \
  --tasks "${TASK_COUNT}" --files "${FILE_COUNT}"
```
</step>

<step name="extract_decisions_and_issues">
From SUMMARY: Extract decisions and add to STATE.md:

```bash
# Add each decision from SUMMARY key-decisions
# Prefer file inputs for shell-safe text (preserves `$`, `*`, etc. exactly)
node ".rcode/bin/rcode-tools.cjs" state add-decision \
  --phase "${PHASE}" --summary-file "${DECISION_TEXT_FILE}" --rationale-file "${RATIONALE_FILE}"

# Add blockers if any found
node ".rcode/bin/rcode-tools.cjs" state add-blocker --text-file "${BLOCKER_TEXT_FILE}"
```
</step>

<step name="update_session_continuity">
Update session info using rcode-tools:

```bash
node ".rcode/bin/rcode-tools.cjs" state record-session \
  --stopped-at "Completed ${PHASE}-${PLAN}-SPRINT.md" \
  --resume-file "None"
```

Keep STATE.md under 150 lines.
</step>

<step name="issues_review_gate">
If SUMMARY "Issues Encountered" ≠ "None": yolo → log and continue. Interactive → present issues, wait for acknowledgment.
</step>

<step name="update_roadmap">
```bash
node ".rcode/bin/rcode-tools.cjs" roadmap update-plan-progress "${PHASE}"
```
Counts PLAN vs SUMMARY files on disk. Updates progress table row with correct count and status (`In Progress` or `Complete` with date).
</step>

<step name="update_requirements">
Mark completed requirements from the SPRINT.md frontmatter `requirements:` field:

```bash
node ".rcode/bin/rcode-tools.cjs" requirements mark-complete ${REQ_IDS}
```

Extract requirement IDs from the plan's frontmatter (e.g., `requirements: [AUTH-01, AUTH-02]`). If no requirements field, skip.
</step>

<step name="git_commit_metadata">
Task code already committed per-task. Commit plan metadata:

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs({phase}-{plan}): complete [plan-name] plan" --files .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
```
</step>

<step name="update_codebase_map">
If .planning/codebase/ doesn't exist: skip.

```bash
FIRST_TASK=$(git log --oneline --grep="feat({phase}-{plan}):" --grep="fix({phase}-{plan}):" --grep="test({phase}-{plan}):" --reverse | head -1 | cut -d' ' -f1)
git diff --name-only ${FIRST_TASK}^..HEAD 2>/dev/null || true
```

Update only structural changes: new src/ dir → STRUCTURE.md | deps → STACK.md | file pattern → CONVENTIONS.md | API client → INTEGRATIONS.md | config → STACK.md | renamed → update paths. Skip code-only/bugfix/content changes.

```bash
node ".rcode/bin/rcode-tools.cjs" commit "" --files .planning/codebase/*.md --amend
```
</step>

<step name="offer_next">
If `USER_SETUP_CREATED=true`: display `⚠️ USER SETUP REQUIRED` with path + env/config tasks at TOP.

```bash
(ls -1 .planning/phases/[current-phase-dir]/*-SPRINT.md 2>/dev/null || true) | wc -l
(ls -1 .planning/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null || true) | wc -l
```

| Condition | Route | Action |
|-----------|-------|--------|
| summaries < plans | **A: More plans** | Find next PLAN without SUMMARY. Yolo: auto-continue. Interactive: show next plan, suggest `/rcode-execute {phase}` + `/rcode-verify-work`. STOP here. |
| summaries = plans, current < highest phase | **B: Phase done** | Show completion, suggest `/rcode-plan {Z+1}` + `/rcode-verify-work {Z}` + `/rcode-discuss-phase {Z+1}` |
| summaries = plans, current = highest phase | **C: Milestone done** | Show banner, suggest `/rcode-complete-milestone` + `/rcode-verify-work` + `/rcode-add-phase` |

All routes: `/clear` first for fresh context.
</step>

</process>

<success_criteria>

- All tasks from SPRINT.md completed
- All verifications pass
- USER-SETUP.md generated if user_setup in frontmatter
- SUMMARY.md created with substantive content
- STATE.md updated (position, decisions, issues, session)
- ROADMAP.md updated
- If codebase map exists: map updated with execution changes (or skipped if no significant changes)
- If USER-SETUP.md created: prominently surfaced in completion output
</success_criteria>

## Next Up

- `/rcode-verify-phase` — verify the phase goal achieved by this sprint
- `/rcode-code-review` — review code changes produced by the sprint
