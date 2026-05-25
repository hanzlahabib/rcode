# AUDIT2 — Lens 13: Observability (Round 2 — General Code Health)

**Branch:** audit2-lens-13-observability  
**Date:** 2026-05-25  
**Status:** WARN  
**Auditor:** lens-13-observability agent (audit-only, no source edits)  
**Prior audit:** `.planning/audits/AUDIT-lens13-observability.md` (2026-05-24, Status: FAIL)

---

## Scope Scanned

Lens 13 round 2 targets **general observability code health** — not rebrand residue. The seven dimensions:

| Dimension | Description |
|-----------|-------------|
| (a) Unguarded rcode-tools calls | `node rcode-tools.cjs ...` calls with no `2>/dev/null` and no `|| fallback` |
| (b) Bare `2>/dev/null` on state writes | rcode-tools state-write calls ending in `2>/dev/null` with no `\|\|` fallback |
| (c) Task() result capture | `Task()` calls where result is never stored or checked |
| (d) INIT= without .ok guard | Assignments where failure yields empty or error JSON, silently continuing |
| (e) console.log in production code | Unstructured `console.*` in `cli/`, `server/`, `rcode/bin/` |
| (f) Shell scripts missing `set -euo pipefail` | All `.sh` files checked |
| (g) Structured logging absent | No Pino/Winston/OTEL investment at all in Node binaries |

**Directories scanned:** `rcode/`, `.rcode/`, `cli/`, `server/`, `scripts/`, `.claude/hooks/`  
**Excluded:** `node_modules/`, `.git/`, `audit/`, `CHANGELOG.md`

---

## Commands Run

```bash
# Dimension (a) — unguarded rcode-tools calls
grep -rn "node.*rcode-tools\.cjs" rcode/workflows/ .rcode/workflows/ | grep -v "2>/dev/null\||| echo\||| true\||| node\|#"

# Dimension (b) — bare 2>/dev/null on state writes
grep -rn "rcode-tools\.cjs.*2>/dev/null$" rcode/workflows/ .rcode/workflows/

# Dimension (c) — Task() result capture
grep -rn "Task(" rcode/ .rcode/ | grep -v "\.git|CHANGELOG|example|#"
# + manual inspection of context around each Task() call site

# Dimension (d) — INIT= assignments
grep -rn "INIT=\|PHASE_INFO=\|INIT_JSON=\|AUDIT=" rcode/workflows/ .rcode/workflows/
# + 15-line window inspection for .ok guard at each site

# Dimension (e) — console.log
grep -rn "console\.(log|error|warn|debug)" rcode/bin/ server/ cli/ --count

# Dimension (f) — shell scripts
find . -name "*.sh" ! -path "*/node_modules/*" ! -path "*/.git/*"
# + check each for set -euo pipefail

# Dimension (g) — structured logging
grep -rn "pino|winston|bunyan|opentelemetry" package.json rcode/bin/ server/ cli/
```

---

## Prior Audit Status (Round 1 → Round 2 Delta)

| Prior Finding | Severity | Status in Round 2 |
|---------------|----------|-------------------|
| C1: `.rcode/workflows/verify-work.md:53` — `agent-skills rihal-checker` | critical | **FIXED** — now `rcode-sprint-checker` |
| C2: `.rcode/workflows/discuss-phase.md:155` — `agent-skills rihal-advisor` | critical | **FIXED** — now `rcode-advisor-researcher` |
| C3: `.rcode/workflows/research-phase.md:47` — `agent-skills rihal-researcher` | critical | **FIXED** — now `rcode-phase-researcher` |
| C4: `.rcode/skills/rihal-code-review/...` — `Task(subagent_type="rihal-security-adversary")` | critical | **FIXED** — `.rcode/skills/` is empty; skill removed |
| C5: `.rcode/skills/rihal-code-review/...` — `Task(subagent_type="rihal-edge-case-hunter")` | critical | **FIXED** — same removal |
| W1-W6: `.rcode/workflows/*.md:12` — `find .rcode/skills/actions -path "*rihal-*"` | warn | **PARTIALLY FIXED** — names changed to `rcode-*` but `.rcode/skills/actions/` still does not exist at runtime (skills install to `.claude/skills/`); every `find` returns empty string, fallback fires "Skill not installed" |
| W7: `.rcode/skills/rihal-code-review/steps/step-02-review.md:28` — stale agent name | warn | **FIXED** — file removed |
| W8: `.github/workflows/semantic.yaml:94` — `rihal-tools` scope retained | warn | **UNCHANGED** — intentional backward-compat |
| W9-W14: `/tmp/rihal-review-*` temp file names in `review.md` | warn | **FIXED** — `/tmp/rihal-*` names no longer present |

---

## New Findings (Round 2 — General Health)

### Critical

_None identified._

---

