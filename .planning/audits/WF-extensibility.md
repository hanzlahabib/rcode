# WF-extensibility — Workflow Audit

**Lens:** Extensibility — how hard is it for a user to add a custom command/skill/agent?  
**Date:** 2026-09-16  
**Auditor:** parallel audit run, lens-extensibility

---

## Verdict

The extensibility surface *looks* complete from the outside — `scaffold-skill` exists, `CONTRIBUTING.md` has a checklist, and the install pipeline has distinct layers for commands, skills, agents, and workflows. In practice, every one of those four pathways has at least one broken joint: scaffold-skill writes to directories that don't exist in the walked path, three dev-practice skills are permanently invisible because their bucket is not in the installer loop, agent registration requires 9 manual file edits with no scaffold tooling, and a custom agent is unreachable via the persona-dispatch system the user actually uses. The extensibility story is **leaky** — structurally present, but silently broken in ways a user can't diagnose without reading source.

---

## The user's actual experience

### Adding a custom skill

1. User reads `DOCS.md` § "Adding a custom command" (line 718) and finds a path that reads as reasonable: create the file, run `npx @hanzlaa/rcode install`, done.
2. User runs `/rcode-scaffold-skill --role pm --name my-discovery-skill` (the command exists: `rcode/commands/scaffold-skill.md`).
3. The command delegates to `rcode/workflows/scaffold-skill.md` Step 1, which maps `--role pm` → target dir `rcode/skills/actions/1-discovery/rcode-my-discovery-skill/` (`scaffold-skill.md:31`).
4. **The directory `1-discovery` does not exist.** `rcode/skills/actions/` contains `1-analysis`, `2-plan`, `3-solutioning`, `4-implementation`. `1-discovery` is created fresh by the skill write, but it is **outside every bucket walked by `installSkills()`**, which only walks `['agents', 'actions', 'core', 'seo']` (`cli/lib/install-skills.cjs:155`). The new skill lands in `actions/1-discovery/` but `installSkills` walks `actions/<bucket>` looking for SKILL.md files — so the skill never reaches `.claude/skills/`.
5. User runs `npx @hanzlaa/rcode install`, inspects `.claude/skills/`, finds the skill absent. No error is reported.

**Role-to-directory mismatches in scaffold-skill.md Step 1:**

| Role flag | Scaffold writes to | Real directory |
|-----------|-------------------|----------------|
| `pm` | `actions/1-discovery/` | does not exist (`1-analysis` exists) |
| `architect` | `actions/2-planning/` | does not exist (`2-plan` exists) |
| `engineer/frontend/backend/ml` | `actions/4-implementation/` | ✅ matches |
| `qa` | `actions/5-verification/` | does not exist |
| `designer/branding` | `actions/3-design/` | does not exist (`3-solutioning` exists) |
| `marketing/writer/…` | `actions/6-other/` | does not exist |

Only `engineer`/`frontend`/`backend`/`ml` → `4-implementation` survives install intact.

### Adding a dev-practices skill (nextjs, react, llm-engineering)

The three skills in `rcode/skills/dev-practices/` (`nextjs-best-practices`, `react-best-practices`, `llm-engineering-best-practices`) have no `internal: true` frontmatter, meaning they are intended to be user-facing. They are never installed because `dev-practices` is not in the `installSkills` bucket list (`cli/lib/install-skills.cjs:155`). A user who reads the repo sees these files; a user who installs via npx never gets them. No warning, no mention in docs.

### Adding a custom agent

1. User reads `CONTRIBUTING.md:189–200` "Adding a New Agent" checklist.
2. The checklist lists 9 locations to update:
   - `rcode/team.yaml` — add agent entry
   - `rcode/agents/<id>.md` — create agent stub
   - `rcode/skills/agents/<id>/SKILL.md` — create dispatch skill
   - `.claude/skills/rcode-<id>/SKILL.md` — copy skill (or re-install)
   - `rcode/workflows/do.md` — add persona alias to routing table
   - `rcode/workflows/discuss.md` — add to dispatch list
   - `rcode/bin/rcode-tools.cjs` — add to `QUALITY_AGENTS` array
   - `README.md` — update team table
   - `server/dashboard.js` — update roster
