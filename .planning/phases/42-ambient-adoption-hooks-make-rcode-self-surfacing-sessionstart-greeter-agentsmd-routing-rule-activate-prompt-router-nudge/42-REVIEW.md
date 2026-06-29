---
status: issues_found
phase: 42
critical: 0
high: 1
medium: 1
low: 2
generated: 2026-06-29T00:00:00Z
---

# Phase 42 Code Review — Ambient Adoption Hooks

**Branch:** `42-ambient-adoption` | **Commits reviewed:** `ee730e8..HEAD` (13 commits)
**Scope:** Sprint 42.1 (CLAUDE.md/AGENTS.md routing rule), 42.2 (state-reader extraction + session-start), 42.3 (dogfood hook activation + intent-table data).

---

## Pattern Check

Before findings: the overall code shape is sound. The state-reader extraction follows Node stdlib-only conventions established across this file. Template-literal escaping in `cmdGenerateClaudeMd` was verified: every inline backtick inside the template string is escaped (`\`` throughout lines 4503–4573); no breakage. The AGENTS.md guard logic (`!agentsExisted || force`) is correct and idempotent. All 13 commits follow Conventional Commits; no AI attribution in any subject or body. JSON in both `settings-hooks.json` and `.claude/settings.json` is valid and contains no duplicate entries per event type.

---

## Findings

### HIGH

#### H1 — `INTENT_TABLE` eager module-level load breaks ALL hook subcommands when data file is absent

**Files:** `rcode/bin/rcode-hooks.cjs:580–585`, `cli/install.js:1307–1311`

```js
const INTENT_TABLE = JSON.parse(
  require('fs').readFileSync(
    require('path').join(__dirname, '..', 'data', 'intent-table.json'),
    'utf8'
  )
);
```

This runs at `require()` time, unconditionally. From `.rcode/bin/rcode-hooks.cjs`, `__dirname` is `.rcode/bin/`, so the resolved path is `.rcode/data/intent-table.json`. The install plan at `cli/install.js:1307–1311` only walks `rcode/bin/` and copies it to `.rcode/bin/`; it never copies `rcode/data/` to `.rcode/data/`. The dogfood copy was placed manually in commit `1059a70`.

**Impact:** Any user project that runs `rcode install` and enables hooks will not have `.rcode/data/intent-table.json`. When Claude Code fires any hook — `pre-edit`, `bash-guard`, `session-start`, `pre-compact`, `stop`, etc. — Node crashes immediately on `require('rcode-hooks.cjs')` before reaching the subcommand dispatch. This is a total hook failure, not a prompt-router-only failure. Every guardrail goes dark.

**Tracked:** `#952` covers the unguarded eager load. The install distribution gap (missing `data/` in the copy plan) is the concrete failure mechanism that wasn't scoped in that issue.

**Recommended fix:** In `cli/install.js`, add a `walkFiles(path.join(SOURCE_ROOT, 'data'))` block analogous to the `bin/` block at line 1308, mapping to `.rcode/data/`. Do not lazy-load the JSON inside `promptRouter()` only — that still leaves the variable undefined for other call paths. The safe fix is both: add the data directory to the install plan AND wrap the module-level load in a try/catch that sets `INTENT_TABLE` to `[]` on failure so other subcommands remain operational.

---

### MEDIUM

#### M1 — `resolveActivePhase` picks the first executing phase, not the most-recently-added one

**File:** `rcode/bin/lib/state-reader.cjs:17`

```js
const executing = phases.find((p) => p && p.status === 'executing');
```

`Array.find()` returns the first match in array order. Phases are stored in insertion order in `state.json`. When multiple phases share `status === 'executing'` (a realistic scenario: phases 35, 36, 37 all marked executing because none were ever closed), this always resolves to phase 35 — the oldest, not the active one.

`session-start` uses `resolveActivePhase` directly (`rcode-hooks.cjs:909`) and emits the result as the session primer. The user sees "Phase 35 executing" at session open, which is misleading when phase 37 is the real work in progress.

`preCompact` consumes the same helper, so HANDOFF.json and `.continue-here.md` carry the same stale label after compaction.

The tie-breaking strategy is undocumented; there is no comment explaining why first-wins is correct.

**Recommended fix:** Change `phases.find(...)` to `phases.findLast(...)` (Node 18+, available in the project's runtime) to prefer the most-recently-added executing phase. Add a comment. Separately, add a guard/warning in `cmdPhaseClose` or equivalent that warns when more than one phase is `executing` — the root cause is stale state, and the resolution helper can't fully compensate for it.

---

### LOW

#### L1 — `readMilestoneHint` silently swallows a `readFileSync` error that the original `preCompact` would have propagated

**Files:** `rcode/bin/lib/state-reader.cjs:88–95` vs. original `preCompact` at commit `a501a01`

The original inline milestone code had no try/catch around `fs.readFileSync(full, 'utf8')`. A permission error on an existing ROADMAP.md would have thrown, propagated to `preCompact`'s outer catch, and exited 1 (the contract for hook errors). The extracted `readMilestoneHint` wraps the read in `try/catch { /* ignore */ }`, returning `null` instead.

This is a deliberate resilience improvement — exit 1 on ROADMAP permission failure was unlikely to be intentional — but it is a behavior change that was not documented. The comment says "ignore" with no rationale.

**Recommended fix:** Change `catch { /* ignore */ }` to `catch { /* ignore — advisory; fail-open on unreadable ROADMAP */ }`. No code change required.

#### L2 — `prompt_nudge` config key shipped commented-out with no inline reason

**File:** `/home/hanzla/development/rihal-code/.rcode/config.yaml:19–22`

```yaml
# prompt_nudge controls how aggressively the UserPromptSubmit hook nudges toward rcode commands.
# ...
# prompt_nudge: every
```

The key is commented out. `readPromptNudgeToggle` correctly defaults to `'every'` when the key is absent, so runtime behavior is correct. However, reading the config gives the impression the feature is not activated. A future maintainer toggling this off (commenting it back in with a different value) would see an uncommented default that appeared to already be disabled.

The stub comment says "added" in the sprint summary but the key is never active in the file. It reads as a todo, not a documented default-by-convention.

**Recommended fix:** Uncomment the key (`prompt_nudge: every`) with a comment explaining the valid values and the default. Alternatively, add an explicit comment: `# Uncomment to override (default: every when absent)`.

---

## Test Coverage Assessment

No new tests were added for `state-reader.cjs`, `session-start`, or `promptRouter`. The extracted helpers are pure functions and easily unit-testable. The phase-ambiguity issue (M1) would be caught immediately by a test with multiple `executing` phases in the input. Filing as a gap rather than a blocker since this codebase has no precedent of hook unit tests.

---

## Maintainability Notes

- `rcode-hooks.cjs` is 983 lines, within the 1000-line limit. The extraction accomplished its stated goal.
- The `resolveActivePhase` tie-breaking semantics (first vs. last executing) are the kind of implicit behavior that accumulates into bugs over time. Document or encode it explicitly before more callers are added.
- The `__dirname`-relative path in the module-level `INTENT_TABLE` load creates a tight coupling between directory layout and runtime location. If `rcode-hooks.cjs` is ever symlinked or relocated, the path silently breaks. A `process.env.RCODE_DATA_DIR` escape hatch would future-proof this.

