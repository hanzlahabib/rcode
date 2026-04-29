# Phase 6: Feature Doc Drift Auto-Heal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 6-feature-doc-drift-auto-heal
**Mode:** Express (single-pass, recommendations accepted in batch)
**Areas discussed:** Severity & Action Model, Failure Modes, Agent Architecture, Phase Scope

---

## Severity & Action Model

| Decision | Options Presented | Selected |
|---|---|---|
| **D-1: Auto-fix vs flag-only on first pass** | A: flag-only (humans review) · B: auto-fix low-severity · C: opt-in `--fix` flag | **C** |
| **D-2: Severity threshold for auto-fix** | A: trivial only (typos/dates) · B: + low-risk text edits · C: + structural changes | **A** |

**User's choice:** Accepted both recommended options.
**Rationale:** Conservative defaults match `/rihal:audit-fix` precedent. `--fix` opt-in earns trust through use; trivial-only allowlist makes the safety promise enforceable in code rather than reliant on agent judgment.

---

## Failure Modes

| Decision | Options Presented | Selected |
|---|---|---|
| **D-3: Missing-file behavior** | A: fail closed (error) · B: fail open (skip silently) · C: warn + continue with partial scope | **C** |

**User's choice:** Accepted recommendation.
**Rationale:** Fail-closed blocks early-stage projects. Fail-open hides drift. Warn-and-continue is the only honest middle ground.

---

## Agent Architecture

| Decision | Options Presented | Selected |
|---|---|---|
| **D-4: Reuse `rihal-docs-auditor` or new agent** | A: reuse · B: new `rihal-feature-drift-auditor` · C: extend with mode flag | **C** |

**User's choice:** Accepted recommendation.
**Rationale:** Agent count is already a project pain point (issue #100). Extension with `--mode=feature-drift` keeps agent surface area lean while reusing the verifier-loop pattern.

---

## Phase Scope

| Decision | Options Presented | Selected |
|---|---|---|
| **D-5: Plans 4 + 5 in scope or deferred** | A: in-scope for Phase 6 · B: defer to Phase 7 · C: in-scope but optional (best-effort) | **B** |

**User's choice:** Accepted recommendation.
**Rationale:** Plans 1-3 are core capability; 4-5 are deployment polish. Ship core first, layer polish in Phase 7.

---

## Claude's Discretion

- Iteration cap for bounded fix-loop (suggest 3 passes)
- Severity tag taxonomy (consistent with existing rihal conventions)
- Drift report file format and exact path
- Internal file structure of new workflow + extended agent

## Deferred Ideas

- Plan 4 — `/loop` + `/schedule` cadence docs → Phase 7
- Plan 5 — PostToolUse hook on `docs/`, `prd/`, `epics/` edits → Phase 7
- Real-time file-watcher daemon → skipped (overkill until manual flow proves out)
- Sweep migration of zero-padded legacy phases → forward-only per Hanzla, no migration
