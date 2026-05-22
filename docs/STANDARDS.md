# rcode — Contributor Standards

For people **modifying rcode itself** (adding/editing skills, agents, workflows, or CLI). If you're just using rcode on your own project, you don't need this — see [`TIERS.md`](./TIERS.md).

The authoritative rules live in [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md). This file is a short index + quick reference.

---

## Non-Negotiables

1. **Never push to `main` without explicit human approval.** Every `git push` needs fresh authorization — past approval is not carry-over.
2. **No `--force` pushes.** Ever.
3. **No AI attribution in commits or PRs.** No "Generated with Claude", no "Co-Authored-By: Claude", no 🤖 emoji. Commits look like they were written by a human.
4. **Never bypass hooks** (`--no-verify`). If a hook fails, fix the underlying issue.

---

## 5-Component Skill Spec

Every skill under `rcode/skills/actions/*/SKILL.md` and `rcode/skills/agents/*/SKILL.md` MUST have:

1. **YAML trigger header** with `name`, `description`, 5–12 trigger phrases, and negative boundaries (`Do NOT use for...`).
2. **Overview paragraph** — what the skill does in 2–3 sentences.
3. **Workflow / instructions** — steps to execute (inline or via referenced prompt files).
4. **Output Format section** — concrete structure, constraints, what NOT to include.
5. **Examples section** — happy path + edge case + negative test.

Quick compliance check:
```bash
for f in rcode/skills/agents/*/SKILL.md rcode/skills/actions/*/SKILL.md; do
  grep -q "^## Output Format" "$f" || echo "MISSING Output Format: $f"
  grep -q "^## Examples" "$f" || echo "MISSING Examples: $f"
done
```

---

## Commits

- **Conventional Commits**: `type(scope): subject`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `revert`
- Allowed scopes: `agents`, `skills`, `workflows`, `templates`, `dashboard`, `docs`, `config`, `github`, `cli`
- Subject: lowercase first letter, imperative mood, no trailing period, <72 chars
- Stage specific files with `git add <files>` — never `git add .` or `git add -A` blindly

---

## Pull Requests

- Title follows Conventional Commits (enforced by `.github/workflows/semantic.yaml`)
- Use [`.github/pull_request_template.md`](../.github/pull_request_template.md) — fill every section
- Every skill change must pass the 5-component check above
- Every agent change must update: `team.yaml`, dashboard roster, README agent table

---

## File Size

- **Hard limit: 1000 lines per file.** Refactor before exceeding.
- **Soft target: 600 lines.** Start splitting at this point.
- Extract sub-components, custom hooks, prompt files, or step files instead of letting a file grow.

---

## Dependencies & Imports

- **Dashboard server (`server/dashboard.js`) stays dependency-free.** Pure Node stdlib. No frameworks.
- Never remove a dependency without explicit approval.
- Verify imports exist before referencing them.
- Never leave half-migrated code (old + new coexisting).

---

## Dashboard Server Rules

- Single file, no framework
- View-only — NEVER add write endpoints, POST handlers, or DB code
- Must start cleanly: `node server/dashboard.js`

---

## Scope Discipline

- Do EXACTLY what was asked — nothing more.
- No "while I'm here" refactors.
- No speculative abstractions.
- Don't create new files unless necessary — edit existing ones first.

---

## Before Merging

Run these three checks locally:

```bash
# 1. Skill compliance
for f in rcode/skills/agents/*/SKILL.md rcode/skills/actions/*/SKILL.md; do
  grep -q "^## Output Format" "$f" || echo "MISSING: $f"
  grep -q "^## Examples" "$f" || echo "MISSING: $f"
done

# 2. No stray TODOs
grep -rn -i "TODO" rcode docs examples README.md server   # should be empty

# 3. Dashboard boots
node server/dashboard.js
```

---

## Red Flags — Stop and Think

- About to `git push` → **STOP. Explicitly authorized for THIS push?**
- About to add a dependency → stop and ask
- About to delete files → stop and confirm
- About to modify `.github/workflows/*` → these affect CI; stop and explain
- About to edit `AGENTS.md`, `CLAUDE.md`, or `CONTRIBUTING.md` → these are meta-rules; stop and confirm

---

## References

- [`AGENTS.md`](../AGENTS.md) — full rules (authoritative)
- [`CLAUDE.md`](../CLAUDE.md) — AI agent project instructions (authoritative)
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contributor workflow
- [`TIERS.md`](./TIERS.md) — user-facing skill/agent organization
