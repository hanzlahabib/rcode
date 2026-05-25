<purpose>
Orchestrate parallel debug agents to investigate issues and find root causes.

After identifying issues, spawn one debug agent per issue. Each agent investigates autonomously with symptoms pre-filled. Collect root causes, then hand off to plan with actual diagnoses.

Orchestrator stays lean: parse issues, spawn agents, collect results, synthesize findings.
</purpose>

@.rcode/references/karpathy-guidelines.md
@.rcode/references/thinking-models-debug.md

## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-debug <argument-here>
```

**Examples:**
```
/rcode-debug example 1
/rcode-debug example 2
```

STOP — do not proceed.

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-debugger — Diagnoses and fixes issues
</available_agent_types>

<paths>
DEBUG_DIR=.rcode/debug

Debug files use the `.rcode/debug/` path (hidden directory with leading dot).
</paths>

<core_principle>
**Diagnose before planning fixes.**

Issue identification tells us WHAT is broken (symptoms). Debug agents find WHY (root cause). Future planning then creates targeted fixes based on actual causes, not guesses.

Without diagnosis: "Feature doesn't work" → guess at fix → maybe wrong
With diagnosis: "Feature doesn't work" → "missing error handler" → precise fix
</core_principle>

## Step 0.5 — Detect non-bug questions (redirect)

If input contains "should we", "what is the best way to", "how do I implement" — these are not bugs, they are how-to or strategy questions.

```
⚠ /rcode-debug investigates broken behavior, not how-to questions.

For implementation guidance: /rcode-discuss waleed $ARGUMENTS
For a strategic decision: /rcode-council $ARGUMENTS
```

Only proceed past this step if the input describes broken or unexpected behavior (e.g., "error X occurs", "feature Y doesn't work", "API returns wrong data").

<process>

<step name="parse_issues">
**Extract issues from context:**

From the conversation or provided input, identify:
- What is broken or not working (truth/expected behavior)
- Severity: blocker, major, minor
- Reproduction steps or context
- Any error messages or symptoms

Build issue list:
```
issues = [
  {truth: "Feature X doesn't work", severity: "major", context: "..."},
  {truth: "API returns wrong data", severity: "blocker", context: "..."},
  ...
]
```
</step>

<step name="report_plan">
**Report diagnosis plan to user:**

```
## Diagnosing {N} Issues

Spawning parallel debug agents to investigate root causes:

| Issue (Truth) | Severity |
|---------------|----------|
| Feature X doesn't work | major |
| API returns wrong data | blocker |

Each agent will:
1. Create DEBUG-{slug}.md with symptoms pre-filled
2. Investigate autonomously (read code, form hypotheses, test)
3. Return root cause

This runs in parallel - all issues investigated simultaneously.
```
</step>

<step name="spawn_agents">
**Load agent skills:**

```bash
AGENT_SKILLS_DEBUGGER=$(node .rcode/bin/rcode-tools.cjs agent-skills rcode-debugger 2>/dev/null)
```

**Spawn debug agents in parallel:**

For each issue, fill the debug-subagent-prompt template and spawn:

```
Task(
  prompt=filled_debug_subagent_prompt + "\n\n<files_to_read>\n- .rcode/STATE.md\n</files_to_read>\n${AGENT_SKILLS_DEBUGGER}",
  subagent_type="rcode-debugger",
  model="{model}",
  description="Debug: {truth_short}"
)
```

**Never pass `isolation="worktree"` without explicit user consent.** Worktree isolation creates a git worktree, which is a write operation the user may not want. If you believe isolation is genuinely needed (e.g., the debug agent may edit files):

```bash
CONFIG_MODE=$(node .rcode/bin/rcode-tools.cjs config-get mode 2>/dev/null || echo "guided")
```

**If `CONFIG_MODE == "yolo"`:** Skip isolation — default to no worktree, proceed immediately.

Otherwise ask via AskUserQuestion:
```
Spawn the debug agent with git worktree isolation?
  - Safer: agent edits stay isolated until you merge
  - Trade-off: creates a new worktree in .worktrees/ that needs cleanup
  [yes / no — default no]
