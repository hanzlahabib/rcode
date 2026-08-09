<purpose>
Sub-step of execute.md — execute_waves. Executes each wave of plans in sequence, handles file-overlap detection, parallel vs sequential spawning, and checkpoint plans between waves.
</purpose>

<step name="execute_waves">
Execute each selected wave in sequence. Within a wave: parallel if `PARALLELIZATION=true`, sequential if `false`.

**For each wave:**

1. **Intra-wave files_modified overlap check (BEFORE spawning):**

   Before spawning any agents for this wave, inspect the `files_modified` list of all plans
   in the wave. Check every pair of plans in the wave — if any two plans share even one file
   in their `files_modified` lists, those plans have an implicit dependency and MUST NOT run
   in parallel.

   **Detection algorithm (pseudocode):**
   ```
   seen_files = {}
   overlapping_plans = []
   for each plan in wave_plans:
     for each file in plan.files_modified:
       if file in seen_files:
         overlapping_plans.add(plan, seen_files[file])  # both plans overlap on this file
       else:
         seen_files[file] = plan
   ```

   **If overlap is detected:**
   - Warn the user:
     ```
     ⚠ Intra-wave files_modified overlap detected in Wave {N}:
       Plan {A} and Plan {B} both modify {file}
       Running these plans sequentially to avoid parallel worktree conflicts.
     ```
   - Override `PARALLELIZATION` to `false` for this wave only — run all plans in the wave
     sequentially regardless of the global parallelization setting.
   - This is a safety net for plans that were incorrectly assigned to the same wave.
     The planner should have caught this; flag it as a planning defect so the user can
     replan the phase if desired.

   **If no overlap:** proceed normally (parallel if `PARALLELIZATION=true`).

2. **Describe what's being built (BEFORE spawning):**

   Read each plan's `<objective>`. Extract what's being built and why.

   ```
   ---
   ## Wave {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, technical approach, why it matters}

   Spawning {count} agent(s)...
   ---
   ```

   - Bad: "Executing terrain generation plan"
   - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

