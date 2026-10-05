# execute - step 01: Raees contract, pre-flight, insight block, execution plan, three options

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## You are Raees for this run

@.rcode/agents-rules/orchestrator/contract.md

**Load that contract and hold it for the whole execution.** The session running
this workflow IS the orchestrator — rcode has no separate process that dispatches
on your behalf, which is exactly why the role has to be adopted explicitly rather
than assumed. Raees is not spawned here as a subagent; a subagent cannot reliably
spawn the executors this workflow needs.

**Open with the orientation banner before the first subagent is spawned**, filled
from the pre-flight data below — not from memory:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► RAEES — {project}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where you are   Phase {N} — {name} · {status} · {X/Y phases complete}
What I read     {files actually opened in pre-flight}
What I'll do    {waves × plans, each naming rcode-executor and the plan it gets}
What I need     {checkpoints ahead and decisions blocked on the user, or "nothing — starting now"}
```

**The no-inline-implementation rule is Raees's, and it is absolute here.** If you
are tempted to write code, create files, or commit directly instead of spawning a
subagent:

> **STOP.** Spawn `rcode-executor` with the sprint plan as context. Your job is to
> dispatch, present checkpoints, and update state — not to implement.

Bypassing it produces a built project with no execution trace, no SUMMARY.md, and
a dashboard frozen at `planned`. See issue #915.

<pre_flight>
0a. **Record the authorized scope** — the user ran an execute command, so building
    is authorized from here:
    ```bash
    node ".rcode/bin/rcode-tools.cjs" state set-intent build --source execute.md
    node ".rcode/bin/rcode-tools.cjs" memlog append --type event --text "Execution started for phase ${PHASE_NUMBER}" --phase "${PHASE_NUMBER}"
    ```

    Log every deviation, checkpoint decision, and override with
    `memlog append` as it happens — a deviation nobody recorded is
    indistinguishable from a plan that was followed.

**Mandatory before execution begins.** Run these checks first and surface
findings BEFORE any subagents are spawned. If any check fails, stop and
route back to the user.

0. **Project-status preflight:**
   ```bash
   PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null || echo uninitialized)
   ```
   If `PROJECT_STATUS` is `uninstalled`, `uninitialized`, or `stub`:
   ```
   Project not initialized. Run /rcode-init first (or /rcode-new-project for a greenfield project), then return here.
   ```
   Stop. Do not proceed until `project-status` returns `real`.

1. **Init state**: `node .rcode/bin/rcode-tools.cjs init execute {N}`
2. **Phase index**: list all plans via `phase-plan-index {N}` — extract
   plan count, wave count, autonomy flag per plan, files_modified overlaps
3. **Anti-patterns**: check for `.continue-here.md` (paused state), STATE.md
   error flag, existing VERIFICATION.md with FAIL items without overrides
4. **Branch check**: confirm current git branch is appropriate
   for the work. Two checks, both blocking:

   a. **Not on main/master without consent** (skip entirely when `git.branching_strategy`
      config is `none` — check via `node .rcode/bin/rcode-tools.cjs config-get
      git.branching_strategy`): if `git branch --show-current` returns `main` or
      `master`, refuse to execute. Suggest: `git switch -c <phase>-<plan>-<slug>`
      (e.g. `git switch -c 8-1-aria`). User can override only by passing `--on-main`
      to /rcode-execute and explicitly typing the override on this turn.

      When `--on-main` was granted: every executor spawn prompt (execute-waves.md
      dispatch, execute-sprint.md Pattern A) must include the line
      `Branch consent: --on-main (user-granted at orchestrator launch)` — the
      task_commit protected-branch preflight (#1092) looks for exactly this line
      and refuses to commit on a protected branch without it. Executors are
      spawned contexts and never inherit this check on their own.

   b. **Working tree clean enough**: if `git status --porcelain` shows
      modified files unrelated to this phase's `files_modified` frontmatter,
      surface them and ask whether to commit, stash, or proceed. Real-session
      repro: P0 CSS fixes landed loose in a dirty tree with no commit
      boundary.

   The branch name should align with the phase/plan IDs from state — check
   `workflow.branch_pattern` config (default `<phase>-<plan>-<slug>`).
5. **Worktree config**: read `workflow.use_worktrees` — if true + no file overlaps, plans in a wave run parallel via worktrees. (`parallelization` is not a real field in `init execute`'s output — see the "initialize" step below; don't gate on it.)
</pre_flight>

<insight_block>
After pre-flight, emit an insight block with the 2-3 most load-bearing
observations from phase inspection. Format exactly:

```
★ Insight ─────────────────────────────────────
  - {observation 1: key scope reality}
  - {observation 2: forced-sequential / overlap / checkpoint flags}
  - {observation 3: autonomous-false plans needing human presence}
─────────────────────────────────────────────────
```

Keep to 3 bullets. Name specific files and plan IDs. No generic advice.
</insight_block>

<execution_plan>
After insight block, render a table of waves × plans:

```
Execution Plan

Phase {NN}: {phase_name} — {N} plans across {M} waves{, building {one-line outcome}}.

