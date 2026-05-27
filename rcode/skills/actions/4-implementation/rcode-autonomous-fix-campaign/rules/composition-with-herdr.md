# Composition with herdr-orchestration

This skill is a layer ON TOP OF `herdr-orchestration`. It does not replace it.

## Purpose
Make the boundary explicit so the orchestrator never reinvents herdr mechanics inside this skill.

## Rules

### Always read herdr-orchestration first
At the start of any campaign session, load the `herdr-orchestration` skill BEFORE dispatching the first wave. Its golden rules (use `cld` not `claude`, worktree per agent, no push during run, interactive mode required) apply to every wave.

### Division of responsibility

| Concern | Skill that owns it |
|---|---|
| Worktree creation | herdr-orchestration |
| Pane splitting + naming | herdr-orchestration |
| `cld --model sonnet` launch via shell alias | herdr-orchestration |
| Sending prompts via `send-text` + `send-keys` | herdr-orchestration |
| Polling `herdr pane list` for status | herdr-orchestration |
| Reading stale buffer text, ignoring stray "merge to master" | herdr-orchestration |
| Conflict resolution (superset rule) | herdr-orchestration |
| **Wave cadence (when to dispatch / merge / pause)** | **this skill** |
| **Backlog management (BACKLOG.md, STATE.md)** | **this skill** |
| **Heartbeat (ScheduleWakeup + bash file)** | **this skill** |
| **TSC baseline gate** | **this skill** |
| **Push-to-origin policy** | **this skill** |

### Pane status mapping → campaign action

| herdr pane status | Campaign action |
|---|---|
| `working` | Leave alone. Re-check on next heartbeat. |
| `blocked` | Read the pane, answer the menu (per herdr-orchestration), continue. |
| `idle` with commits ahead of master | Merge candidate — try to merge this wave. |
| `idle` with 0 commits | Either still warming up or wave failed — peek and decide. |
| `done` | Same as idle-with-commits. Merge if any, then clean up. |
| `unknown` | Recently created; wait one heartbeat. |

### Worktree path convention
Use `../sm-worktrees/camp-<area>` (project-relative `../sm-worktrees`). This matches the convention in herdr-orchestration examples and keeps a single shared place for all campaign worktrees.

### Branch naming convention
- Wave fix branches: `campaign-<area>` (e.g. `campaign-crm-pipeline`)
- Rebase pass branches: `rebase-<area>`
- Post-merge cleanup: delete the branch after push lands

## Examples

### Correct skill load order (start of session)

```
1. Load herdr-orchestration (read SKILL.md, understand golden rules)
2. Load autonomous-fix-campaign (this skill — wave cadence + backlog)
3. Apply both: herdr mechanics for the per-wave dispatch, this skill for the campaign loop
```

### Correct cld invocation (delegated to herdr-orchestration)

```
herdr pane send-text $P "cld --model sonnet"
herdr pane send-keys $P Enter
```
NOT `claude -p` (would be invisible to herdr; see herdr-orchestration golden rule 2).

## Anti-Patterns

### Reimplementing herdr mechanics inside a campaign prompt

**Problem**: Drift between this skill and the upstream herdr-orchestration rules.
**Instead**: Reference herdr-orchestration; do not duplicate.

### Skipping the herdr golden rules because "the campaign is special"

**Problem**: Campaigns still need worktree isolation, still need `cld` alias, still need to ignore stray buffer text.
**Instead**: Treat herdr-orchestration's rules as inviolable.

## Related
- `~/.claude/skills/herdr-orchestration/SKILL.md` (upstream skill)
- `orchestrator-rhythm.md` (this skill — campaign cadence)
- `merge-strategy.md` (this skill — conflict resolution delegates to herdr)

## Changelog
- 2026-05-26: Initial.
