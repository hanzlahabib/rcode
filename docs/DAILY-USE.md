# rcode — Daily Use Guide

A practical guide to using rcode on your own projects day-to-day.

> **Audience:** Developers who want to replace ad-hoc AI usage with a consistent, state-aware workflow across FE, BE, PM, QA, and Marketing tasks.

---

## Install on a new project

```bash
cd my-project
npx @hanzlaa/rcode install
```

That's it. After install you'll have:

- `.rcode/` — config, workflows, references, bin (rcode infrastructure)
- `.claude/agents/` — 34 subagents (Sadiq, Waleed, Hussain-PM, Fatima, etc.)
- `.claude/commands/rcode/` — 87 slash commands
- `.claude/skills/` — 39 phrase-activated skills
- `.planning/` — starter ROADMAP.md, STATE.md, PROJECT.md with Phase 01 scaffolded

Restart Claude Code and type `/` to see all `rcode-*` commands.

---

## The Golden Path — your first session

### 1. Know where you are

```
/rcode-progress
```

Shows current phase, sprint status, velocity, recent work, and suggests the next action.

### 2. Plan a sprint

Two ways — either works:

**Phrase-activated:**
```
plan a sprint for Phase 01
```

**Slash command:**
```
/rcode-sprint-planning --phase 01 --goal "First deliverable"
```

This will:
- Load phase scope from `.planning/ROADMAP.md`
- Ask for your velocity target (first sprint: use 8–13 points)
- Present a story table with points + priorities
- Wait for your confirmation
- Create `.planning/phases/01-*/SPRINT.md`
- Register sprint + stories in `.rcode/state.json`
- Start the sprint

### 3. Execute the sprint

```
/rcode-execute .planning/phases/01-setup-scaffolding/SPRINT.md
```

rcode spawns `rcode-executor` to work through stories one by one, committing each, pausing at checkpoints for your input.

### 4. Check progress any time

```
/rcode-sprint-status
```

Compact board: stories by status (todo/in_progress/review/done), points done vs remaining, velocity trend.

### 5. Complete the sprint

When all stories are done:

```
/rcode-verify-work
```

Runs conversational UAT against sprint acceptance criteria. Auto-completes the sprint and records velocity.

### 6. Auto-advance to whatever's next

```
/rcode-next
```

Zero-friction: reads state, applies routing rules (plan → execute → verify → complete → next phase), invokes the right command immediately.

---

## Command Quick Reference

| Scenario | Command |
|----------|---------|
| "Where am I?" | `/rcode-progress` |
| "What's next?" | `/rcode-next` |
| "Plan a sprint" | `/rcode-sprint-planning` (or say "plan a sprint") |
| "Run the sprint" | `/rcode-execute <sprint-file>` |
| "How's the sprint going?" | `/rcode-sprint-status` |
| "Check the sprint completed properly" | `/rcode-verify-work` |
| "Convene the team for a decision" | `/rcode-council <question>` |
| "Quick sync with one expert" | `/rcode-discuss <agent-name> <question>` |
| "Just pick what I need" | `/rcode-do <natural language>` |
| "Run everything end-to-end" | `/rcode-autonomous` |

---

## Multi-role usage

rcode's 34 agents cover different roles. Spawn them directly or through workflows:

| Role | Go-to agent | Example |
|------|-------------|---------|
| **Frontend** | `rcode-haitham-frontend`, `rcode-layla-designer` | "review this React component" |
| **Backend** | `rcode-yousef-backend`, `rcode-waleed-architect` | "design an API for X" |
| **Product/PM** | `rcode-hussain-pm`, `rcode-sadiq-analyst` | "create a PRD for X" |
| **QA** | `rcode-fatima-qa` | "generate e2e tests for feature X" |
| **Marketing** | `rcode-mariam-marketing`, `rcode-zahra-branding` | "draft launch copy for X" |
| **Writing/Docs** | `rcode-noor-writer` | "update the README" |
| **Leadership** | `rcode-sadiq-analyst` (strategy), `rcode-waleed-architect` (CTO) | "should we build this?" |
| **Orchestration** | `rcode-raees-orchestrator` | "route this work to the right specialists" |

