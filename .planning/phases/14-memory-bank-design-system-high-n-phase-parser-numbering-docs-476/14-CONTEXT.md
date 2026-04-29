# Phase 14 — Memory Bank design-system + high-N parser + numbering docs

**Track:** #476
**Status:** Ready for execution
**Mode:** Express — decisions locked from #476 + earlier session conversation
**Predecessors:** Phase 12 (init shape contract), Phase 13 (parser/walker consolidation, in flight in another session)

<domain>
## Phase Boundary

Three closely-related gaps surfaced in the same 2026-04-30 session, bundled here because they all stem from the same root: **rihal-code didn't anticipate hot-track / multi-language UI projects**.

1. **Memory Bank** has no design-system category — UI agents re-derive Attio tokens every session.
2. **9 parsers** in `rihal-tools.cjs` cap phase numbers at 999 via `\d{1,3}` — invisible to high-N hot-track work.
3. **No documented phase numbering convention** — sessions invent 1001 vs 100.1 vs 999.x ad-hoc.
</domain>

<decisions>
## Decisions (locked)

- **D-1:** Memory Bank gets a new `project/design-system.md` template — NOT a sub-section of `stack.md`. Reason: stack.md is tech stack (frameworks, services); design system is visual language (tokens, components, conventions). Different lifecycle, different writers, different readers.
- **D-2:** Template scope: tokens (color/typography/spacing/radius), canonical component patterns (with class examples), conventions (anti-patterns to avoid), RTL/multilingual notes, lineage refs. Does NOT prescribe specific token names — projects fill those in. Schema only.
- **D-3:** INDEX.md gets one row under the existing "Directory map" table — between `project/glossary.md` and `people/stakeholders.md`.
- **D-4:** Replace ALL 9 `\d{1,3}` occurrences in `rihal-tools.cjs` with `\d+(?:\.\d+)?`. Reason: canonical parser in `lib/roadmap.cjs` already uses `\d+`; the duplicates are drift (will be fully resolved by #469 lifting walkers/parsers to module scope, but THIS phase fixes the bug class without waiting for that refactor).
- **D-5:** Recommended phase-numbering convention is **decimal sub-phases for hot-fixes** (`100.1`, `100.2`) since `/rihal-insert-phase --number 100.1` already supports them and `lib/roadmap.cjs` already parses them. Document the four options in `docs/phase-numbering.md` with tradeoffs, name the recommendation, cross-link from CLAUDE.md template + parking-lot-convention.md.
- **D-6:** Do NOT change siraaj's existing `1001-*` phase dir as part of this phase. That's a separate cleanup decision the siraaj owner makes.
- **D-7:** Do NOT fix the `Skill(rihal-ui-phase)` vs `Skill(rihal:ui-phase)` resolver gap here. That's a Claude Code namespacing issue — file as a follow-up, not bundled.
- **D-8:** Auto-include `design-system.md` in `/rcode-memory-init` template copy logic. New project installs ship it by default.

</decisions>

<canonical_refs>
## Canonical References

- `#476` — umbrella for Phase 14
- `#469` — Phase 13 parser/walker consolidation (in flight, this phase doesn't block)
- `rihal/templates/memory/INDEX.md` — gets the new row
- `rihal/templates/memory/project/design-system.md` — already drafted in working tree (uncommitted), needs final review
- `rihal/skills/core/rihal-memory-init/scripts/init.py` — installer, needs design-system.md copy logic
- `rihal/bin/rihal-tools.cjs` lines 2233, 2338, 2345, 2426, 2522, 2527, 3974, 3988, 4038 — the 9 `\d{1,3}` sites
- `rihal/bin/lib/roadmap.cjs::extractPhases` — canonical pattern (already correct)
- `docs/parking-lot-convention.md` — gets cross-link added
- `rihal/bin/rihal-tools.cjs::cmdGenerateClaudeMd` — CLAUDE.md template gets phase-numbering link

</canonical_refs>

<sprints>
## Plan / sprints

This is a small phase — single sprint, 3 plan files conceptually:

### 14.1 — Memory Bank design-system category
- Finalize `rihal/templates/memory/project/design-system.md` (already drafted)
- Add row to `rihal/templates/memory/INDEX.md`
- Update `rihal/skills/core/rihal-memory-init/scripts/init.py` (or equivalent) to copy design-system.md on init
- Smoke test: fresh `/rcode-memory-init` creates the file
- Gate: `npm test` 132/132

### 14.2 — High-N phase parser support
- Replace remaining 6 `\d{1,3}` occurrences in rihal-tools.cjs (3 already in working tree)
- Smoke test: temporarily add `## Phase 1500 — Test` to ROADMAP, verify `roadmap list-phases`, `roadmap get-phase 1500`, `progress init`, `state sync --from-disk` all see it. Restore ROADMAP.
- Gate: dogfood 9/9 green; existing parser tests still pass

### 14.3 — Phase numbering convention doc
- Write `docs/phase-numbering.md` (4 options, recommendation = decimal sub-phases)
- Cross-link from `docs/parking-lot-convention.md` (parking-lot is for *promotable backlog*, not hot-fixes — link to phase-numbering.md for the latter)
- Cross-link from CLAUDE.md template (`cmdGenerateClaudeMd`) — add a one-liner under "Phase Workflow Rules" pointing to phase-numbering.md
- Gate: visual review only

### 14.4 — SUMMARY.md + ROADMAP flip + commit chain
- Write `14-SUMMARY.md` documenting what shipped + commit hashes
- Flip ROADMAP Phase 14 status to ✅ Complete (date)
- All commits atomic via `cmdCommit` (dogfood Phase 10's tool)

</sprints>

<deferred>
- Skill-name resolver fix (`Skill(rihal-ui-phase)` rejection) — file new issue post-phase
- Renaming siraaj's `1001-*` to `100.1-*` — siraaj owner's call
- Fully resolving #469 (lift parsers/walkers to module scope) — that's the structural fix; this phase is the tactical one
- Adding a `phase add --decimal <parent>` flag for explicit decimal-phase creation — nice-to-have, separate ticket

</deferred>

---

*Phase: 14-memory-bank-design-system-high-n-phase-parser-numbering-docs-476*
*Per Hanzla's "always dogfood rihal-code on rihal-code work" — this phase used /rihal-add-phase (already invoked, phase 14 registered) and will commit atomically per the sprint via cmdCommit.*
