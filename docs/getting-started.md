# Getting Started with Rihal Code

A 5-minute guide to installing and running your first command.

---

## Install

In any project directory:

```bash
git clone --branch v2-prototype --depth 1 https://github.com/hanzlahabib/rihal-code.git /tmp/rihal-src && \
node /tmp/rihal-src/cli/install-v2.js . --yes --user "$(whoami)" --project "$(basename $(pwd))"
```

Restart your IDE (Claude Code, Cursor, or Gemini CLI). All `/rihal:*` commands now appear when you type `/`.

---

## Step 1: Initialize

```
/rihal:init
```

Answers 3 quick questions:
1. Is this a new or existing project?
2. What's your preferred communication language? (English, Urdu, Arabic)
3. What's your model profile? (quality, balanced, budget)

Creates `.rihal/config.yaml` and `.rihal/RIHLA.md` as your project baseline, then routes you to the right first action.

---

## Step 2: Pick your first command

### Try the interactive router
```
/rihal:do
```
Shows you options based on your project state. Guides you to plan, council, discussion, or execution.

### Or jump straight to a council debate
```
/rihal:council should we build this feature?
```
5 agents debate in parallel (Round 1), then challenge each other (Round 2). Results land in `.planning/council-sessions/`.

### Or quick-sync with one expert
```
/rihal:discuss waleed what stack for this saas?
```
Single agent, conversational tone, fast.

---

## Step 3: Where things land

All outputs go into `.planning/`:

```
.planning/
├── council-sessions/         # debate artifacts
├── chains/                    # pipeline outputs
├── phases/01-name/PLAN.md     # plans by phase number
└── notes/                     # quick notes
```

Your decisions, phases, and sessions are also tracked in `.rihal/state.json` — view formatted with:

```
/rihal:status
```

---

## Step 4: Next command

After you've run one command, the system knows your state. Run `/rihal:do` again and it suggests the natural next step.

- Just had a council debate? → Go plan the decision
- Just created a plan? → Go execute it
- Stuck mid-execution? → `/rihal:pause-work` (saves context for later resume)

---

## Common first workflows

### Research + plan a feature
```
/rihal:chain research-plan build a rental app for dubai
```
Runs Mariam (research) → Hussain-PM (scope) → Planner (plan). Outputs: RESEARCH.md, SCOPE.md, PLAN.md.

### Get a second opinion on architecture
```
/rihal:council should we use postgres or nosql?
```
Waleed (CTO), Sadiq (strategy), Fatima (QA) debate. Result: single artifact with all perspectives + flagged disagreements.

### Quick code review
```
/rihal:discuss fatima is this release ready?
```
Fatima (QA) reviews recent changes. No mandatory artifact — feels like texting a colleague.

### Execute a plan
```
/rihal:execute .planning/phases/01/PLAN.md
```
Runs the planner, makes atomic commits per task, runs post-execute gates (integration-checker, nyquist-auditor). Outputs: commits + SUMMARY.md.

---

## Key concepts

### 3 modes
- **Council** (`/rihal:council`) — parallel debate, best for decisions
- **Chain** (`/rihal:chain`) — sequential pipeline, best for structured workflows
- **Discuss** (`/rihal:discuss`) — single agent, best for quick questions

### Intent guards
Run the wrong command and you'll get a single-line redirect instead of a confusing output:
```
/rihal:plan should we build this?
⚠ That's a decision question, not a planning input.
Copy-paste this to ask the council instead:
/rihal:council should we build this?
```

### Numeric IDs
- **M1, M2** — milestones
- **01, 02, 02.1** — phases (02.1 is an urgent insert between 02 and 03)
- **01.01, 01.02** — plans within a phase
- **01.01.01, 01.01.02** — tasks within a plan

### State tracking
Every command reads/writes `.rihal/state.json`. View your project's state anytime:
```
/rihal:status
```

---

## What's next

- **Full command reference**: See `docs/commands.md`
- **Understanding the team**: See `docs/agents.md`
- **Numbering system deep-dive**: See `docs/numbering.md`
- **State + recovery**: See `docs/state-and-recovery.md`
- **FAQ**: See `docs/faq.md`

---

## Troubleshooting

### Commands don't appear
Restart your IDE (Command Palette → Restart Claude Code).

### Not sure which command to use
Run `/rihal:do` — interactive router guides you based on your project state.

### Stuck mid-execution
```
/rihal:pause-work
```
Saves context in `.rihal/HANDOFF.json` and `.planning/.continue-here.md`. Come back later and run:
```
/rihal:resume-work
```
It re-surfaces your blocking constraints and last session context.

### Want to customize something
Edit `.rihal/config.yaml` directly, or run:
```
/rihal:settings
```

---

**Done?** You're ready. Start with `/rihal:do` or jump to a command from the full reference in `docs/commands.md`.
