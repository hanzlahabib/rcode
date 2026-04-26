# Rihal Code — Complete Reference

All slash commands, agents, and skills available after `npx @hanzlaa/rcode install .`

No invented capabilities. Everything here is sourced directly from `rihal/commands/`, `rihal/agents/`, and `rihal/skills/`.

---

## Table of Contents

1. [Slash Commands](#slash-commands)
   - [Project Setup](#project-setup)
   - [Planning](#planning)
   - [Execution](#execution)
   - [Verification & Quality](#verification--quality)
   - [Shipping](#shipping)
   - [Agents & Council](#agents--council)
   - [Codebase Tools](#codebase-tools)
   - [Settings & Config](#settings--config)
   - [Utilities](#utilities)
2. [Agents](#agents)
   - [Council Agents (People)](#council-agents-people)
   - [Orchestration Agents](#orchestration-agents)
   - [Specialist Agents](#specialist-agents)
3. [Skills](#skills)
   - [Analysis Skills](#analysis-skills)
   - [Planning Skills](#planning-skills)
   - [Solutioning Skills](#solutioning-skills)
   - [Implementation Skills](#implementation-skills)

---

## Slash Commands

### Project Setup

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:init` | `[--reset] [--skip-scan]` | **Start here.** Configure Rihal for this project — first command after install. Detects state, asks config questions, writes `.rihal/RIHLA.md`. Run once per project. |
| `/rihal:new-project` | `[--auto @document.md]` | Take an idea to a planned roadmap. Questioning → optional research → REQUIREMENTS → ROADMAP. |
| `/rihal:new-milestone` | `[milestone-name] [--dry-run]` | Start a fresh milestone cycle — initializes ROADMAP, STATE, REQUIREMENTS for the next planning phase. |
| `/rihal:from-template` | `<template-name> [--project-name "<name>"] [--force]` | Seed `.planning/` from a starter template (`saas-b2b` / `api-backend` / `mobile-app`). |
| `/rihal:health` | — | Run 6-point health check on rihal installation — manifest hashes, directories, config, executable. |
| `/rihal:update` | `[--no-confirm]` | Check for rihal-code package updates and apply them with changelog preview. |

---

### Planning

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:plan` | `<phase\|description> [--phase <name>] [--output <dir>]` | Convert task description or phase into executable SPRINT.md files. Spawns rihal-planner → rihal-sprint-checker. The core planning command. |
| `/rihal:discuss-phase` | `<phase-number> [--auto] [--chain] [--power]` | Gather context through adaptive questioning before sprint planning. Creates CONTEXT.md with locked decisions, discretion areas, deferred ideas. Run before `/rihal:plan`. Pass `--power` for bulk question generation on context-heavy phases. |
| `/rihal:research-phase` | `<phase-number>` | Research how to implement a phase before planning. Standalone — `/rihal:plan` runs this automatically. Use only when you want research without creating a plan. |
| `/rihal:sprint-planning` | `[--phase <NN>] [--velocity <points>] [--goal 'Sprint goal']` | Plan the next sprint — compute capacity, prioritize stories, create SPRINT.md, register in state. |
| `/rihal:add-phase` | `<phase-name>` | Add a new integer phase to the end of the current milestone. Auto-calculates next phase number, creates directory, updates ROADMAP.md. |
| `/rihal:insert-phase` | `<N.M> <name>` | Insert a decimal phase between integer phases without renumbering. For urgent work discovered mid-milestone. |
| `/rihal:remove-phase` | `<phase-number>` | Remove an unstarted future phase, renumber subsequent phases, and commit. Cannot remove a phase in progress. |
| `/rihal:list-plans` | `[--phase <id>] [--status <state>] [--detail]` | Table of all SPRINT.md plans across phases — goal, story counts, points, and state in one view. |
| `/rihal:analyze-dependencies` | — | Analyze phase dependencies, suggest "Depends on" entries for ROADMAP.md. |

---

### Execution

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:execute` | `<plan-file.md \| phase-dir> [--wave N] [--interactive] [--continue] [--option=A]` | Execute one or more SPRINT.md files. Spawns rihal-executor subagents in parallel per dependency wave. Pauses at checkpoints. |
| `/rihal:execute-sprint` | `<sprint-file.md \| phase-dir>` | Internal wrapper over `/rihal:execute` for sprint-specific dispatch. Not usually invoked directly. |
| `/rihal:next` | `[--force]` | Automatically advance to the next logical step — zero friction, auto-invoke. |
| `/rihal:autonomous` | `[--from N] [--to M] [--only N] [--interactive]` | Execute remaining phases autonomously. Runs plan → execute → verify cycles, pausing at checkpoints and failures. |
| `/rihal:rerun` | `<phase-id\|plan-id>` | Re-execute a phase or plan, resetting its state and creating fresh commits. |
| `/rihal:quick` | `[description] [--full] [--discuss] [--research]` | Execute small ad-hoc tasks with planning, execution, and optional verification. |
| `/rihal:do` | `[optional task description]` | **[ROUTER]** Interactive picker — describe what you want and rihal picks the right command. |
| `/rihal:correct-course` | `[--prd <path>] [--architecture <path>]` | Load original PRD/architecture, compare to current codebase. Classify deviation and produce ordered remediation plan. |
| `/rihal:undo` | `--last N \| --phase NN [--to-snapshot] \| --plan NN-MM` | Safe git revert — roll back phase or plan commits with dependency checks. |
| `/rihal:forensics` | — | Diagnose incomplete executions and stuck states — show timeline of what broke and how to resume. |
| `/rihal:debug` | `<issue-description>` | Systematically investigate and diagnose issues using scientific method. |

---

### Verification & Quality

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:verify-phase` | `<phase-number>` | Goal-backward audit — does the codebase actually deliver what the phase promised? Produces VERIFICATION.md. Required before `/rihal:ship`. |
| `/rihal:verify-work` | `[--phase <NN>]` | Conversational acceptance testing — verify sprint stories against acceptance criteria. |
| `/rihal:validate-phase` | `<phase-number>` | Audit Nyquist validation gaps for a completed phase. Generate missing tests. Update VALIDATION.md. |
| `/rihal:audit` | `[phase \| milestone \| uat \| code \| fix \| work] [...args]` | Single audit entry point — asks what to audit and dispatches to the right sub-route. |
| `/rihal:audit-milestone` | `[--strict] [--report]` | Cross-phase audit — verify milestone completion against original goals. |
| `/rihal:audit-uat` | — | Cross-phase audit of all UAT and verification files. Finds every outstanding item (pending, skipped, blocked, human_needed). |
| `/rihal:audit-fix` | `[--max N] [--severity high\|medium\|all] [--dry-run] [--source <audit>]` | Autonomous audit-to-fix pipeline — find issues, classify, fix, test, commit. |
| `/rihal:code-review` | `<phase> [--depth=quick\|standard\|deep] [--files=file1,file2,...]` | Review source files for bugs, security issues, and code quality problems. |
| `/rihal:code-review-fix` | `<phase> [--all] [--auto]` | Auto-apply fixes found by code review. |
| `/rihal:review` | — | Cross-AI peer review — invoke external AI CLIs to independently review phase plans. |
| `/rihal:code-review --attack` | `<phase\|git-ref> [--files=path1,path2]` | Attack-mode review — vulnerabilities, race conditions, data loss, abuse cases. |
| `/rihal:code-review --edge-cases` | `[--phase <name>] [--component <name>]` | Enumerate edge cases by category (input, state, concurrency, network) with severity. |
| `/rihal:code-review --karpathy` | `<phase\|git-ref> [--files=path1,path2]` | Audit recent code changes against Karpathy's 4 LLM coding principles. |
| `/rihal:secure-phase` | `<phase>` | Retroactively verify threat mitigations for a completed phase. |
| `/rihal:ui-review` | `[--phase <name>] [--detailed]` | Retroactive 6-pillar visual audit — color consistency, typography, components, accessibility, responsive, coherence. |
| `/rihal:checkpoint-preview` | `[<branch-or-diff>]` | Human-in-the-loop change review — makes sense of a diff, focuses attention where it matters, walks through testing. |
| `/rihal:add-tests` | — | Generate unit and E2E tests for a completed phase based on SUMMARY.md, CONTEXT.md, and implementation. |

---

### Shipping

| Command | Arguments | What it does | When NOT to use |
|---------|-----------|--------------|-----------------|
| `/rihal:ship` | `[<phase>] [--draft]` | Push feature branch + open PR with auto-generated body from ROADMAP, VERIFICATION, SUMMARY. Requires VERIFICATION.md passed. | npm publish, git tags, repos on `main` directly, rihal-code repo itself |
| `/rihal:pr-branch` | `[<base-branch>]` | Create a clean PR branch stripping all Rihal planning artifacts (.planning/, SPRINT.md, SUMMARY.md). Reviewers see only code. | — |
| `/rihal:export-to-github` | `[target] [--execute] [--repo owner/name] [--with-labels] [--decisions [--since ISO]]` | Push phases/stories/decisions to GitHub — thin wrapper over github-sync, plus decisions export. | — |
| `/rihal:complete-milestone` | `[--archive-path=PATH]` | Archive and reset — move completed milestone to archive and prepare for next cycle. | — |
| `/rihal:cleanup` | `[--dry-run]` | Archive completed milestone phase directories to `.planning/milestones/`. Run after `/rihal:complete-milestone`. | — |
| `/rihal:milestone-summary` | `[--format=markdown\|pdf] [--include-decisions]` | Generate human-readable summary of all milestone phases, decisions, and outcomes. | — |

---

### Agents & Council

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:council` | `<question> [--full] [--agents=a,b,c] [--explain]` | Convene the Rihal majlis — spawns 3–5 specialist agents in parallel to answer a strategic question. Agents are picked by keyword scoring. |
| `/rihal:discuss` | `[agent-name] <question>` | Quick sync with one Rihal agent. Lighter than `/rihal:council` — one agent, no cross-talk, optional save. |
| `/rihal:replay` | `<session-path-or-slug> [--agents a,b,c]` | Re-run a past council session with the same question — fresh panel round, linked to original. |
| `/rihal:why` | `<topic-or-question>` | Explain the reasoning behind a decision, classification, or panel selection. |
| `/rihal:decisions` | `[--limit N] [--project <name>] [--since <ISO>] [--this-project]` | Browse decisions across every Rihal project on this machine — sourced from `.rihal/decisions.jsonl`. |
| `/rihal:brainstorm` | `<challenge> [--method=METHOD] [--people=N] [--personas=LIST]` | Guided brainstorming session — select a method, apply it to your challenge, generate ideas systematically. |
| `/rihal:explore` | `[topic]` | Socratic ideation workflow — think through ideas before committing. |
| `/rihal:prfaq` | `[<idea>] [--headless] [--customer=<persona>] [--problem=<problem>] [--stakes=<why>] [--solution=<concept>]` | Working Backwards PRFAQ challenge — write the press release before building. Stress-tests a product concept. |
| `/rihal:chain` | `<preset\|agent-list> <topic>` | Run a sequential agent pipeline (research → scope → build). Each stage reads the previous stage's artifact. |

---

### Codebase Tools

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:map-codebase` | — | Analyze existing codebase and produce structured documents in `.planning/codebase/`. |
| `/rihal:scan` | `[--focus <area>]` | Rapid codebase assessment — lightweight alternative to map-codebase. |
| `/rihal:diff` | `[--last] [<sha1> <sha2>]` | Show changes to plans and state between commits. |
| `/rihal:show` | `<id>` | Print a plan or phase in full with execution status. |
| `/rihal:profile-user` | `[--json <json-blob>]` | Classify developer on 4 dimensions — communication style, autonomy, domain depth, iteration speed. Produces `.rihal/USER-PROFILE.md`. |

---

### Settings & Config

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:settings` | `[show \| get <key> \| set <key> <value>]` | View or edit Rihal project settings — mode, model_profile, workflow gates, git strategy. Interactive prompts when run with no args. |
| `/rihal:config` | `[show \| get <key> \| set <key> <value>]` | Alias for `/rihal:settings`. |
| `/rihal:enable-hooks` | — | Install optional Rihal hooks into `.claude/settings.json` for edit, workflow, and commit guardrails. |

---

### Utilities

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rihal:help` | `[basic\|intermediate\|advanced\|all]` | Show all commands organized by purpose and tier. |
| `/rihal:status` | — | Print current project state — phase, plan progress, recent decisions, blockers, last council session. |
| `/rihal:progress` | — | Check project progress and suggest next steps. |
| `/rihal:stats` | — | Show project statistics from state.json — phases, plans, decisions, council sessions, timeline. |
| `/rihal:sprint-status` | `[--sprint <NN.S>]` | Show current sprint progress — stories, points, velocity, burndown. |
| `/rihal:dashboard` | `[--port 7717] [--no-open]` | Start the Diwan view-only dashboard (port 7717) to browse project state in the browser. |
| `/rihal:resume-work` | — | Restore project context and resume work from last saved state. |
| `/rihal:pause-work` | — | Capture project state and blocking constraints before pausing. Creates HANDOFF.json and `.continue-here.md`. |
| `/rihal:note` | `<text> [--global] \| list \| count` | Capture inline notes instantly. Appends to a dated note file with YAML frontmatter. |
| `/rihal:add-todo` | `<todo-title>` | Capture an idea or task for later work. |
| `/rihal:check-todos` | — | List all pending todos, allow selection, load context, and route to appropriate action. |
| `/rihal:plant-seed` | `<idea>` | Capture a forward-looking idea with trigger conditions — surfaces automatically at the right milestone. |
| `/rihal:inbox` | `[--issues] [--prs] [--label] [--close-incomplete]` | Triage incoming issues and PRs against contribution templates. |
| `/rihal:session-report` | — | Generate a session report with work summary, token usage estimation, commits, decisions, and open blockers. |
| `/rihal:notify-test` | `[--only slack\|discord\|teams] [--title "<t>"] [--body "<b>"]` | Verify configured webhooks (Slack / Discord / MS Teams) by posting a test message. |
| `/rihal:import` | `--from <path>` | Ingest external plans with conflict detection against project decisions. |
| `/rihal:new-workspace` | `<workspace-name> [--from-current]` | Create an isolated workspace for parallel work — separate ROADMAP/STATE with independent tracking. |
| `/rihal:list-workspaces` | `[--detail]` | List all active workspaces with status, start date, and current phase. |
| `/rihal:remove-workspace` | `<workspace-name> [--archive] [--force]` | Remove a workspace and clean up its artifacts. No recovery. |
| `/rihal:workstream` | `<subcommand> [--name <name>]` | Manage parallel workstreams. Create, switch, list, or complete workstreams in state.json. |
| `/rihal:ui-phase` | `[--existing-ui <path>] [--design-system <path>]` | Produce UI-SPEC.md with color tokens, typography, component inventory, interaction states, and accessibility guidelines. |
| `/rihal:dev-story` | `<STORY.md>` | Wrap a STORY.md for AI-coder execution. Produces explicit file paths, context, and checklist. |
| `/rihal:create-epics-and-stories` | `<prd-path> [--prefix <name>]` | Parse a PRD to generate numbered epic files in `.planning/epics/`. Each epic contains user stories with acceptance criteria. |
| `/rihal:create-story` | `<EPIC-file.md> [--story <id>]` | Transform a story from an epic file into a self-contained STORY.md with full AC and dev notes. |
| `/rihal:docs-update` | `[--force] [--fix]` | Generate and update project documentation verified against codebase. |
| `/rihal:document-project` | `[--csv <path>] [--auto-file-tasks]` | Load documentation-requirements.csv, audit missing/stale docs, file missing docs as SPRINT.md tasks. |

---

## Agents

Agents are subagents spawned by workflows and commands. You cannot invoke them directly — they are selected automatically.

### Council Agents (People)

These agents represent Rihal team roles. Spawned by `/rihal:council` based on keyword scoring against your question.

| Agent | Role | Spawned when you ask about |
|-------|------|---------------------------|
| `rihal-waleed` | CTO | Architecture, stack selection, technical feasibility, security, scale |
| `rihal-sadiq` | Director of Strategy | Should we build this, why now, what NOT to do, kill criteria |
| `rihal-hussain-pm` | Product Manager | Scope, roadmap, feature definition, user stories, PRD, sprint planning, backlog |
| `rihal-mariam` | Marketing & Growth Lead | Market research, go-to-market, positioning, launch plans, GCC/Oman market |
| `rihal-fatima` | QA Lead | Test strategy, coverage, release readiness, regression, flaky tests, production readiness |
| `rihal-hanzla` | Senior Full-Stack Engineer | Story execution, code implementation, bug fixes, refactoring, hands-on development |
| `rihal-haitham` | Senior Frontend Engineer | React/Next.js, component design, RTL/Arabic layouts, accessibility, frontend performance |
| `rihal-yousef` | Senior Backend Engineer | Backend implementation, API design, database, performance, queues, webhooks |
| `rihal-layla` | UX Designer | UX design, interaction flows, design systems, accessibility, usability reviews |
| `rihal-zahra` | Branding & Creative Director | Brand identity, visual language, typography (Latin + Arabic), color systems, design tokens |
| `rihal-zayd` | Senior ML Engineer | Machine learning, OCR, LLM integration, RAG, vector search, embeddings, prompt engineering |
| `rihal-khalid` | DevOps & Infrastructure | Deployment pipelines, CI/CD, containers, cloud infrastructure, monitoring, release engineering |
| `rihal-nasser` | Engineering Manager | People ops, 1:1 prep, hiring plans, growth conversations, team health, squad composition |
| `rihal-ahmed` | Technology & Development Director | Delivery timelines, engineering standards, DORA metrics, cross-team coordination, tech debt |
| `rihal-noor` | Technical Writer | Documentation, README, API docs, architecture diagrams, changelogs, pitch decks |
| `rihal-omar` | Software Engineer | Generalist implementation tasks spanning frontend and backend |

### Orchestration Agents

Internal agents used by workflows. Not selected by the council keyword system.

| Agent | What it does | Spawned by |
|-------|-------------|------------|
| `rihal-planner` | Creates executable SPRINT.md files with task breakdown, dependency analysis, and goal-backward verification | `/rihal:plan` |
| `rihal-phase-researcher` | Researches technical approaches for a phase. Produces RESEARCH.md | `/rihal:plan`, `/rihal:research-phase` |
| `rihal-sprint-checker` | Verifies plans will achieve phase goal before execution. Goal-backward analysis | `/rihal:plan` |
| `rihal-executor` | Executes Rihal sprints with atomic commits, deviation handling, checkpoints | `/rihal:execute` |
| `rihal-verifier` | Verifies phase goal achievement through goal-backward analysis. Creates VERIFICATION.md | `/rihal:verify-phase` |
| `rihal-project-researcher` | Researches domain ecosystem before roadmap creation | `/rihal:new-project`, `/rihal:new-milestone` |
| `rihal-roadmapper` | Creates project roadmaps with phase breakdown, requirement mapping, success criteria | `/rihal:new-project` |
| `rihal-research-synthesizer` | Synthesizes outputs from parallel researcher agents into SUMMARY.md | `/rihal:new-project` |

### Specialist Agents

Spawned by specific workflows for targeted analysis.

| Agent | What it does | Spawned by |
|-------|-------------|------------|
| `rihal-codebase-mapper` | Explores codebase, writes structured analysis documents. Focus areas: tech, arch, quality, concerns | `/rihal:map-codebase` |
| `rihal-debugger` | Investigates bugs using scientific method, manages debug sessions, handles checkpoints | `/rihal:debug` |
| `rihal-code-reviewer` | Code quality assessment, bug detection, security issues, standards validation | `/rihal:code-review` |
| `rihal-code-fixer` | Applies code review findings, implements style fixes, refactors for maintainability | `/rihal:code-review-fix`, `/rihal:audit-fix` |
| `rihal-integration-checker` | Verifies cross-phase integration and E2E flows | `/rihal:audit-milestone` |
| `rihal-nyquist-auditor` | Fills validation gaps, generates missing tests, verifies coverage | `/rihal:validate-phase` |
| `rihal-security-auditor` | Comprehensive security audit, compliance verification, posture assessment | `/rihal:secure-phase` |
| `rihal-security-adversary` | Attack-mode security review, threat modeling, attack surface analysis | `/rihal:code-review --attack` |
| `rihal-ui-auditor` | UI audit for usability, consistency, accessibility, design quality | `/rihal:ui-review` |
| `rihal-ux-designer` | UI/UX design, design system work, accessibility, usability | `/rihal:ui-phase` |
| `rihal-noor` | Generates and updates README, API docs, changelogs, migration guides | `/rihal:docs-update` |
| `rihal-profiler` | Analyzes user behavior patterns, creates personas, identifies usage flows | `/rihal:profile-user` |
| `rihal-deviation-analyzer` | Analyzes plan deviations, scope creep, timeline slips | `/rihal:correct-course` |
| `rihal-remediation-planner` | Plans remediation for issues, blockers, failures | internal |
| `rihal-docs-auditor` | Audits documentation completeness, accuracy, gaps between code and docs | `/rihal:docs-update` |
| `rihal-edge-case-hunter` | Enumerates edge cases by category with severity | `/rihal:code-review --edge-cases` |
| `rihal-assumptions-analyzer` | Analyzes codebase for a phase, returns structured assumptions with evidence | `/rihal:discuss-phase` (assumptions mode) |
| `rihal-advisor-researcher` | Researches a gray area decision, returns structured comparison table | `/rihal:discuss-phase` (advisor mode) |

---

## Skills

Skills are domain expertise modules. They are loaded automatically when their trigger phrases are detected in your messages. You can also invoke them directly with `/rihal:<skill-name>`.

### Analysis Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rihal-domain-research` | Domain research requests | Domain landscape, competitive analysis, market signals |
| `rihal-market-research` | Market research requests | Market size, segments, customer personas, pricing benchmarks |
| `rihal-technical-research` | Technical investigation | Technology comparison, architecture options, integration patterns |
| `rihal-document-project` | Document project, audit docs | Documentation gap audit, tasks filed as SPRINT.md items |
| `rihal-prfaq` | PRFAQ, working backwards, press release | PRFAQ document + PRD distillate. Stress-tests a concept before building. |
| `rihal-product-brief` | Product brief, product summary | Structured product brief with problem, solution, audience, metrics |

### Planning Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rihal-create-prd` | Create PRD, write requirements | Full PRD with problem statement, user stories, acceptance criteria, non-goals |
| `rihal-edit-prd` | Edit PRD, update requirements | Updated PRD with tracked changes |
| `rihal-validate-prd` | Validate PRD, review PRD quality | PRD quality report — density, measurability, traceability, domain compliance |
| `rihal-create-epics-and-stories` | Create epics, generate stories | Numbered epic files in `.planning/epics/` with user stories and AC |
| `rihal-create-story` | Create story, dev story | Self-contained STORY.md from epic — full AC, dev notes, implementation guidance |
| `rihal-create-milestone` | Create milestone, plan milestone | Milestone definition with phases, goals, and success criteria |
| `rihal-create-ux-design` | Create UX design, design flows | UX design document with user flows, wireframe descriptions, interaction states |
| `rihal-frontend-design` | Frontend design, UI spec | UI-SPEC.md with color tokens, typography, component inventory, accessibility |

### Solutioning Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rihal-check-implementation-readiness` | Check readiness, implementation ready | Readiness report — PRD approved, architecture approved, deps identified, no blocking assumptions |
| `rihal-create-architecture` | Create architecture, design system | Architecture decision record (ADR) or architecture document |
| `rihal-generate-project-context` | Generate context, project context | `.planning/` context document for AI coding tools |

### Implementation Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rihal-dev-story` | Dev this story, implement story | Story execution wrapper — file paths, context, task checklist |
| `rihal-sprint-planning` | Plan sprint, sprint planning | SPRINT.md with capacity, prioritized stories, velocity estimate |
| `rihal-sprint-status` | Sprint status, sprint progress | Sprint progress report — stories, points, velocity, burndown |
| `rihal-code-review` | Review code, code review | Code review report — bugs, security issues, style violations, severity classifications |
| `rihal-checkpoint-preview` | Checkpoint, walk me through this, human review | Diff summary, key change highlights, testing walkthrough |
| `rihal-correct-course` | Correct course, scope drift, fix deviation | Deviation classification + ordered remediation plan |
| `rihal-scaffold-project` | Scaffold project, bootstrap project | Project scaffold with directory structure, config files, initial code |
| `rihal-qa-generate-e2e-tests` | Generate E2E tests, QA tests | E2E test suite based on SUMMARY.md and acceptance criteria |
| `rihal-retrospective` | Retrospective, retro | Sprint retrospective — what worked, what didn't, action items |

---

## Known Limitations

These are real gaps in the current version (`v2.3.1`):

1. **`/rihal:plan` requires `.planning/` directory** — the workflow cannot be used inside the rihal-code repo itself. There is no self-referential project management.

2. **`/rihal:ship` does not apply to `git.branching_strategy: none`** — if you commit directly to main, the preflight will always fail the "on feature branch" gate.

3. **`/rihal:execute-sprint`** is an internal wrapper. Use `/rihal:execute` instead.

4. **Skills do not auto-trigger in all AI IDEs** — trigger phrases work in Claude Code and compatible tools that support the `.rihal/commands/` format. Plain ChatGPT or Copilot won't pick them up automatically.

5. **The dashboard (`/rihal:dashboard`)** is view-only. It reads `.planning/` data. It has no write endpoints.
