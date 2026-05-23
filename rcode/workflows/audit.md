# Workflow: rcode-audit

<purpose>
Single entry point for every kind of audit. Asks the user *what* to audit
and dispatches to the right sub-workflow. Closes #234 — replaces the prior
state where users had to know about six separate audit/verify commands by
name (`audit-milestone`, `audit-uat`, `audit-fix`, `code-review --karpathy`,
`verify-phase`, `verify-work`).

Honours `.rcode/config.yaml`: in `mode: yolo`, the router skips the menu
and auto-picks the most-relevant target based on project state. In
`mode: guided` (default), it asks.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rcode-audit                           # interactive — asks what to audit
/rcode-audit plans [--report]         # → audit-plans (structural + status + deps check)
/rcode-audit phase [<NN>]              # → /rcode-verify-phase
/rcode-audit milestone [--strict]      # → /rcode-audit-milestone (with synth fallback)
/rcode-audit uat                       # → /rcode-audit-uat
/rcode-audit code [--scope=...]        # → /rcode-review --karpathy
/rcode-audit fix                       # → /rcode-audit-fix
/rcode-audit work                      # → /rcode-verify-work
/rcode-audit lens [<1-15> | all]       # → /rcode-lens-audit (15-lens methodology)
/rcode-audit worktrees [--prune]       # → scan + report orphaned executor worktrees/branches
```

**Examples:**
```
/rcode-audit
/rcode-audit plans
/rcode-audit plans --report
/rcode-audit milestone --strict
/rcode-audit phase 03
/rcode-audit lens security
/rcode-audit lens all
```

## Step 1 — Resolve mode + arguments

```bash
TOOL="node .rcode/bin/rcode-tools.cjs"
MODE=$($TOOL config-get mode 2>/dev/null || echo "guided")
DISCUSS=$($TOOL config-get workflow.discuss_mode 2>/dev/null || echo "adaptive")
```

Parse `$ARGUMENTS`:
- First word ∈ {plans, phase, milestone, uat, code, fix, work, lens, worktrees} → set `$TARGET`, drop it from args, jump to Step 4.
- Empty or unrecognised → continue to Step 2.

## Step 2 — Detect project state

Probe what's audit-able right now:

```bash
ROADMAP=$([ -f .planning/ROADMAP.md ] && echo yes || echo no)
PHASES=$(ls -d .planning/phases/*/ 2>/dev/null | wc -l)
PLANS=$(find .planning/phases \( -name PLAN.md -o -name '*-SPRINT.md' \) 2>/dev/null | wc -l)
SUMMARIES=$(find .planning/phases -name SUMMARY.md 2>/dev/null | wc -l)
UAT_FILES=$(find .planning -name 'UAT*.md' 2>/dev/null | wc -l)
ON_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
DIRTY=$([ -n "$(git status --porcelain 2>/dev/null)" ] && echo yes || echo no)
```

Use these to decide which menu options are *relevant* and which to mark
as `(no data — skip)`.

## Step 3 — Ask user (guided mode only)

Also probe for orphaned executor worktrees (add to context for Step 3 menu):

```bash
ORPHAN_WTS=$(git worktree list --porcelain \
  | awk '/^branch /{if($2 ~ /refs\/heads\/worktree-agent-/) print $2}' \
  | wc -l)
ORPHAN_BR=$(git branch --list 'worktree-agent-*' 2>/dev/null | wc -l)
ORPHANS=$((ORPHAN_WTS + ORPHAN_BR))
```

If `$MODE` is `yolo`, skip this step and pick the most relevant target
automatically (priority: `worktrees` if ORPHANS>0, else `work` if dirty
branch, else `plans` if PLANS>0 and SUMMARIES<PLANS, else `milestone` if
SUMMARIES>0, else `code`).

Otherwise call AskUserQuestion:

```
Question:
What do you want to audit?

Options:
  1. plans           — planning integrity: completeness, status, deps ({PLANS} sprints)
  2. phase           — verify a single phase against its PLAN          ({PLANS} plans)
  3. milestone       — cross-phase milestone goal coverage             ({SUMMARIES} summaries)
  4. uat             — outstanding UAT / verification items            ({UAT_FILES} files)
  5. code-quality    — Karpathy 4-principle code review                (current diff)
  6. auto-fix        — audit then auto-fix findings                    (uses #1–5 output)
  7. work            — verify current branch / WIP                     ({ON_BRANCH}, dirty={DIRTY})
  8. lens            — 15-lens methodology audit                       (security, perf, tests…)
  9. worktrees       — orphaned executor worktrees/branches            ({ORPHANS} found)
  0. cancel
```

Set `$TARGET` from the user's choice.

## Step 4 — Pre-flight per target

Each target has a precondition. Fail loudly with the fix step *before*
dispatching, so the user doesn't get a surprise halt deep inside the
sub-workflow.

| target | precondition | failure message |
|---|---|---|
| plans | `.planning/ROADMAP.md` exists | `No ROADMAP.md. Run /rcode-new-milestone first.` |
| phase | at least one `.planning/phases/*/PLAN.md` or `*-SPRINT.md` | `No plan file found. Run /rcode-plan first.` |
| milestone | ROADMAP.md exists | `No ROADMAP.md. Run /rcode-new-milestone first.` |
| uat | at least one UAT*.md exists | `No UAT files yet. Run /rcode-execute on a phase first.` |
| code | git repo with at least one commit | `Empty repo — nothing to audit yet.` |
| fix | a prior audit report exists OR a prior `--report` artefact | `No audit findings yet. Run /rcode-audit first.` |
| work | inside a git worktree | `Not in a git repo.` |
| lens | `rcode/` or `.rcode/` directory exists | `No rcode source found. Run: npx @hanzlaa/rcode install .` |
| worktrees | git repo exists | `Not in a git repo.` |

For `milestone` specifically, check the **graceful-degrade** condition
(closes #234 audit-milestone halt):

```bash
if [ "$TARGET" = "milestone" ] && [ "$SUMMARIES" -eq 0 ] && [ "$PLANS" -gt 0 ]; then
  # Phases planned but no formal closes — offer to synthesize.
  GIT_FEAT_COMMITS=$(git log --oneline --grep='^feat' 2>/dev/null | wc -l)
  echo "⚠ $PLANS phases planned, 0 SUMMARY.md, $GIT_FEAT_COMMITS feat commits."
  echo "  Phases were executed but never formally closed."
  # Offer (yolo: auto-pick 1; guided: ask):
  #   1. Synthesize SUMMARY.md per phase from SPRINT.md + git log    [recommended]
  #   2. Run /rcode-verify-phase per phase (manual close)
  #   3. Continue audit anyway (will only assess what's documented)
  #   0. Cancel
fi
```

In `mode: yolo`, auto-pick option 1: group `git log --oneline` output by
phase tag (e.g. commits matching `^feat\(0?(\d+)`) and write a first-pass
`SUMMARY.md` per phase under `.planning/phases/<phase>/SUMMARY.md`
containing the goal (from SPRINT.md), the commit list, and a `# TODO:
expand outcomes` marker. The user can then refine before re-running the
audit.

A native `phase synthesize-summaries` CLI subcommand is tracked separately
(see #234 follow-ups) — until it lands, the LLM performs the synthesis
inline using `git log` + `Read SPRINT.md` + `Write SUMMARY.md`.

## Step 5 — Dispatch

Run the target's slash command, forwarding remaining args:

| target | dispatch |
|---|---|
| plans | execute `@.rcode/workflows/audit-plans.md` inline |
| phase | `/rcode-verify-phase $REST_ARGS` |
| milestone | `/rcode-audit-milestone $REST_ARGS` |
| uat | `/rcode-audit-uat $REST_ARGS` |
| code | `/rcode-review $REST_ARGS --karpathy` |
| lens | `/rcode-lens-audit $REST_ARGS` |
| fix | `/rcode-audit-fix $REST_ARGS` |
| work | `/rcode-verify-work $REST_ARGS` |
| worktrees | execute `@.rcode/workflows/audit-worktrees.md` inline |

## Step 6 — Closing summary

After the sub-workflow returns:

```
rcode ► AUDIT ({TARGET}) ✓

Report: {report_path or "(stdout only)"}
Findings: {count}

Next:
  /rcode-audit fix         — auto-fix findings classified as auto-fixable
  /rcode-audit code        — drill into code-quality issues
  /rcode-audit lens        — 15-lens methodology audit
  /rcode-settings show     — review which audit gates are enabled
```

## Success Criteria

- [ ] `/rcode-audit` (no args) presents menu in guided mode, auto-picks in yolo
- [ ] `/rcode-audit milestone` short-circuits the menu
- [ ] `/rcode-audit lens` dispatches to `/rcode-lens-audit` interactive picker
- [ ] `/rcode-audit lens security` passes `security` directly to `/rcode-lens-audit`
- [ ] When SUMMARY.md absent but SPRINT.md present, milestone offers synthesize/verify/skip — does not dead-halt
- [ ] Sub-workflow's closing report is surfaced unchanged

## On Error

- **Sub-workflow not installed** (slash file missing): `Audit subroute '/rcode-{target}' not found. Run: npx @hanzlaa/rcode install .`
- **Precondition failed**: print the message from Step 4's table, suggest the unblocking command, STOP.
- **`.rcode/config.yaml` missing**: treat as `mode: guided`, continue.
