# rcode v2 — Improvement Plans

Plans for the next iteration of the rcode v2 prototype.
Each file is a self-contained implementation spec an agent can pick up and execute.

## Execution order

```
Plan 01 → Plan 02 → Plan 03
Plan 04 (independent — no deps)
Plan 05 → depends on 01, 02
Plan 06 → depends on all above
```

## Plans

| File | Title | Priority | Depends on | Effort |
|------|-------|----------|------------|--------|
| [plan-01-executor-wiring.md](./plan-01-executor-wiring.md) | Wire rcode-executor into install pipeline | critical | — | medium |
| [plan-02-state-json.md](./plan-02-state-json.md) | state.json + /rcode-status dashboard | critical | 01 | medium |
| [plan-03-rcode-planner.md](./plan-03-rcode-planner.md) | rcode-planner + /rcode-plan command | high | 01, 02 | large |
| [plan-04-classifier-fix.md](./plan-04-classifier-fix.md) | Fix question classifier (multilingual) | high | — | small |
| [plan-05-discuss-command.md](./plan-05-discuss-command.md) | /rcode-discuss lightweight single-agent | medium | 01, 02 | small |
| [plan-06-module-system.md](./plan-06-module-system.md) | Module system + /rcode-install | low | all above | large |

## How to use these plans

These are implementation specs, not GSD-formatted PLAN.md files.
An agent reading these should:
1. Read the **Objective** and **Context** sections first
2. Execute **Tasks** in order
3. Commit after each task using the message in the **Commit** field
4. Stop at `checkpoint:human-verify` tasks and wait for human sign-off
5. Follow `rcode/v2/references/commit-conventions.md` for all commits

## What already exists (don't rebuild)

| Already in repo | Location |
|---|---|
| rcode-executor agent draft | `rcode/v2/agents/rcode-executor.md` |
| execution-protocol reference | `rcode/v2/references/execution-protocol.md` |
| execute workflow draft | `rcode/v2/workflows/execute.md` |
| execute command draft | `rcode/v2/commands/execute.md` |
| 5 council agents | `rcode/v2/agents/rcode-{sadiq,waleed,fatima,mariam,hussain-pm}.md` |
| council workflow | `rcode/v2/workflows/council.md` |
| rcode-tools.cjs (partial) | `rcode/v2/bin/rcode-tools.cjs` |
| council-panel.cjs scorer | `rcode/v2/bin/lib/council-panel.cjs` |

## Definition of done (across all plans)

- [ ] Plan 01: fresh `install-v2` includes executor agent + execute workflow
- [ ] Plan 02: `.rcode/state.json` created on install, updated after council + execute
- [ ] Plan 03: `/rcode-plan <session>` produces runnable PLAN.md files
- [ ] Plan 04: Roman Urdu question correctly classified, Mariam included in market panels
- [ ] Plan 05: `/rcode-discuss sadiq <question>` works in under 30 seconds
- [ ] Plan 06: `/rcode-install execution` adds executor capability to a core-only install