---

## Phrase-activated skills (22 total)

Say the phrase — Claude matches the skill automatically:

| Say | Runs |
|-----|------|
| "scaffold a new project" | `rcode-scaffold-project` (clones `rcode-om/template`) |
| "create a PRD" | `rcode-create-prd` |
| "validate this PRD" | `rcode-validate-prd` |
| "create epics and stories" | `rcode-create-epics-and-stories` |
| "create the next story" | `rcode-create-story` |
| "write architecture decision" | `rcode-create-architecture` |
| "review this code" | `rcode-review` |
| "dev this story" | `rcode-dev-story` |
| "run a retrospective" | `rcode-retrospective` |
| "generate e2e tests" | `rcode-qa-generate-e2e-tests` |
| "clone a website" | `rcode-clone-website` |
| "course correct" | `rcode-correct-course` |
| "document this project" | `rcode-document-project` |

---

## Model profiles

Switch between quality/balanced/budget/inherit:

```bash
npx @hanzlaa/rcode set-profile balanced  # default
npx @hanzlaa/rcode set-profile quality   # opus for most agents
npx @hanzlaa/rcode set-profile budget    # haiku for most agents
npx @hanzlaa/rcode set-profile inherit   # follow session model
```

---

## State management

rcode tracks everything in `.rcode/state.json`:

```bash
# Check state
node .rcode/bin/rcode-tools.cjs state read

# Sprint management
node .rcode/bin/rcode-tools.cjs state sprint add --phase 01 --goal "..." --velocity 13
node .rcode/bin/rcode-tools.cjs state story add --title "..." --points 5
node .rcode/bin/rcode-tools.cjs state story move --id 01.1.01 --status done
node .rcode/bin/rcode-tools.cjs state sprint status
node .rcode/bin/rcode-tools.cjs state sprint complete

# Velocity history
node .rcode/bin/rcode-tools.cjs state sprint velocity
```

Workflows call these under the hood — you rarely need them directly.

---

## Dashboard (optional)

```bash
npx @hanzlaa/rcode dashboard
```

Opens a view-only dashboard at `http://localhost:7717` showing phases, sprints, council sessions, and velocity charts.

---

## Updating rcode

```bash
npx @hanzlaa/rcode update
```

Refreshes installed agents/commands/workflows without touching your state or planning artifacts. Backs up the previous state to `.rcode/backups/update-{ts}.tgz`.

---

## Troubleshooting

### "No state.json yet" error

Shouldn't happen — install auto-creates state. If it does:
```bash
node .rcode/bin/rcode-tools.cjs state init --project my-project
```

### Sprint creation fails with "Phase not found"

Check phase exists in state:
```bash
node .rcode/bin/rcode-tools.cjs state read | grep -A2 phases
```

Pass the phase id exactly as shown (e.g. `01`, not `1`).

### Commands don't appear in Claude Code

Restart your Claude Code session after `install`. Commands are loaded at startup.

### Sprint shows wrong velocity

Velocity is recorded only when `sprint complete` runs with all stories `done`. Run:
```bash
node .rcode/bin/rcode-tools.cjs state sprint complete
```

---

## Philosophy

rcode is opinionated on purpose:

- **One workflow** — everyone uses the same commands, reducing AI usage drift across the team
- **State-aware** — every command reads `.rcode/state.json` so context persists across sessions
- **Role-aligned** — agents match real team roles, not generic "helpers"
- **Honest scope** — `output-realism.md` enforces batch-and-confirm for large asks
- **Cultural fit** — Arabic-named agents, Majlis council framing, Omani business rhythm

---

## Next steps

1. **Install in one of your projects** and run `/rcode-progress`
2. **Plan a sprint** with `/rcode-sprint-planning`
3. **Execute** and see `/rcode-sprint-status` update as stories complete
4. **Iterate** — each completed sprint builds velocity history for better planning

For skill/command tier breakdown, see [`TIERS.md`](./TIERS.md).
For contributing, see [`STANDARDS.md`](./STANDARDS.md).
