# Quality Gates — the firewall against AI slop & thin pages

Scaling to 2,000 pages is worthless if Google classifies them as thin/doorway/spam. These
gates are non-negotiable. A page that fails ships as `noindex`, never as raw indexable content.

## Gate 1 — Briefs before prose (hard)

The Writer (A5) **refuses to run** for any slug without `briefs/<slug>.md` marked
`status: approved`. Rationale: a brief forces real-SERP research, an outline, entities, and a
unique angle BEFORE generation — which is the difference between a ranked page and generic
filler. Orchestrator enforces: when dispatching a Writer pane, it verifies the brief exists
first; if missing, it routes the cluster back to A4, not forward to A5.

## Gate 2 — Anti-generic-AI content rules (A5 must obey)

BANNED in any generated page:
- Filler openers: "In today's fast-paced world", "In the digital age", "When it comes to…".
- Empty hedging: "can help", "may be able to", "is a great way to" with no specifics.
- Unsupported stats: every number is cited (source + year) or cut.
- Restated headings as the first sentence of each section.
- Conclusion that summarizes with no new CTA/next step.

REQUIRED in any generated page:
- ≥1 concrete LeadLyze example or named use-case.
- ≥1 data table or comparison matrix.
- Real statistics with citations.
- An FAQ section answering the People-Also-Ask questions from the brief.
- Inline internal links from the brief (not dumped at the bottom).
- A specific CTA tied to the page's funnel stage.

## Gate 3 — Thin / duplicate-content gate (programmatic pages)

The doorway-page killer. For templated pages each MUST have:
- Unique `<title>`, `<h1>`, and **first 2 sentences** (keyed off the varying dimension).
- ≥2 dimension-specific unique blocks (local stat, named local use-case, region-keyed copy).
- ≥ the cluster's `min_words` floor of genuinely varying text (boilerplate doesn't count).
- Pairwise similarity < 0.8 vs sibling pages (cheap check: shingle/Jaccard on body text).

Fail → `noindex` + queue for enrichment. NEVER ship a city-swap-only page indexable.

## Gate 4 — Indexability gate (every page, pre-ship)

Before a page moves `linked → shipped`:
- [ ] Unique title + meta description (≤60 / ≤155 chars), self-referencing canonical.
- [ ] ≥10 inbound + ≥10 outbound internal links recorded in `link-map.json` (no orphans).
- [ ] Valid JSON-LD matching page type (A8), validates against schema.org.
- [ ] Word count ≥ cluster floor; passes Gate 2/3.
- [ ] No broken internal links (every link target exists in the route set).
- [ ] `pnpm build` static-generates it; no tsc error introduced.

## Gate 5 — Build/type baseline (per wave, orchestrator)

Capture `pnpm tsc --noEmit | grep -c "error TS"` at campaign start. After each wave merge,
re-run; any wave that raises the count is reverted from the integration branch and the
offending cluster re-dispatched. (Children never run tsc — orchestrator-only, per
`feedback_no_build_in_child_agents`.)

## Gate 6 — Evidence gate (A1/A2/A9/A10)

No keyword enters `keywords.csv` without a real Semrush volume+KD. AI-estimated metrics are
a hypothesis flagged `est=true`, never treated as ground truth, and must be confirmed against
a live SERP or Semrush pull before a money page is built on them.

## What "shipped" means

`shipped` = merged into the integration branch, passed Gates 1–6, recorded in `BACKLOG.md`.
It does **not** mean pushed to master or deployed — that's a separate, explicit,
user-consented step (see all three skills' push rules).
