# Test Coverage Audit

## Summary

- **Test files**: 58 `.test.cjs` files
- **Tests**: 339 passing, pass rate: 100%
- **Estimated coverage**: MEDIUM — strong on schema/parity/hooks, weak on CLI business logic
- **Critical gaps**: `cli/github-sync.js` (1020 lines, zero tests), `cli/doctor.js` (446 lines, zero tests), `cli/nuke.js` (404 lines, zero tests), `cli/context.js` (213 lines, zero tests), `cli/set-mode.js`/`set-profile.js`/`tiers.js` (zero tests)

---

## Test Type Distribution

| Type | Count | Notes |
|---|---|---|
| Parity (cross-file consistency) | 13 | `-parity.test.cjs` files |
| Unit (`test/lib/`) | 7 | Pure function unit tests |
| Integration (FS/network/server boot) | 4 | `dashboard-boot`, `dashboard-e2e`, `install-matrix`, `orchestrator-security` |
| Behavior/compliance/hook | 34 | Largest category; mixed quality |

---

## Untested Modules

### CLI (zero test coverage, no indirect coverage found)

- `cli/github-sync.js` — **1020 lines**. The brain-pull/push flow, issues sync, PR creation, label management. Largest untested module by a wide margin.
- `cli/doctor.js` — **446 lines**. Health checks, environment validation. Zero tests.
- `cli/nuke.js` — **404 lines**. Destructive wipe operation. Zero tests on a mutation-heavy path.
- `cli/context.js` — **213 lines**. Context generation for agents. Zero tests.
- `cli/set-mode.js`, `cli/set-profile.js`, `cli/tiers.js` — Small but untested config writers.

### rcode bin lib

- `.rcode/bin/lib/code-references.cjs` — No test file, no indirect coverage found.
- `.rcode/bin/lib/council-panel.cjs` — Covered indirectly by `test/panel-scorer.test.cjs` (good).
- `.rcode/bin/lib/roadmap.cjs`, `.rcode/bin/lib/verify.cjs` — Indirect coverage via integration tests only.

---

## Critical Path Status

| Path | Status |
|---|---|
| Install flow | COVERED — `install-matrix`, `install-batch5-regressions`, `install-skills-dedup`, `postinstall-units` |
| Uninstall flow | COVERED — `uninstall-units`, `uninstall-purge` |
| Update flow | COVERED — `update-units`, `update-config-yaml` |
| Dashboard API endpoints | COVERED — `dashboard-e2e` hits `/api/state`, `/api/memory`, `/api/files`, `/api/hierarchy`, path-traversal guard |
| Orchestrator security | COVERED — auth, 401s, traversal storyId rejection |
| Brain pull/sync flow | NOT COVERED — lives in `cli/github-sync.js`, zero tests |
| Doctor / environment checks | NOT COVERED |
| Nuke (destructive wipe) | NOT COVERED |

---

## Test Smells

**setTimeout for synchronization (flakiness signal)** — `dashboard-boot.test.cjs` and `dashboard-e2e.test.cjs` both use `setTimeout(resolve, 100)` as a "wait for ready" settle delay after detecting the ready signal in stdout. This is a race: if the process is slow or the machine is loaded, 100ms may not be enough. Both also use `setTimeout` for boot timeouts (5000ms). Pattern is acceptable for integration tests but fragile on slow CI machines.

**Skip markers (conditional, not `.skip`)** — 7 files use in-code `return` or `continue` to skip assertions when a directory or condition is absent (e.g., `if (!resolveSkillsDir()) return`). These silently pass when the environment is incomplete rather than reporting "skipped". Tests that always pass because the precondition is never met are invisible false positives.

**No tautology assertions found** — `assert.ok(true)` pattern does not appear. Good.

**Heavy mocking**: Only 24 mock/stub instances found across all test files — mocking is minimal. The trade-off is that many tests exercise real FS and real subprocess invocations, which is good for confidence but contributes to slow integration tests.

**Temp file isolation**: All tests using `mkdtempSync` also call `t.after(() => cleanup(dir))` — per-test cleanup is consistent. No shared global temp state found.

---

## Recommendations — Top 5 Tests to Add

1. **`test/github-sync-units.test.cjs`** — Unit test the pure functions in `cli/github-sync.js` (label normalization, PR title formatting, diff parsing). Mock the GitHub API calls. This is the highest-risk gap: 1020 lines with destructive write operations and zero coverage.

2. **`test/nuke-units.test.cjs`** — Test the path selection and dry-run behavior of `cli/nuke.js` in a temp directory. A destructive wipe with no tests is a liability.

3. **`test/doctor-units.test.cjs`** — Test `cli/doctor.js` check functions (tool version detection, config file presence) with mocked `execSync`. Covers the onboarding diagnostic path that users hit first when something is wrong.

4. **`test/context-units.test.cjs`** — Test `cli/context.js` output formatting. Pure string-manipulation logic; easy to unit test without mocking.

5. **Fix the silent-skip smell** — Replace `if (!resolveSkillsDir()) return` patterns with `test.skip(...)` or `assert.fail('precondition missing')` so CI visibly reports when environment is incomplete rather than silently passing.
