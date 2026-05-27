# Campaign Integration Branch

The orchestrator maintains its own long-lived parent branch for the campaign. Sub-agents fork from it, merges land on it, master stays untouched until the user explicitly lands the whole campaign.

## Purpose

A prior campaign session (2026-05-26) revealed the failure mode this rule prevents:

- Sub-agents in Wave-1 forked directly from `master`. They committed.
- Wave-1 merges landed on `master`.
- Wave-2 sub-agents forked from `master` again — at a HEAD that already had Wave-1's merges.
- **But the worktrees were created with `git worktree add ... master` at slightly different times, and some Wave-1 work was still in flight on its own branches.**
- Wave-2 branches overlapped with Wave-1 branches' files → cross-wave merge conflicts.
- The orchestrator spent multiple ticks resolving those conflicts instead of shipping new work.
- Some branches couldn't be auto-merged at all and got queued for a rebase agent, who introduced TSC regressions of its own.

The fix: **one campaign integration branch**, serially advanced. Sub-agents always fork from the integration branch's CURRENT TIP (not a snapshot, not master). When a wave's merges land on the integration branch, the next wave's sub-agents inherit them automatically.

## Rules

### Naming

| Branch | When to use |
|---|---|
| `campaign-integration` | Default for unnamed campaigns. |
| `campaign-<topic>` | When the campaign has a coherent theme (e.g. `campaign-crm-cleanup`, `campaign-q2-tech-debt`). |
| `campaign-<topic>-<wave>` | Don't use. The integration branch is one branch across all waves. Per-wave naming defeats the purpose. |

Sub-agent branches stay named `campaign-<area>` and live as short-lived feature branches that merge into the integration branch.

### Lifecycle

```
master                              ┐
  ├─ campaign-integration (branch)  │  <-- orchestrator stays here
  │   ├─ campaign-area-1            │  <-- sub-agent Wave 1
  │   ├─ campaign-area-2            │
  │   ├─ campaign-area-3            │
  │   │
  │   │   <-- Wave 1 merged into campaign-integration
  │   │
  │   ├─ campaign-area-4            │  <-- Wave 2 forks from updated integration
  │   ├─ campaign-area-5            │
  │   │
  │   │   <-- Wave 2 merged
  │   │
  │   └─ (continues...)             │
  │                                 │
  └─ (Phase 3: integration → master)│
```

### Pre-flight (Phase 0)

```bash
git checkout master && git pull origin master   # start fresh
git checkout -b campaign-integration master
git push -u origin campaign-integration         # OPTIONAL — only the integration branch may be auto-pushed
```

The integration branch can be auto-pushed because:
- It is **not master** — pushing it does not affect production.
- It enables PR-style review via GitHub.
- It survives orchestrator crashes (work lives on origin).

If the user says "no push of anything ever" — respect that. Don't push the integration branch either.

### Sub-agent worktree creation

```bash
# WRONG — direct fork from master, cross-wave conflict risk
git worktree add ../sm-worktrees/camp-<area> -b campaign-<area> master

# RIGHT — fork from integration branch
git worktree add ../sm-worktrees/camp-<area> -b campaign-<area> campaign-integration
```

### Merging during a wave (Phase 2)

```bash
# orchestrator's main worktree is checked out on campaign-integration
git merge campaign-<area> --no-edit
NEW_TSC=$(pnpm tsc --noEmit 2>&1 | grep -c "error TS")
if [ "$NEW_TSC" -gt "$INTEGRATION_BASELINE_TSC" ]; then
  git reset --hard HEAD~1   # back out of integration branch, NOT master
fi
```

Master never enters the picture during merges. The TSC gate compares against the integration branch's recorded baseline, not master's.

### Sync from master during long campaigns

If the campaign runs for hours and other work lands on master from outside, periodically pull master into the integration branch:

```bash
# orchestrator on campaign-integration
git fetch origin
git merge origin/master --no-edit   # fast-forward when possible, conflict-resolve when not
```

