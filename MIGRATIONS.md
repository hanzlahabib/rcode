# rcode Migrations

Every renamed, merged, or dropped surface across the rcode improvement programme. If you're upgrading from a pre-Phase 1 install, this is the file that tells you what changed and what to use instead.

> **Compatibility window.** Old slash names continue to be ignored gracefully — they simply produce "command not found". No workflow is silently rerouted. We chose explicit-fail over surprise-rename.

---

## v3 → v4 (2026-05-23) — hard break, clean cutover

v4.0.0 is a **hard rename** from the legacy `rihal` branding to `rcode`. There is no auto-migration path. There are also no existing users to break — v4 ships as a clean cutover.

### What changed

| Surface | v3 | v4 |
|---|---|---|
| Project directory | `.rihal/` | `.rcode/` |
| Slash command prefix | `/rihal-*` | `/rcode-*` |
| Agent prefix | `rihal-*` | `rcode-*` |
| Skill prefix | `rihal-*` | `rcode-*` |
| Colon-style slash | `/rihal:foo` | `/rcode-foo` (hyphen only) |
| Install command | `npx @hanzlaa/rcode install` | `pnpm dlx @hanzlaa/rcode install` |
| Memory Bank | Skill primitives existed, source bank was empty | rcode now ships with a populated Memory Bank under `.rcode/memory/` (commits `da20232`, `817a937`) |
| Brain pull | Scaffolded with placeholders | `rcode-tools brain pull` working end-to-end |

### What you do

If you have a v3 install in a project, treat it as uninstalled. Either:

1. **Fresh install** — `rm -rf .rihal/` and run `pnpm dlx @hanzlaa/rcode install`. Re-run `/rcode-init`. Re-create planning artifacts.
2. **Salvage** — copy any hand-written content out of `.rihal/RIHLA.md`, `.rihal/state.json`, and `.planning/` *before* removing `.rihal/`. Drop the copies into the v4 equivalents (`.rcode/RIHLA.md`, `.rcode/state.json`, `.planning/`).

There is **no scripted migration**. The rename touched 1,000+ files; the safe path is a clean install.

### Why no auto-migration

There were no production v3 users — only the internal dogfood project (this repo). Shipping a migrator would have added 2,000+ lines of code that nobody would ever exercise. Hard cut + this MIGRATIONS section is the honest answer.

---

## Slash commands

### Dropped (alias / pure duplicate)

| Old | Replacement |
|---|---|
| `/rcode-report` | `/rcode-session-report` (this was always the canonical workflow) |

### Dropped (self-declared internal)

| Old | Replacement |
|---|---|
| `/rcode-new-project-research` | Use `/rcode-new-project` (which calls this internally as a sub-workflow) |
| `/rcode-new-project-roadmap` | Use `/rcode-new-project` (same — internal sub-workflow) |
| `/rcode-check-implementation-readiness` | Internal guard called by `/rcode-plan` and `/rcode-execute`; no user-facing slash |

### Folded into flags

| Old | Replacement |
|---|---|
| `/rcode-discuss-phase-power` | `/rcode-discuss-phase --power` |
| `/rcode-karpathy-audit` | `/rcode-review --karpathy` |
| `/rcode-review-adversarial` | `/rcode-review --attack` (plain English; "adversarial" was jargon) |
| `/rcode-review-edge-case-hunter` | `/rcode-review --edge-cases` |

The underlying workflow files remain — `code-review` delegates to them when the corresponding flag is set. This means existing automation that calls those workflows directly still works; only the user-facing slash invocations changed.

---

## Agents

### Dropped (overlap merged)

| Old | Replacement |
|---|---|
| `rcode-architect` | `rcode-waleed` (CTO + Chief Architect — already covered the full architecture scope) |
| `rcode-tech-writer` | `rcode-noor` (Technical Writer & Presentation Lead — absorbed README, API docs, changelogs, migration guides, inline comments) |

`team.yaml` count: 47 → 46.

### Capability changes

