# execute.md — Interactive Execution Mode

Extracted from `execute.md`'s `check_interactive_mode` step. Only loaded when the `--interactive` flag is present — see the conditional include at that point in `execute.md`.

Interactive mode executes plans sequentially **inline** (no subagent spawning) with user
checkpoints between tasks. The user can review, modify, or redirect work at any point.

**Interactive execution flow:**

1. Load plan inventory as normal (discover_and_group_plans)
2. For each plan (sequentially, ignoring wave grouping):

   a. **Present the plan to the user:**
      ```
      ## Plan {plan_id}: {plan_name}

      Objective: {from plan file}
      Tasks: {task_count}

      Options:
      - Execute (proceed with all tasks)
      - Review first (show task breakdown before starting)
      - Skip (move to next plan)
      - Stop (end execution, save progress)
      ```

   b. **If "Review first":** Read and display the full plan file. Ask again: Execute, Modify, Skip.

   c. **If "Execute":** Read and follow `.rcode/workflows/execute-sprint.md` **inline**
      (do NOT spawn a subagent). Execute tasks one at a time.

   d. **After each task:** Pause briefly. If the user intervenes (types anything), stop and address
      their feedback before continuing. Otherwise proceed to next task.

   e. **After plan complete:** Show results, commit, create SUMMARY.md, then present next plan.
      **Overwrite guard:** If the SUMMARY.md file already exists from a previous run, delete it first with `rm -f <path>` before writing the new version. Never append to or skip an existing SUMMARY.md — always overwrite with the current sprint's completion data.

3. After all plans: proceed to verification (same as normal mode).

**Benefits of interactive mode:**
- No subagent overhead — dramatically lower token usage
- User catches mistakes early — saves costly verification cycles
- Maintains rcode's planning/tracking structure
- Best for: small phases, bug fixes, verification gaps, learning rcode