### Warning

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `rcode/workflows/council.md` | 142 | `INIT_JSON=$(node .rcode/bin/rcode-tools.cjs init council "$ARGUMENTS")` — no `2>/dev/null`, no `\|\| fallback`, and no downstream `.ok` check in first 15 lines. If `rcode-tools.cjs` crashes or is absent, `INIT_JSON` is empty; workflow silently tries to parse JSON from an empty string; panel selection is skipped; subagents receive no council config. | **warn** |
| `rcode/workflows/audit-uat.md` | 11 | `AUDIT=$(node ".rcode/bin/rcode-tools.cjs" audit-uat --raw)` — no `2>/dev/null`, no `|| echo '{}'`. If the command fails (e.g., `state.json` corrupt), `AUDIT` is empty; the JSON parse of `results` and `summary` produces undefined; `summary.total_items` throws silently; workflow exits claiming "All Clear" when state is actually unknown. | **warn** |
| `rcode/workflows/profile-user.md` | 31 | `INIT=$(node .rcode/bin/rcode-tools.cjs init profile-user "$ARGUMENTS")` — no `2>/dev/null`, no `\|\|` fallback, and **no downstream error check** (unlike most other INIT= sites which check `INIT.ok` or `phase_found`). If the binary fails, `flags.json` and `profile_path` are parsed from empty string; workflow continues silently collecting profile data then writes to undefined path. | **warn** |
| `rcode/workflows/ui-phase.md` | 31 | `INIT=$(node .rcode/bin/rcode-tools.cjs init ui-phase "$ARGUMENTS")` — same pattern as profile-user.md; no guard, no downstream `.ok` check. Failure yields empty `flags.existing_ui`, `flags.design_system`, `ui_spec_path`; subsequent `find-files` call on line 43 also unguarded. | **warn** |
| `rcode/workflows/execute-sprint.md` | 492–536 | Five sequential `node ".rcode/bin/rcode-tools.cjs" state *` calls (`advance-plan`, `update-progress`, `record-metric`, `add-decision`, `record-session`, `roadmap update-plan-progress`) have **no error guards** — no `2>/dev/null`, no `|| echo`, no failure branch. A single transient failure (e.g., lock contention, disk full) silently skips state advancement; the sprint counter drifts; subsequent `/rcode-next` sees wrong phase completion state. This is the highest-impact unguarded block. | **warn** |
| `rcode/workflows/research-phase.md` | 26 | `PHASE_INFO=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}")` — no guard. However the immediate downstream check `If found is false: Error and exit` mitigates the impact if `rcode-tools.cjs` returns a well-formed error JSON. If it exits non-zero and emits no output, `PHASE_INFO` is empty and the guard fails silently. | **warn** |
| `server/dashboard.js` | — | No `process.on('unhandledRejection')` or `process.on('uncaughtException')` handlers. The orchestrator (`server/orchestrator.js`) correctly has both. Dashboard has async spawn paths (`ensurePty`, `spawnOrchestrator`) where an uncaught rejection would terminate the process with no error log. | **warn** |
| `scripts/sync-bin.sh` `scripts/dogfood-check.sh` `.claude/hooks/block-unregistered-phase-writes.sh` `.claude/hooks/sync-bin-on-edit.sh` | 10–17 | All 4 shell scripts use `set -e` only — missing `-u` (undefined variables silently expand to empty string) and `-o pipefail` (exit code of a pipeline is last command, hiding earlier failures). Example: `grep X file | wc -l` — if `grep` errors, the count still shows 0. | **warn** |

---

