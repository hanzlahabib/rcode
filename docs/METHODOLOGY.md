# Rihal Method — Deep Dive

## The Problem

AI coding assistants have a context problem. They either:
1. **Remember too much** — stale information contaminates new decisions
2. **Remember too little** — every session starts from scratch
3. **Remember the wrong things** — irrelevant code blocks eat the context budget

And most AI workflows give you **one assistant** — a generalist who has to be strategy, PM, engineer, and designer simultaneously. No real team works that way.

## The Solution

Rihal Method applies three ideas:

1. **Specialized agents with real authority boundaries** (like a real team)
2. **File-based state** that survives between sessions (`.rihal/`)
3. **Context management workflows** that keep AI's working memory lean

## The Nine Agents

### Why Nine?

Because a real software team has nine distinct roles. Fewer and you lose specialization. More and you create coordination overhead.

### Authority Map

```
                    Sadiq (Strategy)
                          |
                     [the why]
                          |
                  +-------+-------+
                  |               |
             Waleed (CTO)    Hussain (PM)
                  |               |
             [the how]      [the what & when]
                  |               |
          +-------+-------+       |
          |               |       |
    Omar (Eng)       Layla (Design)
          |               |       |
          +-------+-------+-------+
                  |
           Fatima (QA)
                  |
             [the gate]
                  |
          Khalid (DevOps)
                  |
             [the ship]

        Noor (Scribe) — writes it all down
        Majlis (Council) — shows it all
```

Each agent **defers** to others on decisions outside their domain, and **has authority** within theirs.

## The `.rihal/` State Directory

This is the project's **persistent brain**. Everything lives here:

```
.rihal/
├── state.json           # Current state (project, phase, agents active)
├── phases/              # Phase briefs, sprints, stories, tasks
│   └── phase-01/
│       ├── brief.md
│       ├── sprints.md
│       ├── stories/
│       └── tasks/
├── plans/               # Implementation plans
├── decisions/           # Architecture Decision Records (ADRs)
├── artifacts/           # Design system, pitch decks, research, reviews
├── progress/            # Daily logs, retros, status reports
└── context/
    └── active.md        # Compacted context (under 2k tokens)
```

### Why File-Based?

1. **Git-native** — state is versioned with code
2. **Inspectable** — any editor can read it
3. **Portable** — no database to migrate
4. **Offline-first** — works on a plane
5. **AI-friendly** — markdown is the universal AI format

## Context Management Workflows

This is the core innovation. Two workflows keep AI focused:

### `context-reset`

When context is stale or overloaded:
1. Save current state to `progress/`
2. Compact everything into a new `context/active.md` (under 2k tokens)
3. Clear AI context (`/clear`)
4. Tell AI: *"Read context/active.md ONLY."*

**Result:** AI starts fresh with just the essentials.

### `context-build`

Before starting any task, decide the context need:

| Task Type | Load | Don't Load |
|---|---|---|
| Feature | active.md + brief + similar pattern | Unrelated modules |
| Bug | active.md + bug report + failing path | Entire codebase |
| Refactor | active.md + target file + importers | Unrelated features |
| Review | active.md + diff + related ADRs | Unchanged code |
| Docs | active.md + feature + audience notes | Implementation |
| Strategy | active.md + market docs + OKRs | Code |

**Rule:** Task-specific context beats universal context.

## The Majlis Dashboard (مجلس)

### Why View-Only?

Because CRUD is where projects break:
- Someone edits state, another agent's state is stale
- Database migrations lag the code
- Multi-user writes need locking, locking needs coordination
- Bugs in write logic corrupt state permanently

**The dashboard never writes.** It reads `.rihal/` files. If you want to change something, you run a workflow — which updates files — and the dashboard reflects the new state on next refresh.

### Why a Server at All?

Because staring at markdown files in a terminal is not the same as seeing them in a dashboard. Humans process visual hierarchies better than file trees.

### What It Shows

- **Current phase and active agents** (top stats)
- **Active context** (what AI currently knows)
- **Team roster** (all 9 agents, active ones highlighted)
- **Phases** (briefs, stories, tasks)
- **Decisions** (ADRs chronologically)
- **Progress** (latest 10 entries)
- **Artifacts** (design system, pitches, reviews)

### Design Choices

- **Omani colors**: Rihal blue `#1e3a8a` + gold `#f59e0b`
- **Dark mode only** — because terminals
- **Arabic + English** — cultural touchstone
- **No JavaScript frameworks** — single Node file, no build
- **5-second refresh** — fast enough to feel live, slow enough to not thrash
- **No dependencies** — pure Node.js stdlib

## Differentiation

### vs generic AI development frameworks

Most frameworks are general-purpose. Rihal Method is opinionated about:
- Specific team roles (9 named agents with clear authority)
- File-based context management (`.rihal/`)
- A view-only dashboard
- Cultural framing (Omani/Arabic identity)

### vs GSD (Get Shit Done)

GSD focuses on planning and execution rigor. Rihal Method borrows:
- Phase-based tracking
- Artifact management
- Progress logging

And adds:
- Multi-agent role specialization
- Cultural identity
- Live dashboard

### vs Addy Osmani's AI Engineering Guide

Addy's work is a book — you read it once. Rihal Method is a runtime — you load agents and run workflows daily.

## When to Use Rihal Method

**Good fit:**
- Team projects with multiple roles
- Long-running initiatives (weeks to months)
- Mix of strategic + technical + design work
- Projects where decisions need to be traceable (ADRs)
- Teams where "who decides what" needs clarity

**Bad fit:**
- Single-file scripts
- One-off prototypes
- Projects that fit in your head (no state needed)

## When NOT to Use Rihal Method

If your project is under 10 files or will be thrown away in a week, Rihal Method is overkill. Use it for real work that ships and lasts.

## The Core Loop

```
1. Kickoff (Sadiq + Waleed + Hussain + Layla)
   → .rihal/phases/{phase}/brief.md
   → .rihal/decisions/001-stack.md

2. Sprint Plan (Hussain)
   → .rihal/phases/{phase}/sprints.md

3. Build Feature (Hussain → Waleed → Layla → Omar → Fatima)
   → Code committed
   → .rihal/progress/session-{date}.md

4. Context Reset (as needed)
   → .rihal/context/active.md

5. Code Review (Omar + Waleed + Fatima)
   → .rihal/artifacts/reviews/

6. Ship It (Fatima → Khalid → Noor)
   → Production
   → .rihal/progress/deploys.md

7. Progress Check (weekly, Hussain + Fatima + Khalid)
   → .rihal/progress/report-{date}.md

8. Strategy Session (as needed, Sadiq)
   → .rihal/decisions/strat-{date}.md

9. Pitch Deck (Sadiq + Waleed + Noor + Layla)
   → .rihal/artifacts/pitch/
```

And at any time:

```
*serve → Majlis shows everything in the dashboard
```

## Final Note

This methodology is opinionated. That's on purpose. If you disagree with the opinions, the module is MIT-licensed — fork it and make it yours. But don't water it down; that's how methodologies become useless.

<div dir="rtl" style="text-align:center;margin-top:40px;font-size:18px;">
رحلة البناء
</div>

*The journey of building.*
