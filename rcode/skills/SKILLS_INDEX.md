# rcode — Skills Index

All 86 skills in rcode, organized by category: 23 agent skills, 38 action skills, 25 core skills, plus 2 shared modules.

## Agent Skills (23)

Each agent has a persona, principles, and a capabilities table that lists which action skills it can invoke.

| rcode Name | Arabic | Role | Skill Path |
|---|---|---|---|
| **Waleed** | وليد | System Architect / CTO | `agents/waleed-architect/` |
| **Sadiq** | صادق | Business Analyst / Strategy | `agents/sadiq-analyst/` |
| **Hussain (PM)** | حسين | Product Manager | `agents/hussain-pm/` |
| **Hussain (SM)** | حسين | Scrum Master | `agents/hussain-sm/` |
| **Layla** | ليلى | UX Designer | `agents/layla-designer/` |
| **Hanzla** | حنظلة | Senior Developer | `agents/hanzla-engineer/` |
| **Fatima** | فاطمة | Test Architect (QA) | `agents/fatima-qa/` |
| **Noor** | نور | Technical Writer | `agents/noor-writer/` |
| **Ahmed Al Hassani** | أحمد الحسني | Technology & Development Director | `agents/ahmed-hassani-director/` |
| **Haitham** | هيثم | Senior Frontend Engineer | `agents/haitham-frontend/` |
| **Mariam** | مريم | Marketing Lead | `agents/mariam-marketing/` |
| **Nasser** | ناصر | Engineering Manager | `agents/nasser-eng-manager/` |
| **Yousef** | يوسف | Senior Backend Engineer | `agents/yousef-backend/` |
| **Zahra** | زهرة | Branding & Creative Director | `agents/zahra-branding/` |
| **Zayd** | زيد | Senior ML Engineer | `agents/zayd-ml/` |
| **Raees** | رئيس | Orchestrator | `agents/raees-orchestrator/` |
| **Majlis** | مجلس | Multi-Agent Council | `agents/majlis-council/` |
| **Dalil** | دليل | Codebase Scout | `agents/dalil-scout/` |
| **Cross-Platform Auditor** | — | Cross-Platform Auditor | `agents/rcode-cross-platform-auditor/` |
| **Dep Auditor** | — | Dependency Health Auditor | `agents/rcode-dep-auditor/` |
| **Deviation Analyzer** | — | Deviation Analyzer | `agents/rcode-deviation-analyzer/` |
| **i18n Auditor** | — | i18n / L10n Auditor | `agents/rcode-i18n-auditor/` |
| **Observability Auditor** | — | Observability Auditor | `agents/rcode-observability-auditor/` |

Note: Hussain has two hats — **PM** (strategic product management) and **SM** (scrum master / sprint ops). Real teams often combine these.

---

## Action Skills (38)

Invoked by agents via the capabilities table in their SKILL.md. Organized by SDLC phase.

### 1 — Analysis (6)
- `actions/1-analysis/research/rcode-domain-research` — domain-specific research
- `actions/1-analysis/research/rcode-market-research` — market and competitive research
- `actions/1-analysis/research/rcode-technical-research` — technical deep-dive research
- `actions/1-analysis/rcode-product-brief` — write product brief
- `actions/1-analysis/rcode-prfaq` — Amazon Working Backwards PRFAQ challenge
- `actions/1-analysis/rcode-document-project` — document an existing codebase (brownfield)

### 2 — Planning (8)
- `actions/2-plan/rcode-create-prd` — create product requirements doc
- `actions/2-plan/rcode-edit-prd` — edit existing PRD
- `actions/2-plan/rcode-validate-prd` — validate PRD completeness
- `actions/2-plan/rcode-create-ux-design` — create UX design
- `actions/2-plan/rcode-frontend-design` — typography, colours, motion, spatial design
- `actions/2-plan/rcode-create-epics-and-stories` — break down PRD into epics and stories
- `actions/2-plan/rcode-create-story` — prepare a dev-ready user story
- `actions/2-plan/rcode-create-milestone` — create milestone definition

### 3 — Solutioning (3)
- `actions/3-solutioning/rcode-create-architecture` — architectural decision record (ADR)
- `actions/3-solutioning/rcode-check-implementation-readiness` — verify PRD/UX/arch alignment
- `actions/3-solutioning/rcode-generate-project-context` — generate project-context.md

