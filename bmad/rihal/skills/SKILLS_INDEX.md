# Rihal Method — Skills Index

All agent skills are sourced from BMAD Method v6.2.2 and rebranded to the Rihal team roster.

## Agent Skills (8)

| Rihal Name | Arabic | Role | Skill Path | BMAD Origin |
|---|---|---|---|---|
| Ahmed | أحمد | System Architect / CTO | `agents/ahmed-architect/` | bmad-agent-architect (Winston) |
| Sadiq | صادق | Business Analyst / Strategy | `agents/sadiq-analyst/` | bmad-agent-analyst (Mary) |
| Hussain | حسين | Product Manager | `agents/hussain-pm/` | bmad-agent-pm (John) |
| Hussain | حسين | Scrum Master | `agents/hussain-sm/` | bmad-agent-sm (Bob) |
| Layla | ليلى | UX Designer | `agents/layla-designer/` | bmad-agent-ux-designer (Sally) |
| Omar | عمر | Senior Developer | `agents/omar-engineer/` | bmad-agent-dev (Amelia/Omar) |
| Fatima | فاطمة | Test Architect (QA) | `agents/fatima-qa/` | bmad-agent-qa (Quinn) |
| Noor | نور | Technical Writer | `agents/noor-writer/` | bmad-agent-tech-writer (Paige) |

Note: Hussain has two hats — **PM** (strategic product management) and **SM** (scrum master / sprint ops). Real teams often combine these.

Additional Rihal-native agent (not from BMAD):
- **Khalid** (خالد) — DevOps — in `bmad/rihal/agents/khalid.devops.agent.md`
- **Majlis** (مجلس) — Dashboard Server — in `bmad/rihal/agents/majlis.council.agent.md`

## Action Skills (19)

Invoked by agents via the capabilities table in their SKILL.md.

### Analysis (3)
- `actions/research` — research any topic
- `actions/bmad-product-brief` — write product brief
- `actions/bmad-document-project` — document an existing codebase

### Planning (4)
- `actions/bmad-create-prd` — create product requirements doc
- `actions/bmad-edit-prd` — edit PRD
- `actions/bmad-validate-prd` — validate PRD completeness
- `actions/bmad-create-ux-design` — create UX design

### Architecture (4)
- `actions/bmad-create-architecture` — architectural decision doc
- `actions/bmad-check-implementation-readiness` — verify PRD/UX/arch alignment
- `actions/bmad-create-epics-and-stories` — break down into epics and stories
- `actions/bmad-generate-project-context` — generate project-context.md

### Implementation (8)
- `actions/bmad-create-story` — create a user story
- `actions/bmad-dev-story` — execute a story (write tests + code)
- `actions/bmad-code-review` — comprehensive code review
- `actions/bmad-qa-generate-e2e-tests` — generate e2e test suite
- `actions/bmad-sprint-planning` — plan a sprint
- `actions/bmad-sprint-status` — sprint status report
- `actions/bmad-retrospective` — retro workflow
- `actions/bmad-correct-course` — course-correction for off-track stories

## Core Skills (12)

Cross-cutting skills used by all agents.

- `core/bmad-init` — initialize project context (config vars)
- `core/bmad-help` — meta-help on available skills
- `core/bmad-brainstorming` — structured brainstorming workflow
- `core/bmad-advanced-elicitation` — advanced requirements elicitation
- `core/bmad-distillator` — distill information
- `core/bmad-index-docs` — index documentation
- `core/bmad-shard-doc` — shard large documents
- `core/bmad-editorial-review-prose` — editorial review for prose
- `core/bmad-editorial-review-structure` — editorial review for structure
- `core/bmad-review-adversarial-general` — adversarial review
- `core/bmad-review-edge-case-hunter` — edge case hunting
- `core/bmad-party-mode` — multi-agent collaboration mode

## How Skills Work

1. **Agent skills** give a persona and list capabilities
2. **Action skills** are the actual capabilities that do work
3. **Core skills** are shared utilities (init, help, brainstorming, reviews)

Agents reference actions by their skill name in their Capabilities table:

```markdown
| Code | Description | Skill |
|------|-------------|-------|
| DS | Write the next story's tests and code | bmad-dev-story |
| CR | Comprehensive code review | bmad-code-review |
```

When a user picks capability `DS`, Claude invokes the `bmad-dev-story` skill.

## Licensing

All skills are sourced from [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) which is open-source. Rihal Method adds:
- Arabic/Omani persona layer
- File-based `.rihal/` state management
- Context management workflows
- Majlis dashboard server

See the [BMAD LICENSE](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/LICENSE) for original terms.
