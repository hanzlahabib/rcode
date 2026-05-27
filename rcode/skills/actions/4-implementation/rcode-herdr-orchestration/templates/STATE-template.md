# CAMPAIGN STATE

Last update: <ISO-TIMESTAMP>
Heartbeat: `.planning/campaign/HEARTBEAT` (file mtime should be < 60s old while campaign is live)
Heartbeat PID: see `.planning/campaign/HEARTBEAT.pid`

## TSC drift over time

| Time (UTC) | Wave | TSC errors | Delta vs baseline |
|---|---|---|---|
| <iso> (campaign start) | 0 (baseline) | <count> | 0 |
| <iso> | 1 | <count> | +/-N |
| <iso> | 2 | <count> | +/-N |

## Wave history

### Wave 1 — <one-line theme>
- Dispatched: <iso>
- Agents: 4 (pane labels: <Pane1, Pane2, Pane3, Pane4>)
- Branches: `<branch-1>`, `<branch-2>`, `<branch-3>`, `<branch-4>`
- Outcome:
  - merged: `<branch-1>` (3 commits), `<branch-2>` (5 commits), `<branch-3>` (2 commits)
  - rebase needed: `<branch-4>` (conflict on shared file)
- Pushed to origin: <iso>
- Cumulative commits: <count>

### Wave 2 — <one-line theme>
- …

## Active panes

| Pane | Label | Branch | Status | Last commit at |
|---|---|---|---|---|
| `<pane-id>` | <label> | `<branch>` | working/idle/done | <iso> |

## Open questions / blockers

<!-- Things the orchestrator surfaces to the human at next opportunity. -->

- <blocker description>