```

**All agents spawn in single message** (parallel execution).

Template placeholders:
- `{truth}`: The expected behavior that failed
- `{expected}`: What should happen
- `{actual}`: What actually happens
- `{errors}`: Any error messages (or "None reported")
- `{context}`: Reproduction context
- `{goal}`: `find_root_cause_only`
- `{slug}`: Generated from truth
</step>

<step name="collect_results">
**Collect root causes from agents:**

Each agent returns with:
```
## ROOT CAUSE FOUND

**Debug Session:** ${DEBUG_DIR}/{slug}.md

**Root Cause:** {specific cause with evidence}

**Evidence Summary:**
- {key finding 1}
- {key finding 2}
- {key finding 3}

**Files Involved:**
- {file1}: {what's wrong}
- {file2}: {related issue}

**Suggested Fix Direction:** {brief hint for planning}
```

Parse each return to extract:
- root_cause: The diagnosed cause
- files: Files involved
- debug_path: Path to debug session file
- suggested_fix: Hint for fix planning

If agent returns `## INVESTIGATION INCONCLUSIVE`:
- root_cause: "Investigation inconclusive - manual review needed"
- Note which issue needs manual attention
- Include remaining possibilities from agent return

**Record verification metadata in DEBUG files (NEW):**
After collecting results, each debug artifact file should have frontmatter added:
```yaml
---
verified_against_commit: <current git HEAD SHA>
verified_at: <ISO 8601 timestamp>
---
```

This records the exact codebase state where the diagnosis was made, so downstream tools (planner, sprint-checker) can detect stale findings when branch changes.

</step>

<step name="report_results">
**Report diagnosis results:**

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► DIAGNOSIS COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Issue (Truth) | Root Cause | Files |
|---------------|------------|-------|
| Feature X doesn't work | Missing error handler | handler.ts |
| API wrong data | Query missing filter | api.ts |

Debug sessions: ${DEBUG_DIR}/

Next: Use diagnosed root causes to plan fixes.
```

Provide quick command to review findings and plan next steps.
</step>

</process>

<context_efficiency>
Agents start with symptoms pre-filled from issue context (no symptom gathering).
Agents only diagnose—planning handles fixes (no fix application).
</context_efficiency>

<failure_handling>
**Agent fails to find root cause:**
- Mark issue as "needs manual review"
- Continue with other issues
- Report incomplete diagnosis

**Agent times out:**
- Check DEBUG-{slug}.md for partial progress
- Can resume investigation

**All agents fail:**
- Something systemic (permissions, git, etc.)
- Report for manual investigation
- Fall back to manual debugging
</failure_handling>

<success_criteria>
- [ ] Issues parsed from context
- [ ] Debug agents spawned in parallel
- [ ] Root causes collected from all agents
- [ ] Debug sessions saved to ${DEBUG_DIR}/
- [ ] User has clear diagnosis to proceed with fixes
</success_criteria>
</process>

## Success Criteria

- [ ] Issues parsed from context and at least one `rcode-debugger` agent spawned in parallel
- [ ] Root causes collected from all debug agents and synthesized into a unified diagnosis
- [ ] Debug sessions saved to `.planning/debug/` with per-issue files
- [ ] Each root cause entry includes: symptom, identified cause, and a concrete suggested fix path
- [ ] User receives a clear diagnosis with enough detail to proceed to `/rcode-plan`

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user


## On Completion

/rcode-review {phase} — review the fix before committing
/rcode-verify-work {phase} — re-run UAT after the fix
/rcode-execute {phase} --gaps-only — re-run just the failing plans

## Next Up

- `/rcode-plan` — plan the fix based on root causes the debug agents found
- `/rcode-execute` — execute the fix once the plan is ready
