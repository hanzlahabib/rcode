# rcode — Complete Reference

All slash commands, agents, and skills available after `pnpm dlx @hanzlaa/rcode install .`

No invented capabilities. Everything here is sourced directly from `rcode/commands/`, `rcode/agents/`, and `rcode/skills/`.

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
| `/rcode-init` | `[--reset] [--skip-scan]` | **Start here.** Configure rcode for this project — first command after install. Detects state, asks config questions, writes `.rcode/JOURNEY.md`. Run once per project. |
| `/rcode-new-project` | `[--auto @document.md]` | Take an idea to a planned roadmap. Questioning → optional research → REQUIREMENTS → ROADMAP. |
| `/rcode-new-milestone` | `[milestone-name] [--dry-run]` | Start a fresh milestone cycle — initializes ROADMAP, STATE, REQUIREMENTS for the next planning phase. |
| `/rcode-from-template` | `<template-name> [--project-name "<name>"] [--force]` | Seed `.planning/` from a starter template (`saas-b2b` / `api-backend` / `mobile-app`). |
| `/rcode-health` | — | Run 6-point health check on rcode installation — manifest hashes, directories, config, executable. |
| `/rcode-update` | `[--no-confirm]` | Check for rcode package updates and apply them with changelog preview. |

---

### Planning

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-plan` | `<phase\|description> [--phase <name>] [--output <dir>]` | Convert task description or phase into executable SPRINT.md files. Spawns rcode-planner → rcode-sprint-checker. The core planning command. |
| `/rcode-discuss-phase` | `<phase-number> [--auto] [--chain] [--power]` | Gather context through adaptive questioning before sprint planning. Creates CONTEXT.md with locked decisions, discretion areas, deferred ideas. Run before `/rcode-plan`. Pass `--power` for bulk question generation on context-heavy phases. |
| `/rcode-research-phase` | `<phase-number>` | Research how to implement a phase before planning. Standalone — `/rcode-plan` runs this automatically. Use only when you want research without creating a plan. |
| `/rcode-sprint-planning` | `[--phase <NN>] [--velocity <points>] [--goal 'Sprint goal']` | Plan the next sprint — compute capacity, prioritize stories, create SPRINT.md, register in state. |
| `/rcode-add-phase` | `<phase-name>` | Add a new integer phase to the end of the current milestone. Auto-calculates next phase number, creates directory, updates ROADMAP.md. |
| `/rcode-insert-phase` | `<N.M> <name>` | Insert a decimal phase between integer phases without renumbering. For urgent work discovered mid-milestone. |
| `/rcode-remove-phase` | `<phase-number>` | Remove an unstarted future phase, renumber subsequent phases, and commit. Cannot remove a phase in progress. |
| `/rcode-list-plans` | `[--phase <id>] [--status <state>] [--detail]` | Table of all SPRINT.md plans across phases — goal, story counts, points, and state in one view. |
| `/rcode-analyze-dependencies` | — | Analyze phase dependencies, suggest "Depends on" entries for ROADMAP.md. |

---

### Execution

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-execute` | `<plan-file.md \| phase-dir> [--wave N] [--interactive] [--continue] [--option=A]` | Execute one or more SPRINT.md files. Spawns rcode-executor subagents in parallel per dependency wave. Pauses at checkpoints. |
| `/rcode-execute-sprint` | `<sprint-file.md \| phase-dir>` | Internal wrapper over `/rcode-execute` for sprint-specific dispatch. Not usually invoked directly. |
| `/rcode-next` | `[--force]` | Automatically advance to the next logical step — zero friction, auto-invoke. |
| `/rcode-autonomous` | `[--from N] [--to M] [--only N] [--interactive]` | Execute remaining phases autonomously. Runs plan → execute → verify cycles, pausing at checkpoints and failures. |
| `/rcode-rerun` | `<phase-id\|plan-id>` | Re-execute a phase or plan, resetting its state and creating fresh commits. |
| `/rcode-quick` | `[description] [--full] [--discuss] [--research]` | Execute small ad-hoc tasks with planning, execution, and optional verification. |
| `/rcode-do` | `[optional task description]` | **[ROUTER]** Interactive picker — describe what you want and rcode picks the right command. |
| `/rcode-correct-course` | `[--prd <path>] [--architecture <path>]` | Load original PRD/architecture, compare to current codebase. Classify deviation and produce ordered remediation plan. |
| `/rcode-undo` | `--last N \| --phase NN [--to-snapshot] \| --plan NN-MM` | Safe git revert — roll back phase or plan commits with dependency checks. |
| `/rcode-forensics` | — | Diagnose incomplete executions and stuck states — show timeline of what broke and how to resume. |
| `/rcode-debug` | `<issue-description>` | Systematically investigate and diagnose issues using scientific method. |

