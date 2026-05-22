---
sprint: 25.1
status: complete
stories_completed: 2
commits: 1
---

## Summary

Added `rcode agent <name>` command wrapping `claude --agent rcode-<name>`.

## Files Changed

- `cli/agent.js` — NEW, 56 lines
- `cli/index.js` — EDITED, 166L → 170L (3 surgical insertions)

## Verification Results

| Criterion | Result |
|-----------|--------|
| `rcode agent --list` prints 41 names | ✓ |
| `rcode agent hanzla` launches claude --agent rcode-hanzla | ✓ |
| `rcode agent badname` exits 1 with error + available list | ✓ |
| `rcode agent` (no args) prints usage + list | ✓ |
| `rcode help` shows `agent` under TEAM section | ✓ |
| CLI boots cleanly | ✓ |
| `cli/agent.js` ≤80 lines (56L) | ✓ |
| `cli/index.js` ≤200 lines (170L) | ✓ |

## Commit

`feat(cli): add rcode agent <name> command wrapping claude --agent (#715)`