### Info

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `rcode/bin/rcode-tools.cjs` | — | 143 `console.*` calls with **no structured logging library** (no Pino, Winston, or OTEL). All logging is unstructured plain-text to stderr/stdout. This makes log aggregation, filtering by level, and tracing impossible. Acceptable for a CLI tool at current scale, but a gap if orchestration logging ever needs machine-readable traces. | **info** |
| `rcode/bin/rcode-hooks.cjs` | — | 20 `console.*` calls — all stderr, which is correct for hooks (hooks output goes to Claude Code's tool stderr). Unstructured but appropriate for the hook context. | **info** |
| `server/orchestrator.js` | 391–398 | Startup banner uses 8 `console.log` lines (plain text). The `unhandledRejection` / `uncaughtException` handlers include ISO timestamps manually (`'[' + new Date().toISOString() + ']'`) — a manual structured-log pattern. Inconsistent with the rest of the file which has no timestamps on `console.error('[orchestrator] server error:', ...)`. | **info** |
| `server/dashboard.js` | 148 | Startup message includes `kill $(lsof -t -i:${PORT})` — `lsof` is not available on all systems (notably WSL2 where it hangs; per project memory `reference-wsl-lsof-hangs.md`). This is a user-visible message, not a bug, but it will display a broken command to WSL2 users. | **info** |
| `rcode/workflows/*/`:12 (6 files) | 12 | `find .rcode/skills/actions -path "*rcode-<skill>/workflow.md"` — `.rcode/skills/` never exists in install mirror (skills go to `.claude/skills/`). Every invocation fires the "Skill not installed" fallback even when skills ARE installed. The path target is wrong. Prior audit classified as W1-W6 with `rihal-*` names — names are now `rcode-*` (fixed) but the path is still wrong (persistent gap). | **info** |
| `rcode/workflows/execute-waves.md` | 149 | `rmdir "$LOCK_DIR" 2>/dev/null` — intentionally silent; `rmdir` on a stale lock that another process already cleaned is expected to fail and should be silenced. This is a **correct** use of `2>/dev/null`. | **info** |
| `rcode/workflows/plan.md` `rcode/workflows/discuss-phase.md` `rcode/workflows/execute.md` | 819, 860, 257 | `node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null` — intentionally silent; the `_auto_chain_active` flag is ephemeral cleanup that should not block workflow startup if `rcode-tools.cjs` is unavailable. This is a **correct** use of `2>/dev/null`. | **info** |

---

## Observability Coverage Assessment

### What Is Well-Guarded

- `main().catch()` at top of `rcode-tools.cjs` — unhandled top-level errors logged + exit 1.
- `server/orchestrator.js` — has both `unhandledRejection` and `uncaughtException` handlers.
- Most `INIT=` sites use `2>/dev/null` and check `INIT.ok`, `phase_found`, or `roadmap_exists`.
- `map-codebase.md` — parallel `Task()` calls use `TaskOutput` with `block:true` + timeout; result checked.
- `plan.md` — `Task(rcode-sprint-checker)` result captured; `## VERIFICATION PASSED` / `## ISSUES FOUND` gates enforced.
- `import.md` — explicit guidance: "If the Task() call itself fails … display error and proceed."
- `audit-fix.md` — `Task(rcode-executor)` result implicit in test-pass gate; test failure halts pipeline.
- `validate-phase.md` — `Task(rcode-nyquist-auditor)` return codes (`GAPS FILLED`, `PARTIAL`, `ESCALATE`) all handled.

### Structural Gap: No Machine-Readable Observability

Neither `rcode-tools.cjs` nor `server/orchestrator.js` emits structured JSON logs. Debugging production multi-agent workflows (e.g., finding which wave failed, why state.json drifted) requires reading unstructured stderr. For a system that orchestrates 10–20 parallel subagents, this is a meaningful blind spot. The `DEBUG=1` env gate in `rcode-tools.cjs` (lines 2592, 2636, 7357, 7364) provides stack traces but not structured events.

**OpenTelemetry/Pino retrofit cost:** Medium — ~200 lines in `rcode-tools.cjs`, ~50 lines in `server/orchestrator.js`. No breaking changes required; existing callers are fine since stdout is already JSON-only (stderr is the log channel).

---

## Severity Summary

| Severity | Count | Notes |
|----------|-------|-------|
| Critical | 0 | All prior criticals resolved |
| Warn | 8 | Execute-sprint unguarded state writes is highest-impact |
| Info | 7 | Includes structural logging gap and skills-path stale issue |

**Overall Status: WARN**

The critical rebrand residue from the prior audit is fully resolved. The remaining warnings are general engineering gaps: three workflows with no INIT error handling (council, profile-user, ui-phase), an unguarded state-write sequence in execute-sprint that can silently corrupt sprint counters, and server/dashboard.js missing global error handlers. No structured logging library is in use anywhere, which limits debuggability of multi-agent orchestration.

---

## Recommendations (Priority Order)

1. **execute-sprint.md state writes** — wrap the 5-call state-update block in a guard: `|| echo "⚠ state update failed — run /rcode-status to verify"`. Silent sprint counter drift causes hard-to-diagnose `/rcode-next` failures.

2. **council.md / audit-uat.md** — add `2>/dev/null || echo '{}'` fallback so empty JSON does not crash the parse step.

3. **profile-user.md / ui-phase.md** — add `.ok` check with error exit after INIT=.

4. **server/dashboard.js** — add `process.on('unhandledRejection')` and `process.on('uncaughtException')` matching the orchestrator pattern.

5. **Shell scripts** — upgrade `set -e` to `set -euo pipefail` in all 4 scripts (5-minute fix, zero behaviour change for happy path).

6. **Skills path (.rcode/skills/actions)** — fix the 6 workflow `find` commands to target the correct install location (`.claude/skills/`) or use `rcode-tools.cjs skill-path` if that command exists.

7. **(Future / nice-to-have)** — Introduce Pino to `rcode-tools.cjs` and `server/orchestrator.js` for JSON-structured logs behind a `RCODE_LOG_LEVEL` env gate. No urgency at current scale.