---

### Verification & Quality

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-verify-phase` | `<phase-number>` | Goal-backward audit — does the codebase actually deliver what the phase promised? Produces VERIFICATION.md. Required before `/rcode-ship`. |
| `/rcode-verify-work` | `[--phase <NN>]` | Conversational acceptance testing — verify sprint stories against acceptance criteria. |
| `/rcode-validate-phase` | `<phase-number>` | Audit Nyquist validation gaps for a completed phase. Generate missing tests. Update VALIDATION.md. |
| `/rcode-audit` | `[phase \| milestone \| uat \| code \| fix \| work] [...args]` | Single audit entry point — asks what to audit and dispatches to the right sub-route. |
| `/rcode-audit-milestone` | `[--strict] [--report]` | Cross-phase audit — verify milestone completion against original goals. |
| `/rcode-audit-uat` | — | Cross-phase audit of all UAT and verification files. Finds every outstanding item (pending, skipped, blocked, human_needed). |
| `/rcode-audit-fix` | `[--max N] [--severity high\|medium\|all] [--dry-run] [--source <audit>]` | Autonomous audit-to-fix pipeline — find issues, classify, fix, test, commit. |
| `/rcode-review` | `<phase> [--depth=quick\|standard\|deep] [--files=file1,file2,...]` | Review source files for bugs, security issues, and code quality problems. |
| `/rcode-review-fix` | `<phase> [--all] [--auto]` | Auto-apply fixes found by code review. |
| `/rcode-review` | — | Cross-AI peer review — invoke external AI CLIs to independently review phase plans. |
| `/rcode-review --attack` | `<phase\|git-ref> [--files=path1,path2]` | Attack-mode review — vulnerabilities, race conditions, data loss, abuse cases. |
| `/rcode-review --edge-cases` | `[--phase <name>] [--component <name>]` | Enumerate edge cases by category (input, state, concurrency, network) with severity. |
| `/rcode-review --karpathy` | `<phase\|git-ref> [--files=path1,path2]` | Audit recent code changes against Karpathy's 4 LLM coding principles. |
| `/rcode-secure-phase` | `<phase>` | Retroactively verify threat mitigations for a completed phase. |
| `/rcode-ui-review` | `[--phase <name>] [--detailed]` | Retroactive 6-pillar visual audit — color consistency, typography, components, accessibility, responsive, coherence. |
| `/rcode-checkpoint-preview` | `[<branch-or-diff>]` | Human-in-the-loop change review — makes sense of a diff, focuses attention where it matters, walks through testing. |
| `/rcode-add-tests` | — | Generate unit and E2E tests for a completed phase based on SUMMARY.md, CONTEXT.md, and implementation. |

---

### Shipping

| Command | Arguments | What it does | When NOT to use |
|---------|-----------|--------------|-----------------|
| `/rcode-ship` | `[<phase>] [--draft]` | Push feature branch + open PR with auto-generated body from ROADMAP, VERIFICATION, SUMMARY. Requires VERIFICATION.md passed. | npm publish, git tags, repos on `main` directly, rcode repo itself |
| `/rcode-pr-branch` | `[<base-branch>]` | Create a clean PR branch stripping all rcode planning artifacts (.planning/, SPRINT.md, SUMMARY.md). Reviewers see only code. | — |
| `/rcode-export-to-github` | `[target] [--execute] [--repo owner/name] [--with-labels] [--decisions [--since ISO]]` | Push phases/stories/decisions to GitHub — thin wrapper over github-sync, plus decisions export. | — |
| `/rcode-complete-milestone` | `[--archive-path=PATH]` | Archive and reset — move completed milestone to archive and prepare for next cycle. | — |
| `/rcode-cleanup` | `[--dry-run]` | Archive completed milestone phase directories to `.planning/milestones/`. Run after `/rcode-complete-milestone`. | — |
| `/rcode-milestone-summary` | `[--format=markdown\|pdf] [--include-decisions]` | Generate human-readable summary of all milestone phases, decisions, and outcomes. | — |

---

### Agents & Council

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-council` | `<question> [--full] [--agents=a,b,c] [--explain]` | Convene the rcode majlis — spawns 3–5 specialist agents in parallel to answer a strategic question. Agents are picked by keyword scoring. |
| `/rcode-discuss` | `[agent-name] <question>` | Quick sync with one rcode agent. Lighter than `/rcode-council` — one agent, no cross-talk, optional save. |
| `/rcode-replay` | `<session-path-or-slug> [--agents a,b,c]` | Re-run a past council session with the same question — fresh panel round, linked to original. |
| `/rcode-why` | `<topic-or-question>` | Explain the reasoning behind a decision, classification, or panel selection. |
| `/rcode-decisions` | `[--limit N] [--project <name>] [--since <ISO>] [--this-project]` | Browse decisions across every rcode project on this machine — sourced from `.rcode/decisions.jsonl`. |
| `/rcode-brainstorm` | `<challenge> [--method=METHOD] [--people=N] [--personas=LIST]` | Guided brainstorming session — select a method, apply it to your challenge, generate ideas systematically. |
| `/rcode-explore` | `[topic]` | Socratic ideation workflow — think through ideas before committing. |
| `/rcode-prfaq` | `[<idea>] [--headless] [--customer=<persona>] [--problem=<problem>] [--stakes=<why>] [--solution=<concept>]` | Working Backwards PRFAQ challenge — write the press release before building. Stress-tests a product concept. |
| `/rcode-chain` | `<preset\|agent-list> <topic>` | Run a sequential agent pipeline (research → scope → build). Each stage reads the previous stage's artifact. |

