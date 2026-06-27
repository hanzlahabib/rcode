# rcode — Tiers

rcode has **26 action skills, 17 team agents, 13 core skills, and 99 slash commands**. That's a lot. To keep it approachable, everything is organized into four tiers plus a preview track.

> **New to rcode?** Start with the 🌱 Starter tier. You can do a complete project with just 7 skills. Ignore everything else until you need it.

---

## 🌱 Starter — The Golden Path

The seven skills you actually need to ship your first rcode project, in order:

| # | Skill | What it does | Say this to activate |
|---|-------|--------------|----------------------|
| 1 | `rcode-scaffold-project` | Clone the rcode template into a new folder | "scaffold a new project" or `/rcode-install` |
| 2 | `rcode-create-prd` | Interview you and write a Product Requirements Document | "create a PRD" or `/rcode-do` |
| 3 | `rcode-create-story` | Break the PRD into implementable stories | "create a story" |
| 4 | `rcode-sprint-planning` | Plan a sprint with the team | "plan a sprint" or `/rcode-sprint-planning` |
| 5 | `rcode-dev-story` | Implement a story (code + tests + PR) | "dev this story" or `/rcode-dev-story` |
| 6 | `rcode-review` | Review changes before merging | "review this code" or `/rcode-review` |
| 7 | `rcode-sprint-status` | Check sprint progress + blockers | "sprint status" or `/rcode-sprint-status` |

**Starter agents (3):** Sadiq (strategy) · Hussain (PM) · Nasser (engineering manager).

If you only learn these, you can run a full project from zero to ship.

---

## 🌿 Advanced — Real Sprint Team

For teams running multiple sprints with formal ceremonies and design work.

### Skills (11)

| Skill | What it does | Say this to activate |
|-------|--------------|----------------------|
| `rcode-product-brief` | 1–2 page executive brief (input to PRD) | "create a product brief" or `/rcode-product-brief` |
| `rcode-prfaq` | Amazon Working Backwards PRFAQ challenge | "create a PRFAQ" or `/rcode-prfaq` |
| `rcode-edit-prd` | Revise an existing PRD | "edit the PRD" or `/rcode-edit-prd` |
| `rcode-validate-prd` | Check PRD completeness and consistency | "validate the PRD" or `/rcode-validate-prd` |
| `rcode-create-epics-and-stories` | Expand PRD → epics → stories batch | "create epics" or `/rcode-create-epics-and-stories` |
| `rcode-create-architecture` | Write an Architecture Decision Record (ADR) | "write an ADR" or `/rcode-create-architecture` |
| `rcode-create-ux-design` | UX flows, wireframes, design system | "create UX design" or `/rcode-create-ux-design` |
| `rcode-frontend-design` | Typography, colours, motion, spatial design | "design this UI" or `/rcode-frontend-design` |
| `rcode-qa-generate-e2e-tests` | Generate end-to-end test cases | "generate e2e tests" or `/rcode-qa-generate-e2e-tests` |
| `rcode-retrospective` | Run a retro, capture action items | "run retrospective" or `/rcode-retrospective` |
| `rcode-new-milestone` | Create milestone definition | "create a milestone" or `/rcode-new-milestone` |

### Agents (8)

Waleed (CTO) · Ahmed Al Hassani (tech director) · Layla (designer) · Zahra (branding) · Haitham (frontend) · Yousef (backend) · Fatima (QA) · Hussain-SM (scrum master).

---

## 🌳 Ultra Advanced — Power User Workflows

For multi-agent consultation, reverse engineering, project recovery, and deep context work.

### Skills (8)

| Skill | What it does | Say this to activate |
|-------|--------------|----------------------|
| `rcode-check-implementation-readiness` | Verify alignment before dev | "check implementation readiness" or `/rcode-check-implementation-readiness` |
| `rcode-correct-course` | Pivot mid-project with minimal disruption | "course correct" or `/rcode-correct-course` |
| `rcode-clone-website` | Reverse-engineer a website (CSS + content + layout) | "clone this website" or `/rcode-clone-website` |
| `rcode-document-project` | Auto-generate full project docs for AI agents | "document this project" or `/rcode-document-project` |
| `rcode-generate-project-context` | Extract conventions, stack, patterns → `.rcode/project-context.md` | "generate project context" or `/rcode-generate-project-context` |
| `rcode-checkpoint-preview` | LLM-assisted human-in-the-loop review | "checkpoint" or `/rcode-checkpoint-preview` |
| `research` | Generic multi-source research skill | "research [topic]" |
| `rcode-brainstorming` | Structured brainstorming workflow | "brainstorm" or `/rcode-brainstorming` |

### Agents (7)

Majlis (multi-agent council) · Raees (orchestrator) · Zayd (ML) · Hanzla (engineer) · Omar (engineer) · Mariam (marketing) · Noor (writer) · Khalid (DevOps).

### Power tools

- `pnpm dlx @hanzlaa/rcode dashboard` — launches Diwan view-only dashboard on :7717
- `pnpm dlx @hanzlaa/rcode digest` — compact agent summaries
- `pnpm dlx @hanzlaa/rcode github-sync` — sync phases/epics/stories to GitHub issues
- `pnpm dlx @hanzlaa/rcode context --refresh` — refresh memory bank from current repo state

---

## 📐 Standards — For Contributors

If you're contributing to rcode itself (not just using it), read [`STANDARDS.md`](./STANDARDS.md).

Covers:
- 5-component skill spec (YAML header, overview, workflow, output format, examples)
- Conventional Commits (no AI attribution)
- File size limits (1000 lines max)
- PR template compliance
- Never-push-to-main rule

---

## 🧪 Preview — v2

v2 has been merged into the main methodology — there is no separate `rcode/v2/` directory anymore. All 41 agents, 96 commands, and 80 skills ship through the single `cli/install.js` installer. See [`V2-PREVIEW.md`](./V2-PREVIEW.md) for migration notes.

---

## CLI Commands at a Glance

Grouped by purpose (full help: `pnpm dlx @hanzlaa/rcode help`):

### Project commands
`install` · `update` · `uninstall` · `config` · `context` · `github-sync`

### Team commands
`team` · `digest` · `show-model` · `dashboard`

### Meta commands
`doctor` · `tiers` · `set-profile` · `set-mode` · `version` · `help`

---

## How to use this document

- **Learning rcode?** Do the Starter tier end-to-end on a real small project.
- **Picking up in the middle?** Jump to Advanced for the skill you need.
- **Going deep?** Ultra Advanced has the multi-agent + recovery tooling.
- **Contributing?** Read Standards.

Keep what you need visible, ignore the rest.
