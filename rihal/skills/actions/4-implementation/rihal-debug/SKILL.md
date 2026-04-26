---
name: rihal-debug
description: Root-cause debugging via the scientific method. Use when a test fails, a build breaks, behaviour doesn't match expectations, or any "it's broken and I don't know why" moment. Forces hypothesis → experiment → observation → narrow → repeat — never guessing or shotgunning fixes. Default observability layer is Sentry; the skill knows how to read Sentry traces if available.
triggers:
  - "debug this"
  - "why is this broken"
  - "find the root cause"
  - "investigate the bug"
  - "what's wrong"
  - "track this down"
  - "narrow down the bug"
  - "scientific method"
user-invocable: true
---

## Overview

Debugging is investigation, not pattern-matching. Each iteration narrows the problem space — never widens it. The skill enforces a written hypothesis, an experiment that distinguishes "yes" from "no", and a captured observation. Random fixes that "happen to work" are not allowed — the bug must be understood.

## Workflow

1. **Reproduce the bug.** Write the exact steps. If you can't reproduce it, the first job is making it reproducible — anything else is guessing.
2. **State the hypothesis.** "I think the bug is in <component>; specifically <mechanism>." One sentence, falsifiable.
3. **Design the experiment.** What single test, log line, or dataflow change would distinguish a true hypothesis from a false one?
4. **Run it. Capture the observation.** Console output verbatim, screenshot, stack trace, network response — whatever the experiment produced.
5. **Update the hypothesis.** Either confirmed (now narrow to the next layer) or refuted (form a new hypothesis based on what was observed).
6. **Stop conditions:** the bug is reproducible from a unit test (then hand to `rihal-prove-it`), OR the root cause is a known external constraint (e.g. third-party API behaviour) that you record in `incidents/known-issues.md`.
7. **Never apply a fix without understanding why it works.** "It seems to fix it" is a red flag — keep investigating until the mechanism is clear.

## Sentry / observability integration

If the project has Sentry (`@sentry/*` in `package.json` or `sentry-sdk` in Python):

- Quote the actual Sentry issue ID and stack trace in the hypothesis section
- Look at breadcrumbs for the chain of events leading to the error
- Check the issue's "first seen / last seen" — recurring or one-off matters
- Cross-reference with deployment timestamps to identify regressions

## Output Format

```
Reproduction:
  <exact steps>
  <observed vs expected>

Iteration 1
  Hypothesis: <falsifiable claim>
  Experiment: <what we did>
  Observation: <verbatim output>
  Outcome: confirmed | refuted | partial

Iteration N
  ...

Root cause:
  <one paragraph explanation of the actual mechanism>

Fix scope:
  <minimum change that fixes the cause, not the symptom>

Regression test:
  <hand off to rihal-prove-it for the test that locks the fix in>
```

Do NOT include: "tried X and it seems to work"; speculative "maybe it's caching"; broad refactors disguised as bug fixes.

## Examples

**Happy path** — "Login fails for Arabic usernames" → reproduce: POST `/login` with `محمد` returns 500 → hypothesis: encoding boundary in URL parsing → experiment: add hex-dump log of the raw request → observation: bytes are UTF-8 but the Postgres driver re-encodes as Latin-1 → root cause: client_encoding mismatch → fix: pin client_encoding=utf8 → regression test asserts non-ASCII login returns 200.

**Edge case — flaky test** — Test passes locally, fails in CI 30% of the time → hypothesis: race condition → experiment: run with `--runInBand` → observation: still flaky → next hypothesis: filesystem timing → experiment: await fs.stat after write → confirmed → fix.

**Negative — shotgun fix** — "I added a try/catch around the whole function and now it doesn't crash". Refuse. The exception is now silently swallowed; the bug still exists. Restore the throw and form a real hypothesis.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/incidents/known-issues.md` (so prior debugging context is loaded), `.rihal/memory/project/stack.md` (Sentry presence)
- **Writes:** append the root cause to `.rihal/memory/incidents/post-mortems/YYYYMMDD-<slug>.md` when an incident is resolved; remove the entry from `known-issues.md` once the fix is verified in production
