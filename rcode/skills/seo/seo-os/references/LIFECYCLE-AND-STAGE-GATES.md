# Lifecycle & Stage Gates

Every SEO project tracked by this skill has exactly one lifecycle state, recorded in
`.rcode/seo/STATE.md`'s `Stage:` field (see `seo-project-init.cjs` and `PORTFOLIO-MANAGEMENT.md`
for how state is created/read). This file is the single enum — do not invent a second state model
elsewhere in this skill.

## Extends, not replaces, rcode's core loop

rcode's project lifecycle already moves work through plan → execute → verify → review/fix
(`rcode-plan` → `rcode-execute` → `rcode-verify-phase` → `rcode-review-fix`, per the existing
`rcode/skills/actions/` phase skills). This lifecycle does **not** replace that loop for an SEO
project's engineering work. It inserts SEO-specific stages around it:

```text
Discuss/Plan (rcode core)
        ↓
SEO Discovery      → Gate 0
        ↓
SEO Research       → Gate 1
        ↓
SEO Plan           → Gate 2, Gate 3
        ↓
Execute (rcode core: rcode-execute)
        ↓
Functional Verification (rcode core: rcode-verify-phase)   → Gate 5
        ↓
SEO Verification    → Gate 6
        ↓
Review / Fix (rcode core: rcode-review-fix)
        ↓
Re-verify
        ↓
Record project state (.rcode/seo/STATE.md)
```