3. No `/rcode-scaffold-agent` command exists. The user must perform all 9 edits by hand.
4. Even after all 9 edits, the custom agent cannot be addressed via `@persona CODE` shorthand, because `do.md` contains a **hardcoded** persona alias table (`rcode/workflows/do.md:56–63`) that maps only the pre-defined team names. A custom agent added to `team.yaml` is not in this table and cannot be reached via the `do` dispatcher without editing `do.md` itself.
5. The `.local.md` override mechanism (`.claude/agents/<id>.local.md`) is mentioned in one line of `cli/install.js:1127` and nowhere in user-facing docs or CONTRIBUTING.md. It is the intended per-project agent customization path, but a user has no reason to know it exists.

### Adding a custom command

1. User follows `DOCS.md:718` guidance: create `rcode/commands/<name>.md`, create a matching workflow, re-install.
2. This is the *package source tree approach*. It works for contributors editing the rcode repo itself.
3. For a consumer project (installed via npx), the user's project does not have a `rcode/commands/` source tree — they have only the installed `.claude/commands/` output. There is no documented path to add a project-local command that survives reinstall.
4. Custom commands placed directly in `.claude/commands/` *do* survive `install` (the installer does not delete unknown files, per `cli/lib/install-plan.cjs` behavior) but this is undocumented; the user must discover it by reading source.

---

## Leaks

**L1 🔴 scaffold-skill writes to non-existent action subdirs**  
Evidence: `rcode/workflows/scaffold-skill.md:31–38` role-to-dir table vs `rcode/skills/actions/` actual dirs.  
User-facing cost: scaffolded skills for pm, architect, qa, designer, marketing, writer, eng-manager, analyst, director, scout roles are created in directories that do not exist in the walked path and are silently never installed. Only `engineer`/`frontend`/`backend`/`ml` work end-to-end.

**L2 🔴 `dev-practices` bucket missing from installSkills**  
Evidence: `cli/lib/install-skills.cjs:155` — `for (const bucket of ['agents', 'actions', 'core', 'seo'])`.  
Three user-facing skills (`nextjs-best-practices`, `react-best-practices`, `llm-engineering-best-practices`) exist in the repo but are never delivered to consumers. No error, no warning.

**L3 🔴 Custom agents can't be reached via persona dispatch**  
Evidence: `rcode/workflows/do.md:56–63` hardcoded alias table; `CONTRIBUTING.md:189` 9-step checklist that doesn't mention this constraint.  
User follows the checklist completely and their agent is still unreachable via the primary dispatch mechanism. The checklist is misleading — it implies registration is sufficient.

**L4 🟡 No `scaffold-agent` command despite 9-step manual checklist**  
Evidence: `CONTRIBUTING.md:189–200`; no `rcode/commands/scaffold-agent.md` in the repo.  
Scaffolding a skill has a command; scaffolding an agent requires 9 manual edits across 9 different files with no tooling, no validation, and no feedback if one is missed.

**L5 🟡 Agent contract spec is entirely aspirational**  
Evidence: `rcode/references/agent-contracts.md` documents `inputs`/`outputs`/`side_effects`/`halt_conditions`/`on_failure` YAML spec; `grep -l "^inputs:" rcode/agents/*.md` returns 0 results across all 46 agents.  
A user reading `agent-contracts.md` who tries to follow the spec produces a non-conforming file relative to every real agent. The spec is dead documentation that misleads contributors.

**L6 🟡 `.local.md` override mechanism is undiscoverable**  
Evidence: `cli/install.js:1127` — single mention in installer output only; absent from CONTRIBUTING.md, DOCS.md, and any workflow.  
The correct consumer-project path for per-project agent customization is invisible to users who don't read the install log carefully or study install.js source.

