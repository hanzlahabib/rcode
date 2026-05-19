---
name: rihal-debug
description: Scientific-method debugging: investigate first, test hypotheses, escalate at 3 failures.
triggers:
  # English
  - "debug this"
  - "why is this broken"
  - "find the root cause"
  - "investigate the bug"
  - "what's wrong"
  - "track this down"
  - "narrow down the bug"
  - "scientific method"
  - "bug fix"
  - "something is broken"
  # Roman Urdu / Hindi
  - "kharab kyu hai"
  - "bug dhoondo"
  - "fix karo bug"
  - "theek karo"
  - "kya masla hai"
  - "kyu kaam nahi kar raha"
  # Arabic native
  - "صحّح هذا"
  - "ما المشكلة"
  - "ابحث عن السبب"
  - "حقّق في الخطأ"
  - "أصلح الخطأ"
  - "تتبّع السبب"
user-invocable: false
---
@.rihal/references/karpathy-guidelines.md

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.
```

If you have not completed Phase 1, you cannot propose a fix. "It seems to work" is a red flag — keep investigating until the mechanism is clear. Symptom fixes are failure.

## Overview

Debugging is investigation, not pattern-matching. Each iteration narrows the problem space — never widens it. The skill enforces a written hypothesis, an experiment that distinguishes "yes" from "no", and a captured observation. Random fixes are not allowed — the bug must be understood before the fix is written.

## Workflow
## Phase 1 — Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Reproduce consistently.** Write the exact steps. If not reproducible, make it reproducible first — anything else is guessing.

2. **Read the error carefully.** Don't skim stack traces. Note file paths, line numbers, error codes. They often contain the exact answer.

3. **Check recent changes.** `git diff`, recent commits, new dependencies, config changes, environment differences.

4. **Gather evidence in multi-component systems.**

   When the system has multiple layers (API → service → DB, CI → build → signing, frontend → backend → queue):

   Add diagnostic instrumentation at EACH component boundary BEFORE proposing fixes:
   ```
   For EACH boundary:
     - Log what data enters the component
     - Log what data exits the component
     - Verify env/config propagation
     - Check state at each layer

   Run ONCE to gather evidence showing WHERE it breaks.
   THEN identify the failing component.
   THEN investigate that specific component.
   ```

   Example:
   ```bash
   # Layer 1: incoming request
   console.log('[L1] body:', req.body, 'userId:', req.user?.id)

   # Layer 2: service call
   console.log('[L2] args to createTask:', args)

   # Layer 3: DB query
   console.log('[L3] Prisma input:', data)
   ```

   This reveals which layer fails — not guessing.

5. **Trace data flow backward.** Where does the bad value originate? What called this function with that bad value? Keep tracing up until you find the source. Fix at source, not at symptom.

## Phase 2 — Pattern Analysis

Before forming a hypothesis, find the comparison point:

1. **Find working examples.** Locate similar code in the same codebase that works. What's different?
2. **Read reference implementations completely.** Don't skim — partial understanding guarantees bugs.
3. **List every difference**, however small. Don't assume "that can't matter."
4. **Check assumptions.** What config, environment, or state does this code assume?

## Phase 3 — Hypothesis and Experiment

Scientific method:

1. **State ONE hypothesis.** "I think X is the root cause because Y." Write it down. Be specific, not vague.
2. **Design the minimal experiment.** What single test, log line, or code change would confirm or refute this hypothesis?
3. **Run it. Capture the observation verbatim.** Console output, stack trace, network response — whatever was produced.
4. **Update.** Confirmed → Phase 4. Refuted → form a new hypothesis based on what was observed. Do NOT add more fixes on top.

## Phase 4 — Implementation

1. **Create a failing test first.** Simplest possible reproduction. Use `rihal-prove-it` for writing the test that locks the fix in.
2. **Implement ONE fix.** Address the root cause identified. No "while I'm here" improvements. No bundled refactors.
3. **Verify.** Test passes. No other tests broken. Issue actually resolved.
4. **If fix doesn't work:** STOP. Count fix attempts.
   - < 3 attempts: return to Phase 1 with new information.
   - **≥ 3 attempts: STOP — this is an architectural problem.**

## Architectural Escalation (after 3 failed fixes)

Pattern that signals architectural problem:
- Each fix reveals new coupling or shared state in a different place
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

When this pattern appears:
1. Stop attempting fixes
2. Ask: is this pattern fundamentally sound, or are we continuing through inertia?
3. Discuss with the user before attempting more fixes
4. Consider `/rihal-council` for a cross-functional review

## Sentry / Observability Integration

If the project has Sentry (`@sentry/*` in `package.json` or `sentry-sdk` in Python):

- Quote the actual Sentry issue ID and stack trace in the hypothesis
- Read breadcrumbs for the chain of events leading to the error
- Check "first seen / last seen" — recurring or one-off matters
- Cross-reference with deployment timestamps to identify regressions
## Red Flags — STOP and return to Phase 1

If you catch yourself thinking any of these:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes and run tests"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "It seems to fix it"
- "One more fix attempt" (when already tried 2+)
- Proposing solutions before tracing data flow
- Each fix reveals a new problem in a different place

**ALL of these mean: STOP. Return to Phase 1.**

## Output Format

```
Reproduction:
  <exact steps>
  <observed vs expected>

Phase 1 — Evidence
  <what layers were instrumented and what they showed>

Iteration 1
  Hypothesis: <falsifiable claim — "I think X because Y">
  Experiment: <the single test/log that would confirm or refute>
  Observation: <verbatim output>
  Outcome: confirmed | refuted | partial

Iteration N
  ...

Root cause:
  <one paragraph — the actual mechanism, not the symptom>

Fix scope:
  <minimum change that addresses the cause>

Regression test:
  <hand to rihal-prove-it — the test that locks the fix in>
```

Do NOT include: "tried X and it seems to work" · speculative "maybe it's caching" · broad refactors disguised as bug fixes.

## Examples

**Happy path** — "Login fails for Arabic usernames" → reproduce: POST `/login` with `محمد` returns 500 → Phase 1: hex-dump log of raw request body → observation: UTF-8 bytes, but Postgres driver re-encodes as Latin-1 → root cause: `client_encoding` mismatch → fix: pin `client_encoding=utf8` in connection string → regression test asserts non-ASCII login returns 200.

**Multi-component** — "Tasks not appearing after creation" → instrument three layers: controller logs input, service logs DB call args, DB query logs row count → observation: service receives correct args, DB returns `rowCount: 0` → hypothesis: wrong table name in query → confirmed → one-line fix, regression test added.

**Edge case — flaky test** — Passes locally, fails in CI 30% of the time → hypothesis: race condition → experiment: `--runInBand` → still flaky → next hypothesis: filesystem timing → experiment: `await fs.stat` after write → confirmed → fix.

**Negative — shotgun fix** — "I added a try/catch around the whole function and now it doesn't crash." Refuse. The exception is silently swallowed; the bug still exists. Restore the throw and form a real hypothesis.

**Architectural escalation** — Three separate fixes attempted (missing await, wrong env var, stale cache) — each fix exposed a new problem elsewhere. Stop. The async data-flow design is wrong. Escalate to `/rihal-council` before attempting Fix #4.

## Memory Bank Hooks

- **Reads:** `known-issues.md`, `stack.md`
- **Writes:** append to `post-mortems/YYYYMMDD-<slug>.md`; remove from `known-issues.md` once fixed in production