┌──────┬───────┬───────────────┬──────────────────────────────────────────────┐
│ Wave │ Plan  │   Autonomy    │                 What it builds                │
├──────┼───────┼───────────────┼──────────────────────────────────────────────┤
│ 1    │ NN-01 │ 🛑 checkpoint │ {one-line what it builds}                    │
│ 1    │ NN-02 │ auto          │ {one-line what it builds}                    │
│ 2    │ NN-03 │ auto          │ {one-line what it builds}                    │
└──────┴───────┴───────────────┴──────────────────────────────────────────────┘
```

Below the table, flag any wave forced to sequential (file overlaps) and
why. One sentence reality check about scope size (file count, token cost,
wall-clock expectation).
</execution_plan>

<three_options>
Check config mode first:
```bash
CONFIG_MODE=$(node .rcode/bin/rcode-tools.cjs config-get mode 2>/dev/null || echo "guided")
```

**If `CONFIG_MODE == "yolo"` or `$ARGUMENTS` contains `--auto`:** Skip the menu. Auto-select **A) Autonomous run** and print one line: `▶ Auto-selecting Autonomous run (yolo mode). /rcode-settings set mode guided to change.`

**herdr availability check (cached).** Before offering options, determine whether a 4th
option (**D) herdr multi-agent orchestration**) should be shown. This uses the same
cached-boolean idiom as `workflow._auto_chain_active` above — read with a safe default,
write back once resolved, and skip the live check on subsequent runs:

```bash
HERDR_NAMED_EXPLICITLY=$([[ "$ARGUMENTS" =~ herdr ]] && echo true || echo false)

HERDR_CHECKED=$(node .rcode/bin/rcode-tools.cjs config-get workflow._herdr_checked 2>/dev/null || echo "false")
HERDR_CHECKED=${HERDR_CHECKED:-false}  # config-get exits 0 with empty output when key absent

if [[ "$HERDR_CHECKED" != "true" || "$HERDR_NAMED_EXPLICITLY" == "true" ]]; then
  # Live re-check: first time ever, OR user named herdr explicitly this run
  # (herdr may have been installed since the last negative cache hit).
  if command -v herdr >/dev/null 2>&1; then
    HERDR_AVAILABLE=true
  else
    HERDR_AVAILABLE=false
  fi
  node .rcode/bin/rcode-tools.cjs config-set workflow._herdr_available "$HERDR_AVAILABLE" 2>/dev/null
  node .rcode/bin/rcode-tools.cjs config-set workflow._herdr_checked true 2>/dev/null
else
  # Cached negative (or positive) result from a prior run — skip the check entirely.
  HERDR_AVAILABLE=$(node .rcode/bin/rcode-tools.cjs config-get workflow._herdr_available 2>/dev/null || echo "false")
  HERDR_AVAILABLE=${HERDR_AVAILABLE:-false}
fi
```

Do **not** re-run `command -v herdr` on every invocation once `_herdr_checked` is `true` —
that defeats the point of caching. The only exception is `HERDR_NAMED_EXPLICITLY`: if the
user's request names herdr by name (e.g. "use herdr for this", "orchestrate via herdr"),
always re-check live regardless of the cached value, since herdr may have been installed
since the negative result was cached.

Otherwise, offer modes via AskUserQuestion. Each option names the tradeoff explicitly:

**A) Autonomous run** — Spawn subagent per plan in sequence/parallel per
    wave rules. Checkpoints still pause for user. Fastest wall-clock.
    Highest token cost. Least visibility mid-plan.

**B) Interactive mode** (`--interactive`) — Execute plans inline in the
    current context (no subagents). Pair-programming style. Lower token
    cost. Catch mistakes early. Best for design-heavy or novel work.

**C) Wave-only** (`--wave N`) — Run just one wave now, review, then run
    later waves in a separate session. Good for staged rollout / review
    gates.

**D) herdr multi-agent orchestration** (only shown if `HERDR_AVAILABLE == "true"`) —
    Fan this phase's plans out to parallel `herdr` panes/tabs, each running its own
    Claude agent in an isolated git worktree, then merge their work back. Be specific
    about the tradeoff, not a one-liner: separate terminal panes you can watch
    independently, genuinely parallel wall-clock (not wave-sequenced), noticeably
    higher token cost than A/B/C since each pane runs a full agent session, and a
    merge step at the end. Best fit is plans that are truly independent (no shared
    `files_modified`, no cross-plan sequencing) — for plans with overlaps or a single
    linear wave, herdr adds coordination overhead for no benefit; prefer A or C instead.
    Selecting this option invokes the `rcode-herdr-orchestration` skill — it does not
    replace this workflow's execution, it's a different way to run the same plans.

    **Never auto-select D, even in yolo/`--auto` mode.** Orchestrating via herdr requires
    explicit user confirmation on this turn — if `CONFIG_MODE == "yolo"` skipped the menu
    above, herdr is simply not offered this run; the autonomous-run auto-selection must
    never silently switch into herdr mode.

Include a recommendation line: "My recommendation: {letter} because {reason
in one clause}." Then ask which option to proceed with — do NOT silently
pick one. If the user selects D, confirm once more in plain language what
will happen (parallel panes, worktrees, higher cost) before invoking
`Skill(skill="rcode-herdr-orchestration", ...)` — do not invoke it on the same
turn as the AskUserQuestion answer without that confirmation being part of
the answer itself (i.e. selecting the option IS the confirmation only if its
label made the tradeoff explicit, which it does above).
</three_options>

Next: Read `.rcode/workflows/execute/steps/02-setup-init.md` before starting it (skip it if its Read-when condition is false).
