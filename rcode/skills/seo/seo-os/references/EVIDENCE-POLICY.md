# Evidence Policy

**Purpose:** canonical home for the evidence-label vocabulary used across every module in this
skill. Define the labels once here; every other module (`SERP-INTENT.md`, `COMPETITOR-RESEARCH.md`,
`SITE-ARCHITECTURE.md`, etc.) applies them without re-explaining what they mean.

## Labels

Eight classes, superseding the original six (mapping table below). Use these directly in any
module that reasons over real ingested data (`DATA-WORKSPACE.md`, `KEYWORD-INTELLIGENCE.md`,
`SERP-INTELLIGENCE.md`, `CONTENT-BRIEFS.md`, and the post-launch intelligence modules) — the
original six remain valid shorthand in modules written before this split (`SERP-INTENT.md`,
`COMPETITOR-RESEARCH.md`, `OUTPUT-TEMPLATES.md`) and are not being rewritten to match.

```
FIRST_PARTY_DATA       — actual data from a connected/exported first-party source (a GSC export,
                          analytics, a backlink export, a conversion/revenue log). Ground truth for
                          this project, not an estimate.
THIRD_PARTY_ESTIMATE   — a number from a third-party tool (Ahrefs/Semrush volume, KD, DR, CPC) —
                          an estimate, never presented as a measured fact.
LIVE_SERP_OBSERVATION  — something actually seen on a live SERP this session (result type, AI
                          Overview, featured snippet, PAA, local pack) — not yet generalized into a
                          claim. Never assumed from model memory (see `SERP-INTELLIGENCE.md`).
COMPETITOR_OBSERVATION — something actually seen on a competitor's own page, site, or backlink
                          profile this session — not yet generalized into a claim.
PROJECT_FACT           — independently verifiable and confirmed about this project or the wider web
                          (a documented HTTP status, a change date, a published algorithm-update
                          date).
INFERENCE              — a reasonable conclusion drawn from one or more of the above.
HYPOTHESIS             — an untested explanation, explicitly offered as untested.
EXPERIMENT_RESULT      — a hypothesis that has been tested against real before/after data, with a
                          recorded result (see `.rcode/seo/EXPERIMENTS.md`).
```

Never invent a `FIRST_PARTY_DATA` or `THIRD_PARTY_ESTIMATE` value (search volume, rankings, clicks,
impressions, CTR, backlink counts, revenue, conversions, current SERP composition) that wasn't
actually supplied in an import or returned by a live connected tool. If a metric a task needs is
missing, say so, name the exact export/source that would provide it (`DATA-WORKSPACE.md`'s "request
a specific export" rule), and keep reasoning over whatever evidence is already available instead of
blocking on it.

### Mapping from the original six

| Original label | Maps to | Disambiguation |
|---|---|---|
| `FACT` | `PROJECT_FACT` or `FIRST_PARTY_DATA` | `PROJECT_FACT` for a verifiable fact about the project/web itself (a status code, a launch date); `FIRST_PARTY_DATA` when it's a number from an owned data export (GSC, analytics, backlinks) |
| `OBSERVATION` | `LIVE_SERP_OBSERVATION` or `COMPETITOR_OBSERVATION` | `LIVE_SERP_OBSERVATION` when observed directly on a SERP; `COMPETITOR_OBSERVATION` when observed on a competitor's own page/site |
| `TOOL_ESTIMATE` | `THIRD_PARTY_ESTIMATE` | direct rename, no behavior change |
| `INFERENCE` | `INFERENCE` | unchanged |
| `HYPOTHESIS` | `HYPOTHESIS` | unchanged |
| `EXPERIMENT` | `EXPERIMENT_RESULT` | direct rename, no behavior change |

A module using the six-label shorthand and a module using the eight-class set are not in
disagreement — every six-label claim maps unambiguously to exactly one eight-class label via this
table.

## Human-input-gap markers

Evidence that doesn't exist yet and can't be fabricated gets a gap marker instead of a guess — the
natural extension of "label the gap, don't fabricate":

```
NEEDS_OWNER_INPUT      NEEDS_SCREENSHOT      NEEDS_CUSTOMER_DATA
NEEDS_CASE_STUDY       NEEDS_EXPERT_REVIEW
```

These are not evidence *about* something observed — they mark a spot where the agent should
continue other work rather than invent the missing piece. `CONTENT-BRIEFS.md`'s
`[NEEDS ORIGINAL EVIDENCE: ...]` placeholder is the content-brief-specific instance of this
vocabulary; `ACTION-QUEUE.md` (Lane F) reuses the same marker names as `status` values so a
gap-blocked action is visible in the same queue as an open action, not silently dropped.

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

Store accordingly — a `HYPOTHESIS` stays a hypothesis until it becomes an `EXPERIMENT_RESULT` with a
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

## See also

- Every other reference module in this skill applies these labels rather than defining its own.
- `OUTPUT-TEMPLATES.md` — the AI content-QA checklist that also draws on this evidence discipline
  (no fabricated statistics, experts, or testimonials).
- `DATA-WORKSPACE.md` — where the freshness tiers above are instantiated per imported dataset, and
  the canonical "request a specific export" wording for a missing metric.
- `KEYWORD-INTELLIGENCE.md`, `SERP-INTELLIGENCE.md`, `CONTENT-BRIEFS.md` — the modules that consume
  the eight-class set directly.
