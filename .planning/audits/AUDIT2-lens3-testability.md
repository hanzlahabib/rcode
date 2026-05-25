# Lens 3 — Testability: Round-2 Audit

**Branch:** audit2-lens-3-testability  
**Date:** 2026-05-25  
**Scope:** General code-health testability audit — functions/workflows/commands with no test; missing assertions; tests that bypass real boundaries; flaky time-dependent patterns; coverage blind spots across `rcode/` and `.rcode/`.  
**Prior audit:** No prior Lens-3 audit exists (lens-3 was not run in the round-1 campaign).  
**Status: WARN** — 17 findings across 6 categories. No critical failures; 2 failing tests in CI (pre-existing, unrelated to this lens). Key gaps: `code-references.cjs` is a complex untested utility; 5 CLI entry points have zero test coverage; 27/37 action skills are test-invisible; 1 hardcoded port creates flaky CI risk.

---

## Commands run

```bash
# Test suite health
node --test test/*.test.cjs 2>&1 | grep -E "(✓|✖|tests|pass|fail)" | tail -5
node --test test/lib/*.test.cjs 2>&1 | grep "ℹ tests" | tail -1

# Source file × test coverage matrix
find rcode/bin/ scripts/ -name "*.js" -o -name "*.cjs" -o -name "*.mjs"
for f in rcode/bin/lib/*.cjs; do
  grep -rl "$(basename $f .cjs)" test/ | wc -l
done

# CLI file × test coverage
for f in cli/*.js; do grep -rl "$(basename $f .js)" test/ | head -1; done

# Action skill × test coverage
find rcode/skills/actions/ -name "SKILL.md" | while read f; do
  skill=$(basename $(dirname "$f"))
  grep -rl "$skill" test/ | wc -l
done | sort -n

# Assertion quality
for f in test/*.test.cjs; do
  echo "ASSERTS=$(grep -c 'assert\.' $f) LINES=$(wc -l < $f) FILE=$(basename $f)"
done | sort -t= -k1 -n | head -10

# Time-dependent tests
grep -n "new Date\|Date.now\|setTimeout\|setInterval" test/*.test.cjs

# Hardcoded ports
grep -rn "PORT.*=[0-9]\{4\}" test/

# Source-read tests (bypass boundary)
grep -rn "readFileSync.*install\|readFileSync.*uninstall" test/*.test.cjs

# Mocking patterns
grep -n "mock\|stub\|sinon\|jest\." test/*.test.cjs

# Memory Bank Hooks compliance in action skills
find rcode/skills/actions/ -name "SKILL.md" | xargs grep -l "Memory Bank" | wc -l
find rcode/skills/actions/ -name "SKILL.md" | xargs grep -L "Memory Bank" | wc -l

# Untested council-panel functions
grep "detectDomain\|validateAgents\|loadTeamConfig" test/*.test.cjs

# Prior L15 findings re-check
grep "@" .rcode/workflows/prfaq.md
grep "@" .rcode/workflows/checkpoint-preview.md
grep -rn "subagent_type.*rihal-" .rcode/skills/
```

---

## Test suite baseline

| Metric | Value |
|--------|-------|
| Total tests (node --test) | 339 |
| Passing | 337 |
| Failing | 2 (pre-existing: agent-size-budget sanity, package-files-parity dist/) |
| Test files (top-level) | 52 `.test.cjs` |
| Test files (lib) | 7 `test/lib/*.test.cjs` |
| Test files (eval) | 1 `test/eval/run-eval.cjs` (2 tests) |

---

## Findings

