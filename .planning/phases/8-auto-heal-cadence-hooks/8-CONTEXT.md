# Phase 8: Auto-Heal Cadence + Hooks — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** Express (locked from ROADMAP entry + Phase 6 precedent)

<domain>
## Phase Boundary

Layer scheduled and edit-time triggers on top of the manual-invoke auto-heal tools shipped in Phase 6. Add the third drift dimension (phase-status drift, #461) to round out the auto-heal portfolio. Mirror Phase 6's extend-existing-tool pattern.

**In scope:**
- Cadence docs — recommended schedules for `/rihal:docs-update`, `/rihal:health`, `/rihal:feature-drift`, `/rihal:memory-audit --fix`
- PostToolUse hook on `docs/`, `prd/`, `.planning/` edits — fires `/rihal:feature-drift --quick`
- `/rihal:feature-drift --mode=phase-status` — extends existing workflow with a third drift dimension (closes #461)

**Not in scope:**
- Real-time file-watcher daemon (rejected — overkill)
- Full agent rewrites (extend, don't replace — Phase 6 precedent)
- Implementing the 15 missing CLI subcommands from #465 (deferred to Phase 10+)
</domain>

<decisions>
## Implementation Decisions

### Cadence

- **D-1:** Recommended cadences as a doc, not enforced infra. Users opt in via `/loop` or external cron — we ship guidance and the underlying scripts. Cadence per tool:
  - `/rihal:health` — weekly (Monday 9am)
  - `/rihal:feature-drift` — on push (already in CI dogfood gate)
  - `/rihal:memory-audit` (read-only) — weekly
  - `/rihal:memory-audit --fix` — monthly (so trivial drift accumulates a bit before sweep, easier to review the diff)
  - `/rihal:phase-status-drift` (this phase) — daily during active development, weekly otherwise
- **D-2:** Doc lives at `docs/AUTO-HEAL-CADENCE.md` — referenced from README's "Auto-heal" section.

### Hooks

- **D-3:** PostToolUse hook on Edit (NOT PreToolUse — don't block edits). Fires on:
  - `docs/**/*.md`
  - `.planning/**/*.md`
  - `prd/**/*.md`
  - `epics/**/*.md`
  - `stories/**/*.md`
- **D-4:** Hook runs `/rihal:feature-drift --quick` (a fast-mode flag we'll add to the existing workflow). `--quick` skips the deep verifier-loop, just runs the auditor scan in report-only mode. Full `--fix` mode is never auto-triggered by hooks (D-1 from Phase 6: never default).
- **D-5:** Hook is opt-in via `/rihal:enable-hooks` (referenced in existing skill). User must explicitly opt in.

### Phase-status drift detector

- **D-6:** Extends `/rihal:feature-drift` with `--mode=phase-status` rather than creating a new `/rihal:phase-status-drift` slash command. Consistent with Phase 6 D-4 (extend, don't proliferate).
- **D-7:** Compares ROADMAP claim (Status: Complete | Active | Planned) against shipping signals:
  - Presence of `*-SUMMARY.md` in phase dir → suggests Complete
  - Presence of `*-SPRINT.md` without summary → suggests In Progress
  - No artifacts → matches Planned
  - Git log on phase scope: any commits matching the phase's `files_modified`?
- **D-8:** Severity:
  - **major** — ROADMAP says Planned/Active but ALL acceptance items shipped (Phase 4 case from this session)
  - **major** — ROADMAP says Complete but NO shipping artifacts exist
  - **partial** — N of M acceptance items shipped (Phase 5 case from this session)
  - **trivial** — missing ✅ marker on heading even though Status says Complete
- **D-9:** `--fix` mode patches only trivial items (✅ marker, missing date) — never auto-flips Active→Complete without human review.

### Claude's Discretion

- Exact format of `docs/AUTO-HEAL-CADENCE.md` (markdown table or prose).
- Hook script implementation details (bash vs node).
- `--quick` mode internals (skip which steps).
- Phase-status drift severity tag taxonomy details.
- Output file path for phase-status drift report.
</decisions>

<canonical_refs>
## Canonical References

### Issues consumed
- `#461` — phase-status drift detector missing (this phase closes it)
- `#463` — Phase 9 dogfood audit (precedent for this phase's discipline)

### Existing tools to extend
- `rihal/workflows/feature-drift.md` — adds `--mode=phase-status` + `--quick` per D-6 / D-4
- `rihal/agents/rihal-docs-auditor.md` — extends `<mode_feature_drift>` family with new `<mode_phase_status>` section
- `scripts/dogfood-check.sh` — Phase 9 baseline; this phase's CI hook integrates here

### Convention sources
- Phase 6 SUMMARY.md — extend-don't-proliferate pattern proven
- Phase 9 SUMMARY.md — dogfood discipline + audit pattern
- `rihal/skills/core/rihal-enable-hooks/SKILL.md` (or equivalent) — for D-5 opt-in pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **`<mode_feature_drift>` precedent in rihal-docs-auditor** — same pattern works for `<mode_phase_status>`
- **Severity allowlist enforcement in feature-drift workflow** — same enforcement structure for phase-status `--fix`
- **CI dogfood gate (`scripts/dogfood-check.sh`)** — adds a new check for phase-status alignment
- **`rihal-tools.cjs` roadmap parser (post #464)** — heading-style ROADMAP works; phase-status detector reads via this
- **`rihal-tools.cjs walkPhaseDirs` (line ~3107)** — already enumerates phase dirs and detects SUMMARY/SPRINT/RESEARCH/CONTEXT presence; perfect input for phase-status drift logic

### Established patterns
- **Manual-invoke first, hooks layer after** — Phase 6's intentional sequencing; Phase 8 ships the layer.
- **Reports in phase dir as markdown** — phase-status drift report at `${phase_dir}/PHASE-STATUS-DRIFT.md`.
- **Atomic commit per fix in `--fix` modes** — `fix(phase-status): {what} → {what}` matches the existing prefix family.

### Integration points
- **`scripts/dogfood-check.sh`** — Phase 8 adds a new check that calls phase-status drift detector and fails on `major`-severity findings.
- **`.claude/settings.json`** — PostToolUse hook lives here when user opts in.

</code_context>

<specifics>
## Specific Ideas

- The `--quick` mode for hooks is critical — without it, every doc edit blocks for the full verifier loop (~30s minimum). `--quick` should target <2s.
- Phase-status drift detector should NOT auto-fix Active→Complete transitions — those are decisions, not corrections. Only ✅ marker / missing date are auto-fixable.
- Cadence doc should include sample crontab entries + sample `/loop` invocations. Don't make users invent schedules from scratch.

</specifics>

<deferred>
## Deferred Ideas

- **Real-time file-watcher daemon** — rejected indefinitely (covered by hook).
- **Email / Slack notifications on drift findings** — out of scope; CI gate already shows in PR.
- **Cross-project dogfood scheduling** — Phase 8 covers single-repo; multi-repo orchestration deferred.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 8-auto-heal-cadence-hooks*
*Context gathered: 2026-04-29*
