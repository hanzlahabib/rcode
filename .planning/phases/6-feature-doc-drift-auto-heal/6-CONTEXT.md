# Phase 6: Feature Doc Drift Auto-Heal — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a drift detector that reads the PRD → epics → stories → code chain, surfaces stale claims with severity tags, and offers a bounded auto-fix path for trivial items only. Closes the gap between feature documentation layers that no existing rihal tool currently spans (`/rihal:docs-update` covers project docs, `/rihal:correct-course` covers PRD-vs-code, `/rihal:memory-audit` reports but doesn't fix — the chain in between is uncovered).

**In scope:**
- New `/rihal:feature-drift` workflow + verifier agent
- Classifier extension so `/rihal:do` correctly routes "audit / drift / re-audit" intent
- `--fix` mode on `/rihal:memory-audit` (surgical updates of trivial staleness only)

**Out of scope (deferred — see deferred section):**
- Cadence docs (`/loop` + `/schedule` integration) — Phase 7
- PostToolUse hook for edit-time drift scan — Phase 7
- Real-time file-watcher daemon — overkill until manual flow proves out
- Migration of existing zero-padded phases 01-05 — Hanzla chose forward-only

</domain>

<decisions>
## Implementation Decisions

### Severity & Action Model

- **D-1:** Auto-fix is opt-in via `--fix` flag, never default. Reports flag-only by default. Matches `/rihal:audit-fix` precedent — trust earned through use, not assumed.
- **D-2:** Severity threshold for `--fix` is "trivial only" — typo-class corrections, stale dates, broken relative paths, factually-wrong-and-mechanically-correctable. Anything structural (rephrasing, deleting claims, changing scope statements) stays flag-only and requires human review.

### Failure Modes

- **D-3:** When PRD / epics / stories file is missing, the drift detector warns and continues with partial scope. Fail-closed blocks early-stage projects from running drift detection at all; fail-open hides drift. Warn-and-continue is honest about gaps.

### Agent Architecture

