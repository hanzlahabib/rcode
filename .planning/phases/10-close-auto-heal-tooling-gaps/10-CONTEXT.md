# Phase 10: Close Auto-Heal Tooling Gaps — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** Express (locked from #466 + Phase 9 audit findings)

<domain>
## Phase Boundary

Close the highest-impact gaps surfaced by Phase 9's dogfood audit. Three concrete fixes:

1. Implement `commit` CLI subcommand (#465 — most-used missing subcommand across workflows)
2. Add phase-aware fields to `cmdInit` (#464 part 3 — unblocks /rihal-plan + /rihal-discuss-phase agent flows)
3. Read **Status:** field in `lib/roadmap.cjs` so `roadmap list-phases` reports actual status

**Out of scope:**
- The other 14 missing subcommands from #465 — Phase 11+ if and when prioritized
- Marketing-related work (Phase 7 deferred indefinitely)
- Refactoring tools that pass the audit
</domain>

<decisions>
## Implementation Decisions

### `commit` subcommand

- **D-1:** Single-purpose — atomic git commit with conventional-commit message validation. NOT a multi-step orchestrator; that's what executor agents do.
- **D-2:** Signature: `node rihal-tools.cjs commit "<message>" [--files <path1> <path2> ...]`. Files default to all-staged if --files absent.
- **D-3:** Validates conventional-commits format (`type(scope): subject`). Rejects empty subjects, non-conventional types, AI-attribution lines.
- **D-4:** Does NOT push. Per project rule: never push without explicit human approval.

### `cmdInit` phase-aware fields

- **D-5:** When workflow is `phase-op` or `sprint-plan` AND a phase number is provided, init returns the documented field set. When phase number is absent or not a valid integer, fields remain absent (no synthetic defaults).
- **D-6:** Source: parse ROADMAP.md via the now-fixed `lib/roadmap.cjs` (post #464 regex fix). Don't reinvent the parser.
- **D-7:** Disk signals (`has_research`, `has_context`, `has_plans`, `plan_count`) come from `walkPhaseDirs` (already exists at line ~3107 of rihal-tools.cjs).

### Status field in `roadmap list-phases`

- **D-8:** Parse the literal `**Status:**` line per phase entry. Map to enum: `complete | active | planned | unknown`.
- **D-9:** When ROADMAP entry has `Status: Active (Sprint X.Y in progress)` or similar, return `active`. When `Status: Complete (date)`, return `complete`. When `Status: Planned`, return `planned`. When line absent, return `unknown`.

### CI gate update

- **D-10:** Once `commit` lands, remove it from the known-tracked allowlist in `scripts/dogfood-check.sh`. Same for any other subcommands implemented in this phase.

### Claude's Discretion

- Exact error messages (consistent with existing CLI tone).
- Internal helper function names.
- Test fixtures (if any added — keep minimal).

</decisions>

<canonical_refs>
## Canonical References

### Issues consumed
- `#465` — 15 missing CLI subcommands (this phase closes 1: `commit`)
- `#464` — roadmap parser drift (parts 1+2 fixed; part 3 closes here)
- `#466` — Phase 10 umbrella

### Existing code to extend
- `rihal/bin/rihal-tools.cjs` line 261 (`cmdInit`) — add phase-aware branch
- `rihal/bin/rihal-tools.cjs` line 3604 (`main()`) — add `case 'commit':`
- `rihal/bin/lib/roadmap.cjs` — add Status: field parsing
- `scripts/dogfood-check.sh` — update allowlist when commit lands

### Convention sources
- Phase 6 commit pattern — `fix(scope): subject` with HEREDOC for body
- CLAUDE.md project rules — no AI attribution, no --no-verify, no auto-push

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `walkPhaseDirs` (line ~3107) — already does disk introspection for phase dirs. Just call it from cmdInit.
- `extractPhases` in `lib/roadmap.cjs` — heading-style ROADMAP parser already returns `{number, name, goal, section}`. Status field can be added without restructuring.
- Conventional-commits regex in many places already — pick one, reuse.

### Established patterns
- Throw on invalid input (don't silently default).
- Return JSON for machine-readable subcommands; plain text only for help/version.
- Atomic operations — `commit` either succeeds fully or leaves git untouched.

### Integration points
- `init phase-op` and `init sprint-plan` cases in `cmdInit` — phase-aware branch fires here.
- `case 'commit':` in main() switch — new entry.
- `extractPhases` parser — gains Status line read.

</code_context>

<specifics>
## Specific Ideas

- `commit` should refuse `--no-verify` flag explicitly (not silently ignore). Print: "rihal-tools commit does not bypass hooks. Fix the underlying issue."
- `commit` should refuse messages containing "Co-Authored-By: Claude" or "Generated with Claude Code". Per project rule.
- Phase-aware fields use `padded_phase` for backward compat with workflows that still expect zero-padding (since phases 01-05 are legacy). New phases (6+) return `padded_phase` equal to `phase_number` (no padding).
- Status parsing should handle the actual ROADMAP variations seen in this repo: `Complete (2026-04-15)`, `Complete (2026-04-29 — closed during phase-status drift audit; ...)`, `Active (Sprint 04.2 in progress)`, `Planned`, `Closed (partial) — eng-side items shipped, ...`.

</specifics>

<deferred>
## Deferred Ideas

- 14 other missing subcommands (#465) — Phase 11+ as needed
- `commit-to-subrepo` — special-case of `commit`, defer to follow-up
- Status-field write-back from state.json into ROADMAP — separate concern (auto-heal write path)

</deferred>

---

*Phase: 10-close-auto-heal-tooling-gaps*
*Context gathered: 2026-04-29*
