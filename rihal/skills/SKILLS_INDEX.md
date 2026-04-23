# Rihal Code — Skills Index

All 58 skills in Rihal Code, organized by category: 17 agent skills, 26 action skills, 13 core skills, plus 2 shared modules.

## Agent Skills (17)

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

Note: Hussain has two hats — **PM** (strategic product management) and **SM** (scrum master / sprint ops). Real teams often combine these.

---

## Action Skills (26)

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

### 4 — Implementation (9)
- `actions/4-implementation/rihal-dev-story` — execute a story (write tests + code)
- `actions/4-implementation/rihal-code-review` — comprehensive code review
- `actions/4-implementation/rihal-qa-generate-e2e-tests` — generate e2e test suite
- `actions/4-implementation/rihal-sprint-planning` — plan a sprint
- `actions/4-implementation/rihal-sprint-status` — sprint status report
- `actions/4-implementation/rihal-retrospective` — retro workflow
- `actions/4-implementation/rihal-correct-course` — course-correction for off-track stories
- `actions/4-implementation/rihal-scaffold-project` — scaffold new project from Rihal template
- `actions/4-implementation/rihal-checkpoint-preview` — LLM-assisted human-in-the-loop review

---

## Core Skills (13)

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
