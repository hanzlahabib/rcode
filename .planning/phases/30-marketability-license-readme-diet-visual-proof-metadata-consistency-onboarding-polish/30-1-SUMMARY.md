# Sprint 30-1 Summary — Resolve the License Contradiction (#755)

**Phase:** 30 — Marketability
**Sprint:** 30.1
**Branch:** audit-gap-closure
**Status:** Complete

## Objective

Resolve the license contradiction (#755): `package.json` said `"license": "UNLICENSED"`
with `publishConfig.access: public`, the README said "UNLICENSED — proprietary",
and no `LICENSE` file existed at the repo root.

## Decision Record (Task 30.1.1 — checkpoint:decision)

**License chosen: MIT** — decided by the user (Hanzla Habib) ahead of execution and
passed in as a resolved decision. The executor did not pick the license.

Rationale: MIT is permissive OSS, matches the existing `publishConfig.access: public`
in package.json, and aligns with the MIT-licensed Karpathy guidelines credited in
`ATTRIBUTION.md`. `publishConfig.access: public` was left untouched — MIT permits
public distribution, so the two are now consistent.

## Tasks Completed

| Task | Type | Outcome |
| ---- | ---- | ------- |
| 30.1.1 | checkpoint:decision | License decision = MIT (resolved by user) |
| 30.1.2 | auto | Created canonical MIT `LICENSE` at repo root, `Copyright (c) 2026 Hanzla Habib` |
| 30.1.3 | auto | Set `package.json` `license` to `"MIT"`; replaced README License section with `Released under the [MIT License](LICENSE).` |

## Files Modified

- `LICENSE` — new, canonical MIT License text
- `package.json` — `license`: `UNLICENSED` → `MIT`
- `README.md` — License section body updated to MIT

## Verification

| Check | Result |
| ----- | ------ |
| `test -f LICENSE && test -s LICENSE` | PASS — LICENSE exists, non-empty |
| `node -e "...license!=='UNLICENSED'"` | PASS |
| `! grep -q UNLICENSED README.md` | PASS |
| `grep -rc UNLICENSED package.json README.md` | 0 hits |
| package.json parses as valid JSON | PASS |
| License type identical across LICENSE / package.json / README | PASS — all MIT |

## Test Suite

`node --test` — 2 failing tests, both pre-existing baseline failures:
- `broken @-references do not regress past baseline`
- `every command file @-includes its corresponding workflow`

No new failures introduced. `scope-history-parity` still passes (not in failure list).
These failures are unrelated to this sprint (no `@`-reference files touched).

## Commits

- `421c129` — docs(config): adopt MIT license and align package.json and README (#755)

## Deviations / Blockers

None. The license-decision checkpoint (30.1.1) was pre-resolved by the user as MIT,
so execution proceeded without pausing.
