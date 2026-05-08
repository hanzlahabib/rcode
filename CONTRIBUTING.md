# Contributing to Rihal Code

Thank you for contributing. These guidelines exist to keep the module maintainable and impressive when demoed.

> **Before you contribute, also read:**
> - [`BRAND.md`](BRAND.md) — voice, naming conventions, persona glossary
> - [`AGENTS.md`](AGENTS.md) — non-negotiable rules for AI coding agents (commit policy, push policy, off-limits files)
> - [`MIGRATIONS.md`](MIGRATIONS.md) — every renamed/dropped surface in the rcode improvement programme
> - [`MEMORY_BANK.md`](MEMORY_BANK.md) — Memory Bank specification
> - [`TASKS.md`](TASKS.md) — master task tracker driving GitHub issues

---

## Architecture overview — what are all these files?

Before you touch anything, you need a mental model of how the four building blocks fit together. Every feature in Rihal Code is assembled from the same four pieces.

### The four building blocks

| Layer | Where | What it is |
|-------|-------|-----------|
| **Command** | `rihal/commands/*.md` | The slash command entry point — what you type in Claude Code |
| **Workflow** | `rihal/workflows/*.md` | Step-by-step orchestration instructions for multi-step tasks |
| **Skill** | `rihal/skills/actions/*/SKILL.md` | Deep, domain-specific instructions for complex multi-stage tasks |
| **Agent** | `rihal/agents/*.md` + `rihal/skills/agents/*/SKILL.md` | A specialized persona spawned by a workflow or skill to do focused work |

### Commands — the entry point

A command file is tiny. It registers a slash command in Claude Code's UI and points at the logic that handles it:

```markdown
---
name: rihal-prfaq
description: Working Backwards PRFAQ challenge
allowed-tools: [Read, Write, Agent, AskUserQuestion, WebSearch]
---

@.rihal/skills/rihal-prfaq/SKILL.md
```

That `@-include` line tells Claude to load the target file's contents as context. Without a command file, a skill is unreachable via `/` — it can only be triggered by describing the task in natural language.

**Rule:** Every capability intended to be user-typed as `/rihal-something` needs a matching `rihal/commands/something.md`.

### Workflows — orchestration logic

Workflows are prose instructions — markdown files Claude reads as a script to follow. They handle control flow: read state, ask a question, dispatch to a sub-workflow, report results. Most slash commands point to a workflow:

```
/rihal-audit  →  commands/audit.md  →  @workflows/audit.md
```

Workflows are the right tool when the task is a sequence of steps that Claude drives (check state → ask user → run something → report). They should not contain deep domain knowledge — that belongs in skills.

### Skills — deep domain knowledge

Skills go deeper than workflows. A skill like `rihal-prfaq` has its own folder with multi-stage reference files, sub-agent definitions, and templates:

```
rihal/skills/actions/1-analysis/rihal-prfaq/
├── SKILL.md                   ← main entry, loaded by the command
├── references/
│   ├── press-release.md       ← Stage 2 instructions
│   ├── customer-faq.md        ← Stage 3
│   ├── internal-faq.md        ← Stage 4
│   └── verdict.md             ← Stage 5
├── agents/
│   ├── artifact-analyzer.md   ← sub-agent spawned inline
│   └── web-researcher.md
└── assets/
    └── prfaq-template.md
```

Skills are the right tool when the task has multiple stages, needs sub-agent parallelism, or carries domain-specific coaching logic (e.g., how to run a PRFAQ gauntlet, how to do a Karpathy code review).

Skills have **two activation paths**:
1. **Via command** — `/rihal-prfaq` loads the SKILL.md directly
2. **Phrase-activated** — when a user describes the task, Claude picks up the skill from its `description` field in the YAML frontmatter

### Agents — focused specialists

Agents are spawned by workflows and skills to do a specific job. They have a persona, a set of tools, and deferral rules (Hanzla defers to Waleed on architecture; Waleed defers to Sadiq on whether to build).

