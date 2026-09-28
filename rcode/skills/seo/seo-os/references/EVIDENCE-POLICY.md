# Evidence Policy

**Purpose:** canonical home for the evidence-label vocabulary used across every module in this
skill. Define the labels once here; every other module (`SERP-INTENT.md`, `COMPETITOR-RESEARCH.md`,
`SITE-ARCHITECTURE.md`, etc.) applies them without re-explaining what they mean.

## Labels

```
FACT            — independently verifiable and confirmed (e.g. a documented HTTP status, a
                  published algorithm-update date)
OBSERVATION     — something actually seen in this session (a SERP result, a competitor's page
                  structure, a GSC row) — not yet generalized into a claim
TOOL_ESTIMATE   — a number from a third-party tool (search volume, KD, DR) — an estimate, not
                  ground truth
INFERENCE       — a reasonable conclusion drawn from one or more observations
HYPOTHESIS      — an untested explanation, explicitly offered as untested
EXPERIMENT      — a hypothesis that has been tested against real data, with a recorded result
                  (see `.rcode/seo/EXPERIMENTS.md`)
```

## Phrasing rule

Bad:

> Exact-match domains rank better.

Better:

> Several ranking competitors use exact-match or descriptive domains. This is an OBSERVATION;
> domain wording alone does not demonstrate causation.

Apply the same discipline to every causal-sounding claim about ranking factors, competitor
strategy, or user behavior — see `COMPETITOR-RESEARCH.md`'s "never say competitor ranks because X"
rule as the sharpest instance of this.

## Anti-myth protection

Before adding a belief to canonical project or skill knowledge, ask:

```
Is this verified?          Is this merely observed?      Is this vendor/tool guidance?
Is this an instructor opinion?                            Is this our own experiment?
```

Store accordingly — a `HYPOTHESIS` stays a hypothesis until it becomes an `EXPERIMENT` with a
recorded result; it does not get promoted to house doctrine by repetition.

## Research freshness

Classify research by durability, and record the date it was gathered:

```
durable            — business model, core architecture decisions
semi-durable       — site architecture, topic clusters
freshness-sensitive — current SERPs, keyword volume, backlinks, rankings
```

Before re-researching, check `.rcode/seo/RESEARCH.md` / `SERP.md` for an existing dated entry and
judge whether it's stale enough to warrant a refresh — do not rerun freshness-sensitive research
every session by default, and do not treat durable facts as needing re-verification at all
(see `LIFECYCLE-AND-STAGE-GATES.md`'s "don't repeat expensive research" rule).

## Extension point (not built here)

A richer, data-sourced evidence-class set (`FIRST_PARTY_DATA` / `THIRD_PARTY_ESTIMATE` /
`LIVE_SERP_OBSERVATION`, etc.) is reserved for a future iteration of this system, as a **superset**
of the six labels above — not a replacement. When it lands, a mapping table from these six labels to
the richer set belongs here; it is not built now (tracked against rcode issue #1098's follow-up
scope).

## See also

- Every other reference module in this skill applies these labels rather than defining its own.
- `OUTPUT-TEMPLATES.md` — the AI content-QA checklist that also draws on this evidence discipline
  (no fabricated statistics, experts, or testimonials).