---

### Codebase Tools

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-map-codebase` | — | Analyze existing codebase and produce structured documents in `.planning/codebase/`. |
| `/rcode-scan` | `[--focus <area>]` | Rapid codebase assessment — lightweight alternative to map-codebase. |
| `/rcode-diff` | `[--last] [<sha1> <sha2>]` | Show changes to plans and state between commits. |
| `/rcode-show` | `<id>` | Print a plan or phase in full with execution status. |
| `/rcode-profile-user` | `[--json <json-blob>]` | Classify developer on 4 dimensions — communication style, autonomy, domain depth, iteration speed. Produces `.rcode/USER-PROFILE.md`. |

---

### Settings & Config

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-settings` | `[show \| get <key> \| set <key> <value>]` | View or edit rcode project settings — mode, model_profile, workflow gates, git strategy. Interactive prompts when run with no args. |
| `/rcode-config` | `[show \| get <key> \| set <key> <value>]` | Alias for `/rcode-settings`. |
| `/rcode-enable-hooks` | — | Install optional rcode hooks into `.claude/settings.json` for edit, workflow, and commit guardrails. |

---

### Utilities

| Command | Arguments | What it does |
|---------|-----------|--------------|
| `/rcode-help` | `[basic\|intermediate\|advanced\|all]` | Show all commands organized by purpose and tier. |
| `/rcode-status` | — | Print current project state — phase, plan progress, recent decisions, blockers, last council session. |
| `/rcode-progress` | — | Check project progress and suggest next steps. |
| `/rcode-stats` | — | Show project statistics from state.json — phases, plans, decisions, council sessions, timeline. |
| `/rcode-sprint-status` | `[--sprint <NN.S>]` | Show current sprint progress — stories, points, velocity, burndown. |
| `/rcode-dashboard` | `[--port 7717] [--no-open]` | Start the Diwan view-only dashboard (port 7717) to browse project state in the browser. |
| `/rcode-resume-work` | — | Restore project context and resume work from last saved state. |
| `/rcode-pause-work` | — | Capture project state and blocking constraints before pausing. Creates HANDOFF.json and `.continue-here.md`. |
| `/rcode-note` | `<text> [--global] \| list \| count` | Capture inline notes instantly. Appends to a dated note file with YAML frontmatter. |
| `/rcode-add-todo` | `<todo-title>` | Capture an idea or task for later work. |
| `/rcode-check-todos` | — | List all pending todos, allow selection, load context, and route to appropriate action. |
| `/rcode-plant-seed` | `<idea>` | Capture a forward-looking idea with trigger conditions — surfaces automatically at the right milestone. |
| `/rcode-inbox` | `[--issues] [--prs] [--label] [--close-incomplete]` | Triage incoming issues and PRs against contribution templates. |
| `/rcode-session-report` | — | Generate a session report with work summary, token usage estimation, commits, decisions, and open blockers. |
| `/rcode-notify-test` | `[--only slack\|discord\|teams] [--title "<t>"] [--body "<b>"]` | Verify configured webhooks (Slack / Discord / MS Teams) by posting a test message. |
| `/rcode-import` | `--from <path>` | Ingest external plans with conflict detection against project decisions. |
| `/rcode-new-workspace` | `<workspace-name> [--from-current]` | Create an isolated workspace for parallel work — separate ROADMAP/STATE with independent tracking. |
| `/rcode-list-workspaces` | `[--detail]` | List all active workspaces with status, start date, and current phase. |
| `/rcode-remove-workspace` | `<workspace-name> [--archive] [--force]` | Remove a workspace and clean up its artifacts. No recovery. |
| `/rcode-workstream` | `<subcommand> [--name <name>]` | Manage parallel workstreams. Create, switch, list, or complete workstreams in state.json. |
| `/rcode-ui-phase` | `[--existing-ui <path>] [--design-system <path>]` | Produce UI-SPEC.md with color tokens, typography, component inventory, interaction states, and accessibility guidelines. |
| `/rcode-dev-story` | `<STORY.md>` | Wrap a STORY.md for AI-coder execution. Produces explicit file paths, context, and checklist. |
| `/rcode-create-epics-and-stories` | `<prd-path> [--prefix <name>]` | Parse a PRD to generate numbered epic files in `.planning/epics/`. Each epic contains user stories with acceptance criteria. |
| `/rcode-create-story` | `<EPIC-file.md> [--story <id>]` | Transform a story from an epic file into a self-contained STORY.md with full AC and dev notes. |
| `/rcode-docs-update` | `[--force] [--fix]` | Generate and update project documentation verified against codebase. |
| `/rcode-document-project` | `[--csv <path>] [--auto-file-tasks]` | Load documentation-requirements.csv, audit missing/stale docs, file missing docs as SPRINT.md tasks. |

