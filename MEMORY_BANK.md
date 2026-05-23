# Memory Bank — Specification

The Memory Bank is rcode's structured, checked-in project memory. It is the differentiator: a place where AI agents read context first and write to as work happens, so context survives session resets, team changes, and AI memory limits.

This document specifies the structure, semantics, and integration points. The implementation shipped in Phase 3 and is live as of v4.0.0 — rcode itself now ships with a populated Memory Bank at `.rcode/memory/` (see commits `da20232`, `817a937`).

---

## Why a Memory Bank

AI agents lose context. `CLAUDE.md` files go stale. Onboarding a teammate three sprints in is a 30-minute archaeology dig. The Memory Bank fixes this by giving every project:

- **A structured directory** that any agent can read in <5K tokens
- **Visibility** — checked into git, browsable in any IDE, viewable in the Diwan dashboard
- **Distillates** — token-optimised summaries for fast LLM hydration
- **Survival** — context outlives any single session, conversation, or developer

---

## Directory structure

The Memory Bank lives at `.rcode/memory/` and is additive to the existing `.rcode/context/` and `.rcode/brain/` layers (which are not moved or replaced).

```
.rcode/memory/
├── INDEX.md                     # human-readable directory of everything
├── project/
│   ├── stack.md                 # languages, frameworks, services in use
│   ├── decisions.md             # ADR-lite log of every architectural choice
│   └── glossary.md              # domain terms, internal names, acronyms
├── people/
│   ├── stakeholders.md          # client contacts, decision authority, comm channels
│   └── team.md                  # who owns what
├── milestones/
│   ├── current.md               # active milestone with phase + tasks
│   └── archive/                 # completed milestones, one file each
├── incidents/
│   ├── known-issues.md          # active bugs and workarounds
│   └── post-mortems/            # one file per incident, dated
├── change-records/              # ports the existing rcode change-record format
│   └── YYYYMMDD-NNN.md          # date + sequence
└── distillates/                 # generated, not hand-edited
    ├── project.distillate.md    # full-project summary, lossless
    └── stack.distillate.md      # stack-only summary
```

### Why this shape

- **`project/`** answers "what is this codebase?"
- **`people/`** answers "who decides what?"
- **`milestones/`** answers "what are we doing now?"
- **`incidents/`** answers "what has gone wrong, what did we learn?"
- **`change-records/`** ports an existing rcode pattern verified in the project template
- **`distillates/`** answers "give me the whole project in <5K tokens"

Each file has a single, focused responsibility. No nested duplication.

---

## File semantics

### `INDEX.md`
Top-level directory of the Memory Bank. Lists every other file with a one-line summary. Read first by every agent session.

### `project/stack.md`
Inventory of languages, frameworks, libraries, services. Populated from `package.json`, `requirements.txt`, `docker-compose.yml`, `helm/`. Refreshed by `/rcode-memory-update` when stack changes.

### `project/decisions.md`
Append-only log. Each entry: date, decision, rationale, alternatives considered, who decided. Lighter than full ADRs — one paragraph each. Heavier decisions get their own ADR file referenced from here.

### `project/glossary.md`
Domain terms specific to this project. Internal names, acronyms, business concepts. Prevents "what does X mean again?" thrash.

### `people/stakeholders.md`
External contacts with decision authority. Client name, role, comm channel, response cadence, areas they own. **Directly addresses the "client late requirements → delays" pain.**

### `people/team.md`
Internal team. Who owns which area, who reviews what, who is on holiday this week.

### `milestones/current.md`
Active milestone. Goal, phases, current sprint, blockers. The agent reads this before starting any task.

### `milestones/archive/`
One file per completed milestone. Used by `/rcode-milestone-summary` and onboarding flows.

### `incidents/known-issues.md`
Active bugs and workarounds. Searchable so an agent doesn't waste cycles re-debugging a known issue.

