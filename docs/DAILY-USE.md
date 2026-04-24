# Rihal Code — Daily Use Guide

A practical guide to using Rihal Code on your own projects day-to-day.

> **Audience:** Developers who want to replace ad-hoc AI usage with a consistent, state-aware workflow across FE, BE, PM, QA, and Marketing tasks.

---

## Install on a new project

```bash
cd my-project
npx @hanzlaa/rcode install
```

That's it. After install you'll have:

- `.rihal/` — config, workflows, references, bin (Rihal infrastructure)
- `.claude/agents/` — 34 subagents (Sadiq, Waleed, Hussain-PM, Fatima, etc.)
- `.claude/commands/rihal/` — 87 slash commands
- `.claude/skills/` — 39 phrase-activated skills
- `.planning/` — starter ROADMAP.md, STATE.md, PROJECT.md with Phase 01 scaffolded

Restart Claude Code and type `/` to see all `rihal:*` commands.

---

## The Golden Path — your first session

### 1. Know where you are

```
/rihal:progress
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
/rihal:sprint-planning --phase 01 --goal "First deliverable"
```

This will:
- Load phase scope from `.planning/ROADMAP.md`
- Ask for your velocity target (first sprint: use 8–13 points)
- Present a story table with points + priorities
- Wait for your confirmation
- Create `.planning/phases/01-*/SPRINT.md`
- Register sprint + stories in `.rihal/state.json`
- Start the sprint

### 3. Execute the sprint

```
/rihal:execute .planning/phases/01-setup-scaffolding/SPRINT.md
```

Rihal spawns `rihal-executor` to work through stories one by one, committing each, pausing at checkpoints for your input.

### 4. Check progress any time

```
/rihal:sprint-status
```

Compact board: stories by status (todo/in_progress/review/done), points done vs remaining, velocity trend.

### 5. Complete the sprint

When all stories are done:

```
/rihal:verify-work
```

Runs conversational UAT against sprint acceptance criteria. Auto-completes the sprint and records velocity.

### 6. Auto-advance to whatever's next

```
/rihal:next
```

Zero-friction: reads state, applies routing rules (plan → execute → verify → complete → next phase), invokes the right command immediately.

---

## Command Quick Reference

| Scenario | Command |
|----------|---------|
| "Where am I?" | `/rihal:progress` |
| "What's next?" | `/rihal:next` |
| "Plan a sprint" | `/rihal:sprint-planning` (or say "plan a sprint") |
| "Run the sprint" | `/rihal:execute <sprint-file>` |
| "How's the sprint going?" | `/rihal:sprint-status` |
| "Check the sprint completed properly" | `/rihal:verify-work` |
| "Convene the team for a decision" | `/rihal:council <question>` |
| "Quick sync with one expert" | `/rihal:discuss <agent-name> <question>` |
| "Just pick what I need" | `/rihal:do <natural language>` |
| "Run everything end-to-end" | `/rihal:autonomous` |

---

## Multi-role usage

Rihal's 34 agents cover different roles. Spawn them directly or through workflows:

| Role | Go-to agent | Example |
|------|-------------|---------|
| **Frontend** | `rihal-haitham-frontend`, `rihal-layla-designer` | "review this React component" |
| **Backend** | `rihal-yousef-backend`, `rihal-waleed-architect` | "design an API for X" |
| **Product/PM** | `rihal-hussain-pm`, `rihal-sadiq-analyst` | "create a PRD for X" |
| **QA** | `rihal-fatima-qa` | "generate e2e tests for feature X" |
| **Marketing** | `rihal-mariam-marketing`, `rihal-zahra-branding` | "draft launch copy for X" |
| **Writing/Docs** | `rihal-noor-writer` | "update the README" |
| **Leadership** | `rihal-sadiq-analyst` (strategy), `rihal-waleed-architect` (CTO) | "should we build this?" |
| **Orchestration** | `rihal-raees-orchestrator` | "route this work to the right specialists" |

---

## Phrase-activated skills (22 total)

Say the phrase — Claude matches the skill automatically:

| Say | Runs |
|-----|------|
| "scaffold a new project" | `rihal-scaffold-project` (clones `rihal-om/template`) |
| "create a PRD" | `rihal-create-prd` |
| "validate this PRD" | `rihal-validate-prd` |
| "create epics and stories" | `rihal-create-epics-and-stories` |
| "create the next story" | `rihal-create-story` |
| "write architecture decision" | `rihal-create-architecture` |
| "review this code" | `rihal-code-review` |
| "dev this story" | `rihal-dev-story` |
| "run a retrospective" | `rihal-retrospective` |
| "generate e2e tests" | `rihal-qa-generate-e2e-tests` |
| "clone a website" | `rihal-clone-website` |
| "course correct" | `rihal-correct-course` |
| "document this project" | `rihal-document-project` |

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

Rihal tracks everything in `.rihal/state.json`:

```bash
# Check state
node .rihal/bin/rihal-tools.cjs state read

# Sprint management
node .rihal/bin/rihal-tools.cjs state sprint add --phase 01 --goal "..." --velocity 13
node .rihal/bin/rihal-tools.cjs state story add --title "..." --points 5
node .rihal/bin/rihal-tools.cjs state story move --id 01.1.01 --status done
node .rihal/bin/rihal-tools.cjs state sprint status
node .rihal/bin/rihal-tools.cjs state sprint complete

# Velocity history
node .rihal/bin/rihal-tools.cjs state sprint velocity
```

Workflows call these under the hood — you rarely need them directly.

---

## Dashboard (optional)

```bash
npx @hanzlaa/rcode dashboard
```

Opens a view-only dashboard at `http://localhost:7717` showing phases, sprints, council sessions, and velocity charts.

---

## Updating Rihal

```bash
npx @hanzlaa/rcode update
```

Refreshes installed agents/commands/workflows without touching your state or planning artifacts. Backs up the previous state to `.rihal/backups/update-{ts}.tgz`.

---

## Troubleshooting

### "No state.json yet" error

Shouldn't happen — install auto-creates state. If it does:
```bash
node .rihal/bin/rihal-tools.cjs state init --project my-project
```

### Sprint creation fails with "Phase not found"

Check phase exists in state:
```bash
node .rihal/bin/rihal-tools.cjs state read | grep -A2 phases
```

Pass the phase id exactly as shown (e.g. `01`, not `1`).

### Commands don't appear in Claude Code

Restart your Claude Code session after `install`. Commands are loaded at startup.

### Sprint shows wrong velocity

Velocity is recorded only when `sprint complete` runs with all stories `done`. Run:
```bash
node .rihal/bin/rihal-tools.cjs state sprint complete
```

---

## Philosophy

Rihal Code is opinionated on purpose:

- **One workflow** — everyone uses the same commands, reducing AI usage drift across the team
- **State-aware** — every command reads `.rihal/state.json` so context persists across sessions
- **Role-aligned** — agents match real team roles, not generic "helpers"
- **Honest scope** — `output-realism.md` enforces batch-and-confirm for large asks
- **Cultural fit** — Arabic-named agents, Majlis council framing, Omani business rhythm

---

## Next steps

1. **Install in one of your projects** and run `/rihal:progress`
2. **Plan a sprint** with `/rihal:sprint-planning`
3. **Execute** and see `/rihal:sprint-status` update as stories complete
4. **Iterate** — each completed sprint builds velocity history for better planning

For skill/command tier breakdown, see [`TIERS.md`](./TIERS.md).
For contributing, see [`STANDARDS.md`](./STANDARDS.md).