---

## Agents

Agents are subagents spawned by workflows and commands. You cannot invoke them directly — they are selected automatically.

### Council Agents (People)

These agents represent rcode team roles. Spawned by `/rcode-council` based on keyword scoring against your question.

| Agent | Role | Spawned when you ask about |
|-------|------|---------------------------|
| `rcode-waleed` | CTO | Architecture, stack selection, technical feasibility, security, scale |
| `rcode-sadiq` | Director of Strategy | Should we build this, why now, what NOT to do, kill criteria |
| `rcode-hussain-pm` | Product Manager | Scope, roadmap, feature definition, user stories, PRD, sprint planning, backlog |
| `rcode-mariam` | Marketing & Growth Lead | Market research, go-to-market, positioning, launch plans, GCC/Oman market |
| `rcode-fatima` | QA Lead | Test strategy, coverage, release readiness, regression, flaky tests, production readiness |
| `rcode-hanzla` | Senior Full-Stack Engineer | Story execution, code implementation, bug fixes, refactoring, hands-on development |
| `rcode-haitham` | Senior Frontend Engineer | React/Next.js, component design, RTL/Arabic layouts, accessibility, frontend performance |
| `rcode-yousef` | Senior Backend Engineer | Backend implementation, API design, database, performance, queues, webhooks |
| `rcode-layla` | UX Designer | UX design, interaction flows, design systems, accessibility, usability reviews |
| `rcode-zahra` | Branding & Creative Director | Brand identity, visual language, typography (Latin + Arabic), color systems, design tokens |
| `rcode-zayd` | Senior ML Engineer | Machine learning, OCR, LLM integration, RAG, vector search, embeddings, prompt engineering |
| `rcode-khalid` | DevOps & Infrastructure | Deployment pipelines, CI/CD, containers, cloud infrastructure, monitoring, release engineering |
| `rcode-nasser` | Engineering Manager | People ops, 1:1 prep, hiring plans, growth conversations, team health, squad composition |
| `rcode-ahmed` | Technology & Development Director | Delivery timelines, engineering standards, DORA metrics, cross-team coordination, tech debt |
| `rcode-noor` | Technical Writer | Documentation, README, API docs, architecture diagrams, changelogs, pitch decks |
| `rcode-omar` | Software Engineer | Generalist implementation tasks spanning frontend and backend |

