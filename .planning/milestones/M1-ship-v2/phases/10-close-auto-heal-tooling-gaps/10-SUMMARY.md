# Phase 10: Close Auto-Heal Tooling Gaps — Summary

**Status:** Complete
**Delivered:** 2026-04-29
**Tracks:** #464, #465, #466

## What shipped

| Fix | File | Outcome |
|---|---|---|
| `cmdCommit` subcommand | `rcode/bin/rcode-tools.cjs` | Atomic git commit with conventional-commits validation. Rejects AI attribution, rejects `--no-verify` flag, no auto-push. Closes the most-used missing subcommand from #465 (used by execute-sprint, map-codebase, new-project-roadmap). |
| `cmdInit` phase-aware fields | `rcode/bin/rcode-tools.cjs` | When workflow is `phase-op` or `sprint-plan` + valid phase number provided, init now returns 21 phase-aware fields the workflows already document. Closes the third part of #464. |
| Status parsing in `lib/roadmap.cjs` | `rcode/bin/lib/roadmap.cjs` | `extractPhases` reads the literal `**Status:**` line and maps to enum (complete / active / planned / closed / unknown). `cmdListPhases` now reports actual status. |
| `files0(dir, pattern)` helper | `rcode/bin/rcode-tools.cjs` | Small module-scope utility for resolving artifact paths under phase dirs (handles both zero-padded legacy and plain integer prefixes). |
| Dogfood gate baseline update | `scripts/dogfood-check.sh` | `commit` removed from #465 allowlist — any future regression of `cmdCommit` fails CI. |

## Decisions honored

- **D-1:** `cmdCommit` is single-purpose — atomic commit only, not multi-step. ✓
- **D-2:** Signature `commit "<message>" [--files <paths...>]`. ✓
- **D-3:** Conventional-commits validation, AI-attribution rejection. ✓
- **D-4:** No push (project rule). ✓
- **D-5/D-6/D-7:** Phase-aware fields surface only with valid phase number, parsed via the now-fixed `lib/roadmap.cjs`, disk signals from inline file enumeration. ✓
- **D-8/D-9:** Status enum mapping + raw status preserved in `status_raw`. ✓
- **D-10:** `commit` allowlist entry removed from CI gate. ✓

## Self-validating loop

The `cmdCommit` subcommand was used to commit Phase 10's own changes — first try produced a junk-message commit (smoke test stage carried real changes), recovered via `git commit --amend`. The bug surfaced by dogfooding the new tool: my initial validation logic tokenized `--no-verify` from inside the message body, not just from standalone flags. Fixed before commit was finalized — argv-array-based parsing instead of string-token tokenization. **Phase 10's own discovery → fix → ship cycle was itself dogfooded.**

## Issues confirmed closed

| # | Verification |
|---|---|
| #466 | All 3 highest-impact gaps from #464 + #465 closed in this commit. |
| #465 (commit only) | `node rcode/bin/rcode-tools.cjs commit "<msg>"` works end-to-end. 14 other missing subcommands remain in #465. |
| #464 (part 3) | `init phase-op N` and `init sprint-plan N` return phase-aware fields. |

## Out of scope (deferred)

- 14 other missing subcommands from #465 — Phase 11+ as needed (next-priority based on workflow consumption: `check-implementation-readiness`, `generate-claude-md`, `commit-to-subrepo`).
- Acceptance-bullet parsing for partial-shipped detection (would refine `--mode=phase-status` from Phase 8).
- Marketing Push (Phase 7) — operator-driven, indefinitely deferred.

## Commit chain (Phase 10)

```
2d6dda0  feat(10): close auto-heal tooling gaps — commit subcmd + phase-aware init + Status parsing
```

Single commit — Phase 10 was scoped tight enough to land atomically. Note: amended once during this session to fix a smoke-test mishap (junk message). No remote was affected.
