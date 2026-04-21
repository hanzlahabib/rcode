# Rihal Code — Skills Index

All 39 skills in Rihal Code, organized by category.

## Agent Skills (8)

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

Note: Hussain has two hats — **PM** (strategic product management) and **SM** (scrum master / sprint ops). Real teams often combine these.

---

## Action Skills (19)

Invoked by agents via the capabilities table in their SKILL.md.

### Analysis (3)
- `actions/research` — research any topic (domain / market / technical)
- `actions/rihal-product-brief` — write product brief
- `actions/rihal-document-project` — document an existing codebase

### Planning (4)
- `actions/rihal-create-prd` — create product requirements doc
- `actions/rihal-edit-prd` — edit PRD
- `actions/rihal-validate-prd` — validate PRD completeness
- `actions/rihal-create-ux-design` — create UX design

### Architecture (4)
- `actions/rihal-create-architecture` — architectural decision doc
- `actions/rihal-check-implementation-readiness` — verify PRD/UX/arch alignment
- `actions/rihal-create-epics-and-stories` — break down into epics and stories
- `actions/rihal-generate-project-context` — generate project-context.md

### Implementation (8)
- `actions/rihal-create-story` — create a user story
- `actions/rihal-dev-story` — execute a story (write tests + code)
- `actions/rihal-code-review` — comprehensive code review
- `actions/rihal-qa-generate-e2e-tests` — generate e2e test suite
- `actions/rihal-sprint-planning` — plan a sprint
- `actions/rihal-sprint-status` — sprint status report
- `actions/rihal-retrospective` — retro workflow
- `actions/rihal-correct-course` — course-correction for off-track stories

---

## Core Skills (12)

- `core/rihal-init` — INTERNAL config loader (installs to .rihal/skills/, not .claude/skills/)
- `core/rihal-help` — meta-help on available skills
- `core/rihal-brainstorming` — structured brainstorming workflow
- `core/rihal-advanced-elicitation` — advanced requirements elicitation
- `core/rihal-distillator` — distill information
- `core/rihal-index-docs` — index documentation
- `core/rihal-shard-doc` — shard large documents
- `core/rihal-editorial-review-prose` — editorial review for prose
- `core/rihal-editorial-review-structure` — editorial review for structure
- `core/rihal-review-adversarial-general` — adversarial review
- `core/rihal-review-edge-case-hunter` — edge case hunting
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