### Orchestration Agents

Internal agents used by workflows. Not selected by the council keyword system.

| Agent | What it does | Spawned by |
|-------|-------------|------------|
| `rcode-planner` | Creates executable SPRINT.md files with task breakdown, dependency analysis, and goal-backward verification | `/rcode-plan` |
| `rcode-phase-researcher` | Researches technical approaches for a phase. Produces RESEARCH.md | `/rcode-plan`, `/rcode-research-phase` |
| `rcode-sprint-checker` | Verifies plans will achieve phase goal before execution. Goal-backward analysis | `/rcode-plan` |
| `rcode-executor` | Executes rcode sprints with atomic commits, deviation handling, checkpoints | `/rcode-execute` |
| `rcode-verifier` | Verifies phase goal achievement through goal-backward analysis. Creates VERIFICATION.md | `/rcode-verify-phase` |
| `rcode-project-researcher` | Researches domain ecosystem before roadmap creation | `/rcode-new-project`, `/rcode-new-milestone` |
| `rcode-roadmapper` | Creates project roadmaps with phase breakdown, requirement mapping, success criteria | `/rcode-new-project` |
| `rcode-research-synthesizer` | Synthesizes outputs from parallel researcher agents into SUMMARY.md | `/rcode-new-project` |

### Specialist Agents

Spawned by specific workflows for targeted analysis.

| Agent | What it does | Spawned by |
|-------|-------------|------------|
| `rcode-codebase-mapper` | Explores codebase, writes structured analysis documents. Focus areas: tech, arch, quality, concerns | `/rcode-map-codebase` |
| `rcode-debugger` | Investigates bugs using scientific method, manages debug sessions, handles checkpoints | `/rcode-debug` |
| `rcode-reviewer` | Code quality assessment, bug detection, security issues, standards validation | `/rcode-review` |
| `rcode-fixer` | Applies code review findings, implements style fixes, refactors for maintainability | `/rcode-review-fix`, `/rcode-audit-fix` |
| `rcode-integration-checker` | Verifies cross-phase integration and E2E flows | `/rcode-audit-milestone` |
| `rcode-nyquist-auditor` | Fills validation gaps, generates missing tests, verifies coverage | `/rcode-validate-phase` |
| `rcode-security-auditor` | Comprehensive security audit, compliance verification, posture assessment | `/rcode-secure-phase` |
| `rcode-security-adversary` | Attack-mode security review, threat modeling, attack surface analysis | `/rcode-review --attack` |
| `rcode-ui-auditor` | UI audit for usability, consistency, accessibility, design quality | `/rcode-ui-review` |
| `rcode-ux-designer` | UI/UX design, design system work, accessibility, usability | `/rcode-ui-phase` |
| `rcode-noor` | Generates and updates README, API docs, changelogs, migration guides | `/rcode-docs-update` |
| `rcode-profiler` | Analyzes user behavior patterns, creates personas, identifies usage flows | `/rcode-profile-user` |
| `rcode-deviation-analyzer` | Analyzes plan deviations, scope creep, timeline slips | `/rcode-correct-course` |
| `rcode-remediation-planner` | Plans remediation for issues, blockers, failures | internal |
| `rcode-docs-auditor` | Audits documentation completeness, accuracy, gaps between code and docs | `/rcode-docs-update` |
| `rcode-edge-case-hunter` | Enumerates edge cases by category with severity | `/rcode-review --edge-cases` |
| `rcode-assumptions-analyzer` | Analyzes codebase for a phase, returns structured assumptions with evidence | `/rcode-discuss-phase` (assumptions mode) |
| `rcode-advisor-researcher` | Researches a gray area decision, returns structured comparison table | `/rcode-discuss-phase` (advisor mode) |