### 4 — Implementation (21)
- `actions/4-implementation/rcode-dev-story` — execute a story (write tests + code)
- `actions/4-implementation/rcode-review` — comprehensive code review
- `actions/4-implementation/rcode-qa-generate-e2e-tests` — generate e2e test suite
- `actions/4-implementation/rcode-sprint-planning` — plan a sprint
- `actions/4-implementation/rcode-sprint-status` — sprint status report
- `actions/4-implementation/rcode-retrospective` — retro workflow
- `actions/4-implementation/rcode-correct-course` — course-correction for off-track stories
- `actions/4-implementation/rcode-scaffold-project` — scaffold new project from rcode template
- `actions/4-implementation/rcode-checkpoint-preview` — LLM-assisted human-in-the-loop review
- `actions/4-implementation/rcode-browser-verify` — verify browser behaviour via Chrome DevTools MCP
- `actions/4-implementation/rcode-ci` — CI/CD setup and quality gates
- `actions/4-implementation/rcode-debug` — root-cause debugging via the scientific method
- `actions/4-implementation/rcode-git-flow` — branching, commits, conflicts, parallel work
- `actions/4-implementation/rcode-harden` — security hardening checklist for SaaS apps
- `actions/4-implementation/rcode-incremental` — ship code in small, atomic, verifiable steps
- `actions/4-implementation/rcode-migrate` — move from MVP to production-grade infrastructure
- `actions/4-implementation/rcode-perf` — performance optimisation (LCP / TBT / CLS / hydration)
- `actions/4-implementation/rcode-prove-it` — test-first development
- `actions/4-implementation/rcode-source-truth` — cite official docs before writing framework code
- `actions/4-implementation/rcode-trim` — code simplification
- `actions/4-implementation/rcode-herdr-orchestration` — orchestrate parallel cld agents in herdr; single-shot fan-out OR long-running autonomous wave-based fix campaign with durable backlog + integration branch + heartbeat

---

## Core Skills (25)

Shared utilities used across agents and workflows.

- `core/rcode-init` — INTERNAL config loader (installs to .rcode/skills/, not .claude/skills/)
- `core/rcode-help` — meta-help on available skills
- `core/rcode-brainstorming` — structured brainstorming workflow
- `core/rcode-advanced-elicitation` — advanced requirements elicitation
- `core/rcode-distillator` — distill information into concise summaries
- `core/rcode-index-docs` — index documentation for search
- `core/rcode-shard-doc` — shard large documents into linked sections
- `core/rcode-clone-website` — reverse-engineer and clone a website
- `core/rcode-editorial-review-prose` — editorial review for prose quality
- `core/rcode-editorial-review-structure` — editorial review for structural quality
- `core/rcode-review-adversarial-general` — adversarial review for robustness
- `core/rcode-review-edge-case-hunter` — edge case hunting and boundary testing
- `core/rcode-party-mode` — multi-agent collaboration mode
- `core/rcode-auth-audit` — audit Keycloak ↔ AD sync, JWT validation, tenant isolation
- `core/rcode-client-gate` — client requirement freeze gates and async-comm patterns
- `core/rcode-deploy-unify` — detect and unify multiple deployment paths
- `core/rcode-incident-record` — generate a change record + post-mortem
- `core/rcode-memory-init` — bootstrap the Memory Bank for a project
- `core/rcode-memory-update` — surgical update of specific Memory Bank files
- `core/rcode-memory-audit` — audit the Memory Bank for stale entries and contradictions
- `core/rcode-memory-distill` — regenerate token-optimised Memory Bank distillates
- `core/rcode-mvp-graduate` — move an MVP to production-grade infrastructure incrementally
- `core/rcode-ocr-consistency` — OCR pipeline determinism + ground-truth validation
- `core/rcode-rebrand` — stack-wide rebranding migration
- `core/rcode-theme-system` — audit a frontend's design tokens before launch

---

## How Skills Work

1. **Agent skills** give a persona and list capabilities
2. **Action skills** are the actual capabilities that do work
3. **Core skills** are shared utilities

Agents reference actions by their skill name in their Capabilities table:

```markdown
| Code | Description | Skill |
|------|-------------|-------|
| DS | Write the next story's tests and code | rcode-dev-story |
| CR | Comprehensive code review | rcode-review |
```

When a user picks capability `DS`, Claude invokes the `rcode-dev-story` skill.

---

## Licensing

Free to use and adapt.
