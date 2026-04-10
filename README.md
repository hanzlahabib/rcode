# Rihal Code

<div dir="rtl">طريقة رحال</div>

> **A context-aware AI team methodology inspired by Rihal (Muscat, Oman).**
> Agents embody real team roles. Projects stay on rails from strategy to ship.

A self-contained AI team methodology: nine agents, 39 skills, file-based state management, context hygiene workflows, and a live view-only dashboard. Everything you need to run a real AI-assisted team in one module.


---

## What This Is

Most AI coding frameworks give you one helpful assistant. **Rihal Code gives you a full team.**

Nine agents — each with a real role, personality, and authority — guide projects through every stage: strategy, architecture, product, design, engineering, QA, DevOps, documentation, and transparency.

A view-only dashboard (Majlis, مجلس — "the council") shows everything happening in your project at once.

## Why "Rihal"?

Rihal is one of Oman's fastest-growing tech companies (2,441% growth, Series A 2025, 270+ employees). This module is inspired by their team structure and Omani work culture. Agent names are Arabic placeholders — replace with your real team in `team.yaml`.

---

## The Team

| Agent | Arabic | Role | Authority |
|---|---|---|---|
| **Waleed** | وليد | System Architect / CTO | Tech stack, architecture, security |
| **Sadiq** | صادق | Business Analyst / Strategy | Business direction, prioritization |
| **Hussain (PM)** | حسين | Product Manager | Product vision, requirements, PRDs |
| **Hussain (SM)** | حسين | Scrum Master | Sprint ops, story flow, retros |
| **Layla** | ليلى | UX Designer | UI/UX, design system, accessibility |
| **Omar** | عمر | Senior Developer | Implementation, refactoring, code review |
| **Fatima** | فاطمة | Test Architect (QA) | Testing, release gating, bug triage |
| **Noor** | نور | Technical Writer | Docs, pitch decks, presentations |
| **Khalid** | خالد | DevOps | CI/CD, infra, monitoring, deploys |
| **Majlis** | مجلس | The Council (dashboard) | View-only project transparency |

**Every agent ships with 2-4 real action skills** — not marketing bullet points. See [`rihal/skills/SKILLS_INDEX.md`](rihal/skills/SKILLS_INDEX.md) for the full capability map (39 skills total).

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
rihal-code/
├── README.md
├── server/
│   └── dashboard.js              # Majlis — view-only dashboard server
├── rihal/
│   ├── config.yaml
│   ├── team.yaml                 # ← replace Arabic placeholders with real team
│   ├── agents/
│   │   ├── waleed.cto.agent.md
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
# 1. Clone this module
git clone https://github.com/hanzlahabib/rihal-code.git
cd rihal-code

# 2. Initialize a project in your work directory
cd ~/projects/your-app
# (See docs/METHODOLOGY.md for agent loading instructions)

# 4. Start the dashboard
node ~/rihal-code/server/dashboard.js

# Visit http://localhost:7717
```

---

## Context Management

AI performs badly when context is stale or overloaded. Rihal Code includes two critical workflows:

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

> **Strategy without execution is hallucination. Execution without strategy is drift. Rihal Code forces both.**

- **Sadiq asks "why?"** before Waleed asks "how?"
- **Waleed locks the stack** before Omar writes code
- **Hussain breaks features** before anyone commits
- **Layla designs states** before engineering wires them
- **Fatima gates releases** before Khalid deploys
- **Noor documents** before the knowledge walks out the door
- **Majlis shows everything** so nothing hides in someone's head

---

## Customization

### Replace agent names with your real team

Edit `rihal/team.yaml`:

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

In `rihal/config.yaml`, change:
- Greetings
- Primary/secondary language
- Server port
- Context thresholds

---

Free to use, fork, and adapt.

## Author

**Hanzla Habib** — 2026.


<div dir="rtl">صُنع بحب في مسقط — Made with love in Muscat (in spirit)</div>