3. **Spawn executor agents:**

   Pass paths only — executors read files themselves with their fresh context window.
   For 200k models, this keeps orchestrator context lean (~10-15%).
   For 1M+ models (Opus 4.6, Sonnet 4.6), richer context can be passed directly.

   **Classify plan and select subagent_type (BEFORE spawning, once per plan):**

   This used to be prose pseudocode the orchestrating LLM was expected to hand-apply
   (FRONTEND_GLOBS/BACKEND_GLOBS matching + keyword fallback). A live execution run showed
   that computation was never actually carried out — a plan whose `files_modified` clearly
   matched the backend glob rule (a path containing `db`) still fell back to `rcode-executor`.
   Classification is now a deterministic CLI call — do not hand-compute it.

   Call `classify-plan` with the phase and this plan's id (it reads `files_modified` and the
   `<objective>` directly from the plan's SPRINT.md, so no need to re-parse step 1's overlap
   data yourself):

   ```bash
   CLASSIFY_JSON=$(node ".rcode/bin/rcode-tools.cjs" classify-plan "$PHASE" "$PLAN_ID" 2>/dev/null)
   SUBAGENT_TYPE=$(echo "$CLASSIFY_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).subagent_type)}catch{console.log('rcode-executor')}})")
   SUBAGENT_TYPE=${SUBAGENT_TYPE:-rcode-executor}
   ```

   Use the literal `subagent_type` value returned — do not second-guess or override it.

   This decision is computed once per plan, before that plan's Task() spawn(s) below, and the
   resulting `subagent_type` value is used in the Task() call template (worktree and sequential
   modes both reuse this same value — see "Sequential mode" further below).

   **Resolve executor model (once per wave, before spawning):**

   `executor_model` from `init` is the raw `model_profile` string (e.g. `balanced`), not a
   resolved model id — it must be passed through `resolve-model` first, the same way
   `code_review_gate` in execute.md resolves `REVIEWER_MODEL` before its Task() spawn.
   ```bash
   EXECUTOR_MODEL=$(node ".rcode/bin/rcode-tools.cjs" resolve-model executor 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).model)}catch{console.log('')}})" || echo "sonnet")
   EXECUTOR_MODEL=${EXECUTOR_MODEL:-sonnet}
   ```

   **Worktree mode** (`USE_WORKTREES` is not `false`):

   Before spawning, capture the current HEAD:
   ```bash
   EXPECTED_BASE=$(git rev-parse HEAD)
   ```

   **Sequential dispatch for parallel execution (waves with 2+ agents):**
   When spawning multiple agents in a wave, dispatch each `Task()` call **one at a time
   with `run_in_background: true`** — do NOT send all Task calls in a single message.
   `git worktree add` acquires an exclusive lock on `.git/config.lock`, so simultaneous
   calls race for this lock and fail. Sequential dispatch ensures each worktree finishes
   creation before the next begins (the round-trip latency of each tool call provides
   natural spacing), while all agents still **run in parallel** once created.

   ```
   # CORRECT: dispatch one Task() per message, each with run_in_background: true
   # → worktrees created sequentially, agents execute in parallel
   #
   # WRONG: multiple Task() calls in a single message
   # → simultaneous git worktree add → .git/config.lock contention → failures
   ```

   ```
   Task(
     subagent_type="{subagent_type}",
     description="Execute plan {plan_number} of phase {phase_number}",
     model="${EXECUTOR_MODEL}",
     isolation="worktree",
     prompt="
       <objective>
       Execute plan {plan_number} of phase {phase_number}-{phase_name}.
       Commit each task atomically. Create SUMMARY.md.
       Do NOT update STATE.md or ROADMAP.md — the orchestrator owns those writes after all worktree agents in the wave complete.

       Routing note: this plan touches {classification} paths → dispatched to {subagent_type} (see step 3's classification logic in execute-waves.md).
       </objective>

       <!--
         #721 i18n: when init JSON's response_language is set, prepend this line
         verbatim to the prompt before the objective. Human-facing prose in
         SUMMARY.md must be in {response_language}; code/identifiers stay English.
       -->
       ${response_language ? `Respond in ${response_language}. Write SUMMARY.md prose in ${response_language}; keep code, file paths, identifiers, and commit messages in English.` : ''}

       <worktree_branch_check>
       FIRST ACTION before any other work: verify this worktree's branch is based on the correct commit.

       Run:
       ```bash
       ACTUAL_BASE=$(git merge-base HEAD {EXPECTED_BASE})
       CURRENT_HEAD=$(git rev-parse HEAD)
       ```

       If `ACTUAL_BASE` != `{EXPECTED_BASE}` (i.e. the worktree branch was created from an older
       base such as `main` instead of the feature branch HEAD), rebase onto the correct base:
       ```bash
       git rebase --onto {EXPECTED_BASE} $(git rev-parse --abbrev-ref HEAD~1 2>/dev/null || git rev-parse HEAD^) HEAD 2>/dev/null || true
       # If rebase fails or is a no-op, reset the branch to start from the correct base:
       git reset --soft {EXPECTED_BASE}
       ```

       If `ACTUAL_BASE` == `{EXPECTED_BASE}`: the branch base is correct, proceed immediately.

       This check fixes a known issue on Windows where `EnterWorktree` creates branches from
       `main` instead of the current feature branch HEAD.
       </worktree_branch_check>

       <parallel_execution>
       You are running as a PARALLEL executor agent. To avoid pre-commit hook
       contention with other agents, acquire a file-based lock before each
       commit and release it immediately after. The spinlock has a 60-second
       timeout and a stale-lock recovery (older than 5 minutes is broken):

         LOCK_DIR=".rcode/.commit-lock"
         LOCK_WAIT=0
         LOCK_MAX=60         # seconds — abort if we never acquire
         LOCK_STALE=300      # seconds — assume holder is dead and break
         while ! mkdir "$LOCK_DIR" 2>/dev/null; do
           if [ -d "$LOCK_DIR" ]; then
             AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_DIR" 2>/dev/null || stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0) ))
             if [ "$AGE" -gt "$LOCK_STALE" ]; then
               echo "⚠ Breaking stale commit lock (age ${AGE}s > ${LOCK_STALE}s)"
               rmdir "$LOCK_DIR" 2>/dev/null
               continue
             fi
           fi
           if [ "$LOCK_WAIT" -ge "$LOCK_MAX" ]; then
             echo "✖ Failed to acquire commit lock within ${LOCK_MAX}s — aborting wave" >&2
             exit 1
           fi
           sleep 0.5
           LOCK_WAIT=$(( LOCK_WAIT + 1 ))
         done
         trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT
         git commit -m "..."           # hooks run normally
         rmdir "$LOCK_DIR"
         trap - EXIT

       Hooks run as designed for every commit. AGENTS.md forbids --no-verify;
       hook failures must be fixed at the source, not bypassed. The orchestrator
       still validates state once after all agents complete.
       </parallel_execution>

       <execution_context>
       @.rcode/workflows/execute-sprint.md
       @.rcode/templates/summary.md
       @.rcode/references/tdd.md
       <!-- checkpoints.md (778 lines) loaded only when a task contains "checkpoint" or a prior wave failed -->
       ${SPRINT_HAS_CHECKPOINT || PRIOR_WAVE_FAILED ? '@.rcode/references/checkpoints.md' : ''}
       </execution_context>

       <files_to_read>
       Read these files at execution start using the Read tool:
       - {phase_dir}/{plan_file} (Plan)
       - .planning/PROJECT.md (Project context — core value, requirements, evolution rules)
       - .planning/STATE.md (State)
       - .rcode/config.yaml (Config, if exists — read via `node rcode-tools.cjs config-get <key>` or readConfig())
       ${CONTEXT_WINDOW >= 500000 ? `
       - ${phase_dir}/*-CONTEXT.md (User decisions from discuss-phase — honors locked choices)
       - ${phase_dir}/*-RESEARCH.md (Technical research — pitfalls and patterns to follow)
       - ${prior_wave_summaries} (SUMMARY.md files from earlier waves in this phase — what was already built)
       ` : ''}
       - ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
       - .claude/skills/ or .agents/skills/ (Project skills, if either exists — list skills, read SKILL.md for each, follow relevant rules during implementation)
       </files_to_read>

       ${AGENT_SKILLS}

       <mcp_tools>
       If CLAUDE.md or project instructions reference MCP tools (e.g. jCodeMunch, context7,
       or other MCP servers), prefer those tools over Grep/Glob for code navigation when available.
       MCP tools often save significant tokens by providing structured code indexes.
       Check tool availability first — if MCP tools are not accessible, fall back to Grep/Glob.
       </mcp_tools>

       <done_field_protocol>
       For every task that contains a `<done>` field: treat it as the acceptance
       criterion for that task. Before committing, verify every condition in `<done>`
       is met (use grep, file reads, or CLI commands). If any condition fails, fix
       the implementation before committing. Do NOT skip or defer `<done>` checks.
       </done_field_protocol>

       <success_criteria>
       - [ ] All tasks executed
       - [ ] Each task's <done> criteria verified before commit
       - [ ] Each task committed individually
       - [ ] SUMMARY.md created in plan directory
       </success_criteria>
     "
   )
   ```

   **Sequential mode** (`USE_WORKTREES` is `false`):

   Omit `isolation="worktree"` from the Task call. Replace the `<parallel_execution>` block with:

   ```
       <sequential_execution>
       You are running as a SEQUENTIAL executor agent on the main working tree.
       Use normal git commits (with hooks). Do NOT use --no-verify.
       </sequential_execution>
   ```

   The sequential mode Task prompt uses the same structure as worktree mode but with these differences in success_criteria — since there is only one agent writing at a time, there are no shared-file conflicts:

   ```
       <success_criteria>
       - [ ] All tasks executed
       - [ ] Each task committed individually
       - [ ] SUMMARY.md created in plan directory
       - [ ] STATE.md updated with position and decisions
       - [ ] ROADMAP.md updated with plan progress (via `roadmap update-plan-progress`)
       </success_criteria>
   ```

   When worktrees are disabled, execute plans **one at a time within each wave** (sequential) regardless of the `PARALLELIZATION` setting — multiple agents writing to the same working tree concurrently would cause conflicts.

4. **Wait for all agents in wave to complete.**

   **Completion signal fallback (Copilot and runtimes where Task() may not return):**

   If a spawned agent does not return a completion signal but appears to have finished
   its work, do NOT block indefinitely. Instead, verify completion via spot-checks:

   ```bash
   # For each plan in this wave, check if the executor finished:
   SUMMARY_EXISTS=$(test -f "{phase_dir}/{plan_number}-{plan_padded}-SUMMARY.md" && echo "true" || echo "false")
   COMMITS_FOUND=$(git log --oneline --all --grep="{phase_number}-{plan_padded}" --since="1 hour ago" | head -1)
   ```

   **If SUMMARY.md exists AND commits are found:** The agent completed successfully —
   treat as done and proceed to step 5. Log: `"✓ {Plan ID} completed (verified via spot-check — completion signal not received)"`

   **If SUMMARY.md does NOT exist after a reasonable wait:** The agent may still be
   running or may have failed silently. Check `git log --oneline -5` for recent
   activity. If commits are still appearing, wait longer. If no activity, report
   the plan as failed and route to the failure handler in step 6.

   **This fallback applies automatically to all runtimes.** Claude Code's Task() normally
   returns synchronously, but the fallback ensures resilience if it doesn't.

5. **Post-wave hook validation (parallel mode only):**

   When agents committed with `--no-verify`, run pre-commit hooks once after the wave:
   ```bash
   # Run project's pre-commit hooks on the current state
   git diff --cached --quiet || git stash  # stash any unstaged changes
   git hook run pre-commit 2>&1 || echo "⚠ Pre-commit hooks failed — review before continuing"
   ```
   If hooks fail: report the failure and ask "Fix hook issues now?" or "Continue to next wave?"

5.5. **Worktree cleanup (when `isolation="worktree"` was used):**

   When executor agents ran in worktree isolation, their commits land on temporary branches in separate working trees. After the wave completes, merge these changes back and clean up:

   ```bash
   # IMPORTANT: only touch worktrees whose branch starts with "worktree-agent-".
   # Claude Code's EnterWorktree names all auto-created branches with this prefix.
   # A broad "all non-primary worktrees" grep is dangerous — it would also pick up
   # manually-created worktrees (feature branches, other milestone workspaces, etc.)
   # and either corrupt or delete work that wasn't part of this execution.
   WORKTREES=$(git worktree list --porcelain \
     | awk '/^worktree /{path=$2} /^branch /{if($2 ~ /refs\/heads\/worktree-agent-/) print path}')

   for WT in $WORKTREES; do
     # Get the branch name for this worktree
     WT_BRANCH=$(git -C "$WT" rev-parse --abbrev-ref HEAD 2>/dev/null)
     if [ -n "$WT_BRANCH" ] && [ "$WT_BRANCH" != "HEAD" ]; then
       CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

       # --- Orchestrator file protection (#1756) ---
       # Snapshot orchestrator-owned files BEFORE merge. If the worktree
       # branch outlived a milestone transition, its versions of STATE.md
       # and ROADMAP.md are stale. Main always wins for these files.
       STATE_BACKUP=$(mktemp)
       ROADMAP_BACKUP=$(mktemp)
       git show HEAD:.planning/STATE.md > "$STATE_BACKUP" 2>/dev/null || true
       git show HEAD:.planning/ROADMAP.md > "$ROADMAP_BACKUP" 2>/dev/null || true

       # Snapshot list of files on main BEFORE merge to detect resurrections
       PRE_MERGE_FILES=$(git ls-files .planning/)

       # Merge the worktree branch into the current branch
       git merge "$WT_BRANCH" --no-edit -m "chore: merge executor worktree ($WT_BRANCH)" 2>&1 || {
         echo "⚠ Merge conflict from worktree $WT_BRANCH — resolve manually"
         rm -f "$STATE_BACKUP" "$ROADMAP_BACKUP"
         continue
       }

       # Restore orchestrator-owned files (main always wins)
       if [ -s "$STATE_BACKUP" ]; then
         cp "$STATE_BACKUP" .planning/STATE.md
       fi
       if [ -s "$ROADMAP_BACKUP" ]; then
         cp "$ROADMAP_BACKUP" .planning/ROADMAP.md
       fi
       rm -f "$STATE_BACKUP" "$ROADMAP_BACKUP"

       # Detect files deleted on main but re-added by worktree merge
       # (e.g., archived phase directories that were intentionally removed)
       # IMPORTANT: skip executor-created planning artifacts (SUMMARY, SPRINT, RESEARCH,
       # CONTEXT) — these are brand-new files, not resurrections of previously-deleted ones.
       # Deleting them here would cause phases to stay stuck in "executing". (#604)
       DELETED_FILES=$(git diff --diff-filter=A --name-only HEAD~1 -- .planning/ 2>/dev/null || true)
       for RESURRECTED in $DELETED_FILES; do
         # Never remove executor-created planning artifacts
         case "$RESURRECTED" in
           *-SUMMARY.md|*-SPRINT.md|*-RESEARCH.md|*-CONTEXT.md|*-PLAN.md) continue ;;
         esac
         # Check if this file was NOT in main's pre-merge tree
         if ! echo "$PRE_MERGE_FILES" | grep -qxF "$RESURRECTED"; then
           git rm -f "$RESURRECTED" 2>/dev/null || true
         fi
       done

       # Amend merge commit with restored files if any changed
       if ! git diff --quiet .planning/STATE.md .planning/ROADMAP.md 2>/dev/null || \
          [ -n "$DELETED_FILES" ]; then
         # Only amend the commit with .planning/ files if commit_docs is enabled (#1783)
         COMMIT_DOCS=$(node ".rcode/bin/rcode-tools.cjs" config-get commit_docs 2>/dev/null || echo "true")
         if [ "$COMMIT_DOCS" != "false" ]; then
           git add .planning/STATE.md .planning/ROADMAP.md 2>/dev/null || true
           git commit --amend --no-edit 2>/dev/null || true
         fi
       fi

       # Remove the worktree
       git worktree remove "$WT" --force 2>/dev/null || true

       # Delete the temporary branch
       git branch -D "$WT_BRANCH" 2>/dev/null || true
     fi
   done
   ```

   **If `workflow.use_worktrees` is `false`:** Agents ran on the main working tree — skip this step entirely.

   **If no worktrees found:** Skip silently — agents may have been spawned without worktree isolation.

   **Post-cleanup verification (mandatory):** After the loop, confirm no `worktree-agent-*` worktrees or branches remain:

   ```bash
   LEFTOVER_WT=$(git worktree list --porcelain \
     | awk '/^branch /{if($2 ~ /refs\/heads\/worktree-agent-/) print $2}')
   LEFTOVER_BR=$(git branch --list 'worktree-agent-*' 2>/dev/null)

   if [ -n "$LEFTOVER_WT" ] || [ -n "$LEFTOVER_BR" ]; then
     echo "⚠ WORKTREE LEAK: leftover executor artifacts detected after cleanup:"
     [ -n "$LEFTOVER_WT" ] && echo "  Worktrees: $LEFTOVER_WT"
     [ -n "$LEFTOVER_BR" ] && echo "  Branches:  $LEFTOVER_BR"
     echo "  Run: /rcode-audit worktrees  to inspect and prune"
   else
     echo "✓ Worktree cleanup verified — no executor artifacts remain"
   fi
   ```

   Do NOT silently skip this check. If leaks are found, surface them — the user's next
   `/rcode-status` should not show surprise worktrees from a previous execution.

5.6. **Post-wave shared artifact update (worktree mode only):**

   When executor agents ran with `isolation="worktree"`, they skipped STATE.md and ROADMAP.md updates to avoid last-merge-wins overwrites. The orchestrator is the single writer for these files. After worktrees are merged back, update shared artifacts once:

   ```bash
   # Update ROADMAP.md for each completed plan in this wave
   for PLAN_ID in ${WAVE_PLAN_IDS}; do
     node ".rcode/bin/rcode-tools.cjs" roadmap update-plan-progress "${PHASE_NUMBER}" "${PLAN_ID}" completed
   done

   ```

   Where `WAVE_PLAN_IDS` is the space-separated list of plan IDs that completed in this wave.

   **If `workflow.use_worktrees` is `false`:** Sequential agents already updated STATE.md and ROADMAP.md themselves — skip this step.

6. **Report completion — spot-check claims first:**

   For each SUMMARY.md:
   - Verify first 2 files from `key-files.created` exist on disk
   - Check `git log --oneline --all --grep="{phase}-{plan}"` returns ≥1 commit
   - Check for `## Self-Check: FAILED` marker

   If ANY spot-check fails: report which plan failed, route to failure handler — ask "Retry plan?" or "Continue with remaining waves?"

   If pass:
   ```
   ---
   ## Wave {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from SUMMARY.md}
   {Notable deviations, if any}

   {If more waves: what this enables for next wave}
   ---
   ```

   - Bad: "Wave 2 complete. Proceeding to Wave 3."
   - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Wave 3) can now reference ground surfaces."

7. **Handle failures:**

   **Known Claude Code bug (classifyHandoffIfNeeded):** If an agent reports "failed" with error containing `classifyHandoffIfNeeded is not defined`, this is a Claude Code runtime bug — not a rcode or agent issue. The error fires in the completion handler AFTER all tool calls finish. In this case: run the same spot-checks as step 5 (SUMMARY.md exists, git commits present, no Self-Check: FAILED). If spot-checks PASS → treat as **successful**. If spot-checks FAIL → treat as real failure below.

   For real failures: report which plan failed → ask "Continue?" or "Stop?" → if continue, dependent plans may also fail. If stop, partial completion report.

7b. **Pre-wave dependency check (waves 2+ only):**

    Before spawning wave N+1, for each plan in the upcoming wave:
    ```bash
    node ".rcode/bin/rcode-tools.cjs" verify key-links {phase_dir}/{plan}-SPRINT.md
    ```

    If any key-link from a PRIOR wave's artifact fails verification:

    ## Cross-Plan Wiring Gap

    | Plan | Link | From | Expected Pattern | Status |
    |------|------|------|-----------------|--------|
    | {plan} | {via} | {from} | {pattern} | NOT FOUND |

    Wave {N} artifacts may not be properly wired. Options:
    1. Investigate and fix before continuing
    2. Continue (may cause cascading failures in wave {N+1})

    Key-links referencing files in the CURRENT (upcoming) wave are skipped.

8. **Execute checkpoint plans between waves** — see `<checkpoint_handling>`.

9. **Proceed to next wave.**
</step>

## Next Up

- `/rcode-verify-phase` — verify the phase goal after waves complete
- `/rcode-checkpoint-preview` — review wave changes before advancing
