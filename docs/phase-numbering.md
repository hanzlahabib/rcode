# Phase Numbering Convention

**One canonical answer to: "What number do I give a phase?"**

This document closes the recurring confusion that surfaces in real sessions: hot-fix phases get numbered `1001`, `100.1`, `999.5` ad-hoc depending on which agent ran which workflow. Pick one, document it, propagate.

---

## The four options the codebase supports today

| Option | Number | Meaning | Tooling |
|---|---|---|---|
| **A — Sequential** | `101` | Just the next integer after the last phase | `/rcode-add-phase` (auto-numbers) |
| **B — Decimal sub-phases** | `100.1`, `100.2` | Hot-fix branched **from** Phase 100 | `/rcode-insert-phase --number 100.1` |
| **C — Parking lot** | `999.1`, `999.5` | Promotable backlog (not yet active) | `/rcode-plant-seed` / `/rcode-add-backlog` |
| **D — Hot-track 1000+** | `1001`, `1500` | High numbers reserved for parallel hot-track | none — informal |

---

## Recommendation: Option B (decimal sub-phases) for hot-fixes

When you're mid-Phase 100 and an urgent fix lands that needs its own scope:

```bash
/rcode-insert-phase --number 100.1 --name "linkedin workflow bug fixes"
```

That creates `.planning/phases/100.1-linkedin-workflow-bug-fixes/`, registers in ROADMAP.md as `## Phase 100.1`, and updates `state.json`. The phase is **explicitly a child of Phase 100** — lineage is in the number itself.

### Why this and not the others

- **vs Option A (sequential `101`)**: sequential mixes hot-fixes with main flow in `roadmap list-phases`. With B you can `grep '^## Phase 100'` and see both the parent and its sub-phases as a cluster.
- **vs Option C (parking lot `999.x`)**: parking lot semantically means *promotable backlog* — work that *might* be picked up. Hot-fixes are *already active*; using 999.x conflates the two.
- **vs Option D (`1001`)**: undocumented, no rule for `1000` vs `1500`, magic-numbered, surprising to readers. Fails the "would-a-new-team-member-understand-this" test.

### Tooling support is real

- `lib/roadmap.cjs::extractPhases` parses `\d+(?:\.\d+)?` — decimals already work
- `cmdProgress` walks `.planning/phases/<N>(?:\.\d+)?-*/` — decimal dirs already render
- `cmdState` sync handles decimal phase numbers in ROADMAP — they round-trip correctly
- `/rcode-status` displays them as a tree: `Phase 100 → 100.1, 100.2`

---

## When to use which option

```
"I'm starting a brand-new phase, no parent context"
  → Option A — /rcode-add-phase "<name>"

"Urgent fix while mid-Phase N. Must own its own SPRINT.md."
  → Option B — /rcode-insert-phase --number N.M

"This is an idea I might want to pull in later. Don't disrupt active work."
  → Option C — /rcode-plant-seed or /rcode-add-backlog

"Truly parallel hot-track that doesn't map to a parent phase"
  → Option B with the most-recent integer parent (still better than D)
  → OR Option A and accept the visual mixing
  → DON'T use Option D — it's unprincipled
```

---

## Migration / cleanup

If your project has phases numbered in the 1000+ range (Option D pattern from earlier sessions), don't panic. Migration steps:

1. **For each `.planning/phases/<1000+>-*/` dir**: pick the appropriate parent integer phase
2. **Rename**: `git mv .planning/phases/1001-foo .planning/phases/100.1-foo`
3. **Update ROADMAP.md**: change `## Phase 1001 — Foo` to `## Phase 100.1 — Foo`
4. **Update state.json**: `phases[].number = "100.1"` for that entry
5. **Run** `/rcode-state-sync --from-disk` to verify everything reconciles
6. **Smoke** `/rcode-status` shows the new tree

The high-N parsers in `rcode-tools.cjs` (closed in #476) handle 1000+ correctly during the migration window — old and new naming coexist without errors.

---

## Cross-references

- [`docs/parking-lot-convention.md`](parking-lot-convention.md) — Option C details (when to use 999.x)
- `/rcode-add-phase` — Option A
- `/rcode-insert-phase` — Option B
- `/rcode-plant-seed`, `/rcode-add-backlog` — Option C
- CLAUDE.md template (in projects via `rcode-tools generate-claude-md`) — has a one-liner pointing here

---

## Maintenance

When a new option emerges in real session usage that this doc doesn't cover, file an issue tagged `docs:phase-numbering` and propose. Don't quietly adopt new conventions — they fragment.
