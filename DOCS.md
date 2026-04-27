# rcode — Complete Documentation

The single document covering everything you need to use, customise, and contribute to rcode. For the brand voice, see [`BRAND.md`](BRAND.md). For the upgrade path from older versions, see [`MIGRATIONS.md`](MIGRATIONS.md). For the Memory Bank specification, see [`MEMORY_BANK.md`](MEMORY_BANK.md). For the competitive positioning, see [`docs/USP.md`](docs/USP.md).

---

## Table of contents

1. [What is rcode](#1-what-is-rcode)
2. [Installation](#2-installation)
3. [Five-minute quick start](#3-five-minute-quick-start)
4. [Core concepts](#4-core-concepts)
5. [Memory Bank](#5-memory-bank)
6. [Personas (45 agents)](#6-personas-45-agents)
7. [Slash commands (95)](#7-slash-commands-95)
8. [Skills (80)](#8-skills-80)
9. [Workflows](#9-workflows)
10. [Diwan dashboard](#10-diwan-dashboard)
11. [Configuration](#11-configuration)
12. [Common use cases](#12-common-use-cases)
13. [Customising rcode](#13-customising-rcode)
14. [Troubleshooting](#14-troubleshooting)
15. [Architecture](#15-architecture)
16. [Contributing](#16-contributing)

---

## 1. What is rcode

rcode is the **memory bank for AI-driven SaaS teams** — a CLI tool that installs persistent project context, distinctive engineering personas, and phase-based workflows into your repository for use with Claude Code, Cursor, Gemini, and any compatible AI IDE.

**Built by Rihal. Designed for solo devs, startup teams, and SaaS builders.**

### The problem rcode solves

- **AI agents lose context mid-project.** Three sessions in, the assistant has forgotten the architectural decision you made on day one.
- **Onboarding a teammate** means a 30-minute archaeology dig through Slack, Notion, and review comments to explain "why we did it this way".
- **Late client requirements** keep shifting the goal posts, and there's no record of what was decided when.
- **MVPs that work but can't be revamped** without rewriting from scratch — the original context is lost.

### What rcode gives you

- **Persistent project memory** at `.rihal/memory/` — checked into git, browsable in any IDE, visible in the Diwan dashboard
- **45 distinctive engineering personas** with Arabic-named brand vocabulary (Sadiq, Waleed, Fatima, Dalil, Majlis…)
- **80 skills** covering analysis, planning, implementation, security, performance, debugging, and 8 real-pain skills encoded from Rihal's actual production incidents
- **95 slash commands** for parallel agent debate (`/rihal-council`), sequential pipelines (`/rihal-chain`), quick consultation (`/rihal-discuss`), and end-to-end automation (`/rihal-autonomous`)
- **A view-only dashboard** (Diwan) at port 7717 that renders project state, decision logs, and Memory Bank content
- **Zero runtime dependencies** — pure Node.js with built-in test runner

### What rcode is not

- Not a methodology — use rcode alongside whatever planning approach fits your team
- Not Rihal-only — the named primitives are brand vocabulary like Linear's "Cycles" or Notion's "Blocks"; anyone can use them
- Not a chatbot — rcode is opinionated about persistent memory, distinctive personas, and phase clarity

---

## 2. Installation

### One command in any project directory

```bash
npx @hanzlaa/rcode install
```

Works in an existing codebase or an empty folder. Requires Node ≥ 18.

After install, the project gains:

| Path | Contents |
|---|---|
| `.rihal/` | rcode infrastructure + project state |
| `.rihal/memory/` | Memory Bank (the differentiator) |
| `.rihal/state.json` | Current phase, decisions, sessions |
| `.rihal/config.yaml` | Project preferences |
| `.rihal/brain/` | Rihal institutional knowledge pulled from upstream |
| `.claude/agents/` | 45 first-class subagents (for Claude Code) |
| `.claude/commands/rihal/` | 95 slash commands |
| `.claude/skills/` | 80 phrase-activated skills |
| `.cursor/rules/rihal/` | Cursor commands and rules |
| `.gemini/rihal/` | Gemini CLI commands and agents |
| `.planning/` | Where your project's artefacts land |

### Module subsets

Install only the parts you need:

```bash
npx @hanzlaa/rcode install --module core         # council + quick-sync only
npx @hanzlaa/rcode install --module execution
npx @hanzlaa/rcode install --module discovery
```

### Multi-IDE support

```bash
npx @hanzlaa/rcode install --ide claude    # default
npx @hanzlaa/rcode install --ide cursor
npx @hanzlaa/rcode install --ide gemini
```

### Updates

```bash
npx @hanzlaa/rcode update
```

Updates the installed methodology files in place. Local edits to `rihal/skills/_shared/best-practices/` survive every install (see `cli/postinstall.js` for the local-overrides pattern).

---

## 3. Five-minute quick start

After installing, restart your AI IDE so the new commands and skills are picked up. Then:

```
/rihal-init
```

This is the first command for every project. It detects state (fresh / existing-with-no-rihal / returning), asks a few config questions (model profile, language, branching strategy), and routes you to the right next action.

### The Golden Path (7 commands, end-to-end)

```
1. /rihal-init                    # configure for this project
2. /rihal-new-project             # idea → research → REQUIREMENTS → ROADMAP
3. /rihal-plan 1                  # produce SPRINT.md for phase 1
4. /rihal-execute 1               # ship phase 1 with atomic commits
5. /rihal-next                    # auto-route to the next step
6. /rihal-status                  # see current state
7. /rihal-ship                    # open PR with auto-generated body
```

### Bootstrap your Memory Bank

```
/rcode:memory-init
```

Asks 5 questions, populates `.rihal/memory/` with the project goal, stack, milestone, primary stakeholder, and any known production issue. Future agent sessions read this on entry.

### Open the Diwan dashboard

```bash
node server/dashboard.js
```

Visit `http://localhost:7717`. Browse phases, decisions, files, agents, and Memory Bank in one view. Stop with `kill $(lsof -t -i:7717)`.

---

## 4. Core concepts

rcode is built from five layers. Every feature is assembled from the same five.

### The five building blocks

| Layer | Where | What it is |
|---|---|---|
| **Command** | `rihal/commands/*.md` | The slash command entry point — what you type in Claude Code |
| **Workflow** | `rihal/workflows/*.md` | Step-by-step orchestration instructions |
| **Skill** | `rihal/skills/{actions,agents,core}/<name>/SKILL.md` | Deep, domain-specific instructions |
| **Agent** | `rihal/agents/*.md` + `rihal/skills/agents/*/SKILL.md` | A specialised persona spawned by a workflow or skill |
| **Memory Bank** | `.rihal/memory/` | Persistent, structured project context the agents read first |

### Phase-based work organisation

Every action skill lives in one of four phase folders:

```
rihal/skills/actions/
├── 1-analysis/      # research, briefs, document existing project
├── 2-plan/          # PRDs, epics, stories, UX, architecture
├── 3-solutioning/   # architecture decisions, readiness gates
└── 4-implementation/ # ship code, review, debug, deploy
```

This isn't a waterfall — it's a vocabulary. You can jump between phases freely; the folders just signal what kind of work each skill is for.

### Three execution modes

| Mode | Command | Use when |
|---|---|---|
| **Parallel debate** | `/rihal-council` | Strategic decision needs multiple perspectives — 3-5 agents debate in parallel, 2 rounds with cross-talk |
| **Sequential pipeline** | `/rihal-chain` | Pipeline of agents where each reads the previous output (research → scope → plan → build) |
| **Quick consultation** | `/rihal-discuss` | Single expert, fast, conversational, no mandatory artefact |

### Brand vocabulary

| Term | Meaning |
|---|---|
| **Memory Bank** | The structured `.rihal/memory/` directory. The differentiator. |
| **Distillate** | Token-optimised, lossless compression of one or more documents for fast LLM context loading |
| **Majlis** (مجلس) | The multi-perspective consulting council |
| **Diwan** (ديوان) | The view-only dashboard (`server/dashboard.js`) |
| **Dalil** (دليل) | The codebase scout persona — reads the repo and reports honestly |

See [`BRAND.md`](BRAND.md) for the full glossary and naming conventions.

---

## 5. Memory Bank

The most important rcode concept. Persistent, structured, checked-in project context that AI agents read first.

### Directory structure

```
.rihal/memory/
├── INDEX.md                     # human-readable directory of everything
├── project/
│   ├── stack.md                 # languages, frameworks, services in use
│   ├── decisions.md             # ADR-lite log, append-only, newest at top
│   └── glossary.md              # domain terms, internal names, acronyms
├── people/
│   ├── stakeholders.md          # external contacts, decision authority, comms
│   └── team.md                  # who owns what
├── milestones/
│   ├── current.md               # active milestone — goal, phase, blockers
│   └── archive/                 # completed milestones, one file each
├── incidents/
│   ├── known-issues.md          # active bugs and workarounds
│   └── post-mortems/            # resolved incidents, dated
├── change-records/              # YYYYMMDD-NNN.md format, audit trail
└── distillates/                 # generated, lossless compression
    ├── project.distillate.md
    └── stack.distillate.md
```

### Lifecycle commands

| Command | Purpose |
|---|---|
| `/rcode:memory-init` | Bootstrap — copy templates, ask 5 questions, populate seed files |
| `/rcode:memory-update` | Surgical append to a Memory Bank file from conversation context |
| `/rcode:memory-distill` | Regenerate `distillates/*.distillate.md` after sources change |
| `/rcode:memory-audit` | Find stale entries, contradictions, missing sections |

### Token budget

| Load mode | Tokens | Use when |
|---|---|---|
| `INDEX.md` only | ~500 | Quick orientation |
| `INDEX.md` + `project.distillate.md` | ~5K | Standard session start |
| Full `project/` directory | ~10–15K | Deep planning |
| Full Memory Bank | ~30–50K | Major refactor or onboarding |

A typical session loads ~5K tokens of Memory Bank and is fully oriented to the project's history, decisions, current state, and known issues. A cold session that re-reads the codebase costs 30–100K tokens.

### Constraints

- No secrets, tokens, or PII
- This directory is checked into git
- Distillates are generated, not hand-edited

See [`MEMORY_BANK.md`](MEMORY_BANK.md) for the full spec.

---

## 6. Personas (45 agents)

Distinctive named characters that bring focused expertise to specific questions. Each has a clear domain and explicit scope boundaries.

### Strategic & product

| Persona | Role | When to invoke |
|---|---|---|
| **Sadiq** (صادق) | Director of Strategy | "Should we build this?", kill criteria, opportunity cost |
| **Hussain-PM** (حسين) | Product Manager | PRD, scope, roadmap, prioritisation |
| **Hussain-SM** | Scrum Master | Sprint planning, ceremonies, mid-sprint course correction |
| **Mariam** (مريم) | Marketing & Growth | Positioning, GTM, launch posts, GCC/MENA markets |
| **Zahra** (زهراء) | Branding & Creative Director | Brand consistency, visual identity, design system |

### Engineering

| Persona | Role | When to invoke |
|---|---|---|
| **Waleed** (وليد) | CTO + Chief Architect | Architecture, stack selection, ADRs, scalability, security posture |
| **Yousef** (يوسف) | Senior Backend Engineer | APIs, databases, queues, server-side performance |
| **Haitham** (هيثم) | Senior Frontend Engineer | React/Next.js, RTL, accessibility, frontend performance |
| **Hanzla** | Senior Full-Stack Engineer | Story execution, cross-stack implementation |
| **Omar** | Software Engineer (generalist) | Pair work, bug fixes, routine refactors |
| **Zayd** (زيد) | Senior ML Engineer | ML/AI pipelines, model serving, OCR, retrieval |
| **Khalid** (خالد) | DevOps & Infrastructure | Deployment, K8s, Helm, CI/CD |

### Quality & design

| Persona | Role | When to invoke |
|---|---|---|
| **Fatima** (فاطمة) | QA Lead | Test strategy, edge cases, release gating |
| **Layla** (ليلى) | UX Designer | Interaction design, user flows, design systems |
| **Noor** (نور) | Technical Writer & Presentation Lead | Docs, README, API docs, ADRs, decks |

### Org / operations

| Persona | Role | When to invoke |
|---|---|---|
| **Ahmed Hassani** | Technology & Development Director | Multi-team coordination, executive alignment |
| **Nasser** (ناصر) | Engineering Manager | Team operations, growth plans, performance feedback |
| **Raees** (رئيس) | Project Orchestrator | Dispatching work to specialists, sequencing phases |

### Special primitives

| Persona | Role | When to invoke |
|---|---|---|
| **Majlis** (مجلس) | Multi-agent council | Cross-domain questions, formal team consultation |
| **Dalil** (دليل) | Codebase scout | Repo discovery, structured codebase audits |

### Functional sub-agents (~26)

Used internally by workflows — usually not invoked directly:

`rihal-planner` · `rihal-executor` · `rihal-verifier` · `rihal-plan-checker` · `rihal-debugger` · `rihal-codebase-mapper` · `rihal-project-researcher` · `rihal-roadmapper` · `rihal-phase-researcher` · `rihal-advisor-researcher` · `rihal-assumptions-analyzer` · `rihal-research-synthesizer` · `rihal-integration-checker` · `rihal-nyquist-auditor` · `rihal-code-reviewer` · `rihal-code-fixer` · `rihal-edge-case-hunter` · `rihal-deviation-analyzer` · `rihal-remediation-planner` · `rihal-docs-auditor` · `rihal-doc-verifier` · `rihal-doc-writer` · `rihal-security-auditor` · `rihal-security-adversary` · `rihal-sprint-checker` · `rihal-ui-auditor`

---

## 7. Slash commands (95)

Grouped by purpose. See `docs/REFERENCE.md` and `docs/commands.md` for the full list with arguments.

### Lifecycle (8)

`init` · `do` · `help` · `status` · `stats` · `health` · `forensics` · `update`

### Discovery + research (6)

`new-project` · `map-codebase` · `scan` · `explore` · `document-project` · `analyze-dependencies`

### Discovery + validation (5)

`prfaq` · `brainstorm` · `market-research` · `domain-research` · `technical-research` · `product-brief`

### Planning (12)

`plan` · `discuss-phase` (with `--power` flag) · `chain` · `create-epics-and-stories` · `create-story` · `create-prd` · `edit-prd` · `validate-prd` · `create-architecture` · `add-phase` · `insert-phase` · `remove-phase` · `list-plans` · `analyze-dependencies`

### Discussion (3)

`council` · `discuss` · `replay`

### Execution (12)

`execute` · `quick` · `autonomous` · `audit-fix` · `undo` · `next` · `correct-course` · `debug` · `from-template` · `rerun` · `pause-work` · `resume-work`

### Verification (8)

`verify-phase` · `verify-work` · `validate-phase` · `audit` · `audit-milestone` · `audit-uat` · `secure-phase` · `karpathy-audit` (folded → use `code-review --karpathy`)

### Review (5)

`code-review` (with `--karpathy`, `--attack`, `--edge-cases` flags) · `code-review-fix` · `review` · `review-adversarial` (folded) · `review-edge-case-hunter` (folded) · `checkpoint-preview`

### Memory Bank (4)

`/rcode:memory-init` · `/rcode:memory-update` · `/rcode:memory-distill` · `/rcode:memory-audit`

### Capture (5)

`note` · `add-todo` · `check-todos` · `plant-seed` · `inbox`

### Project mgmt (10)

`new-milestone` · `complete-milestone` · `milestone-summary` · `audit-milestone` · `cleanup` · `new-workspace` · `list-workspaces` · `remove-workspace` · `workstream` · `progress`

### Shipping (5)

`ship` · `pr-branch` · `decisions` · `export-to-github` · `import`

### Reporting (5)

`session-report` · `dashboard` · `notify-test` · `enable-hooks` · `settings` · `config`

### Utilities (12)

`add-tests` · `dev-story` · `discuss-phase-power` (folded) · `execute-sprint` · `from-template` · `map-codebase` · `plant-seed` · `profile-user` · `quick` · `scaffold-project` (skill) · `secure-phase` · `show` · `sprint-planning` · `sprint-status` · `ui-phase` · `ui-review` · `verify-phase` · `verify-work` · `why`

For the canonical reference: [`docs/commands.md`](docs/commands.md) and [`docs/REFERENCE.md`](docs/REFERENCE.md).

---

## 8. Skills (80)

Skills are deep, domain-specific instructions invoked by phrase or by other skills. Auto-generated catalogue: [`docs/skills-catalog.md`](docs/skills-catalog.md).

### Phase 1 — Analysis (6 skills)

`rihal-domain-research` · `rihal-market-research` · `rihal-technical-research` · `rihal-document-project` · `rihal-prfaq` · `rihal-product-brief`

### Phase 2 — Plan (8 skills)

`rihal-create-epics-and-stories` · `rihal-create-milestone` · `rihal-create-prd` · `rihal-create-story` · `rihal-create-ux-design` · `rihal-edit-prd` · `rihal-frontend-design` · `rihal-validate-prd`

### Phase 3 — Solutioning (3 skills)

`rihal-check-implementation-readiness` · `rihal-create-architecture` · `rihal-generate-project-context`

### Phase 4 — Implementation (20 skills)

**Original (9):** `rihal-checkpoint-preview` · `rihal-code-review` · `rihal-correct-course` · `rihal-dev-story` · `rihal-qa-generate-e2e-tests` · `rihal-retrospective` · `rihal-scaffold-project` · `rihal-sprint-planning` · `rihal-sprint-status`

**Engineering rigour (11):** `rihal-incremental` · `rihal-prove-it` · `rihal-source-truth` · `rihal-browser-verify` · `rihal-debug` · `rihal-trim` · `rihal-harden` · `rihal-perf` · `rihal-git-flow` · `rihal-ci` · `rihal-migrate`

### Persona skills (18)

`ahmed-hassani-director` · `dalil-scout` · `fatima-qa` · `haitham-frontend` · `hanzla-engineer` · `hussain-pm` · `hussain-sm` · `layla-designer` · `majlis-council` · `mariam-marketing` · `nasser-eng-manager` · `noor-writer` · `raees-orchestrator` · `sadiq-analyst` · `waleed-architect` · `yousef-backend` · `zahra-branding` · `zayd-ml`

### Core (25 skills)

**Memory Bank (4):** `rihal-memory-init` · `rihal-memory-update` · `rihal-memory-distill` · `rihal-memory-audit`

**Real-pain (8):** `rihal-auth-audit` · `rihal-client-gate` · `rihal-deploy-unify` · `rihal-incident-record` · `rihal-mvp-graduate` · `rihal-ocr-consistency` · `rihal-rebrand` · `rihal-theme-system`

**Content tools (5):** `rihal-advanced-elicitation` · `rihal-brainstorming` · `rihal-distillator` · `rihal-editorial-review-prose` · `rihal-editorial-review-structure`

**Reviews (2, sub-skills of code-review):** `rihal-review-adversarial-general` · `rihal-review-edge-case-hunter`

**Init / help / utilities (6):** `rihal-init` · `rihal-help` · `rihal-index-docs` · `rihal-clone-website` · `rihal-shard-doc` · `rihal-party-mode`

### Skill anatomy

Every SKILL.md follows the 5-component standard:

```yaml
---
name: rihal-<verb>-<noun>
description: ... Use when ... Do NOT use for ...
triggers: [5-12 trigger phrases]
user-invocable: true
---

## Overview     (2-3 sentences)
## Workflow     (numbered steps)
## Output Format
## Examples     (happy + edge + negative)
## Memory Bank Hooks
```

Hard cap: 200 lines per SKILL.md. Detail belongs in a sibling `references.md`.

---

## 9. Workflows

Workflow files at `rihal/workflows/<name>.md` contain the actual orchestration logic — bash blocks, agent dispatches, state updates.

A typical workflow:

1. **Parses arguments** from the slash command
2. **Loads project state** via `node .rihal/bin/rihal-tools.cjs init <op>`
3. **Validates inputs** (phase exists, gates satisfied)
4. **Spawns subagents** via `Task(subagent_type=rihal-<name>, ...)`
5. **Updates state** via `rihal-tools.cjs state` calls
6. **Reports** to the user with the standard output format

Workflows are referenced from command files via `@`-include:

```markdown
# rihal/commands/plan.md
---
name: rihal-plan
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion
---

@.rihal/workflows/plan.md
```

The largest workflow is `.rihal/workflows/autonomous.md` at 1059 lines. Five workflows exceed 500 lines; this is by design — they orchestrate complex multi-phase processes. Trimming them carries unverified runtime risk and was deferred from the v3.0 programme.

---

## 10. Diwan dashboard

A view-only HTTP server at `server/dashboard.js`. Renders project state, phase progress, decisions, agents, files, and Memory Bank. Zero dependencies — pure Node `http` module.

### Run it

```bash
node server/dashboard.js
# defaults to PORT=7717
```

Stop with `kill $(lsof -t -i:7717)`.

### Routes

| Route | Returns |
|---|---|
| `/` | Server-rendered HTML dashboard |
| `/health` | `{"status":"ok","mode":"view-only","rihal_dir":"..."}` |
| `/api/state` | Project state from `.rihal/state.json` + scanner output |
| `/api/files` | List of `.planning/` markdown files grouped by category |
| `/api/file?path=<rel>` | Markdown file content (security: paths must be inside project root and end in `.md`) |
| `/api/hierarchy` | Milestone → phases → sprints → stories tree |
| `/api/memory` | Memory Bank scan output (sections, files, populated state, distillates, change-records) |

### Architecture

```
server/
├── dashboard.js          # HTTP server + routing (~92 lines)
└── lib/
    ├── scanner.js        # State scanning from .rihal/ and .rihal/memory/
    ├── api.js            # API route handlers
    └── html/
        ├── shell.js      # HTML page composition + nav
        ├── css.js        # All CSS styles
        └── client.js     # Client-side JS: routing, rendering
```

Total: ~1880 lines across 6 files. View-only by design — no write endpoints, no database, no framework.

### Views

The HTML client has these views (toggle via nav):

- **Overview** — current phase, milestone, decision count, planning files
- **Roadmap** — phase progression
- **Milestones** — milestone list + archive
- **Phases / Sprints / Tasks** — drill-down hierarchy
- **Files** — `.planning/` markdown browser
- **Agents** — personas roster (rendered server-side from `team.yaml`)
- **Decisions** — decision log timeline
- **Memory Bank** (new) — `.rihal/memory/` browser with section-by-section file status

### Verification

End-to-end test: `node --test test/dashboard-e2e.test.cjs` — 9 assertions covering every route with non-empty content checks.

---

## 11. Configuration

### `.rihal/config.yaml`

Project-level preferences. Created by `/rihal-init`.

```yaml
project_name: my-app
user_name: alice
communication_language: en   # en | ar | ur
mode: guided                 # guided | yolo
model_profile: balanced      # quality | balanced | budget
git:
  branching_strategy: feature-branch  # feature-branch | none
workflow:
  code_review: true
  code_review_depth: standard         # quick | standard | deep
  commit_planning: true               # commit .planning/ artefacts
```

### Model profiles

`rihal/config/model-profiles.json` defines 5 profiles. Each maps an agent to a Claude model tier:

- **`fast`** — haiku for utility agents, sonnet for council
- **`balanced`** (default) — opus for strategic, sonnet for engineering, haiku for utility
- **`quality`** — opus everywhere
- **`inherit-fast`** / **`inherit-quality`** — inherit Claude Code's current setting

### State file (`.rihal/state.json`)

Project state machine. Lists phases, decisions, council sessions, blockers, current pointer, milestone tracking. Updated by `rihal-tools.cjs` on every workflow event.

### Memory Bank initialisation pointer

After `/rcode:memory-init`, `state.json` records:

```json
{
  "memory_bank": {
    "initialised_at": "2026-04-26T...",
    "version": 1
  }
}
```

The Diwan dashboard reads this to show "Memory Bank: live" status.

---

## 12. Common use cases

### Starting a new project

```
/rihal-init
/rihal-new-project build a saas rental platform for Oman
/rihal-plan 1
/rihal-execute 1
/rihal-next
```

### Onboarding to an existing project

```
/rihal-init
/rcode:memory-init       # bootstrap memory bank from current state
/rihal-scan              # codebase audit (Dalil)
/rihal-status            # current phase + decisions
```

### Cross-domain decision

```
/rihal-council should we migrate auth from Firebase to Keycloak?
```

5 agents debate in parallel; output saved to `.planning/council-sessions/`.

### Pre-launch security pass

```
/rihal-harden          # invoke the security checklist skill
/rihal-secure-phase 4  # threat-model verify phase 4
/rcode:memory-update remember: tenant isolation now enforced via RLS
```

### Code review before merge

```
/rihal-code-review HEAD~5..HEAD                  # standard
/rihal-code-review HEAD~5..HEAD --karpathy       # Karpathy 4-principle audit
/rihal-code-review HEAD~5..HEAD --attack         # adversarial / red-team mode
/rihal-code-review HEAD~5..HEAD --edge-cases     # boundary enumeration
```

### MVP-to-production planning

```
/rihal-mvp-graduate    # 8-check gap report + 5-phase plan
```

### Incident post-mortem

```
/rihal-incident-record   # generate change-record + post-mortem from context
```

---

## 13. Customising rcode

### Project-local overrides

Local edits to `rihal/skills/_shared/best-practices/` survive every install. The `cli/postinstall.js` flow preserves `*.local.md` files.

### Adding a custom skill

1. Create `rihal/skills/{actions|core|agents}/<name>/SKILL.md` with the 5-component frontmatter
2. (Optional) Add `references.md` for detail
3. (Optional) Add a slash command at `rihal/commands/<name>.md`
4. (Optional) Add a workflow at `rihal/workflows/<name>.md`
5. Run `node --test test/skills-compliance.test.cjs` to verify
6. Run `node scripts/build-skills-catalog.cjs` to regenerate the catalogue

### Adding a custom agent

1. Define the agent in `rihal/agents/rihal-<name>.md` with `name`, `description`, `tools`, `color`
2. Add an entry in `rihal/team.yaml` with `id`, `file_path`, optional `skill_path`, `domain_keywords`, and `description`
3. (Optional) Add a persona skill at `rihal/skills/agents/<name>/SKILL.md`
4. Run `node --test test/agents-registry.test.cjs` to verify
5. Restart the dashboard to pick up the new agent in the roster

### Adding a custom command

1. Create `rihal/commands/<name>.md` with frontmatter (name, description, argument-hint, allowed-tools)
2. Body contains `@.rihal/workflows/<name>.md` to delegate
3. Create the matching workflow file
4. Re-install: `npx @hanzlaa/rcode install` to copy into `.claude/commands/rihal/`

### Global agent customisation

Define reusable agents at `~/.rihal/agents/rihal-<name>.md`. They appear in every project alongside project-local agents, without forking the repo.

---

## 14. Troubleshooting

### Upgrade flow (v3.2.0+): interactive resolution of local edits

Starting in **v3.2.0**, `npx @hanzlaa/rcode install` on an existing project that has local edits no longer prints a wall of `differs from package version` warnings. Instead:

1. The installer collects all conflicts into a categorised summary (workflows / agents / commands / skills).
2. It prompts you with three options — review each one, take upstream for all, or keep local for all.
3. **Review mode** shows the per-file diff (with stats), then asks per file: take upstream / keep local / view full diff.

Use `--force-overwrite` to skip the prompts entirely (legacy behaviour). Use `--yes` for fully non-interactive runs (default = keep local).

### Upgrade flow on v3.1.0 and earlier: manual workaround

If you're upgrading from v3.1.0 or older and see 30+ `differs from package version` warnings, you have two paths:

**Path A — surgical upstream pull (recommended):** apply just the critical bug-fix files (the v3.1.0 agent tool-name fixes from #445, plus `plan.md` and `execute.md` updates). Keep your local edits everywhere else.

```bash
cd <your-project>

# 1. Diff each critical-fix file before deciding
for f in rihal-sprint-checker rihal-verifier rihal-codebase-mapper \
         rihal-integration-checker rihal-roadmapper \
         rihal-advisor-researcher rihal-assumptions-analyzer \
         rihal-phase-researcher rihal-project-researcher \
         rihal-research-synthesizer; do
  echo "=== $f ==="
  diff ".claude/agents/$f.md" \
       "$(npm root -g)/@hanzlaa/rcode/rihal/agents/$f.md" | head -20
done
```

**Path B — full force-overwrite:** loses any local customisations to those 30+ files, but applies every v3.1.0 fix.

```bash
npx @hanzlaa/rcode install --force-overwrite
```

If you've made meaningful local edits, prefer Path A. If your install is mostly stock, Path B is faster.

### `node --test` fails after install

Likely cause: `cli/install.js` couldn't create one of the target directories. Run `/rihal-health` for a 6-point diagnostic:

```bash
npx @hanzlaa/rcode doctor
```

Or boot the dashboard at `/health` for a JSON status.

### Dashboard refuses to start (EADDRINUSE)

Another instance is on port 7717:

```bash
kill $(lsof -t -i:7717)
node server/dashboard.js
```

Or use a different port: `PORT=9000 node server/dashboard.js`.

### `/api/memory` returns `exists: false` even though I have a `.rihal/memory/` directory

The scanner looks for `.rihal/memory/INDEX.md`. If you copied templates manually without an `INDEX.md`, run `/rcode:memory-init` to generate it.

### Skill doesn't trigger on the expected phrase

Check `rihal/skills/<name>/SKILL.md` frontmatter — the `triggers:` list controls phrase activation. Add or refine your phrase. Compatible IDEs (Claude Code, Cursor, Gemini) honour these triggers; plain ChatGPT does not.

### Old slash command (`/rihal-karpathy-audit`, etc.) doesn't work

These were folded in v3.0. See [`MIGRATIONS.md`](MIGRATIONS.md) for the new flag-based equivalent. Compatibility window: **none** — old slashes return "command not found" rather than silently rerouting (deliberate; surprise reroutes were rejected).

### Agent name conflicts between two installs

Project-local agents (`.claude/agents/rihal-*.md`) override global agents (`~/.rihal/agents/rihal-*.md`). Conflicts are silent — last write wins.

### Test failure: `agents-registry: every file_path resolves to an existing agent file`

Means a `team.yaml` entry has `file_path:` pointing to a file that doesn't exist. Either the file was deleted or the path drifted. Fix the path or remove the entry.

---

## 15. Architecture

### File-system layout

```
rihal-code/                     # the rcode source repo
├── BRAND.md                     # voice + naming
├── MEMORY_BANK.md               # Memory Bank spec
├── MIGRATIONS.md                # upgrade path from older versions
├── DOCS.md                      # this file
├── TASKS.md                     # task tracker
├── AGENTS.md                    # rules for AI agents working on this repo
├── CONTRIBUTING.md              # contributor guide
├── CHANGELOG.md
├── README.md
├── package.json                 # zero runtime deps
├── cli/                         # the CLI entry point (off-limits in PRs)
│   ├── install.js
│   ├── update.js
│   ├── github-sync.js
│   ├── postinstall.js
│   └── ...
├── rihal/                       # the methodology (this is what gets installed)
│   ├── agents/                  # 44 agent definition files
│   ├── commands/                # 95 slash command files
│   ├── workflows/               # 95 workflow files
│   ├── skills/                  # 80 SKILL.md files in 3 buckets
│   │   ├── actions/{1-analysis,2-plan,3-solutioning,4-implementation}/
│   │   ├── agents/              # 18 persona skills
│   │   └── core/                # 25 cross-cutting skills
│   ├── references/              # shared reference files (response style, etc.)
│   ├── templates/               # project + memory bank templates
│   ├── modules/                 # module YAMLs grouping skills
│   ├── config/                  # model-profiles.json
│   ├── brain/                   # institutional knowledge from upstream
│   └── team.yaml                # agent registry
├── server/                      # Diwan dashboard (~1880 lines, no deps)
│   ├── dashboard.js
│   └── lib/
├── scripts/                     # build + catalogue generators
├── test/                        # node:test suite (120 cases)
├── docs/                        # extended docs (REFERENCE, commands, agents, TIERS, ADRs)
└── .github/                     # CI workflows + issue templates
```

### What gets installed in your project

When you run `npx @hanzlaa/rcode install` in a project, the installer:

1. Walks `rihal/skills/` recursively and copies each skill folder to `.claude/skills/rihal-<name>/` (prepending `rihal-` if not already prefixed)
2. Copies `rihal/commands/*.md` to `.claude/commands/rihal/`
3. Copies `rihal/agents/rihal-*.md` to `.claude/agents/`
4. Copies `rihal/workflows/*.md` to `.rihal/workflows/`
5. Copies `rihal/references/*.md` to `.rihal/references/`
6. Copies `rihal/templates/` to `.rihal/templates/`
7. Pulls institutional knowledge into `.rihal/brain/` (per `sources.yaml`)
8. Creates `.rihal/state.json` if absent
9. Creates `.rihal/config.yaml` if absent (with sensible defaults)
10. Creates empty `.rihal/context/active.md` and `project-brief.md` stubs

The installer is **idempotent** — re-running it is safe and updates files in place.

### Data flow

```
User types /rihal-plan
   │
   ▼
.claude/commands/rihal/plan.md   (slash command shell)
   │  @-includes
   ▼
.rihal/workflows/plan.md          (orchestration logic)
   │  invokes
   ▼
Task(subagent_type=rihal-planner, ...)
   │  reads
   ▼
.rihal/state.json + .rihal/memory/  (project context)
   │
   ▼
Spawned subagent produces SPRINT.md
   │  written to
   ▼
.planning/phases/<NN>/<NN>-<NN>-SPRINT.md
   │  state updated via
   ▼
node .rihal/bin/rihal-tools.cjs state set ...
   │
   ▼
Diwan dashboard re-renders on next 30s poll
```

### Zero-dependency invariant

`package.json` `dependencies: {}` is enforced by `.github/workflows/test.yml` (the `no-new-deps` job). All runtime needs are met by Node built-ins. devDependencies are bundled by esbuild for distribution; they don't ship at runtime.

This invariant exists because:
- CI runs on a clean checkout with nothing but Node — no install step needed
- A fork PR from a new contributor gets the same result as a maintainer push
- Supply-chain risk is minimised

### Test architecture

`test/` uses `node --test` with `.cjs` files. Helpers in `test/helpers.cjs`. Every test creates its own temp directory under `os.tmpdir()`; cleanup is automatic via `t.after()`.

| File | Coverage |
|---|---|
| `test/classifier.test.cjs` | Council panel scoring |
| `test/compliance.test.cjs` | Command/workflow/agent consistency |
| `test/panel-scorer.test.cjs` | Domain keyword matching |
| `test/skills-compliance.test.cjs` | SKILL.md frontmatter, line budget, prefix |
| `test/dashboard-boot.test.cjs` | Server boots and serves core endpoints |
| `test/dashboard-e2e.test.cjs` | Every dashboard route returns content |
| `test/memory-templates.test.cjs` | Memory Bank template integrity |
| `test/agents-registry.test.cjs` | team.yaml file/skill_path resolution |

CI matrix: Node 18, 20, 22, 24.

---

## 16. Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full guide. Highlights:

- **Read [`AGENTS.md`](AGENTS.md) first** — non-negotiable rules for AI coding agents (push policy, commit policy, off-limits files)
- **Conventional Commits** — `type(scope): subject`. No AI attribution lines.
- **One logical change per commit** — bundled refactors get rejected
- **Every skill change must pass the 5-component compliance check** — frontmatter, overview, workflow, output format, examples
- **Every agent change must update**: `team.yaml`, dashboard roster, README counts
- **Off-limits files**: `cli/install.js`, `cli/update.js`, `cli/github-sync.js`, `cli/postinstall.js`, `cli/uninstall.js`, `package.json` `bin`/`files` fields, `.rihal-template/` packaging. `server/dashboard.js` is extended additively only.

### Contribution workflow

```bash
# Sync
git pull --rebase origin main

# Branch
git checkout -b feature/<short-slug>

# Work in atomic commits
# Run tests after each commit
node --test

# Push (requires explicit human approval — see AGENTS.md)
git push origin <branch>

# Open PR
gh pr create --base main --title "<conventional commits subject>" --body "Closes #<issue>"
```

### Issue conventions

Per [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/):
- **Epic** — strategic initiative (`type: epic`)
- **Feature** — specific functionality within an epic (`type: feature`)
- **Task** — individual work item (`type: task`)
- **Bug** — defect with reproduction steps

Issue numbering follows the GitHub default; cross-link with `Closes #N` in commits.

### Local development

```bash
# Run the test suite
node --test

# Run the dashboard against the rcode source repo itself (dogfood)
node server/dashboard.js
# Open http://localhost:7717

# Build the bundled CLI for distribution
node scripts/build.cjs

# Generate the skills catalogue
node scripts/build-skills-catalog.cjs
```

### Reporting bugs

Open an issue at [`hanzlahabib/rihal-code`](https://github.com/hanzlahabib/rihal-code/issues) using the bug report template. Include:
- rcode version (`cat package.json | grep version`)
- Node version (`node --version`)
- Expected vs actual
- Reproduction steps

---

## Appendix — Further reading

- [`README.md`](README.md) — quick intro + install
- [`BRAND.md`](BRAND.md) — voice, naming, persona glossary
- [`MEMORY_BANK.md`](MEMORY_BANK.md) — Memory Bank specification
- [`MIGRATIONS.md`](MIGRATIONS.md) — upgrade path from older versions
- [`TASKS.md`](TASKS.md) — master task tracker
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`AGENTS.md`](AGENTS.md) — non-negotiable rules for AI coding agents
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contributor guide
- [`docs/REFERENCE.md`](docs/REFERENCE.md) — full slash command reference
- [`docs/commands.md`](docs/commands.md) — commands grouped by purpose
- [`docs/agents.md`](docs/agents.md) — full agent reference
- [`docs/TIERS.md`](docs/TIERS.md) — beginner / advanced / power-user paths
- [`docs/skills-catalog.md`](docs/skills-catalog.md) — auto-generated skill catalogue (80 entries)
- [`docs/install.md`](docs/install.md) — install flavours (modules, IDE, version pinning, yolo mode)
- [`docs/DAILY-USE.md`](docs/DAILY-USE.md) — day-to-day workflow examples

---

*Built by Rihal. Designed for everyone who's tired of AI agents losing context.*
