# Rihal Code — Skills Index

All 85 skills in Rihal Code, organized by category: 23 agent skills, 37 action skills, 25 core skills, plus 2 shared modules.

## Agent Skills (23)

Each agent has a persona, principles, and a capabilities table that lists which action skills it can invoke.

| Rihal Name | Arabic | Role | Skill Path |
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
| **Cross-Platform Auditor** | — | Cross-Platform Auditor | `agents/rihal-cross-platform-auditor/` |
| **Dep Auditor** | — | Dependency Health Auditor | `agents/rihal-dep-auditor/` |
| **Deviation Analyzer** | — | Deviation Analyzer | `agents/rihal-deviation-analyzer/` |
| **i18n Auditor** | — | i18n / L10n Auditor | `agents/rihal-i18n-auditor/` |
| **Observability Auditor** | — | Observability Auditor | `agents/rihal-observability-auditor/` |

Note: Hussain has two hats — **PM** (strategic product management) and **SM** (scrum master / sprint ops). Real teams often combine these.

---

## Action Skills (37)

Invoked by agents via the capabilities table in their SKILL.md. Organized by SDLC phase.

### 1 — Analysis (6)
- `actions/1-analysis/research/rihal-domain-research` — domain-specific research
- `actions/1-analysis/research/rihal-market-research` — market and competitive research
- `actions/1-analysis/research/rihal-technical-research` — technical deep-dive research
- `actions/1-analysis/rihal-product-brief` — write product brief
- `actions/1-analysis/rihal-prfaq` — Amazon Working Backwards PRFAQ challenge
- `actions/1-analysis/rihal-document-project` — document an existing codebase (brownfield)

### 2 — Planning (8)
- `actions/2-plan/rihal-create-prd` — create product requirements doc
- `actions/2-plan/rihal-edit-prd` — edit existing PRD
- `actions/2-plan/rihal-validate-prd` — validate PRD completeness
- `actions/2-plan/rihal-create-ux-design` — create UX design
- `actions/2-plan/rihal-frontend-design` — typography, colours, motion, spatial design
- `actions/2-plan/rihal-create-epics-and-stories` — break down PRD into epics and stories
- `actions/2-plan/rihal-create-story` — prepare a dev-ready user story
- `actions/2-plan/rihal-create-milestone` — create milestone definition

### 3 — Solutioning (3)
- `actions/3-solutioning/rihal-create-architecture` — architectural decision record (ADR)
- `actions/3-solutioning/rihal-check-implementation-readiness` — verify PRD/UX/arch alignment
- `actions/3-solutioning/rihal-generate-project-context` — generate project-context.md

### 4 — Implementation (20)
- `actions/4-implementation/rihal-dev-story` — execute a story (write tests + code)
- `actions/4-implementation/rihal-code-review` — comprehensive code review
- `actions/4-implementation/rihal-qa-generate-e2e-tests` — generate e2e test suite
- `actions/4-implementation/rihal-sprint-planning` — plan a sprint
- `actions/4-implementation/rihal-sprint-status` — sprint status report
- `actions/4-implementation/rihal-retrospective` — retro workflow
- `actions/4-implementation/rihal-correct-course` — course-correction for off-track stories
- `actions/4-implementation/rihal-scaffold-project` — scaffold new project from Rihal template
- `actions/4-implementation/rihal-checkpoint-preview` — LLM-assisted human-in-the-loop review
- `actions/4-implementation/rihal-browser-verify` — verify browser behaviour via Chrome DevTools MCP
- `actions/4-implementation/rihal-ci` — CI/CD setup and quality gates
- `actions/4-implementation/rihal-debug` — root-cause debugging via the scientific method
- `actions/4-implementation/rihal-git-flow` — branching, commits, conflicts, parallel work
- `actions/4-implementation/rihal-harden` — security hardening checklist for SaaS apps
- `actions/4-implementation/rihal-incremental` — ship code in small, atomic, verifiable steps
- `actions/4-implementation/rihal-migrate` — move from MVP to production-grade infrastructure
- `actions/4-implementation/rihal-perf` — performance optimisation (LCP / TBT / CLS / hydration)
- `actions/4-implementation/rihal-prove-it` — test-first development
- `actions/4-implementation/rihal-source-truth` — cite official docs before writing framework code
- `actions/4-implementation/rihal-trim` — code simplification

---

## Core Skills (25)

Shared utilities used across agents and workflows.

- `core/rihal-init` — INTERNAL config loader (installs to .rihal/skills/, not .claude/skills/)
- `core/rihal-help` — meta-help on available skills
- `core/rihal-brainstorming` — structured brainstorming workflow
- `core/rihal-advanced-elicitation` — advanced requirements elicitation
- `core/rihal-distillator` — distill information into concise summaries
- `core/rihal-index-docs` — index documentation for search
- `core/rihal-shard-doc` — shard large documents into linked sections
- `core/rihal-clone-website` — reverse-engineer and clone a website
- `core/rihal-editorial-review-prose` — editorial review for prose quality
- `core/rihal-editorial-review-structure` — editorial review for structural quality
- `core/rihal-review-adversarial-general` — adversarial review for robustness
- `core/rihal-review-edge-case-hunter` — edge case hunting and boundary testing
- `core/rihal-party-mode` — multi-agent collaboration mode
- `core/rihal-auth-audit` — audit Keycloak ↔ AD sync, JWT validation, tenant isolation
- `core/rihal-client-gate` — client requirement freeze gates and async-comm patterns
- `core/rihal-deploy-unify` — detect and unify multiple deployment paths
- `core/rihal-incident-record` — generate a change record + post-mortem
- `core/rihal-memory-init` — bootstrap the Memory Bank for a project
- `core/rihal-memory-update` — surgical update of specific Memory Bank files
- `core/rihal-memory-audit` — audit the Memory Bank for stale entries and contradictions
- `core/rihal-memory-distill` — regenerate token-optimised Memory Bank distillates
- `core/rihal-mvp-graduate` — move an MVP to production-grade infrastructure incrementally
- `core/rihal-ocr-consistency` — OCR pipeline determinism + ground-truth validation
- `core/rihal-rebrand` — stack-wide rebranding migration
- `core/rihal-theme-system` — audit a frontend's design tokens before launch

---

## How Skills Work

1. **Agent skills** give a persona and list capabilities
2. **Action skills** are the actual capabilities that do work
3. **Core skills** are shared utilities

Agents reference actions by their skill name in their Capabilities table:

```markdown
| Code | Description | Skill |
|------|-------------|-------|
| DS | Write the next story's tests and code | rihal-dev-story |
| CR | Comprehensive code review | rihal-code-review |
```

When a user picks capability `DS`, Claude invokes the `rihal-dev-story` skill.

---

## Licensing

Free to use and adapt.