| ID | File | Line | Description | Severity |
|----|------|------|-------------|----------|
| L3-01 | `rcode/bin/lib/code-references.cjs` | — | No test file anywhere in `test/` references this module. Exports `extractReferences()` and `verifyReferences()` — two regex-heavy functions used by rcode-tools `verify-references` subcommand and `.rcode/agents-rules/sprint-checker/process.md`. Complex regex patterns (4 patterns, CamelCase filter, file:line detection) have zero unit test coverage. | **critical** |
| L3-02 | `cli/github-sync.js` | — | No test reference. Complex multi-entity sync logic (milestones, epics, stories) with dry-run/execute modes and partial-phase targeting. Only `cli/` file that touches the GitHub API with zero coverage. | **warn** |
| L3-03 | `cli/nuke.js` | — | No test reference. Destructive removal of all rcode artifacts across all package managers + Claude global dirs. Zero coverage on a file that can permanently delete user data. | **warn** |
| L3-04 | `cli/set-mode.js` | — | No test reference. Thin wrapper over `rcode config communication_mode`. | **info** |
| L3-05 | `cli/set-profile.js` | — | No test reference. Thin wrapper over `rcode config model_profile`. | **info** |
| L3-06 | `cli/show-model.js` | — | No test reference. Lists resolved model per agent per profile. | **info** |
| L3-07 | `scripts/build-skills-catalog.cjs` | — | No test reference. Builds `docs/skills-catalog.md` from all SKILL.md frontmatter. If the parser regresses, the output silently corrupts without CI catching it. | **warn** |
| L3-08 | `rcode/bin/lib/roadmap.cjs` | — | No unit tests for internal library functions: `extractPhases()`, `parseRequirements()`, `parseSuccessCriteria()`, `parsePlans()`, `phaseStatus()`. Only tested via CLI subprocess in `test/milestone-discipline.test.cjs` (black-box). Parsing bugs in these functions are not caught until `validate-roadmap` CLI output changes. | **warn** |
| L3-09 | `rcode/bin/lib/verify.cjs` | — | `cmdSchemaDrift()` has no direct test. Depends on git history, making unit testing harder, but the function's parsing logic (migration detection, file change filtering) is untested. | **info** |
| L3-10 | `rcode/bin/lib/council-panel.cjs` | — | Three exported functions have no test: `detectDomain()`, `validateAgents()`, `loadTeamConfig()`. `panel-scorer.test.cjs` covers `selectPanel`, `explainSelection`, `MARKET_TRIGGERS`, `normalize`, `applyPriorityBoosts`, `scoreAgent`, and `AGENT_IDS` — but not these three. | **warn** |
| L3-11 | `test/orchestrator-security.test.cjs` | 20 | `const PORT = 7799` — hardcoded port. If another process holds 7799 (another test run in parallel, a user service), the `before()` hook will time out and all 6 tests fail. `dashboard-boot.test.cjs` uses `randomPort()` for exactly this reason; the orchestrator test predates that pattern. | **warn** |
| L3-12 | `test/install-batch5-regressions.test.cjs` | 224–241 | `#706` test reads `install.js` source with `fs.readFileSync` and asserts `timeout:\s*\d+` exists via regex. This verifies the option is *written* but not that it *fires*. Comment explicitly states: `"We can't easily test the timeout firing without mocking"`. Mocked boundary: real `execFileSync` timeout behavior is untested. | **warn** |
| L3-13 | `test/ide-list-parity.test.cjs` | 38 | Test 3 (`uninstall.js imports SUPPORTED_IDES instead of duplicating`) reads `uninstall.js` source with `readFileSync` to assert `require('./install.js')` is present. Source-pattern test — verifies the import is written, not that it is exercised at runtime. | **info** |
| L3-14 | `rcode/skills/actions/` | — | 27 of 37 action skills have zero test references anywhere in `test/`. The 10 with references are mentioned only in strings/comments, not exercised. No test enforces structural compliance (trigger phrases, output format, examples) for actions — `skills-compliance.test.cjs` scans all of `rcode/skills/` for name/description/line-budget but not the 5-component standard. | **warn** |
| L3-15 | `rcode/skills/actions/` | — | 25 of 37 action skills have no `Memory Bank Hooks` section. `skills-memory-hooks.test.cjs` **explicitly exempts** `rcode/skills/actions/` from enforcement (comment: `"tracked separately — many legacy action skills predate the 5-component standard"`). This exemption has never been lifted; the backlog of 25 skills with no declared read/write contract is invisible to CI. | **warn** |
| L3-16 | `test/workflow-behavioral.test.cjs` | — | All 13 assertions check for text patterns inside workflow `.md` files (regex on file content). These are structural-proxy tests: they verify a workflow *mentions* a concept (e.g. `rcode-executor`, `rcode\/snapshot\/phase`) but not that the concept is *wired correctly* or *executes*. A workflow can satisfy all 13 checks by having the keywords in a comment. | **info** |
| L3-17 | `scripts/dogfood-check.sh`, `scripts/sync-bin.sh` | — | Both shell scripts have no tests. `sync-bin.sh` copies production binaries; silent regression here could ship stale binaries. `dogfood-check.sh` is dev-workflow tooling, lower risk. | **info** |