**L7 🟢 Consumer command-add path is undocumented**  
Evidence: `DOCS.md:718` describes the source-tree contributor path; no documentation of `.claude/commands/<name>.md` as a valid project-local extension point.  
Users who want project-local commands have no documented path and discover the behavior (install doesn't clobber unknowns) only by accident or source inspection.

**L8 🟢 Only `/rcode-do` gets a sidebar stub**  
Evidence: `cli/generate-command-skills.cjs:48` — `SIDEBAR_COMMANDS = new Set(['do'])`.  
116 commands are slash-autocomplete only. A user browsing the sidebar sees only `/rcode-do`. This is a deliberate budget choice (issue #710) but is undocumented and creates a confusing discoverability gap.

---

## Strengthenings

**S1 — Fix scaffold-skill role→directory table**  
What: Update `rcode/workflows/scaffold-skill.md` Step 1 table to use the actual directory names (`1-analysis`, `2-plan`, `3-solutioning`, `4-implementation`). Remove roles that map to non-existent directories or map them to `4-implementation` as a safe fallback.  
Why: Currently 10 of 12 role flags write to non-existent paths. This is the highest-impact fix because scaffold-skill is the primary extensibility onboarding path.  
Effort: S  
Files: `rcode/workflows/scaffold-skill.md`

**S2 — Add `dev-practices` to installSkills bucket list**  
What: Add `'dev-practices'` to the bucket array at `cli/lib/install-skills.cjs:155`.  
Why: Three user-facing skills (nextjs, react, llm-engineering best practices) are silently never installed. Single-line fix.  
Effort: S  
Files: `cli/lib/install-skills.cjs`

**S3 — Document `.local.md` override in CONTRIBUTING.md and DOCS.md**  
What: Add a "Per-project agent customization" section explaining `.claude/agents/<id>.local.md` with an example.  
Why: This is the correct consumer path for agent customization and is completely undiscoverable.  
Effort: S  
Files: `CONTRIBUTING.md`, `DOCS.md`

**S4 — Add scaffold-agent command**  
What: Create `rcode/commands/scaffold-agent.md` + `rcode/workflows/scaffold-agent.md` that automates the 9-step checklist: generates the agent stub, SKILL.md, team.yaml entry, and prints the remaining manual steps (do.md alias, dashboard.js) with exact insertion points.  
Why: The asymmetry between scaffold-skill (has a command) and add-agent (9 manual steps) is the sharpest friction point for extensibility.  
Effort: M  
Files: `rcode/commands/scaffold-agent.md`, `rcode/workflows/scaffold-agent.md`

**S5 — Document consumer command extension path in DOCS.md**  
What: Add a "Adding a project-local command (consumer install)" section explaining: place `<name>.md` directly in `.claude/commands/`, use `@.rcode/workflows/<name>.md` delegation pattern, re-install won't clobber it.  
Why: The current docs describe the contributor path only, leaving consumer users with no documented extension path.  
Effort: S  
Files: `DOCS.md`

**S6 — Make do.md persona dispatch table data-driven from team.yaml**  
What: Replace the hardcoded alias table in `rcode/workflows/do.md:56–63` with a note that the personas are derived from `team.yaml` at dispatch time, and update the do.md workflow to read aliases from team.yaml dynamically (or at least document the constraint that custom agents added to team.yaml require a do.md edit).  
Why: A user who completes the 9-step registration checklist still can't use their agent via persona dispatch — the checklist is misleading.  
Effort: M  
Files: `rcode/workflows/do.md`, `CONTRIBUTING.md`

---

## Kill your darlings

**K1 — Delete or clearly mark `rcode/references/agent-contracts.md` as aspirational**  
The YAML contract spec (`inputs`, `outputs`, `side_effects`, `halt_conditions`, `on_failure`) is documented in full but implemented in zero of the 46 real agents. It is dead weight that misleads contributors into following a non-existent standard. Either delete it or add a top-of-file `> **Status: aspirational — no agents currently implement this spec.**` callout.

**K2 — Collapse the 9-step checklist into what's actually required vs. nice-to-have**  
`CONTRIBUTING.md:189–200` lists `README.md` table update and `server/dashboard.js` roster update as required steps. These are presentational and break nothing if omitted. Splitting the checklist into "required for agent to function" (4 steps) vs. "required for docs/dashboard consistency" (5 steps) would reduce the perceived barrier significantly.

**K3 — Either expand `SIDEBAR_COMMANDS` or remove the sidebar-stub generation entirely**  
`generate-command-skills.cjs` with `SIDEBAR_COMMANDS = new Set(['do'])` generates exactly one stub. If the intentional design is that commands are autocomplete-only, remove the generation script and the stub it produces to eliminate confusion. If the intent is sidebar discoverability, expand the set. The current state (a generator that generates almost nothing) is confusing infrastructure that implies more work was intended.
