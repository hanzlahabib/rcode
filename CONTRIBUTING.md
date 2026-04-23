# Contributing to Rihal Code

Thank you for contributing. These guidelines exist to keep the module maintainable and impressive when demoed.

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
- `templates` — memory bank or pitch templates
- `dashboard` — Majlis/Diwan server
- `docs` — README, METHODOLOGY, SKILLS_INDEX
- `config` — team.yaml, config.yaml
- `github` — CI/CD, issue templates, PR templates

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
