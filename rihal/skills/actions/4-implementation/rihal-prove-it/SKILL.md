---
name: rihal-prove-it
description: Test-first development. Use when implementing any new behaviour, fixing any bug, or changing existing logic. Writes a failing test first, then the minimum code to pass it, then refactors. For UI flows uses Playwright; for unit logic uses Jest or node:test. The phrase "prove it" is the activation — every claim of "this works" must have a test backing it.
triggers:
  - "prove it"
  - "tdd"
  - "test first"
  - "write a failing test"
  - "red green refactor"
  - "test driven"
  - "regression test"
  - "reproduce the bug first"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Test-first cycle: red (failing test that captures the requirement) → green (smallest code that passes) → refactor (clean up with the test as safety net). For bugs: reproduce-the-bug-as-a-test before fixing — the test then guards against regression. The skill assumes a JS/TS project with Jest, Playwright, or node:test; the choice is detected from the project's `package.json`.

## Workflow

1. **Detect the test runner.** Read `package.json` `devDependencies` and `scripts.test`. Order of preference: `playwright` for E2E flows, `jest` or `vitest` for unit, `node --test` for zero-dep projects (rcode uses this).
2. **For a new feature:** describe the behaviour in one sentence. Write the test that captures it. Run — confirm it fails for the right reason.
3. **For a bug fix:** reproduce the bug as a failing test BEFORE looking at the code. The test must fail in the way the user reports.
4. **Write the smallest code** that makes the test green. Resist the urge to handle cases not in the test.
5. **Refactor with the test as safety net.** Rename, simplify, deduplicate. The test stays green.
6. **Add edge-case tests** in a second pass. Common missing cases: empty input, boundary values, error paths, concurrent access.
7. **Commit:** `test: add failing test for X` → `feat/fix: implement X` → optional `refactor: simplify Y`. Three commits, three diffs.

## Output Format

```
Detected runner: <jest|playwright|node:test|vitest>

Step 1 — Failing test
  File: <path>
  Behaviour: <one sentence>
  Run: <command>
  Expected to fail at: <line>

Step 2 — Implementation
  Files: <list>
  Smallest change: <one sentence>

Step 3 — Edge cases
  - <empty input>
  - <boundary>
  - <error path>
```

Do NOT include: tests written after the fact, "I tested manually", or coverage as a substitute for assertions.

## Examples

**Happy path — bug** — "Login fails for usernames with Arabic characters" → test that calls login with "محمد" and asserts no exception → fix the encoding issue → test passes → ship the test alongside the fix as one commit.

**Happy path — feature** — "Add /api/memory endpoint" → test asserts 200 + JSON shape → minimal handler → green → second pass adds tests for empty Memory Bank case.

**Negative — coverage as substitute** — "We have 85% line coverage" without per-behaviour assertions. Refuse to count this as "tested". Coverage is a floor, not a ceiling.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (to detect the test runner correctly)
- **Writes:** append to `.rihal/memory/incidents/known-issues.md` if the bug is acknowledged but the fix is deferred