---

## Verification notes

### L3-01 — code-references.cjs completely untested (critical)

**Verified:**
```bash
grep -rl "code-references" test/  # → (empty)
```
The module exports two functions called from `rcode/bin/rcode-tools.cjs:7081–7084` (the `verify-references` subcommand) and from `.rcode/agents-rules/sprint-checker/process.md`. The regex engine in `extractReferences()` has 4 independent patterns (file paths, file:line, snake_case, CamelCase) plus a 50+ word English-word filter set. Bugs in any pattern would silently produce wrong reference lists. `rcode-tools-subcommands.test.cjs` does not include a `verify-references` subcommand test.

### L3-02 / L3-03 — cli/github-sync.js and cli/nuke.js untested

**Verified:**
```bash
grep -rl "github-sync\|nuke" test/  # → (empty)
```
`github-sync.js` is ~350 lines of API coordination logic. `nuke.js` can delete global and project-level artifacts across 4 package managers — making it the highest-blast-radius untested file in the codebase.

### L3-07 — build-skills-catalog.cjs untested

**Verified:**
```bash
grep -rl "build-skills-catalog\|buildSkillsCatalog\|skills.*catalog" test/  # → (empty)
```
The script's `parseFrontmatter()` is a re-implementation different from the one in `skills-compliance.test.cjs`. Divergence in parsing behavior would silently produce a malformed catalog.

### L3-08 — roadmap.cjs library functions untested as units

**Verified:** No `require('../rcode/bin/lib/roadmap.cjs')` or `require('../rcode/bin/lib/verify.cjs')` exists in any test file. `test/milestone-discipline.test.cjs` uses `spawnSync` against the CLI binary — subprocess tests catch CLI output regressions but not internal parser bugs (e.g., `parseSuccessCriteria()` misreading a section boundary).

### L3-10 — council-panel.cjs: 3 untested exports

**Verified:**
```bash
grep "detectDomain\|validateAgents\|loadTeamConfig" test/*.test.cjs  # → (empty)
```
`loadTeamConfig()` reads `team.yaml` from the project root — if the YAML changes shape, the silent failure is `selectPanel()` returning a degraded default, not a test error.

### L3-11 — orchestrator-security.test.cjs hardcoded port

**Verified:** `const PORT = 7799` at line 20. Compare `dashboard-boot.test.cjs` which uses:
```js
function randomPort() { return 9000 + Math.floor(Math.random() * 1000); }
```
Running both test files simultaneously (e.g., `node --test --test-concurrency=2`) would cause `orchestrator-security` to fail if the dashboard test happened to pick 7799, or if the developer has a service on that port.

### L3-12 — #706 test is a source-read guard, not a behavior test

**Comment in source (line 226):**
```
// We can't easily test the timeout firing without mocking, so verify the
// option is wired by reading the source — guard against deletion.
```
The test is correctly labeled but represents an acknowledged hole: the timeout behavior in the `brain-pull` path is entirely untested at the behavior level.

### L3-14 / L3-15 — Action skills coverage gap

