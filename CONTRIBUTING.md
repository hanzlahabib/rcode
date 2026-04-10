# Contributing to Rihal Code

Thank you for contributing. These guidelines exist to keep the module maintainable and impressive when demoed.

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
