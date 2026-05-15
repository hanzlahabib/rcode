# rcode Brand Guide

This document defines the voice, naming, and brand vocabulary for rcode. It is the single source of truth for tone and convention across skills, commands, agents, and docs.

---

## What rcode is

> **rcode is the memory bank for AI-driven SaaS teams — your project's context, structured, visible, and never lost.**

Built by Rihal. Designed for solo devs, startup teams, and SaaS builders who have lived the pain of:
- AI agents losing context mid-project
- Onboarding a teammate who has no idea what was decided three sprints ago
- Late client requirements derailing delivery
- MVPs that work but can't be revamped without rewriting from scratch

## What rcode is not

- It is not a methodology. Use rcode alongside whatever planning approach fits your team.
- It is not Rihal-only. The named primitives (Memory Bank, Majlis, Diwan, Dalil, Distillate) are brand vocabulary, like Linear's "Cycles" or Notion's "Blocks". Anyone can use them.
- It is not a generic agentic toolkit. rcode is opinionated about persistent memory, distinctive personas, and phase clarity.

---

## Voice rules

**Plain English, engineering-first.** Every skill teaches a real engineering technique. No LARP, no cultural pep talk in skill bodies. Brand vocabulary is named tooling, not lectures.

**Opinionated about the modern SaaS stack.** When examples are needed, they're written for Next.js, React, TypeScript, Strapi or Node backends, Postgres, Docker Compose for dev, Helm/K8s for prod, Sentry, Temporal, Keycloak or Firebase. Users on different stacks adapt — they don't need a generic tool.

**Bilingual where it adds clarity, English where it adds precision.** Trigger phrases accept English and Roman-Urdu/Arabic ("convene the majlis," "sab sa consult karo," "talk to Dalil"). Skill bodies are English, technical, terse. This is a feature for global users, not an exclusion signal.

**Terse beats warm.** A clear sentence beats a clear paragraph. A clear paragraph beats a clear page. Cut anything that doesn't change a reader's next action.

---

## Naming conventions

| Surface | Pattern | Example |
|---|---|---|
| Skill name (folder + frontmatter) | `rihal-<verb>-<noun>` | `rihal-auth-audit`, `rihal-deploy-unify` |
| Slash command | `/rihal-<name>` | `/rihal-plan`, `/rihal-council` |
| Persona ID (in `team.yaml`) | Distinctive name with `rihal-` prefix retained for compatibility | `rihal-sadiq`, `rihal-waleed`, `rihal-fatima` |
| Persona display name | Original Arabic + Latin | "Sadiq (صادق)", "Dalil (دليل)" |
| Concept / primitive | TitleCase brand term | Memory Bank, Distillate, Majlis, Diwan |
| Doc files | `kebab-case.md` | `BRAND.md`, `MEMORY_BANK.md`, `MIGRATIONS.md` |

**Why personas keep `rihal-` prefix in IDs:** the dashboard scanner reads `team.yaml` and renders persona pages by ID. Renaming IDs would break the dashboard. Display names and skill folders use the new vocabulary; IDs stay for compatibility.

---

## Brand vocabulary (glossary)

| Term | Meaning |
|---|---|
| **Memory Bank** | The structured, checked-in `.rihal/memory/` directory that stores project context, decisions, incidents, and people. The differentiator. |
| **Distillate** | A token-optimised, lossless compression of one or more documents, suitable for fast LLM context loading. |
| **Majlis** (مجلس) | The multi-perspective consulting council. Convenes specialists, surfaces dissent, synthesises a recommendation. |
| **Diwan** (ديوان) | The view-only dashboard that visualises Memory Bank, phases, decisions, and project state. |
| **Dalil** (دليل) | The codebase scout. Reports honestly on what's in the repo, with explicit scan-scope disclosure. |
| **Phase** | A unit of work in `1-analysis / 2-plan / 3-solutioning / 4-implementation` flow. |
| **Persona** | A named character with a defined engineering role. Personas have voice; rcode skills underneath are universal. |

---

## Persona roster

All personas stay. None are dropped. Each has a clear engineering or org-pattern role.

### Strategic and product

| Persona | Role | When to invoke |
|---|---|---|
| **Sadiq (صادق)** | Director of Strategy | "Should we build this?", kill criteria, opportunity cost |
| **Hussain (حسين)** | Product Manager | PRD creation, scope, prioritisation |
| **Mariam (مريم)** | Marketing & Growth Lead | Positioning, launch posts, GTM messaging |
| **Zahra (زهراء)** | Branding & Creative Director | Brand consistency, visual system, identity |

### Engineering

| Persona | Role | When to invoke |
|---|---|---|
| **Waleed (وليد)** | CTO / Chief Architect | Architecture, stack selection, ADR, scale, security posture |
| **Yousef (يوسف)** | Senior Backend Engineer | APIs, databases, queues, server-side performance |
| **Haitham (هيثم)** | Senior Frontend Engineer | React/Next.js, RTL, accessibility, frontend perf |
| **Hanzla** | Senior Full-Stack Engineer | Story execution, cross-stack implementation |
| **Omar** | Software Engineer (generalist) | Pair work, bug fixes, routine refactors |
| **Zayd (زيد)** | Senior ML Engineer | ML/AI pipelines, model serving, data flow |
| **Khalid (خالد)** | DevOps & Infrastructure Engineer | Deployment, K8s, Helm, CI/CD |

### Quality and design

| Persona | Role | When to invoke |
|---|---|---|
| **Fatima (فاطمة)** | QA Lead | Test strategy, edge cases, release gating |
| **Layla (ليلى)** | UX Designer | Interaction design, user flows, design systems |
| **Noor (نور)** | Technical Writer & Presentation Lead | Docs, READMEs, ADR writing, decks |

### Org / operations

| Persona | Role | When to invoke |
|---|---|---|
| **Ahmed Hassani** | Technology & Development Director | Multi-team coordination, executive alignment |
| **Nasser (ناصر)** | Engineering Manager | Team operations, growth plans, performance feedback |
| **Raees (رئيس)** | Project Orchestrator | Dispatching work to specialists, sequencing phases |

### Special

| Persona | Role | When to invoke |
|---|---|---|
| **Majlis (مجلس)** | Multi-agent council | Cross-domain questions, formal team consultation |
| **Dalil (دليل)** | Codebase Scout | Repo discovery, structured codebase audits |

Plus the 26 functional sub-agents (planner, executor, verifier, debugger, code-fixer, etc.) used by workflows. These are utility, not personas.

---

## Commit conventions

Per `AGENTS.md`:
- Conventional Commits: `type(scope): subject`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `revert`
- Scopes: `agents`, `skills`, `workflows`, `templates`, `dashboard`, `docs`, `config`, `github`, `commands`, `memory`, `brand`, `cli`, `ci`, `release`
- Subject: lowercase first letter, imperative mood, no trailing period, ≤72 chars
- **No AI attribution lines** — no "Generated with Claude Code", no "Co-Authored-By: Claude"
- **No `--no-verify`** to bypass hooks
- Stage specific files (no `git add -A`)
