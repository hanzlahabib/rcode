# AGENTS.md — Rules for AI Agents Working on This Repo

This file is loaded by Claude Code, Codex, and compatible AI coding tools at the start of every session. The rules below are **NON-NEGOTIABLE**.

---

## 🚨 CRITICAL: Never Push Without Explicit Human Approval

**The single most important rule:**

- **NEVER run `git push`** without the user explicitly saying "push", "push it", "push to remote", "push to origin", or similar direct authorization on that specific push.
- **NEVER `git push --force`** under any circumstances without the user typing it themselves.
- **NEVER push in the background**, in a loop, in an "autonomous mode", or as part of a larger task, even if the user previously authorized a push earlier in the session. Every push requires fresh approval.
- **NEVER configure CI, hooks, or scripts that auto-push.** Commits are fine. Pushes require a human hand.
- **If you are unsure whether a push is authorized, STOP and ask.** The cost of asking is 5 seconds. The cost of an unauthorized push can be lost work, broken CI, or exposed secrets.

If a user says "just keep going" or "don't stop until done", that authorization applies to local commits only — never to pushes.

**Violations of this rule are the most serious form of trust violation in this repository.**

---

## Commit Rules

- Follow [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): subject`
- Types allowed: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `revert`
- Scopes allowed: `agents`, `skills`, `workflows`, `templates`, `dashboard`, `docs`, `config`, `github`, `commands`, `memory`, `brand`, `cli`, `ci`, `release`, `meta`, `tasks`, `migrations`, `refs`, `state`, `hooks`, `install`, `parity`, `triggers`, `dogfood`, `namespace`, `planning`, `insights`, `help`, `roadmap`, `session`, `audits`, `execute`, `executor`, `plan`, `planner`, `readme`, `sync`, `sprint`, `agent-exp`, `extensibility`, `lens-audit`, `tiers`, `build`, `council`, `doctor`, `postinstall`, `progress`, `security`, `tools`, `uninstall`, `update`, `test`, `changelog`, `scopes`, `phases`, `references`, plus numeric phase/sprint scopes (e.g. `docs(15)`, `feat(8.3)`)
- Subject: lowercase first letter, imperative mood, no trailing period, under 72 chars
- **NEVER add Claude/AI attribution to commit messages.** No "Generated with Claude Code", no "Co-Authored-By: Claude", no "🤖 Generated". The user does not want this.
- **NEVER use `--no-verify`** to bypass hooks. If hooks fail, fix the underlying issue.
- **ALWAYS stage specific files** with `git add <files>` — never `git add -A` or `git add .` without reading what would be staged first.

---

## Pull Request Rules

- PR titles follow Conventional Commits (enforced by `.github/workflows/semantic.yaml`)
- Use the template in `.github/pull_request_template.md`
- Every skill change must pass the 5-component compliance check:
  1. YAML trigger header with 5-12 trigger phrases + negative boundaries
  2. Overview paragraph
  3. Workflow/instructions
  4. Output Format section
  5. Examples (happy + edge + negative)
- Every agent change must update: `team.yaml`, dashboard roster, README table

---

## Naming & Branding (per `BRAND.md`)

- **Skill names** in frontmatter: `rihal-<verb>-<noun>` for legacy skills; new branded skills use `rcode-<verb>-<noun>` ONLY in slash command surface (`/rcode:<name>`); folder names stay `rihal-*` because `cli/install.js` hardcodes that prefix.
- **Persona IDs** in `team.yaml` stay `rihal-<name>` (dashboard scanner reads them by id; renaming breaks rendering).
- **Persona display names** keep Arabic alongside Latin: `Sadiq (صادق)`, `Dalil (دليل)`, etc.
- **Concept primitives** (Memory Bank, Distillate, Majlis, Diwan) are named tooling — capitalised, used consistently in user-facing copy.
- **Plain English over jargon in flags.** Prefer `--attack` over `--adversarial`, `--edge-cases` over `--edge-case-hunter`. Audience includes non-native English speakers.

---

## File Modification Rules

- **Maximum file size: 1000 lines** — refactor before exceeding
- **Refactor incrementally** — never rewrite from scratch
- **Preserve existing patterns** — don't introduce new conventions without documented justification
- **Never remove dependencies** without explicit user approval
- **Verify imports exist** before referencing them

---

## Dashboard Server Rules

- Keep `server/dashboard.js` dependency-free (pure Node stdlib)
- Single-file — do not introduce a framework
- View-only — NEVER add write endpoints, POST handlers, or database code
- Test after every change: `node server/dashboard.js` must start cleanly

---

## Testing Rules

- Run the compliance check after modifying any skill:
  ```bash
  for f in rihal/skills/agents/*/SKILL.md rihal/skills/actions/*/SKILL.md; do
    grep -q "^## Output Format" "$f" || echo "MISSING: $f"
    grep -q "^## Examples" "$f" || echo "MISSING: $f"
  done
  ```
- Run grep checks before committing renames or refactors:
  ```bash
  grep -rn -i "TODO" rihal docs examples README.md server   # should be empty
  ```
- Test the dashboard server boots without errors before committing dashboard changes

---

## Scope Discipline

- Do EXACTLY what was asked — nothing more
- No "while I'm here" improvements
- No speculative abstractions
- No new files unless necessary
- If the user asks for a bug fix, don't also refactor nearby code

---

## Communication Rules

- Report progress honestly — do not claim work is done if it isn't
- Flag blockers immediately — do not silently fail
- When unsure, ask — do not guess at user intent on destructive operations
- If the user gives a standard to maintain (like the 5-component skills standard), enforce it on every future change

---

## Red Flags — Stop and Reconsider

- About to run `git push` — **STOP. Is this explicitly authorized for THIS push?**
- About to add a dependency — stop and ask
- About to delete files — stop and confirm
- About to modify `.github/workflows/*` — these affect CI; stop and explain what will change
- About to edit `AGENTS.md`, `CONTRIBUTING.md`, or `CLAUDE.md` — these are meta-rules; stop and confirm

---

## When This File Conflicts With the User

If the user explicitly overrides a rule in this file (e.g., "yes, push it now"), the explicit instruction wins for that one action. Do NOT generalize a one-time authorization to a blanket permission.

---

**This file is part of the project. Treat it as load-bearing.**