There are two kinds:

**Sub-agents** live inside skill folders (`rihal/skills/agents/*/SKILL.md`). They're invoked by their parent skill, not by the user directly. Example: the PRFAQ skill spawns `artifact-analyzer` and `web-researcher` in parallel during Stage 1.

**Council agents** live in `rihal/agents/*.md`. They're the named characters (Waleed, Hanzla, Fatima, Sadiq…) that `/rihal-council` assembles into a panel. These are installed to `.claude/agents/` and can be spawned from any workflow.

### How they chain for a real request

```
User types:  /rihal-council "Should we use Redis?"
                   │
         commands/council.md          ← slash command entry
                   │ @-includes
         workflows/council.md         ← orchestration: pick agents, frame question
                   │ spawns (parallel)
        ┌──────────┴───────────────┐
        ▼                          ▼
  agents/rihal-waleed.md     agents/rihal-sadiq.md
  (architecture answer)      (strategic kill criteria)
        └──────────┬───────────────┘
                   ▼
        synthesize → output to user
```

A more complex chain involving a skill:

```
User types:  /rihal-prfaq
                   │
         commands/prfaq.md
                   │ @-includes
         skills/rihal-prfaq/SKILL.md   ← Stage 1: ignition + context gathering
                   │ spawns (parallel)
        ┌──────────┴────────────────────┐
        ▼                               ▼
  skills/.../artifact-analyzer.md   skills/.../web-researcher.md
        └──────────┬────────────────────┘
                   ▼
         references/press-release.md    ← Stage 2: loaded by SKILL.md
         references/customer-faq.md     ← Stage 3
         references/verdict.md          ← Stage 5: output + PRD distillate
```

### Which layer do I edit?

| I want to… | Edit this |
|-----------|-----------|
| Add a new `/rihal-something` slash command | Create `rihal/commands/something.md` pointing to a workflow or skill |
| Change the steps in an existing command | Edit the workflow it points to |
| Improve how a persona thinks (Hanzla, Waleed, etc.) | Edit `rihal/skills/agents/<name>/SKILL.md` or `rihal/agents/<name>.md` |
| Add a new agent to `/rihal-council` | Edit `rihal/agents/team.yaml` + add agent file |
| Improve a complex multi-stage task (PRFAQ, code review, etc.) | Edit the skill's stage reference files |
| Add a new skill triggered by natural language | Create `rihal/skills/actions/<category>/<name>/SKILL.md` — no command file needed if slash is not required |
| Fix a broken `@-include` reference | Check that the target file exists at `.rihal/<path>` after install |

### The install chain

The source tree in `rihal/` is **not what Claude reads at runtime**. On install, `cli/install.js` copies everything into `.rihal/` and `.claude/`. When a command `@-includes` `.rihal/workflows/audit.md`, it's reading the installed copy. If you edit the source but don't reinstall, Claude still sees the old version.

```bash
# After editing source files:
node cli/install.js . --force-overwrite --yes
```

This is why the compliance check runs against the source tree but the reload window step (after install) is what actually activates your changes.

---

## Who owns what — contribute to YOUR slice