---

## Skills

Skills are domain expertise modules. They are loaded automatically when their trigger phrases are detected in your messages. You can also invoke them directly with `/rcode-<skill-name>`.

### Analysis Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rcode-domain-research` | Domain research requests | Domain landscape, competitive analysis, market signals |
| `rcode-market-research` | Market research requests | Market size, segments, customer personas, pricing benchmarks |
| `rcode-technical-research` | Technical investigation | Technology comparison, architecture options, integration patterns |
| `rcode-document-project` | Document project, audit docs | Documentation gap audit, tasks filed as SPRINT.md items |
| `rcode-prfaq` | PRFAQ, working backwards, press release | PRFAQ document + PRD distillate. Stress-tests a concept before building. |
| `rcode-product-brief` | Product brief, product summary | Structured product brief with problem, solution, audience, metrics |

### Planning Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rcode-create-prd` | Create PRD, write requirements | Full PRD with problem statement, user stories, acceptance criteria, non-goals |
| `rcode-edit-prd` | Edit PRD, update requirements | Updated PRD with tracked changes |
| `rcode-validate-prd` | Validate PRD, review PRD quality | PRD quality report — density, measurability, traceability, domain compliance |
| `rcode-create-epics-and-stories` | Create epics, generate stories | Numbered epic files in `.planning/epics/` with user stories and AC |
| `rcode-create-story` | Create story, dev story | Self-contained STORY.md from epic — full AC, dev notes, implementation guidance |
| `rcode-create-milestone` | Create milestone, plan milestone | Milestone definition with phases, goals, and success criteria |
| `rcode-create-ux-design` | Create UX design, design flows | UX design document with user flows, wireframe descriptions, interaction states |
| `rcode-frontend-design` | Frontend design, UI spec | UI-SPEC.md with color tokens, typography, component inventory, accessibility |

### Solutioning Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rcode-check-implementation-readiness` | Check readiness, implementation ready | Readiness report — PRD approved, architecture approved, deps identified, no blocking assumptions |
| `rcode-create-architecture` | Create architecture, design system | Architecture decision record (ADR) or architecture document |
| `rcode-generate-project-context` | Generate context, project context | `.planning/` context document for AI coding tools |

### Implementation Skills

| Skill | Trigger | What it produces |
|-------|---------|-----------------|
| `rcode-dev-story` | Dev this story, implement story | Story execution wrapper — file paths, context, task checklist |
| `rcode-sprint-planning` | Plan sprint, sprint planning | SPRINT.md with capacity, prioritized stories, velocity estimate |
| `rcode-sprint-status` | Sprint status, sprint progress | Sprint progress report — stories, points, velocity, burndown |
| `rcode-review` | Review code, code review | Code review report — bugs, security issues, style violations, severity classifications |
| `rcode-checkpoint-preview` | Checkpoint, walk me through this, human review | Diff summary, key change highlights, testing walkthrough |
| `rcode-correct-course` | Correct course, scope drift, fix deviation | Deviation classification + ordered remediation plan |
| `rcode-scaffold-project` | Scaffold project, bootstrap project | Project scaffold with directory structure, config files, initial code |
| `rcode-qa-generate-e2e-tests` | Generate E2E tests, QA tests | E2E test suite based on SUMMARY.md and acceptance criteria |
| `rcode-retrospective` | Retrospective, retro | Sprint retrospective — what worked, what didn't, action items |

---

## Known Limitations

These are real gaps in the current version (`v4.0.0`):

1. **`/rcode-plan` requires `.planning/` directory** — the workflow cannot be used inside the rcode repo itself. There is no self-referential project management.

2. **`/rcode-ship` does not apply to `git.branching_strategy: none`** — if you commit directly to main, the preflight will always fail the "on feature branch" gate.

3. **`/rcode-execute-sprint`** is an internal wrapper. Use `/rcode-execute` instead.

4. **Skills do not auto-trigger in all AI IDEs** — trigger phrases work in Claude Code and compatible tools that support the `.rcode/commands/` format. Plain ChatGPT or Copilot won't pick them up automatically.

5. **The dashboard (`/rcode-dashboard`)** is view-only. It reads `.planning/` data. It has no write endpoints.