### `incidents/post-mortems/`
One file per resolved incident. Format follows existing rcode change-record template. **Connects to `rcode-incident-record` skill from Phase 6.**

### `change-records/`
Ports the verified rcode change-record format from `template/docs/change_records/`. Each change record: ID, date, requester, owner, category, type, description, risk, deployment, approval, rollback, verification, outcome.

### `distillates/`
**Generated, not hand-edited.** Produced by `/rcode-memory-distill`. Lossless compression of source files for fast LLM context loading. Re-run when source files change.

---

## Integration points

### Skills that read the Memory Bank
Every Phase 5 engineering skill and Phase 6 real-pain skill declares "Memory Bank Hooks" — which files it reads on entry and writes on exit. Examples:

| Skill | Reads | Writes |
|---|---|---|
| `rcode-prove-it` | `project/stack.md` | `incidents/known-issues.md` (when bug found) |
| `rcode-harden` | `project/decisions.md`, `incidents/post-mortems/` | `change-records/` |
| `rcode-mvp-graduate` | `milestones/current.md`, `project/stack.md` | `project/decisions.md`, `change-records/` |
| `rcode-client-gate` | `people/stakeholders.md` | `people/stakeholders.md` |
| `rcode-incident-record` | `change-records/` | `change-records/`, `incidents/post-mortems/` |

### Dashboard view
The Diwan dashboard exposes a `/memory` route (added in Phase 3) that:
- Renders `INDEX.md` as a tree
- Shows file content previews
- Auto-generates a stack diagram from `project/stack.md`
- Displays a decision log timeline from `project/decisions.md`
- Search across all Memory Bank files

### Skills that maintain the Memory Bank
Four skills, all created in Phase 3:

| Skill | Purpose |
|---|---|
| `rcode-memory-init` | Bootstrap `.rcode/memory/` for an existing project. Asks 5 questions, populates templates. |
| `rcode-memory-update` | Surgical update of specific Memory Bank files from conversation context. |
| `rcode-memory-distill` | Regenerate `distillates/` from source files. |
| `rcode-memory-audit` | Find stale entries, contradictions, missing sections. |

---

## Token economics

The Memory Bank is designed for fast LLM hydration:

| Load mode | Tokens (estimated) | Use when |
|---|---|---|
| `INDEX.md` only | ~500 | Quick orientation |
| `INDEX.md` + `distillates/project.distillate.md` | ~5K | Standard session start |
| Full `project/` directory | ~10–15K | Deep planning |
| Full Memory Bank | ~30–50K | Major refactor, audit, onboarding |

A typical session loads ~5K tokens of Memory Bank context and is fully oriented to the project's history, decisions, current state, and known issues. Compare to a cold session that re-reads the codebase: 30–100K tokens.

---

## Constraints

- **Memory Bank is a complement to, not a replacement for**, `.rcode/context/active.md` (current task context) and `.rcode/brain/` (rcode institutional knowledge from external sources). All three coexist.
- **Distillates are generated, not authored.** Hand-editing a distillate is a smell — the source file should be edited and the distillate regenerated.
- **Memory Bank does not store secrets.** No tokens, no credentials, no PII. Stakeholder contact info should reference an external CRM, not embed personal data.
- **The directory is checked into git.** This is intentional: visibility and team-shared context are the value. Private projects use private repos.

---

## Phase 3 — shipped in v4.0.0

The spec above is implemented and live. Verified deliverables:

- Running `/rcode-memory-init` on a fresh repo produces the directory structure above.
- The Diwan dashboard renders a `/memory` view with file tree + previews.
- Distillates regenerate from sources via `/rcode-memory-distill`. The rcode repo itself ships `distillates/project.distillate.md` (6.1K) and `distillates/stack.distillate.md` (2.6K) as canonical examples.
- Phase 5 and 6 skills declare and honour their Memory Bank hooks (see the integration table above).

This file is now the reference doc for the live system.
