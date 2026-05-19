# rcode Migrations

Every renamed, merged, or dropped surface across the rcode improvement programme. If you're upgrading from a pre-Phase 1 install, this is the file that tells you what changed and what to use instead.

> **Compatibility window.** Old slash names continue to be ignored gracefully — they simply produce "command not found". No workflow is silently rerouted. We chose explicit-fail over surprise-rename.

---

## Slash commands

### Dropped (alias / pure duplicate)

| Old | Replacement |
|---|---|
| `/rihal-report` | `/rihal-session-report` (this was always the canonical workflow) |

### Dropped (self-declared internal)

| Old | Replacement |
|---|---|
| `/rihal-new-project-research` | Use `/rihal-new-project` (which calls this internally as a sub-workflow) |
| `/rihal-new-project-roadmap` | Use `/rihal-new-project` (same — internal sub-workflow) |
| `/rihal-check-implementation-readiness` | Internal guard called by `/rihal-plan` and `/rihal-execute`; no user-facing slash |

### Folded into flags

| Old | Replacement |
|---|---|
| `/rihal-discuss-phase-power` | `/rihal-discuss-phase --power` |
| `/rihal-karpathy-audit` | `/rihal-code-review --karpathy` |
| `/rihal-review-adversarial` | `/rihal-code-review --attack` (plain English; "adversarial" was jargon) |
| `/rihal-review-edge-case-hunter` | `/rihal-code-review --edge-cases` |

The underlying workflow files remain — `code-review` delegates to them when the corresponding flag is set. This means existing automation that calls those workflows directly still works; only the user-facing slash invocations changed.

---

## Agents

### Dropped (overlap merged)

| Old | Replacement |
|---|---|
| `rihal-architect` | `rihal-waleed` (CTO + Chief Architect — already covered the full architecture scope) |
| `rihal-tech-writer` | `rihal-noor` (Technical Writer & Presentation Lead — absorbed README, API docs, changelogs, migration guides, inline comments) |

`team.yaml` count: 47 → 45.

### Capability changes

- **Noor** now has `Write, Edit` tools (added when absorbing tech-writer's documentation-writing scope).
- **Waleed**'s capability table previously delegated `RV` (architecture review) to `rihal-architect`; now `RV` is `inline` (Waleed handles it).

---

## Skills

### Naming convention

- New skills (Memory Bank, future engineering and real-pain skills) are conceptually `rcode-*` in branding (slash commands like `/rihal-memory-init`), but folder names stay `rihal-memory-*` for `cli/install.js` compatibility. The installer hardcodes the `rihal-` prefix at line 741 of `install.js`; renaming would break installs. Documented in [`BRAND.md`](BRAND.md).

### Slimmed (≤120 lines, detail moved to sibling `references.md`)

These skill folders gained a `references.md` file containing the in-depth principles, scripts, templates, and checklists that previously bloated `SKILL.md`:

- `rihal/skills/core/rihal-clone-website/` (416 → 75 lines)
- `rihal/skills/core/rihal-distillator/` (212 → 63)
- `rihal/skills/core/rihal-editorial-review-structure/` (211 → 73)
- `rihal/skills/core/rihal-advanced-elicitation/` (167 → 67)
- `rihal/skills/agents/dalil-scout/` (202 → 120)
- `rihal/skills/agents/majlis-council/` (192 → 98)
- `rihal/skills/agents/raees-orchestrator/` (166 → 105)
- `rihal/skills/actions/2-plan/rihal-frontend-design/` (182 → 92)

The skill behaviour is unchanged. If you previously cited a section by line number from one of these SKILL.md files, that reference is now broken — re-cite from `references.md`.

### Added (Memory Bank — Phase 3)

New skill primitives. None replace existing skills; they enable the persistent project memory layer.

- `rihal-memory-init` — bootstrap `.rihal/memory/` for an existing project
- `rihal-memory-update` — surgical update to a Memory Bank file from conversation context
- `rihal-memory-distill` — regenerate fast-load distillates from sources
- `rihal-memory-audit` — find stale entries, contradictions, missing sections

Slash names: `/rihal-memory-init`, `/rihal-memory-update`, `/rihal-memory-distill`, `/rihal-memory-audit`.

---

## Configuration

### `rihal/config/model-profiles.json`

The key `tech-writer` was renamed to `noor` in all 5 profile blocks (`fast`, `balanced`, `quality`, `inherit-fast`, `inherit-quality`). If you have a custom `model-profiles.json` override locally, update the key name.

---

## Files added

- `BRAND.md` — voice guide, naming conventions, persona glossary
- `MEMORY_BANK.md` — Memory Bank specification
- `MIGRATIONS.md` — this file
- `TASKS.md` — master task tracker for the rcode improvement programme
- `rihal/templates/memory/` — 13 template files used by `rcode-memory-init`
- `server/lib/scanner.js` — extended with `scanMemoryBank()`
- `server/lib/api.js` — extended with `handleApiMemory`
- `server/dashboard.js` — `/api/memory` route registered (additive)
- `server/lib/html/shell.js` — Memory Bank nav entry + view container (additive)
- `server/lib/html/client.js` — `renderMemory()` view renderer (additive)
- `test/skills-compliance.test.cjs`
- `test/dashboard-boot.test.cjs`
- `test/memory-templates.test.cjs`
- `test/agents-registry.test.cjs`

---

## Files removed

- `rihal/commands/report.md`
- `rihal/commands/new-project-research.md`
- `rihal/commands/new-project-roadmap.md`
- `rihal/commands/discuss-phase-power.md`
- `rihal/commands/karpathy-audit.md`
- `rihal/commands/review-adversarial.md`
- `rihal/commands/review-edge-case-hunter.md`
- `rihal/commands/check-implementation-readiness.md`
- `rihal/agents/rihal-architect.md`
- `rihal/agents/rihal-tech-writer.md`

---

## Quick upgrade checklist

If you are running rcode from before this programme:

1. Replace any `/rihal-report ...` calls with `/rihal-session-report ...`
2. Replace any `/rihal-karpathy-audit ...` with `/rihal-code-review ... --karpathy`
3. Replace any `/rihal-review-adversarial ...` with `/rihal-code-review ... --attack`
4. Replace any `/rihal-review-edge-case-hunter ...` with `/rihal-code-review ... --edge-cases`
5. Replace any `/rihal-discuss-phase-power ...` with `/rihal-discuss-phase ... --power`
6. Stop calling `/rihal-check-implementation-readiness`, `/rihal-new-project-research`, `/rihal-new-project-roadmap` directly — they are internal sub-workflows now
7. Anywhere your project references `rihal-tech-writer`, swap to `rihal-noor`
8. Anywhere your project references `rihal-architect`, swap to `rihal-waleed`
9. Run `/rihal-memory-init` to bootstrap the new Memory Bank for your project

CI runs `node --test` — none of these changes break public surfaces, but if your custom workflows reference dropped surfaces, the test suite will catch missing files at install time.
