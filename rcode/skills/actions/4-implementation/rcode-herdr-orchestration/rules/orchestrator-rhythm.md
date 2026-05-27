# Orchestrator Rhythm + Heartbeat

The orchestrator must never go silent while sub-agents are still working.

## Purpose
A long-running campaign hits two failure modes that this rule prevents:
1. **Silent assistant**: orchestrator answers a question, then never wakes back up — sub-agents finish, their commits sit unmerged.
2. **Polling waste**: orchestrator wakes too often (every 60s), burning cache misses and tokens.

## Rules

### Heartbeat sources — IMPORTANT distinctions

**`ScheduleWakeup` only fires when `/loop` mode is active.** Outside `/loop`, it is effectively a no-op — the harness will NOT re-invoke the assistant after the delay. The assistant must verify this before relying on it.

**To actually auto-wake the orchestrator during a campaign, pick ONE of these:**

1. **`/loop` mode (RECOMMENDED for long campaigns)** — User invokes `/loop` at the start of the campaign. After that, the assistant's `ScheduleWakeup` calls actually fire and re-invoke autonomously. The user can ctrl-c the loop at any time. This is the only built-in path to true autonomous re-invocation.

2. **`/schedule` (cron-based)** — User creates a scheduled routine that pings the assistant at fixed intervals (e.g. every 15 min). Survives session restarts. Requires Anthropic's scheduled-agents feature. Best for multi-hour campaigns where the user closes the terminal.

3. **Manual pinging** — User types `<<autonomous-loop-dynamic>>` (or just "check status") each time they want progress. Most honest default if `/loop` and `/schedule` aren't available. The orchestrator should be honest with the user that nothing auto-fires.

4. **Bash heartbeat file** — Only an EXTERNAL liveness signal. `touch .planning/campaign/HEARTBEAT` every 30s in a background bash loop. **This does NOT wake the assistant** — it only tells an external watcher (you, a monitor script) that the campaign hasn't crashed. Useful as a secondary check, never as the primary heartbeat.

### Be honest at campaign start

At Phase 0, the orchestrator MUST clarify with the user which heartbeat path is in effect:

```
Heartbeat options for this campaign:
  (a) Wrap the campaign in /loop so auto-wakeup actually fires (recommended for >1h work)
  (b) Use /schedule to ping every N minutes (best for multi-hour, can-close-terminal campaigns)
  (c) Manual mode — you ping me with "check status" whenever you want progress

Which would you like? (a/b/c)
```

If the user picks (c) or skips: NEVER claim "Scheduling 20-min wakeup" in chat — that's a lie. Say instead: "12 agents detached and running. Ping me back with 'check status' when you want me to merge results."

### Cadence by phase (only relevant under /loop or /schedule)

| Phase | Heartbeat interval | Rationale |
|---|---|---|
| Phase 1 (wave just dispatched) | 720s | Sub-agents need 10-15 min to produce a commit |
| Phase 2 (multiple waves running) | 540-720s | Slightly tighter — more chances to merge |
| Phase 3 (draining last waves) | 270s | Sub-agents finishing close to each other; don't miss the last |
| Idle (waiting on stuck pane) | 1200s | Sub-agent stuck — give it room or surface it |

### Cadence by phase

| Phase | Heartbeat interval | Rationale |
|---|---|---|
| Phase 1 (wave just dispatched) | 720s | Sub-agents need 10-15 min to produce a commit |
| Phase 2 (multiple waves running) | 540-720s | Slightly tighter — more chances to merge |
| Phase 3 (draining last waves) | 270s | Sub-agents finishing close to each other; don't miss the last |
| Idle (waiting on stuck pane) | 1200s | Sub-agent stuck — give it room or surface it |

### Stop conditions
The heartbeat should stop ONLY when ALL three are true:
- Every herdr pane is `idle` or `done`
- Every campaign branch has been merged or marked rejected
- `.planning/campaign/BACKLOG.md` is empty (or only contains items marked `[skip]`)

## Examples

### End-of-turn pattern (every campaign turn)

```
ScheduleWakeup(
  delaySeconds=720,
  reason="Wave-3 in flight; expect commits within 10 min then merge + dispatch wave-4",
  prompt="<<autonomous-loop-dynamic>>"
)
```

### Heartbeat bash template

```bash
#!/bin/bash
# Run with: bash heartbeat.sh & echo $! > .planning/campaign/HEARTBEAT.pid
HEARTBEAT=.planning/campaign/HEARTBEAT
while true; do
  date -u +%FT%TZ > "$HEARTBEAT"
  sleep 30
done
```

### Resuming after auto-compact

If the orchestrator hits auto-compact mid-campaign, the first turn after must:
1. Read `.planning/campaign/STATE.md` — figure out which wave is in flight.
2. Run `herdr pane list` — find which panes are still working.
3. Run `git branch | grep campaign-` + `git rev-list --count master..<each>` — find unmerged commits.
4. Resume from Phase 2 of the workflow. Do not redispatch waves that are already in flight.

## Anti-Patterns

### Polling every 60s

**Problem**: Wakeup interval shorter than 270s burns the Anthropic prompt cache repeatedly without any real work happening (sub-agents need minutes between commits).
**Instead**: 540-720s default. Drop to 270s only when wrapping the last wave.

### Bash `sleep && check` loop instead of ScheduleWakeup

**Problem**: A blocking `sleep` in the assistant's own session ties up the conversation slot. The harness blocks long leading sleeps anyway.
**Instead**: Use ScheduleWakeup. The bash heartbeat is for a SEPARATE background process, not for sleeping in the assistant's bash.

### Ending a turn without scheduling wakeup while sub-agents are working

**Problem**: Orchestrator returns control to user, user doesn't reply, sub-agents complete, no one merges, work rots.
**Instead**: Last action of every campaign turn = `ScheduleWakeup`. Non-negotiable.

## Related
- `wave-design.md` — how wave size affects cadence
- `composition-with-herdr.md` — herdr pane status states (`working`/`idle`/`done`) drive the loop exit

## Changelog
- 2026-05-26: Initial. Codified from session that shipped 200+ commits across ~12 waves.
