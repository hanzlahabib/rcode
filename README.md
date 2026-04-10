# Rihal Method

<div dir="rtl">طريقة رحال</div>

> **A context-aware AI team methodology inspired by Rihal (Muscat, Oman).**
> Agents embody real team roles. Projects stay on rails from strategy to ship.

Built on the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) framework, with ideas borrowed from [Get Shit Done (GSD)](https://github.com/hanzlahabib/get-shit-done) for progress tracking and artifact management.

---

## What This Is

Most AI coding frameworks give you one helpful assistant. **Rihal Method gives you a full team.**

Nine agents — each with a real role, personality, and authority — guide projects through every stage: strategy, architecture, product, design, engineering, QA, DevOps, documentation, and transparency.

A view-only dashboard (Majlis, مجلس — "the council") shows everything happening in your project at once.

## Why "Rihal"?

Rihal is one of Oman's fastest-growing tech companies (2,441% growth, Series A 2025, 270+ employees). This module is inspired by their team structure and Omani work culture. Agent names are Arabic placeholders — replace with your real team in `team.yaml`.

---

## The Team

| Agent | Arabic | Role | Authority |
|---|---|---|---|
| **Ahmed** | أحمد | CTO | Tech stack, architecture, security |
| **Sadiq** | صادق | Director of Strategy | Business direction, prioritization |
| **Hussain** | حسين | Product Manager | Sprint planning, scope, delivery |
| **Layla** | ليلى | Lead Designer | UI/UX, design system, accessibility |
| **Omar** | عمر | Senior Engineer | Implementation, refactoring, code review |
| **Fatima** | فاطمة | QA Lead | Testing, release gating, bug triage |
| **Khalid** | خالد | DevOps | CI/CD, infra, monitoring, deploys |
| **Noor** | نور | Scribe | Docs, pitch decks, presentations |
| **Majlis** | مجلس | The Council | View-only dashboard server |

---

## Core Principles

1. **Context-aware, not context-bloated** — AI works better with 2k relevant tokens than 50k mixed tokens
2. **File-based state** — everything lives in `.rihal/`, no database, no magic
3. **View-only dashboard** — the Majlis server reads files and shows them; it never writes
4. **Real roles, real authority** — each agent has clear decision boundaries
5. **Progress is a file** — tracked in `.rihal/progress/`, visible in the dashboard
6. **Arabic-Omani cultural touch** — greetings, colors, naming

---

## Directory Structure

```
rihal-method/
├── README.md
├── server/
│   └── dashboard.js              # Majlis — view-only dashboard server
├── bmad/rihal/
│   ├── config.yaml
│   ├── team.yaml                 # ← replace Arabic placeholders with real team
│   ├── agents/
│   │   ├── ahmed.cto.agent.md
│   │   ├── sadiq.strategy.agent.md
│   │   ├── hussain.pm.agent.md
│   │   ├── layla.design.agent.md
│   │   ├── omar.engineer.agent.md
│   │   ├── fatima.qa.agent.md
│   │   ├── khalid.devops.agent.md
│   │   ├── noor.scribe.agent.md
│   │   └── majlis.council.agent.md
│   ├── workflows/
│   │   ├── kickoff/              # Initialize project
│   │   ├── sprint-plan/          # Plan a sprint
│   │   ├── build-feature/        # Feature loop
│   │   ├── code-review/          # Multi-agent review
│   │   ├── ship-it/              # Deploy pipeline
│   │   ├── pitch-deck/           # Presentation workflow
│   │   ├── strategy-session/     # Decision workflow
│   │   ├── progress-check/       # Weekly status
│   │   ├── context-reset/        # Clear stale context
│   │   ├── context-build/        # Load minimal context
│   │   └── serve-dashboard/      # Start Majlis server
│   └── templates/
│       ├── memory-bank/          # project-brief, tech-stack, impl-plan
│       ├── project/              # ADR, sprint, story templates
│       ├── pitch/                # Pitch deck templates
│       └── adr/                  # Decision record template
└── docs/
    └── METHODOLOGY.md            # Deep methodology explanation
```

And the working state directory (created by `*kickoff`):

```
your-project/
└── .rihal/
    ├── state.json                # Current project state
    ├── team.yaml                 # (optional override)
    ├── phases/                   # Phase briefs, sprints, stories
    ├── plans/                    # Implementation plans
    ├── decisions/                # ADRs
    ├── artifacts/                # Design system, pitches, research
    ├── progress/                 # Status reports, standups, retros
    └── context/
        └── active.md             # Compacted context for AI
```

---

## Quick Start

```bash
# 1. Install BMAD method
npm install -g bmad-method

# 2. Clone this module
git clone https://github.com/hanzlahabib/rihal-method.git
cd rihal-method

# 3. Initialize a project in your work directory
cd ~/projects/your-app
# (Use bmad commands to load agents — see docs/METHODOLOGY.md)

# 4. Start the dashboard
node ~/rihal-method/server/dashboard.js

# Visit http://localhost:7717
```

---

## Context Management (inspired by GSD)

AI performs badly when context is stale or overloaded. Rihal Method includes two critical workflows:

### `context-reset`
Clears Claude's context, saves current state, and reloads only `active.md` (under 2k tokens).

**Run when:**
- Responses feel off-topic
- Context usage over 70%
- Switching between phases

### `context-build`
Loads just-enough context for a specific task type (feature / bug / refactor / review / docs / strategy).

**Rule:** The AI should know what it's doing, not everything the project has ever done.

---

## The Majlis Dashboard

<div dir="rtl">مجلس</div>

In Omani tradition, a majlis is a gathering where the community sees and discusses what's happening. The Majlis dashboard does this for your project.

**Features:**
- ✅ View-only (no CRUD — no fragility)
- ✅ Auto-refresh every 5 seconds
- ✅ Scans `.rihal/` directory directly
- ✅ No database, no build step
- ✅ Works offline
- ✅ Single Node.js file (no dependencies)
- ✅ Omani color palette (Rihal blue + gold)

**Start it:**
```bash
node server/dashboard.js
# → http://localhost:7717
```

**Stop it:**
```bash
kill $(lsof -t -i:7717)
```

---

## Philosophy

> **Strategy without execution is hallucination. Execution without strategy is drift. Rihal Method forces both.**

- **Sadiq asks "why?"** before Ahmed asks "how?"
- **Ahmed locks the stack** before Omar writes code
- **Hussain breaks features** before anyone commits
- **Layla designs states** before engineering wires them
- **Fatima gates releases** before Khalid deploys
- **Noor documents** before the knowledge walks out the door
- **Majlis shows everything** so nothing hides in someone's head

---

## Customization

### Replace agent names with your real team

Edit `bmad/rihal/team.yaml`:

```yaml
team:
  - id: architect
    name: "Your Real CTO Name"
    arabic_name: "الاسم بالعربية"
    role: CTO
    # ...
```

Agent markdown files will reference names from this file.

### Adjust cultural elements

In `bmad/rihal/config.yaml`, change:
- Greetings
- Primary/secondary language
- Server port
- Context thresholds

---

## License

MIT — free to use, fork, and adapt.

## Attribution

- **Inspired by** the team structure and growth story of [Rihal Oman](https://rihal.om)
- **Built on** the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) framework
- **Context management** ideas from [Get Shit Done (GSD)](https://github.com/hanzlahabib/get-shit-done)
- **Authored by** Hanzla Habib

<div dir="rtl">صُنع بحب في مسقط — Made with love in Muscat (in spirit)</div>
