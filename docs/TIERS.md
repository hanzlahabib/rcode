# Rihal Code — Tiers

Rihal Code has **26 action skills, 17 team agents, 13 core skills, and 99 slash commands**. That's a lot. To keep it approachable, everything is organized into four tiers plus a preview track.

> **New to Rihal Code?** Start with the 🌱 Starter tier. You can do a complete project with just 7 skills. Ignore everything else until you need it.

---

## 🌱 Starter — The Golden Path

The seven skills you actually need to ship your first Rihal project, in order:

| # | Skill | What it does | Say this to activate |
|---|-------|--------------|----------------------|
| 1 | `rihal-scaffold-project` | Clone the Rihal template into a new folder | "scaffold a new project" or `/rihal-install` |
| 2 | `rihal-create-prd` | Interview you and write a Product Requirements Document | "create a PRD" or `/rihal-do` |
| 3 | `rihal-create-story` | Break the PRD into implementable stories | "create a story" |
| 4 | `rihal-sprint-planning` | Plan a sprint with the team | "plan a sprint" or `/rihal-sprint-planning` |
| 5 | `rihal-dev-story` | Implement a story (code + tests + PR) | "dev this story" or `/rihal-dev-story` |
| 6 | `rihal-code-review` | Review changes before merging | "review this code" or `/rihal-code-review` |
| 7 | `rihal-sprint-status` | Check sprint progress + blockers | "sprint status" or `/rihal-sprint-status` |

**Starter agents (3):** Sadiq (strategy) · Hussain (PM) · Nasser (engineering manager).

If you only learn these, you can run a full project from zero to ship.

---

## 🌿 Advanced — Real Sprint Team

For teams running multiple sprints with formal ceremonies and design work.

### Skills (11)

| Skill | What it does | Say this to activate |
|-------|--------------|----------------------|
| `rihal-product-brief` | 1–2 page executive brief (input to PRD) | "create a product brief" |
| `rihal-prfaq` | Amazon Working Backwards PRFAQ challenge | "create a PRFAQ" or "work backwards" |
| `rihal-edit-prd` | Revise an existing PRD | "edit the PRD" |
| `rihal-validate-prd` | Check PRD completeness and consistency | "validate the PRD" |
| `rihal-create-epics-and-stories` | Expand PRD → epics → stories batch | "create epics" |
| `rihal-create-architecture` | Write an Architecture Decision Record (ADR) | "write an ADR" |
| `rihal-create-ux-design` | UX flows, wireframes, design system | "create UX design" |
| `rihal-frontend-design` | Typography, colours, motion, spatial design | "design this UI" |
| `rihal-qa-generate-e2e-tests` | Generate end-to-end test cases | "generate e2e tests" |
| `rihal-retrospective` | Run a retro, capture action items | "run retrospective" |
| `rihal-create-milestone` | Create milestone definition | "create a milestone" |

### Agents (8)

Waleed (CTO) · Ahmed Al Hassani (tech director) · Layla (designer) · Zahra (branding) · Haitham (frontend) · Yousef (backend) · Fatima (QA) · Hussain-SM (scrum master).

---

## 🌳 Ultra Advanced — Power User Workflows

For multi-agent consultation, reverse engineering, project recovery, and deep context work.

### Skills (8)

| Skill | What it does | Say this to activate |
|-------|--------------|----------------------|
| `rihal-check-implementation-readiness` | Verify alignment before dev | "check implementation readiness" |
| `rihal-correct-course` | Pivot mid-project with minimal disruption | "course correct" |
| `rihal-clone-website` | Reverse-engineer a website (CSS + content + layout) | "clone this website" |
| `rihal-document-project` | Auto-generate full project docs for AI agents | "document this project" |
| `rihal-generate-project-context` | Extract conventions, stack, patterns → `.rihal/project-context.md` | "generate project context" |
| `rihal-checkpoint-preview` | LLM-assisted human-in-the-loop review | "checkpoint" or "walk me through this change" |
| `research` | Generic multi-source research skill | "research [topic]" |
| `rihal-brainstorming` | Structured brainstorming workflow | "brainstorm" |

### Agents (7)

Majlis (multi-agent council) · Raees (orchestrator) · Zayd (ML) · Hanzla (engineer) · Omar (engineer) · Mariam (marketing) · Noor (writer) · Khalid (DevOps).

### Power tools

- `npx @hanzlaa/rcode dashboard` — launches Diwan view-only dashboard on :7717
- `npx @hanzlaa/rcode digest` — compact agent summaries
- `npx @hanzlaa/rcode github-sync` — sync phases/epics/stories to GitHub issues
- `npx @hanzlaa/rcode context --refresh` — refresh memory bank from current repo state

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

`rihal/v2/` has been unified into the main methodology. All 43 agents, 99 commands, and 56 skills are now available through the single installer. See [`V2-PREVIEW.md`](./V2-PREVIEW.md) for migration notes.

---

## CLI Commands at a Glance

Grouped by purpose (full help: `npx @hanzlaa/rcode help`):

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
