# Rihal Code — Tiers

Rihal Code has **22 action skills, 17 team agents, and 17 CLI commands**. That's a lot. To keep it approachable, everything is organized into four tiers plus a preview track.

> **New to Rihal Code?** Start with the 🌱 Starter tier. You can do a complete project with just 7 skills. Ignore everything else until you need it.

---

## 🌱 Starter — The Golden Path

The seven skills you actually need to ship your first Rihal project, in order:

| # | Skill | What it does | Say this to activate |
|---|-------|--------------|----------------------|
| 1 | `rihal-scaffold-project` | Clone the Rihal template into a new folder | "scaffold a new project" |
| 2 | `rihal-create-prd` | Interview you and write a Product Requirements Document | "create a PRD" |
| 3 | `rihal-create-story` | Break the PRD into implementable stories | "create a story" |
| 4 | `rihal-sprint-planning` | Plan a sprint with the team | "plan a sprint" |
| 5 | `rihal-dev-story` | Implement a story (code + tests + PR) | "dev this story" |
| 6 | `rihal-code-review` | Review changes before merging | "review this code" |
| 7 | `rihal-sprint-status` | Check sprint progress + blockers | "sprint status" |

**Starter agents (3):** Sadiq (strategy) · Hussain (PM) · Nasser (engineering manager).

If you only learn these, you can run a full project from zero to ship.

---

## 🌿 Advanced — Real Sprint Team

For teams running multiple sprints with formal ceremonies and design work.

### Skills (9)

| Skill | What it does |
|-------|--------------|
| `rihal-product-brief` | 1–2 page executive brief (input to PRD) |
| `rihal-edit-prd` | Revise an existing PRD |
| `rihal-validate-prd` | Check PRD completeness and consistency |
| `rihal-create-epics-and-stories` | Expand PRD → epics → stories batch |
| `rihal-create-architecture` | Write an Architecture Decision Record (ADR) |
| `rihal-create-ux-design` | UX flows, wireframes, design system |
| `rihal-frontend-design` | Typography, colours, motion, spatial design |
| `rihal-qa-generate-e2e-tests` | Generate end-to-end test cases |
| `rihal-retrospective` | Run a retro, capture action items |

### Agents (7)

Waleed (CTO) · Ahmed Hassani (tech director) · Layla (designer) · Zahra (branding) · Haitham (frontend) · Yousef (backend) · Fatima (QA) · Hussain-SM (scrum master).

---

## 🌳 Ultra Advanced — Power User Workflows

For multi-agent consultation, reverse engineering, project recovery, and deep context work.

### Skills (6)

| Skill | What it does |
|-------|--------------|
| `rihal-check-implementation-readiness` | Verify alignment before dev |
| `rihal-correct-course` | Pivot mid-project with minimal disruption |
| `rihal-clone-website` | Reverse-engineer a website (CSS + content + layout) |
| `rihal-document-project` | Auto-generate full project docs for AI agents |
| `rihal-generate-project-context` | Extract conventions, stack, patterns → `.rihal/project-context.md` |
| `research` | Generic multi-source research skill |

### Agents (7)

Majlis (multi-agent council) · Raees (orchestrator) · Diwan (dashboard) · Zayd (ML) · Hanzla (engineer) · Mariam (marketing) · Noor (writer).

### Power tools

- `npx rihal-code dashboard` — launches Diwan view-only dashboard on :7717
- `npx rihal-code digest` — compact agent summaries
- `npx rihal-code github-sync` — sync phases/epics/stories to GitHub issues
- `npx rihal-code context --refresh` — refresh memory bank from current repo state

---

## 📐 Standards — For Contributors

If you're contributing to Rihal Code itself (not just using it), read [`STANDARDS.md`](./STANDARDS.md).

Covers:
- 5-component skill spec (YAML header, overview, workflow, output format, examples)
- Conventional Commits (no AI attribution)
- File size limits (1000 lines max)
- PR template compliance
- Never-push-to-main rule

---

## 🧪 Preview — v2

`rihal/v2/` contains the next-generation methodology (36 agents, 67 workflows, 69 commands). It's **in active development and not yet the default path**. See [`V2-PREVIEW.md`](./V2-PREVIEW.md) before using it.

---

## CLI Commands at a Glance

Grouped by purpose (full help: `npx rihal-code help`):

### Project commands
`install` · `update` · `uninstall` · `config` · `context` · `github-sync`

### Team commands
`team` · `digest` · `show-model` · `dashboard`

### Meta commands
`doctor` · `tiers` · `set-profile` · `set-mode` · `version` · `help`

---

## How to use this document

- **Learning Rihal Code?** Do the Starter tier end-to-end on a real small project.
- **Picking up in the middle?** Jump to Advanced for the skill you need.
- **Going deep?** Ultra Advanced has the multi-agent + recovery tooling.
- **Contributing?** Read Standards.

Keep what you need visible, ignore the rest.
