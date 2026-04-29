# Phase 9: Dogfood Audit Pass — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** Express (locked from #463 + Phase 6 lessons)

<domain>
## Phase Boundary

Run every rihal tool against rihal-code itself, surface every gap as a filed issue (no silent fixes), and add a CI gate that catches regressions on push. This phase formalizes the ad-hoc dogfooding that surfaced 8 systemic bugs during Phase 6 — turning episodic discovery into recurring practice.

**In scope:**
- Plan 1: Dogfood scan — invoke each tool, document observed-vs-expected
- Plan 2: Workflow-vs-CLI drift sweep — verify every CLI invocation in every workflow
- Plan 3: State path audit — find any other dual-path / orphan-state anti-patterns
- Plan 4: CI dogfood gate — fail-on-regression check on push to main

**Deferred:**
- Plan 5 (stretch): `/rihal:dogfood-scan` slash-command wrapper — wait for Plan 1 to land first; if scan-results.md proves stable, then wrap. Tracked in deferred section.

**Not in scope:**
- Phase-status drift detector (#461) — Phase 8 owns it
- Cadence docs / PostToolUse hooks — Phase 8
- Refactor of any tool that PASSES the audit — only fix what fails
</domain>

<decisions>
## Implementation Decisions

### Audit philosophy

- **D-1:** Every gap surfaced gets a filed GH issue with reproducer. No silent fixes. Even trivial drift gets a ticket so the pattern is visible.
- **D-2:** Audit is read-only by default. No tool modifies the repo during the scan; modifications only happen during explicit fix commits per gap.

### Workflow drift sweep

- **D-3:** Pattern to detect: `rihal-tools.cjs <subcommand>` referenced in any `.md` workflow → confirm the subcommand exists in `rihal/bin/rihal-tools.cjs` AND accepts the expected flags AND returns the JSON shape the workflow consumes. The detector grep + verifier loop runs in plan 2.
- **D-4:** Drift findings classify into severity: `breaking` (subcommand doesn't exist — like #460 #462), `shape` (subcommand exists but flags or output mismatched), `cosmetic` (workflow refers to `/rihal-x` form when canonical is `/rihal:x` — already cleaned in #456 but verify no recurrence).

### State path audit

- **D-5:** Two state files were the root cause of #462. Audit pattern: any reference to `state.json` in code or workflows must resolve to exactly one canonical file. Document the mapping in `STATE-PATHS.md`. Forbid future divergence.

### CI gate

- **D-6:** Lightweight bash + node only — no new dev deps. Run as a GitHub Action on push to main and as an optional `pnpm dogfood` script for local pre-push.
- **D-7:** Fail conditions: any CLI subcommand returns "Unknown subcommand", any workflow grep finds an unresolved CLI reference, any state file orphans appear, `state sync --from-disk` returns warnings. Pass conditions: all clean.

### Scope discipline

- **D-8:** This phase fixes only NEW bugs surfaced by the audit. Bugs already filed (#455–#462) are closed/in-progress and don't count as Phase 9 work — except where the audit confirms they're truly resolved (then close the ticket).

### Claude's Discretion

- Exact severity-tag taxonomy in audit report (consistent with #455/#460/#462 precedent).
- File paths inside `.planning/phases/9-dogfood-audit-pass/` for sub-reports (SCAN-RESULTS.md, DRIFT-SWEEP.md, STATE-PATHS.md, CI-GATE.md).
- GitHub Action workflow filename + step layout.
</decisions>

<canonical_refs>
## Canonical References

### Issues this phase consumes
- `#463` — umbrella issue for Phase 9 (this CONTEXT was distilled from it)
- `#455 #456 #457 #458 #460 #462` — sibling fixes from Phase 6 cleanup; audit must verify they're truly closed
- `#461` — phase-status drift (Phase 8, not Phase 9 — but the audit's recurring run will eventually catch its absence)

### Existing tools to audit
- `rihal/workflows/health.md` — 6-point installation health check
- `rihal/workflows/status.md` — phase + sprint state from state.json
- `rihal/workflows/audit.md` — unified audit router
- `rihal/workflows/feature-drift.md` — just shipped in Phase 6
- `rihal/workflows/memory-audit.md` — extended in Phase 6 with --fix
- `rihal/bin/rihal-tools.cjs` — every CLI subcommand referenced by any workflow

### Convention sources
- `CLAUDE.md` — project rules (no push without approval, conventional commits, no AI attribution)
- `.gitignore` — `.rihal/state.json` is gitignored, `.planning/state.json` should NOT exist
- Phase 6 SUMMARY.md — pattern proven this session: ticket-first, dogfood-first, atomic-commit-per-fix

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **Phase 6 fix-issue pattern** — every gap got its own GH issue with reproducer + commit closing it. Plan 1-3 reuse this discipline.
- **`gh issue create` with HEREDOC** — bash pattern for filing issues from CLI without manual editor open.
- **`grep -rln` + grep verification loop** — pattern used to verify CLI references in #460 + #462 sweep. Plan 2 templates from this.
- **`rihal/bin/rihal-tools.cjs help`** output — already enumerates all subcommands; Plan 2 cross-references workflow refs against this list.

### Established patterns
- **Atomic commit per fix** with `fix(scope): {what} → {fixed}` message. Phase 9 fixes follow this.
- **Severity-tagged findings** consistent with feature-drift / memory-audit / sprint-checker conventions.
- **Reports as markdown artifacts** in phase dir — `SCAN-RESULTS.md`, `DRIFT-SWEEP.md`, etc.

### Integration points
- **`rihal/bin/rihal-tools.cjs help`** — primary source-of-truth for "what CLI subcommands exist". Plan 2's verifier reads this.
- **`.github/workflows/`** — Plan 4 adds new YAML here.
- **`package.json`** — Plan 4 adds `scripts.dogfood` for local invocation.

</code_context>

<specifics>
## Specific Ideas

- **Audit report format** — for each tool, three sections: `## What it claims to do` (from workflow purpose), `## Observed on rihal-code` (actual output captured), `## Drift / gap` (delta + severity). Maps cleanly into issue bodies if filed.
- **CI gate runs in <30 seconds** — no subagent spawning, no plan/execute calls. Just CLI smoke tests + grep checks. Anything heavier becomes a separate scheduled run.
- **Filing one umbrella issue per audit run** if multiple gaps appear — link individual reproducer issues underneath. Avoid issue-flood from a single audit.

</specifics>

<deferred>
## Deferred Ideas

- **Plan 5 — `/rihal:dogfood-scan` slash command** — wrap plan 1 into a one-shot invocation. Defer to follow-up phase (10 or 11) once SCAN-RESULTS.md format stabilizes.
- **Scheduled dogfood runs** — `/loop` or `/schedule` agent that runs the audit daily and auto-files issues — Phase 8 territory (cadence docs).
- **Cross-project dogfood** — running rihal-code's tools on schedule-manager / siraaj after package release. Out of scope for Phase 9 since those projects aren't this repo.

### Reviewed Todos (not folded)
None — no pending todos relevant to dogfood audit.

</deferred>

---

*Phase: 9-dogfood-audit-pass*
*Context gathered: 2026-04-29*
