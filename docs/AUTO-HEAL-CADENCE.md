# Auto-Heal Cadence

Recommended schedules for rcode's auto-heal tools. Pick the cadence that matches your project's velocity and ops budget.

## Recommended cadence per tool

| Tool | What it checks | Recommended cadence | Mode |
|---|---|---|---|
| `/rcode-health` | 6-point installation compliance (manifest hashes, dirs, configs) | Weekly (Mon 9am) | report-only |
| `/rcode-feature-drift` | PRD ↔ epics ↔ stories ↔ code drift | On every push (CI dogfood gate) + on doc edits (PostToolUse hook, opt-in) | `--quick` for hooks; full for CI; `--fix` manual only |
| `/rcode-feature-drift --mode=phase-status` | ROADMAP claim vs shipping reality | Daily during active development; weekly otherwise | report-only by default; `--fix` patches only `✅` markers + missing dates |
| `/rcode-memory-audit` | Memory Bank staleness, contradictions, broken refs | Weekly | report-only |
| `/rcode-memory-audit --fix` | Trivial memory bank corrections (typos, stale ISO dates, broken paths) | Monthly | mutating — atomic commits per fix |
| `/rcode-docs-update` | Project docs vs live codebase | On major release prep, ad-hoc | mutating (writer + verifier loop) |

## Why these cadences

- **On push** (CI gate): catches regressions cheaply, before merge.
- **Weekly**: balances signal vs noise. Tools that aren't on the critical-path of development don't need to fire every commit.
- **Monthly** for `--fix` modes: trivial drift accumulates a bit before sweep, so the diff is meaningful and reviewable in one PR.
- **On doc edits** (PostToolUse hook, opt-in): catches drift as it's introduced. Always `--quick` (<2s, report-only) so it doesn't block your edit flow.

## Auto-fix safety rules

These rules apply across every auto-heal tool:

1. **`--fix` is never default.** Every tool must be invoked with the explicit `--fix` flag to mutate files. Default behavior is always report-only.
2. **`--fix` only patches `trivial` severity.** Hard allowlist enforced in workflow code, not agent discretion. Anything above trivial (minor / major / critical) stays report-only and requires human review.
3. **`--fix` never runs unsupervised.** CI gates and hooks are NEVER configured to invoke `--fix` automatically. Scheduled runs (cron, `/loop`, `/schedule`) require explicit operator opt-in via the schedule's command line.
4. **Atomic commits.** Each fix lands as its own git commit, so `git revert <hash>` undoes a single correction without unwinding the whole sweep.
5. **`--quick` mode** (PostToolUse hook): forced report-only regardless of other flags. Cannot be coerced into mutation.

## /loop examples (in-session use)

If you're in an interactive Claude Code session and want a tool to run on a fixed cadence within the conversation:

```
/loop 1d /rcode-feature-drift --mode=phase-status
/loop 1w /rcode-health
/loop 1w /rcode-memory-audit
/loop 1mo /rcode-memory-audit --fix
```

`/loop` is in-session only — it stops when the conversation ends. For persistent scheduling, use crontab (below) or the `/schedule` skill.

## /schedule examples (persistent agents)

For schedules that survive across sessions (recommended for any cadence ≥ daily):

```
/schedule create
  name: "weekly-health"
  cron: "0 9 * * 1"          # Mon 9am
  command: /rcode-health

/schedule create
  name: "daily-phase-status"
  cron: "0 18 * * *"          # 6pm daily during active development
  command: /rcode-feature-drift --mode=phase-status

/schedule create
  name: "monthly-memory-fix"
  cron: "0 9 1 * *"           # 1st of month, 9am
  command: /rcode-memory-audit --fix
```

`/schedule list` shows what's currently active. `/schedule delete <name>` to remove.

## Crontab examples (ops-side scheduling)

If you'd rather run these from the ops layer (no Claude session needed), here's a sample crontab. Replace `/path/to/repo` with your project root:

```cron
# rcode auto-heal cadence
# Format: m h dom mon dow command

# Weekly health check (Mon 9am)
0 9 * * 1 cd /path/to/repo && pnpm dogfood >> .rcode/logs/health.log 2>&1

# Daily phase-status drift scan (6pm)
0 18 * * * cd /path/to/repo && node rcode/bin/rcode-tools.cjs roadmap list-phases > /dev/null 2>&1 && \
  echo "$(date): phase-status drift baseline OK" >> .rcode/logs/drift.log

# Monthly memory bank --fix sweep (1st of month, 9am)
0 9 1 * * cd /path/to/repo && /usr/bin/env node rcode/bin/rcode-tools.cjs state sync --from-disk \
  >> .rcode/logs/memory.log 2>&1
```

> Crontab examples are illustrative — actual `/rcode-` slash commands require a Claude session. The CLI subcommands (`pnpm dogfood`, `state sync`, `roadmap list-phases`) are the parts that work standalone.

## CI integration

The `dogfood` GitHub Action (`.github/workflows/dogfood.yml`) already runs the smoke checks on every push to main. If you want to add scheduled runs at the CI layer:

```yaml
# .github/workflows/dogfood-scheduled.yml
on:
  schedule:
    - cron: '0 18 * * *'   # daily 6pm UTC

jobs:
  dogfood:
    # ... same as the on-push job in dogfood.yml
```

## Picking your cadence

Lightest-touch starter pack — recommended for solo devs and small teams:

- CI dogfood gate on every push (already in place)
- Weekly `/rcode-health` via `/schedule`

Add as you grow:

- Daily `feature-drift --mode=phase-status` once you have ≥5 active phases
- Monthly `memory-audit --fix` once your memory bank exceeds 20 entries
- PostToolUse hook (`/rcode-enable-hooks`) once your team is ≥3 people editing docs concurrently

The honest test: if your auto-heal cadence isn't catching real drift in your reports, it's noise. Cut frequency until findings are signal-only.
