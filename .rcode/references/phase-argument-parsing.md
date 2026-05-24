# Phase Argument Parsing

Workflows that take a phase argument (`/rcode-plan 04`, `/rcode-execute-phase 999.5`, `/rcode-research-phase 12`) all use the same parsing rules.

## Accepted forms

| Input | Resolves to | Notes |
|-------|-------------|-------|
| `04` | Phase 04 | Zero-padded NN |
| `4` | Phase 04 | Auto-pads |
| `999.5` | Decimal parking-lot phase 999.5 | See `docs/parking-lot-convention.md` |
| `04.1` | Sub-phase 04.1 | Inserted-phase / urgent work |
| `current` | The phase currently in `state.current_phase` | Useful when looping |
| `next` | The next planned phase after current | Looks at ROADMAP.md ordering |
| (empty) | Same as `current` if state has one; else error | Most workflows refuse empty |

## Resolution

1. Strip whitespace.
2. Match against the patterns above (regex per row).
3. Look up the resolved number in `state.phases[]`.
4. If not found, fall back to looking on disk under `.planning/phases/<NN>-*/`.
5. If neither, exit non-zero with: `Phase X not found. Run /rcode-status to list known phases.`

## Strict vs lenient

Workflows pass `--strict` if a missing phase should hard-fail rather than offering to create. By default, planning workflows ask "Phase X doesn't exist — create it now?" before erroring. Execution workflows hard-fail because executing a phase that doesn't exist is always a bug.

## Error messages

Always include the resolved (or attempted-resolve) value in the error. Never just say "phase not found" — say "Phase 12 not found in state.json (3 phases registered: 04, 05, 999.5)".

## Multi-phase invocations

Some workflows accept `04..06` to operate on a range, or `04 05 06` as space-separated. Each gets parsed by the rules above; the workflow operates on the resolved set in roadmap order.