Rihal Code v2 is organized around **role ownership** (issue #160). Find your role, touch only that slice, open a focused PR. CODEOWNERS in `.github/CODEOWNERS` routes reviews automatically.

| I am a… | Touch this | Why you'd edit |
|---------|-----------|----------------|
| **PM / Scrum Master** | `rihal/skills/agents/hussain-pm/`, `hussain-sm/`, `raees-orchestrator/` + `rihal/skills/actions/2-plan/` + `actions/1-analysis/` | Sharper PRD questions, better story templates, sprint-planning that matches how Rihal runs sprints |
| **CTO / Architect** | `rihal/skills/agents/waleed-architect/`, `ahmed-hassani-director/`, `nasser-eng-manager/` + `rihal/skills/actions/3-solutioning/` | ADR structure, tech-selection criteria reflecting Rihal stack biases, arch-review gates |
| **Designer / UX** | `rihal/skills/agents/layla-designer/`, `zahra-branding/` + `rihal/skills/actions/2-plan/rihal-create-ux-design/`, `rihal-frontend-design/` | Stronger design critiques, accessibility checks, Arabic-first RTL guidance |
| **Backend / Frontend / ML** | `rihal/skills/agents/yousef-backend/`, `haitham-frontend/`, `zayd-ml/`, `hanzla-engineer/` + `rihal/skills/actions/4-implementation/` | Code-review checklists that catch the bugs Rihal sees in production, sprint capacity rules from lived experience |
| **QA / Writer** | `rihal/skills/agents/fatima-qa/`, `noor-writer/` | Edge-case hunters, documentation patterns (README / API / ADR) |
| **Strategy / Marketing** | `rihal/skills/agents/sadiq-analyst/`, `mariam-marketing/`, `majlis-council/` + `rihal/skills/actions/1-analysis/` | Kill-criteria framing, GCC-first GTM patterns, council panel heuristics |
| **Any role, cross-cutting rule** | `rihal/skills/_shared/` | **Rarely.** A change here affects every skill referencing the fragment. Bring a clear motivating failure; expect extra scrutiny. |
| **Infra / CLI / workflows** | `rihal/bin/`, `cli/`, `rihal/workflows/`, `rihal/commands/`, `.github/` | New CLI subcommands (follow the `rihal-tools state sync` / `brain pull` patterns), new slash commands, CI tweaks |
| **Rihal standards / brain content** | `rihal/brain/` + `rihal/skills/_shared/` | New cross-project Rihal standards. After issue #162 (M5), upstream Rihal-docs-repo changes flow here via `brain pull`. |

### The four-step pattern

1. **Branch off `main`:** `git checkout -b <role>/<short-slug>` (e.g. `pm/sharper-prd-questions`).
2. **Edit one slice.** If you touch multiple roles' slices in one PR, split it.
3. **Run the compliance check** (below in [Pull Request Standards](#pull-request-standards)).
4. **Open PR.** CODEOWNERS auto-requests the right reviewer. Conventional Commits title. No AI attribution in messages.

Example — a PM improving the PRD discovery step:

```bash
git checkout -b pm/sharper-prd-discovery
# edit rihal/skills/actions/2-plan/rihal-create-prd/steps-c/step-02-discovery.md
# run the compliance check
git commit -am "feat(skills): sharper PRD discovery on pricing models"
gh pr create --title "feat(skills): sharper PRD discovery on pricing models"
```

---

## Adding a New Agent — Registration Checklist

When you add a new agent to `rihal/team.yaml`, update **all** of these locations to keep parity tests green:

| File | What to add |
|------|-------------|
| `rihal/team.yaml` | Agent entry with `id`, `name`, `role`, `domain_keywords` |
| `rihal/agents/rihal-<id>.md` | Agent persona stub |
| `rihal/skills/agents/<slug>/SKILL.md` | Full skill definition (5-component standard) |
| `.claude/skills/rihal-<id>/SKILL.md` | Installed skill copy (or let install sync it) |
| `rihal/workflows/do.md` | Routing alias row in the persona table |
| `rihal/workflows/discuss.md` | Add to single-agent dispatch list |
| `rihal/bin/rihal-tools.cjs` `QUALITY_AGENTS` | Add model assignment if the agent is `quality` tier |
| `README.md` team table | Add a row for the new persona |
| `server/dashboard.js` roster | Add to dashboard display roster |

**Parity tests that will fail if you miss a location:**
- `agent-team-parity.test.cjs` — team.yaml ↔ agent files
- `agents-registry.test.cjs` — agent registry consistency
- `help-md-parity.test.cjs` — any new command stubs

Run `node --test` before opening a PR.

---

## 🚨 Critical Rule — Never Auto-Push

**AI agents and automation tools working on this repository MUST NEVER push to any remote without explicit, interactive user approval on every push.**

- Commits may be created by agents, but pushes require a human saying "push it" or the user running `git push` themselves.
- CI workflows in `.github/workflows/` are triggered on PR events; they do NOT auto-commit or auto-push.
- If an agent is unsure whether a push is authorized, it must stop and ask.
- This rule applies even when an agent is in "autonomous" or "run until done" mode. No exceptions.

**Why:** Pushed code is public. It affects colleagues, CI systems, and downstream consumers. Authorization is per-push, not per-session.

---

## Branching Strategy

- `main` — protected, ships to the marketplace / production
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`
- Refactors: `refactor/<short-description>`
- Docs: `docs/<short-description>`

Branch off `main`, rebase before opening a PR.

---

## Commit Message Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) format. The `semantic-pull-request` workflow enforces this on PR titles.

### Format
```
<type>(<scope>): <subject>
```

### Allowed types
- `feat` — new feature (agent, skill, workflow)
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting, no code change
- `refactor` — code change that's not a feature or fix
- `test` — adding or updating tests
- `chore` — tooling, dependencies, meta work
- `perf` — performance improvement
- `revert` — reverting a previous commit

### Allowed scopes (for Rihal Code)
- `agents` — agent persona files
- `skills` — action or agent skills
- `workflows` — multi-step workflows
- `commands` — `rihal/commands/*.md` slash command files
- `templates` — memory bank or pitch templates
- `dashboard` — Majlis/Diwan server
- `docs` — README, METHODOLOGY, SKILLS_INDEX, USER-GUIDE, FAQ
- `config` — team.yaml, config.yaml
- `github` — CI/CD, issue templates, PR templates
- `cli` — `cli/*.js` and `rihal/bin/rihal-tools.cjs`
- `state` — `.rihal/state.json` and state-manipulation code paths
- `refs` — files inside `rihal/references/`
- `hooks` — `.claude/hooks/*` and install-time hook wiring
- `install` — installer flow, manifest, side-effects
- `memory` — Memory Bank distillates and templates
- `brand` — branding/voice across surfaces
- `ci` — CI workflow YAML and gating logic
- `release` — version bumps, CHANGELOG, npm publish artifacts
- `meta` — repo-level files (AGENTS.md, CONTRIBUTING.md, this list)
- `tasks` — TaskCreate/TaskUpdate-shaped task tracking
- `migrations` — schema/data migrations between versions
- `parity` — drift gate / parity test additions
- `triggers` — multilingual trigger phrase additions
- `dogfood` — `scripts/dogfood-check.sh` and self-test gates
- `state` — state.json schema or sync logic
- `namespace` — namespace standardization across files
- `planning` — `.planning/` artifacts (STATE.md, ROADMAP.md, REQUIREMENTS.md)
- `insights` — runtime insight surfaces
- `help` — help.md content
- `roadmap` — `.planning/ROADMAP.md` edits
- `session` — session reports / closing notes
- `audits` — `.planning/audits/` artifacts
- `execute` — execute workflow
- `executor` — executor agent
- `plan` — plan workflow
- `planner` — planner agent
- `readme` — README.md
- `sync` — install/state sync flows
- `sprint` — sprint-level workflow additions and fixes
- `agent-exp` — agent experience improvements
- `extensibility` — extensibility and plugin hooks
- `lens-audit` — 15-lens audit system and lenses
- `tiers` — TIERS.md and tier-related documentation
- `build` — `scripts/build.cjs`, esbuild config, bundle artifacts
- `council` — `/rihal-council` workflow + spawning logic
- `doctor` — `cli/doctor.js` health checks
- `postinstall` — `cli/postinstall.js` lifecycle hook
- `progress` — `/rihal-progress` workflow
- `security` — security guardrails (symlink guards, integrity checks)
- `test` — test files under `test/` (test-only changes)
- `tools` — `rihal/bin/rihal-tools.cjs` subcommands
- `uninstall` — `cli/uninstall.js` flow
- `update` — `cli/update.js` flow
- `changelog` — CHANGELOG.md edits
- `<phase-id>` — numeric phase scope when committing inside a phase (e.g. `docs(15)`, `feat(8.3)`)
- `<sprint-id>` — numeric sprint scope inside a phase (e.g. `feat(15.1)`)

### Subject rules
- Lowercase first letter (enforced by `semantic-pull-request`)
- Imperative mood: "add agent" not "added agent"
- No trailing period
- Under 72 characters

### Examples

```
feat(agents): add Mariam marketing lead agent
fix(skills): correct rihal-dev-story trigger phrases
docs(readme): update team roster with 17 agents
refactor(dashboard): rename Majlis to Diwan for view-only role
chore(github): import Siraaj commit and PR rules
```

---

## Pull Request Standards

### Before opening a PR

1. **Rebase on `main`** to avoid merge commits
2. **Run the compliance check** for any modified skills:
   ```bash
   for f in rihal/skills/agents/*/SKILL.md rihal/skills/actions/*/SKILL.md; do
     grep -q "^## Output Format" "$f" || echo "MISSING Output Format: $f"
     grep -q "^## Examples" "$f" || echo "MISSING Examples: $f"
   done
   ```
3. **Test the dashboard** still runs:
   ```bash
   RIHAL_DIR=$(pwd)/examples/.rihal node server/dashboard.js
   # Check http://localhost:7717
   ```
4. **Grep for regressions:**
   ```bash
   grep -rn -i "TODO" rihal docs examples README.md server   # should be empty
   grep -rn "ahmed" rihal docs README.md server | grep -v "ahmed-hassani\|Ahmed Al Hassani"   # should be empty
   ```

### PR title
Must follow Conventional Commits format (see above). The `semantic-pull-request` workflow will block non-compliant titles.

### PR description
Use the template in `.github/pull_request_template.md`. Fill every applicable section.

### PR review
- At least one approval required
- Self-review: walk through the diff yourself first
- Tag reviewers: specialist agents for their domain (FE changes → Haitham, BE changes → Yousef, etc.)
- Responses to review comments should be explicit: "Fixed in commit X" or "Won't fix because Y"

### Merge strategy
- **Squash and merge** for feature branches (default)
- **Rebase and merge** for bug fixes and small changes
- **Never merge commits** — they pollute history

---

## Code Style

### Markdown
- Use ATX-style headings (`#`, `##`, `###`)
- Code blocks with language tags (`\`\`\`typescript`, not plain `\`\`\``)
- Lists: `-` not `*`
- Wrap at 100 chars where possible; long URLs and tables may exceed

### YAML
- 2-space indent (never tabs)
- Quoted strings only when necessary
- Comments with `#` starting at column 0

### Node.js (dashboard server)
- No dependencies — pure Node stdlib
- Single file (`server/dashboard.js`)
- No frameworks, no build step
- Error handling at function boundaries

---

## Running the test suite

The project ships with a `node:test`-based test suite for every critical library
in `cli/lib/`. Zero dependencies, zero secrets, no network, no `gh` CLI.
A fresh clone can run the full suite with nothing but Node.js installed.

```bash
# From the repo root
node --test                 # runs every test/lib/*.test.cjs file
# or via npm / pnpm
pnpm test                    # equivalent to `node --test`
pnpm run test:ci             # spec reporter, friendlier in CI logs
```

Expected output on a clean main:

```
ℹ tests 139
ℹ pass 139
ℹ fail 0
```

If a test fails on your fork but passes on main, rebase first — it's almost
always a stale fixture. If it still fails, that's a real regression; include
the failing output in your PR description so reviewers can reproduce.

### What the test suite covers

Every library in `cli/lib/` has a dedicated test file in `test/lib/`:

| Library | Test file | Coverage |
|---|---|---|
| `fsutil.cjs` (atomic writes) | `fsutil.test.cjs` | Idempotency, cleanup on failure, custom modes |
| `config.cjs` (3-level cascade) | `config.test.cjs` | Merge order, validation, typo suggestions |
| `memory-bank.cjs` (staleness) | `memory-bank.test.cjs` | Fingerprinting, manifest drift, structure drift |
| `manifest.cjs` (install verification) | `manifest.test.cjs` | Drift detection against real package source |
| `sprint-state.cjs` (per-sprint state machine) | `sprint-state.test.cjs` | CRUD, status transitions, cross-sprint queries |
| `handoff.cjs` (pause/resume) | `handoff.test.cjs` | Singleton semantics, force overwrite, clear |
| `milestones.cjs` (top-level organizing) | `milestones.test.cjs` | Frontmatter linkage, resolution walk, history |
| `session-log.cjs` (searchable logs) | `session-log.test.cjs` | Write, list, topic search, frontmatter parse |
| `permanent-memory.cjs` (auto-archive) | `permanent-memory.test.cjs` | Section routing, archive trigger, ordering |
| `story-commit.cjs` (commit formatter) | `story-commit.test.cjs` | Trailer emission, label validation, suggestions |

### Adding a new test

1. Pick the matching library file in `cli/lib/`
2. Open (or create) `test/lib/<name>.test.cjs`
3. Require the library and `test/helpers.cjs`
4. Use `makeTempDir()` and `t.after(() => cleanup(dir))` so every test gets its own sandbox
5. Follow `node:test` conventions — `test('...', (t) => { ... })`

Every test **must**:
- Run offline (no network, no `gh` CLI, no real git remotes)
- Use `os.tmpdir()` via `helpers.makeTempDir()` — never touch the contributor's real filesystem
- Clean up after itself (register `t.after`)
- Finish in under 100ms ideally (libraries are pure; I/O should be tempfile-only)

Every test **must not**:
- Depend on the contributor's real `~/.rihal-code/defaults.json` — use `withStubbedHome` from `test/lib/config.test.cjs` as the pattern
- Call `process.exit()` from test code (tests run in the same process; this would kill the runner)
- Write to `console.log` for assertions — use `node:assert` functions instead
- Add a new npm dependency (runtime or dev) — see the "Zero-dep invariant" CI job below

### CI

GitHub Actions runs the suite on every push and pull request across Node 18, 20, 22, and 24.
See `.github/workflows/test.yml`. A separate job enforces the zero-dep invariant — the PR is
blocked if `package.json` gains any `dependencies` or `devDependencies`.

A third job runs `node -c` against every file in `cli/` to catch syntax errors that would
only surface at install time.

---

## Testing Your Changes

### For agents/skills
1. Grep for compliance (see above)
2. Walk through the Examples in the SKILL.md — do they match what the skill would actually do?
3. Verify negative tests — the skill should NOT fire on the listed negative inputs

### For dashboard changes
1. `node server/dashboard.js` starts cleanly
2. Visit `http://localhost:7717` — all sections render
3. Stop with `kill $(lsof -t -i:7717)`

### For new workflows
1. Read the workflow instructions end-to-end as if executing it
2. Check for dead references (files that don't exist, skills that aren't registered)
3. Verify it saves outputs to the correct `.rihal/` subdirectory

---

## Issue Templates

When filing an issue, use the appropriate template in `.github/ISSUE_TEMPLATE/`:
- **Bug report** — something is broken
- **Feature request** — new agent, skill, or capability
- **Task** — small maintenance item
- **Epic** — multi-PR initiative

---

## What Gets Rejected

- PRs that auto-push (no such thing — see critical rule)
- Skills missing any of the 5 standard components
- Commits with Claude/AI attribution in the message (not needed, and noisy)
- Changes that break the dashboard server
- Renames that leave stale references
- "Refactors" that also add unrelated features

---

## Questions?

Open an issue with the `question` label, or discuss in the Rihal team Slack if you're internal.

Thank you for making Rihal Code better. Every improvement compounds across every project that uses it.

— Hanzla Habib