- **Noor** now has `Write, Edit` tools (added when absorbing tech-writer's documentation-writing scope).
- **Waleed**'s capability table previously delegated `RV` (architecture review) to `rcode-architect`; now `RV` is `inline` (Waleed handles it).

---

## Skills

### Naming convention

- New skills (Memory Bank, future engineering and real-pain skills) are conceptually `rcode-*` in branding (slash commands like `/rcode-memory-init`), but folder names stay `rcode-memory-*` for `cli/install.js` compatibility. The installer hardcodes the `rcode-` prefix at line 741 of `install.js`; renaming would break installs. Documented in [`BRAND.md`](BRAND.md).

### Slimmed (≤120 lines, detail moved to sibling `references.md`)

These skill folders gained a `references.md` file containing the in-depth principles, scripts, templates, and checklists that previously bloated `SKILL.md`:

- `rcode/skills/core/rcode-clone-website/` (416 → 75 lines)
- `rcode/skills/core/rcode-distillator/` (212 → 63)
- `rcode/skills/core/rcode-editorial-review-structure/` (211 → 73)
- `rcode/skills/core/rcode-advanced-elicitation/` (167 → 67)
- `rcode/skills/agents/dalil-scout/` (202 → 120)
- `rcode/skills/agents/majlis-council/` (192 → 98)
- `rcode/skills/agents/raees-orchestrator/` (166 → 105)
- `rcode/skills/actions/2-plan/rcode-frontend-design/` (182 → 92)

The skill behaviour is unchanged. If you previously cited a section by line number from one of these SKILL.md files, that reference is now broken — re-cite from `references.md`.

### Added (Memory Bank — Phase 3)

New skill primitives. None replace existing skills; they enable the persistent project memory layer.

- `rcode-memory-init` — bootstrap `.rcode/memory/` for an existing project
- `rcode-memory-update` — surgical update to a Memory Bank file from conversation context
- `rcode-memory-distill` — regenerate fast-load distillates from sources
- `rcode-memory-audit` — find stale entries, contradictions, missing sections

Slash names: `/rcode-memory-init`, `/rcode-memory-update`, `/rcode-memory-distill`, `/rcode-memory-audit`.

---

## Configuration

### `rcode/config/model-profiles.json`

The key `tech-writer` was renamed to `noor` in all 5 profile blocks (`fast`, `balanced`, `quality`, `inherit-fast`, `inherit-quality`). If you have a custom `model-profiles.json` override locally, update the key name.

---

## Files added

- `BRAND.md` — voice guide, naming conventions, persona glossary
- `MEMORY_BANK.md` — Memory Bank specification
- `MIGRATIONS.md` — this file
- `TASKS.md` — master task tracker for the rcode improvement programme
- `rcode/templates/memory/` — 13 template files used by `rcode-memory-init`
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

- `rcode/commands/report.md`
- `rcode/commands/new-project-research.md`
- `rcode/commands/new-project-roadmap.md`
- `rcode/commands/discuss-phase-power.md`
- `rcode/commands/karpathy-audit.md`
- `rcode/commands/review-adversarial.md`
- `rcode/commands/review-edge-case-hunter.md`
- `rcode/commands/check-implementation-readiness.md`
- `rcode/agents/rcode-architect.md`
- `rcode/agents/rcode-tech-writer.md`

---

## Quick upgrade checklist

If you are running rcode from before this programme:

1. Replace any `/rcode-report ...` calls with `/rcode-session-report ...`
2. Replace any `/rcode-karpathy-audit ...` with `/rcode-review ... --karpathy`
3. Replace any `/rcode-review-adversarial ...` with `/rcode-review ... --attack`
4. Replace any `/rcode-review-edge-case-hunter ...` with `/rcode-review ... --edge-cases`
5. Replace any `/rcode-discuss-phase-power ...` with `/rcode-discuss-phase ... --power`
6. Stop calling `/rcode-check-implementation-readiness`, `/rcode-new-project-research`, `/rcode-new-project-roadmap` directly — they are internal sub-workflows now
7. Anywhere your project references `rcode-tech-writer`, swap to `rcode-noor`
8. Anywhere your project references `rcode-architect`, swap to `rcode-waleed`
9. Run `/rcode-memory-init` to bootstrap the new Memory Bank for your project

CI runs `node --test` — none of these changes break public surfaces, but if your custom workflows reference dropped surfaces, the test suite will catch missing files at install time.