- **D-4:** Extend the existing `rihal-docs-auditor` agent with a `--mode=feature-drift` flag rather than create a new `rihal-feature-drift-auditor`. Agent count is already a project pain point (issue #100 backlog) — adding more agents without strong cause violates that.

### Phase Scope

- **D-5:** Plans 4 (cadence docs) and 5 (PostToolUse hook) are deferred to Phase 7. Phase 6 ships the core capability — workflow + agent + classifier + memory-audit `--fix`. Polish (scheduled runs, edit-time hooks) needs the core proven first.

### Claude's Discretion

- Implementation language, file paths inside `rihal/workflows/feature-drift.md` and `rihal/agents/`: Claude decides.
- Bounded fix-loop iteration cap: Claude picks a sensible default (suggest 3 passes) — bounded means bounded, exact number is implementation detail.
- Severity tag taxonomy: Claude picks (e.g., critical / major / minor / trivial) consistent with existing rihal conventions.
- Output format of drift report: Claude picks markdown with severity-grouped sections.

### Folded Todos

None — no pending todos matched Phase 6 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing auto-heal patterns (study before designing the new one)
- `rihal/workflows/docs-update.md` — writer + verifier loop pattern that the feature-drift workflow should mirror
- `rihal/workflows/audit-fix.md` — find → classify → fix → test → commit autonomous pipeline
- `rihal/workflows/code-review-fix.md` — REVIEW.md consumption pattern for severity-tagged auto-fix
- `rihal/workflows/correct-course.md` — PRD-vs-code drift comparison (the layer above feature-drift)
- `rihal/workflows/memory-audit.md` — current report-only memory bank audit (D-1 / D-2 extends this with --fix)

### Existing agents to study / extend
- `rihal/agents/rihal-docs-auditor.md` — agent to extend with `--mode=feature-drift` per D-4
- `rihal/agents/rihal-noor.md` — companion writer agent (writes corrections after auditor flags them)

### Classifier
- `rihal/bin/rihal-tools.cjs` — `cmdClassifyQuestion` (line ~394) and `classifyScope` (line ~2340) are the extension points for D-1's intent routing
- `rihal/workflows/do.md` — routing table line 270-303 needs the new "audit / re-audit / extend artifact" entry (already added in #458 fix to point at `/rihal:audit`; feature-drift slots underneath that)

### Issues / decisions tracked
- `#459` — umbrella issue for this phase
- `#456`, `#457`, `#458`, `#460` — sibling fixes shipped while scaffolding Phase 6 (they prove the same systemic pattern this phase is meant to detect — meta-confirmation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`rihal-docs-auditor` agent:** Already structured around verifier-loop pattern. Extending with a mode flag avoids agent proliferation (D-4).
- **`rihal-noor` writer agent:** Pairs with auditor in `docs-update` flow. Same pairing works for feature-drift's `--fix` path.
- **Bounded fix-loop pattern (`docs-update.md`):** Reusable. Drift detector + writer iterate up to N passes, then escalate to human if drift remains.
- **Severity-tag conventions in `code-review-fix.md`:** Existing taxonomy (critical/major/minor/trivial) — match it for consistency.
- **Classifier extension surface (`classifyScope` in `rihal-tools.cjs`):** Just added "phase" + "feature" + "ticket" types — adding "audit"/"drift" is a small extension.

### Established Patterns
- **Manual-invoke first, hooks later:** Every existing rihal auto-heal tool is manually invoked. Phase 6 follows the pattern — D-5 explicitly defers hooks to Phase 7.
- **Reports as markdown artifacts in phase dirs:** `REVIEW.md`, `VERIFICATION.md`, `SECURITY.md` precedent. The drift report should follow — call it `DRIFT.md` or `DRIFT-REPORT.md`.
- **Atomic commit per fix in `--fix` modes:** `code-review-fix.md` and `audit-fix.md` both commit each fix individually. Feature-drift `--fix` does the same.

### Integration Points
- **`/rihal:do` routing table** (already updated in #458 to mention `/rihal:audit`) — needs a sub-route for `/rihal:feature-drift`.
- **`rihal-tools.cjs` classifier** — new intent type so router can pick this up automatically.
- **`/rihal:memory-audit` workflow** — accepts new `--fix` flag, routes to writer agent for trivial-tier corrections only.

</code_context>

<specifics>
## Specific Ideas

- "Fail open on missing files" specifically means: if `epics.md` is missing, drift detector still reads PRD + stories + code and reports drift between THOSE three layers. Output explicitly says "epics layer not present — skipped, drift may exist that this run cannot see."
- "Trivial only" for `--fix` (D-2) is enforced by a hard severity allowlist in code, not by hoping the agent stays conservative. Items above the allowlist are reported, never patched.
- `--fix` mode commits each correction as its own atomic git commit with message `fix(drift): {what was stale} → {what's true now}` — humans can `git revert` individual fixes if needed.
- Drift report writes to `${phase_dir}/DRIFT.md` if invoked inside a phase context, otherwise to `.planning/audits/feature-drift-{ISO}.md`.

</specifics>

<deferred>
## Deferred Ideas

- **Plan 4 — `/loop` + `/schedule` cadence docs** (Phase 7). How-to docs + recommended cadences for `/rihal:docs-update`, `/rihal:health`, `/rihal:feature-drift`. No new infra, just a reference doc.
- **Plan 5 — PostToolUse hook on `docs/`, `prd/`, `epics/` edits** (Phase 7). Settings.json hook fires `feature-drift --quick` on Edit. Opt-in via `/rihal:enable-hooks`.
- **Real-time file-watcher daemon** — overkill. Skipped indefinitely.
- **Sweep migration of existing zero-padded phases 01-05** → plain integers — chosen forward-only by Hanzla; legacy stays.

### Reviewed Todos (not folded)
None — no pending todos were reviewed.

</deferred>

---

*Phase: 6-feature-doc-drift-auto-heal*
*Context gathered: 2026-04-29*