Do this between waves, NEVER mid-wave (would disrupt in-flight sub-agents whose branches were forked from the older integration tip).

### Landing (Phase 3)

When BACKLOG.md is empty and all sub-agent branches have merged into the integration branch:

```bash
git checkout campaign-integration
git diff master..campaign-integration --stat   # show user the change set
git log master..campaign-integration --oneline  # show user the commit list
```

Then **ask the user**:

```
Campaign-integration is N commits ahead of master.
How do you want to land it?
  (a) Open a PR: gh pr create --base master --head campaign-integration
  (b) Merge to master locally (--no-ff for a clean merge commit)
  (c) Squash-merge to master (one tidy commit, history compressed)
  (d) Leave campaign-integration as-is — I'll review later
```

Do NOT default to any of these. Wait for the user's answer.

## Examples

### Three-wave campaign with integration branch

```
T+0:    git checkout -b campaign-integration master    # Phase 0
T+1:    wave 1: 4 sub-agents fork from campaign-integration
T+15m:  wave 1 merges land on campaign-integration (NOT master)
T+15m:  wave 2: 4 sub-agents fork from updated campaign-integration
                ↑ inherits wave 1's work automatically
T+30m:  wave 2 merges land on campaign-integration
T+30m:  wave 3: 4 sub-agents fork from updated campaign-integration
T+45m:  wave 3 merges land
T+45m:  BACKLOG empty. Ask user how to land. (PR / merge / squash / leave)
```

Cross-wave conflicts disappear because every sub-agent sees the previous waves' merged work.

### Sync from master mid-campaign (rare)

```
T+0h:    Start campaign-integration from master.
T+2h:    Wave 1, 2 done on integration branch.
T+2h:    Notice another team merged "fix(auth): X" to master.
T+2h:    Between waves: orchestrator on campaign-integration runs
         `git merge origin/master --no-edit` → fast-forward succeeds.
T+2h:    Wave 3 forks from now-up-to-date integration branch.
```

## Anti-Patterns

### Forking sub-agents from master directly

**Problem**: Cross-wave conflicts pile up — sibling branches stomp on the same files because they both fork from the same parent without seeing each other's work.
**Instead**: Sub-agents always fork from `campaign-integration`.

### Treating the integration branch as just-another-branch and merging it to master mid-campaign

**Problem**: Defeats the isolation. If you ship integration → master on every wave, you're back to the old direct-on-master pattern.
**Instead**: Merge integration → master only once, at Phase 3, with explicit user consent.

### Per-wave integration branches (`campaign-wave1-integration`, `campaign-wave2-integration`)

**Problem**: Now you have to merge the wave integrations together at the end — adds a layer of merge work for no benefit. The whole point of integration is one durable line.
**Instead**: One integration branch, serially advanced across all waves.

### Skipping the Phase-3 "how do you want to land it" question

**Problem**: Auto-merging integration → master at campaign end repeats the no-consent-push mistake at the local level.
**Instead**: Always ask. Present PR / merge / squash / leave as explicit options.

### Pushing campaign-integration without checking first

**Problem**: User may have a "no push" preference that covers ALL refs, not just master.
**Instead**: For the very first push of the integration branch, ask once. Subsequent pushes of the same branch can use that answer.

## Related

- `orchestrator-rhythm.md` — heartbeat continues while integration branch has open waves
- `wave-design.md` — wave size still 3-5; integration branch doesn't change wave structure
- `merge-strategy.md` — TSC gate is now against integration baseline, not master
- `backlog-building.md` — BACKLOG and STATE files live on the integration branch
- `composition-with-herdr.md` — herdr panes still own per-sub-agent worktrees; orchestrator owns the integration branch's main worktree

## Changelog

- 2026-05-26: Initial. Codified from the session that revealed cross-wave conflict explosions — the orchestrator was merging sub-agent branches into master directly, which forced parallel waves to fight over the same files. The integration-branch pattern eliminates that.
