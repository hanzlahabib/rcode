# Technical Intelligence

**Purpose:** turn technical findings (from `rcode-technical-seo-checker`'s live audits or an external
crawler export) into prioritized, queueable work. This file does not re-implement crawling — it
defines the deterministic audit fields worth tracking, an issue taxonomy, and a prioritization
model that feeds `ACTION-QUEUE.md`.

## What this layer covers, and what it doesn't

A lightweight per-URL audit record is useful wherever a page's basic on-page technical state needs
tracking over time:

```
URL, HTTP status, title, title length, meta description, description length,
H1 count, canonical, robots, word/content signal, indexability
```

This is **not a complete crawler**. Do not mistake it for one, and do not let an agent claim
"technical audit done" on the strength of these fields alone. Explicitly out of scope for this
layer:

```
JavaScript rendering            Core Web Vitals
pages absent from the sitemap   the full internal link graph
browser-only rendering issues
```

Where any of these matter, use `rcode-technical-seo-checker` directly (it is live-tool/WebFetch
driven and already owns this ground — see its `references/bulk-audit-playbook.md` and
`references/technical-audit-templates.md`) or an external crawler export. This module is the
AI-reasoning layer that groups and prioritizes whatever either of those surfaces, not a competing
pipeline.

## Issue taxonomy

Group findings into one of these `ISSUE_TYPE` values before they reach the action queue — a
consistent taxonomy is what lets `ACTION-QUEUE.md` dedupe and `PORTFOLIO-MANAGEMENT.md` roll up
"how many `NOINDEX_ACCIDENT`s across the portfolio" without free-text parsing:

```
NOINDEX_ACCIDENT        BROKEN_URL              SERVER_ERROR
BAD_REDIRECT            CANONICAL_ERROR         MISSING_TITLE
DUPLICATE_TITLE         MISSING_DESCRIPTION     MULTIPLE_H1
ORPHAN_PAGE             BROKEN_INTERNAL_LINK    THIN_PAGE
HREFLANG_ERROR          SITEMAP_ERROR           ROBOTS_ERROR
```

`ORPHAN_PAGE` and `BROKEN_INTERNAL_LINK` overlap with `INTERNAL-LINK-INTELLIGENCE.md` — file them
under whichever module surfaced the evidence first and cross-link rather than duplicate the record.

## Impact / effort prioritization

Where useful, compute:

```
priority = impact / effort
```

or a normalized equivalent. Impact should account for scope (one page vs. site-wide), traffic or
revenue affected, and risk — not just "how bad does this look." Do not present the number as
objective truth; it is a sort key, not a verdict (same discipline as `OPPORTUNITY-SCORING.md`).

**Strategic overrides are expected, not a failure of the formula.** A site-wide accidental
`NOINDEX_ACCIDENT` must outrank ten `MISSING_TITLE` fixes even if a naive impact/effort ratio scores
some of the title fixes higher (they're cheap, so effort is low) — scope and irreversibility of
"the entire site stopped being indexed" dominates. When overriding the score, say so and why; don't
silently reorder without a recorded reason (`EVIDENCE-POLICY.md` discipline applies to prioritization
claims same as any other).

Issue records feed `ACTION-QUEUE.md` directly: `ISSUE_TYPE` → `issue`, the impact/effort
reasoning → `priority`/`effort`, and the audit evidence (status code, title length, etc.) →
`evidence`.

## Schema intelligence

Do not generate structured data blindly. Before adding or editing schema for a page:

1. Determine the page type (product, article, FAQ, HowTo, local business, etc.).
2. Confirm the visible content actually supports that schema — every property must correspond to
   something a reader can see on the page.
3. Identify the real entities involved (the actual product, the actual author, the actual
   organization) — never a placeholder or an assumed one.
4. Check schema eligibility against the page type before generating markup, then validate the
   output.

Never invent properties (a rating that wasn't collected, a price that isn't charged, an availability
status nobody confirmed). This is not a new rule — `RISK-GUARDRAILS.md`'s "Structured data honesty"
section already bans fabricated ratings/reviews/prices/availability/authorship/entities; this module
applies that rule specifically to the page-type/eligibility decision rather than restating the ban.

## Content-source integrity

For factual or sensitive content, record the sources behind a claim — especially for:

```
YMYL topics       calculations       statistics
legal requirements                   official specifications
```

AI may help organize and format sources, but must not fabricate a citation, a study, or an expert
quote that doesn't exist. Where a source is genuinely missing, use `EVIDENCE-POLICY.md`'s
`NEEDS_EXPERT_REVIEW` / `NEEDS_CASE_STUDY` markers (see `ACTION-QUEUE.md`'s human-layer hooks)
instead of inventing one. This extends `RISK-GUARDRAILS.md`'s YMYL guardrail (stronger sources,
methodology, accuracy, jurisdiction awareness) to the specific case of "where did this number come
from."

## See also

- `rcode-technical-seo-checker` — the live-audit skill this module reasons over; use it to actually
  find the issues.
- `on-page-seo-auditor` — title/meta/heading scoring at the single-page level.
- `RISK-GUARDRAILS.md` — the structured-data-honesty and YMYL rules this module applies rather than
  restates.
- `ACTION-QUEUE.md` — where prioritized technical issues land as actionable records.
- `INTERNAL-LINK-INTELLIGENCE.md` — the sibling module for `ORPHAN_PAGE`/`BROKEN_INTERNAL_LINK`
  findings that concern link structure rather than page-level metadata.