A build task inside an SEO project still goes through rcode's normal execute/verify/review cycle —
this file only defines what happens *before* Execute (so nothing gets built on unvalidated
intent/volume) and what SEO-specific check gets added *after* functional verification (so a
working page that fails technical SEO doesn't ship as "done").

## The 16 lifecycle states

| State | Meaning |
|---|---|
| `IDEA` | Candidate noted, nothing validated yet. Default state for a project with no `STATE.md`. |
| `RESEARCHING` | Gate 0/1 in progress — domain, SERP, keyword, competitor research underway. |
| `VALIDATED` | Gate 2 passed — intent, click potential, dedicated competition, utility opportunity, and business value are confirmed with evidence. |
| `ARCHITECTED` | Gate 3 passed — topic clusters, page types, URL map, internal-link model, conversion paths are designed. |
| `SCAFFOLDED` | Initial site/stack scaffold exists but pages aren't functionally complete. |
| `FUNCTIONAL` | Gate 5 passed — tools, calculators, forms, navigation work correctly. |
| `CONTENT_READY` | Content for the planned page set is written and QA'd per `OUTPUT-TEMPLATES.md`'s content policy. |
| `SEO_AUDITED` | Gate 6 passed — crawlability, metadata, schema, links, canonicals, sitemap, robots, redirects, performance checked. |
| `LAUNCH_READY` | Gate 7 checklist satisfied but not yet live. |
| `LAUNCHED` | Gate 7 complete — live, tracked, submitted. |
| `OBSERVING` | Gate 8 — collecting real signal (GSC, analytics, conversions) before deciding next investment. |
| `EXPANDING` | Gate 9 decision: invest further (new clusters, locales, pages) based on observed evidence. |
| `IMPROVING` | Gate 9 decision: iterate on an existing surface (content refresh, UX fix, internal linking) rather than expand scope. |
| `HOLD` | Gate 9 decision: pause further investment without killing the project; evidence is inconclusive or resources are elsewhere. |
| `CONSOLIDATING` | Gate 9 decision: merge/redirect weaker pages or sibling projects into a stronger one. |
| `KILLED` | Gate 9 decision: stop investment; evidence does not support continued spend. |
| `SOLD` | Project divested; kept for portfolio history (`PORTFOLIO-MANAGEMENT.md`). |

A project moves forward through gates in order; it can be sent back a stage (e.g.
`SEO_AUDITED` → `FUNCTIONAL` after a review-fix cycle finds a regression) but should never skip a
gate silently — skipping a gate without evidence is exactly the failure mode this file exists to
prevent (see `RISK-GUARDRAILS.md`).

## Gates 0–9

Each gate has an entry condition (what must be true to start it) and an exit checklist (what must
be true, with evidence, to advance the `Stage:` field).

### Gate 0 — Understand
**Entry:** a candidate project or an existing site needs work.
**Exit checklist:**
- [ ] Business model identified
- [ ] Current site/stack identified (or "none" for a greenfield idea)
- [ ] Target market/geography identified
- [ ] Primary conversion action identified
- [ ] Existing SEO state checked (GSC/analytics if available)
- [ ] Available data sources listed (GSC, Ahrefs, analytics, none)

### Gate 1 — Research
**Entry:** Gate 0 passed.
**Exit checklist:**
- [ ] Keyword landscape captured (`KEYWORDS.md`)
- [ ] SERP inspected per query per `SERP-INTENT.md` (`SERP.md`)
- [ ] Competitors researched per `COMPETITOR-RESEARCH.md` (`COMPETITORS.md`)
- [ ] Risk flags checked per `RISK-GUARDRAILS.md`
- [ ] Monetization model identified per `MONETIZATION.md`
- [ ] Topic landscape sketched

### Gate 2 — Validate
**Entry:** Gate 1 passed.
**Exit checklist:**
- [ ] Dominant intent confirmed, not assumed
- [ ] Click potential estimated (not equated with search volume)
- [ ] Dedicated-competition density assessed
- [ ] Utility advantage opportunity identified (`UTILITY-GAPS.md`) if the project is tool-shaped
- [ ] Business value case made (`MONETIZATION.md`)
- [ ] Opportunity score computed via `seo-opportunity-score.cjs` and recorded with evidence

### Gate 3 — Architecture
**Entry:** Gate 2 passed (or the score's band + evidence justify proceeding despite a weak score).
**Exit checklist:**
- [ ] Topic clusters defined (`TOPIC-CLUSTERS.md`)
- [ ] Page types classified per `PAGE-TYPE-CLASSIFIER.md`
- [ ] Keyword-to-page map built (`KEYWORD-MAP.md`)
- [ ] URL map / site map drafted (`SITE-MAP.md`)
- [ ] Internal-link model sketched
- [ ] Conversion paths defined
- [ ] Tool requirements specified (if applicable) per `UTILITY-ADVANTAGE.md`/`TOOL-ACCURACY.md`

### Gate 4 — Build
**Entry:** Gate 3 passed.
**Exit checklist:** approved architecture implemented — no new SEO checklist here, this is
ordinary rcode Execute (`rcode-execute`).

### Gate 5 — Functional Verify
**Entry:** Gate 4's build exists.
**Exit checklist:**
- [ ] Tools/calculators produce correct output (`TOOL-ACCURACY.md` fixtures pass)
- [ ] Forms submit and validate correctly
- [ ] Navigation and responsive behavior work
- [ ] No critical functional bugs

### Gate 6 — SEO Verify
**Entry:** Gate 5 passed.
**Exit checklist:**
- [ ] Crawlability (robots, HTTP status) checked
- [ ] Metadata (titles, descriptions, H1s) checked
- [ ] Schema valid
- [ ] Internal links valid, no orphans
- [ ] Canonicals correct
- [ ] Sitemap present and accurate
- [ ] Redirects correct (if any URL changes occurred — see spec's redirect workflow)
- [ ] Performance/Core Web Vitals checked

### Gate 7 — Launch
**Entry:** Gate 6 passed.
**Exit checklist:**
- [ ] Production domain + HTTPS live
- [ ] Analytics installed
- [ ] Search Console verified and sitemap submitted
- [ ] Bing Webmaster set up where useful
- [ ] Conversion tracking verified working

### Gate 8 — Observe
**Entry:** Gate 7 complete.
**Exit checklist:** none — this gate has a duration, not a checklist. Record a baseline (target
queries/pages, launch date, expected conversions, key hypotheses) so Gate 9 has something to
evaluate against.

### Gate 9 — Improve
**Entry:** enough observation window has passed for the data to be meaningful (weeks, not days).
**Exit checklist:** a decision is made and recorded in `DECISIONS.md`:
- [ ] expand / improve / consolidate / hold / kill / sell chosen
- [ ] decision backed by observed evidence, not vibes
- [ ] `STATE.md`'s `Stage:` and "Next recommended actions" updated accordingly

## Google Search Console decision logic

Use this table when Gate 8/9 evidence includes GSC data. This is decision-support pattern
matching, not causal proof — label conclusions per `EVIDENCE-POLICY.md`.

| Signal | Investigate |
|---|---|
| High impressions + low CTR | Position, title, description, intent match, competing SERP features, brand weakness |
| Positions ~4–15 | Content gap, utility gap, internal links, backlinks, entity coverage, UX |
| Fast-rising impressions | Potential winner — consider expanding the cluster (`EXPANDING`) |
| Indexed but zero impressions | Search demand, intent mismatch, keyword targeting, duplicate content, indexation, quality, competition — **investigate before** buying backlinks |

For the full export-driven workflow behind this table (striking-distance analysis, decay detection,
cannibalization, winner/weak-project detection), see `GSC-GROWTH-ENGINE.md`.

## Do-not-repeat discipline

Before starting research at any gate, read `.rcode/seo/STATE.md`'s "Do not repeat" list and
`DECISIONS.md` first (see `RESEARCH.md`'s freshness fields). Re-running validated, durable research
wastes tokens and risks silently overturning a documented decision — see `PORTFOLIO-MANAGEMENT.md`
for how the portfolio-wide view of "what stage is each project in" is derived instead of
re-discovered per session.