**Verified:**
```bash
find rcode/skills/actions/ -name "SKILL.md" | wc -l  # → 37 skills total
find rcode/skills/actions/ -name "SKILL.md" | while read f; do
  hits=$(grep -rl "$(basename $(dirname $f))" test/ | wc -l)
  echo "$hits $(dirname $f)"
done | grep "^0" | wc -l  # → 27 skills with zero test references
find rcode/skills/actions/ -name "SKILL.md" | xargs grep -L "Memory Bank" | wc -l  # → 25 skills
```
The existing `skills-compliance.test.cjs` checks name/description/line-budget for all skills. The `skills-memory-hooks.test.cjs` **explicitly skips** actions/. No test enforces the 5-component standard (trigger phrases, negative boundaries, Output Format, Examples, Memory Bank Hooks) for action skills.

### Prior L15 findings — all fixed

| Finding | Status |
|---------|--------|
| L15-01: `.rcode/workflows/prfaq.md` broken @-ref | **FIXED** — now `@rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md` |
| L15-02: `.rcode/workflows/checkpoint-preview.md` broken @-ref | **FIXED** — now `@rcode/skills/actions/4-implementation/rcode-checkpoint-preview/SKILL.md` |
| L15-03: `.rcode/skills/rihal-code-review/` stale subagent refs | **FIXED** — `rihal-code-review/` dir removed |
| L15-04: `.rcode/skills/agents/rihal-deviation-analyzer/` stale dir | **FIXED** — `.rcode/skills/agents/` dir no longer exists |
| L15-05: agent-team-parity scan misses `.rcode/skills/` | N/A — `.rcode/skills/` no longer exists, gap is moot |
| L15-06: at-ref-parity scan misses `.rcode/workflows/` | Partially addressed — L15-01/02 fixed; test gap noted but no regression currently |

---

## Coverage signal: files in rcode/ with no test reference

Files with zero test references (direct require or filename mention):

| File | Type | Test refs | Risk |
|------|------|-----------|------|
| `rcode/bin/lib/code-references.cjs` | Library | 0 | High — complex regex logic |
| `scripts/build-skills-catalog.cjs` | Build tool | 0 | Medium — catalog output integrity |
| `cli/github-sync.js` | CLI | 0 | High — GitHub API mutations |
| `cli/nuke.js` | CLI | 0 | High — destructive global cleanup |
| `cli/set-mode.js` | CLI thin wrapper | 0 | Low |
| `cli/set-profile.js` | CLI thin wrapper | 0 | Low |
| `cli/show-model.js` | CLI thin wrapper | 0 | Low |
| `scripts/sync-bin.sh` | Shell | 0 | Medium — copies production binaries |
| `scripts/dogfood-check.sh` | Shell | 0 | Low — dev tooling |
| `rcode/bin/lib/verify.cjs` internal fns | Library | 0 (direct) | Medium |
| `rcode/bin/lib/roadmap.cjs` internal fns | Library | 0 (direct) | Medium |

---

## Recommended fixes (priority order)

1. **(Critical)** Add `test/code-references.test.cjs` — unit tests for `extractReferences()` (file patterns, file:line, snake_case, CamelCase + filter) and `verifyReferences()` (mock `fs.existsSync` + mock `execSync`). These two functions have 130 lines of regex logic with no coverage.

2. **(Warn)** Add `test/nuke.test.cjs` with dry-run mode tests — `nuke.js` already has `--yes` / dry-run separation; test the dry-run output against temp dirs without triggering real deletion.

3. **(Warn)** Fix `test/orchestrator-security.test.cjs:20` — replace `const PORT = 7799` with `randomPort()` matching `dashboard-boot.test.cjs` pattern.

4. **(Warn)** Add unit tests for `roadmap.cjs` internal parsers — `extractPhases()` and `parseSuccessCriteria()` can be tested with fixture strings without spawning a subprocess.

5. **(Warn)** Add `council-panel.cjs` tests for `detectDomain()`, `validateAgents()`, and `loadTeamConfig()` to `test/panel-scorer.test.cjs`.

6. **(Warn)** Lift the `skills-memory-hooks.test.cjs` exemption for `actions/` — or add a separate `test/action-skills-compliance.test.cjs` enforcing the 5-component standard for the 25 action skills that currently have no Memory Bank Hooks.
