# Phase ID Conventions

The canonical rule for naming a phase in rcode. Issue #718.

---

## TL;DR

| Shape | Example | Use case |
|-------|---------|----------|
| `<int>` | `19`, `22`, `103` | Top-level phase added at the end of the current milestone |
| `<int>.<int>` | `19.1`, `19.2`, `22.3` | Sub-phase inserted under an existing parent |
| anything else | `A1`, `B5`, `phase-x`, `06` | **REJECTED** |

Validate any ID with:

```bash
node .rcode/bin/rcode-tools.cjs validate-phase-id <id>
```

Scan an entire ROADMAP at once:

```bash
node .rcode/bin/rcode-tools.cjs validate-roadmap
```

---

## Why these are the only two shapes

**Integer phases (`19`, `22`)** are the natural unit of milestone progress.
They're added to the end of the roadmap by `/rcode-add-phase` and the
`phase add` CLI calculates the next number automatically. This is the
default — 99% of phases should be integers.

**Decimal sub-phases (`19.1`, `19.2`)** exist for one purpose: inserting
focused work under an already-defined parent without renumbering everything
after it. Use `/rihal-phase insert 19.1` (the `phase` subcommand) — the
parent phase stays `19`, the sub-phase fits between `19` and `20` without
shifting `20→21→22…`.

**Anything else is freestyling.** Audit-style outputs that produce `A1`,
`B5`, "Audit Phase 1", or domain-prefixed names (`auth-1`, `sec-2`) break:

- ROADMAP.md parsing — the `## Phase <id>` regex assumes a number
- State.json schema — `phases[].id` is typed as a number-or-decimal string
- Dashboard rendering — sorts phases by numeric value
- Cross-phase references in SUMMARY.md, PLAN.md, etc.

If you find yourself wanting `A1` or `B1`, you actually want **two
milestones**: one for audit, one for implementation. Run
`/rcode-complete-milestone` on the audit milestone before the
implementation work starts.

---

## Leading zeros: never

Per feedback memory: `19`, not `019`. `6`, not `06`. The validator
rejects leading-zero forms explicitly because they cause downstream
sorting bugs and inconsistent file naming (`.planning/phases/06-foo`
vs `.planning/phases/6-foo`).

---

## Where the validator fires

- **`/rcode-add-phase`** — runs `milestone-health` after adding, nudges
  toward `/rcode-complete-milestone` when ≥8 phases are open.
- **`/rcode-status`** — surfaces milestone-health gauge when not `healthy`.
- **CI** (`test/scope-history-parity.test.cjs` style) — a future test
  can call `validate-roadmap` against the committed ROADMAP.md.

Workflows that produce phase IDs from AI freestyle (`/rcode-plan`,
`/rcode-audit-milestone`) MUST call `validate-phase-id` before writing
to disk. If they don't, file an issue.

---

## Milestone health thresholds

| Open phases | Recommendation | Behavior |
|-------------|----------------|----------|
| 0–7 | `healthy` | Quiet — no nudge |
| 8–11 | `consider-closing` | Soft nudge after `/rcode-add-phase` |
| ≥12 | `should-close` | Hard nudge with both close + fork commands |

Bump thresholds in a future PR if real-world data shows users want bigger
milestones. Current numbers are conservative on purpose — long milestones
without closure are the original symptom.

---

## Related

- `rcode/workflows/add-phase.md` — milestone-health check after adding
- `rcode/workflows/status.md` — milestone-health gauge in status output
- `rcode/workflows/complete-milestone.md` — the closure workflow
- `rcode/bin/rcode-tools.cjs` — `validate-phase-id`, `validate-roadmap`,
  `milestone-health` subcommands
- Issue #718 (this file's origin)
