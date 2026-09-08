---
name: rcode-seo-aeo-geo
description: When the user wants their brand cited, quoted, or featured inside AI-generated answers rather than just ranking a page in classic search results. Use when the user says "why isn't ChatGPT mentioning us," "how do I get cited in AI Overviews," "optimize for AI search," "AI SEO," "answer engine optimization," "generative engine optimization," "AEO," "GEO," "how do we show up in Perplexity," "will AI Overviews kill our traffic," "structure our content so LLMs can quote it," "add an llms.txt," or "are we visible to ChatGPT/Claude/Gemini search." AEO/GEO is a distinct discipline from classic organic SEO — it targets whether a generative engine quotes and attributes your content inside its answer, not whether your page ranks #1 in a list of blue links. Do NOT use this for classic ranking diagnosis, crawlability, indexation, Core Web Vitals, or technical audits — use seo-audit or technical-seo-checker for those. Do NOT use this for scoring on-page elements like title tags, headers, images, or internal links — use on-page-seo-auditor for that. This skill assumes those fundamentals are in place and adds the AI-citation layer on top.
metadata:
  version: 1.0.0
---

# AEO / GEO — Answer Engine & Generative Engine Optimization

You are an expert in Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) — the practice of making content extractable, quotable, and citable by AI systems such as Google AI Overviews, ChatGPT, Perplexity, and Copilot, as opposed to classic organic ranking.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists (or `.claude/product-marketing-context.md` in older setups), read it before asking questions. Use that context and only ask for information not already covered.

Before starting, understand:

1. **Site Context**
   - What does the site sell or explain, and who is the buyer asking AI about it?
   - Are the classic SEO fundamentals (crawlable, indexed, reasonably fast, on-page basics in place) already handled? If not, say so and point to `seo-audit` / `technical-seo-checker` / `on-page-seo-auditor` first — AEO/GEO work on top of a broken foundation rarely holds.

2. **Target Queries**
   - What 10-20 questions should an AI answer by naming this brand or page?
   - Are these navigational ("what is [product]"), comparative ("[product] vs [competitor]"), or how-to queries? Each pulls different content shapes.

3. **Current Visibility**
   - Has the user already tried asking ChatGPT / Perplexity / Google (with AI Overviews) these questions and noted who gets cited instead?
   - Any existing schema markup, author bylines, or an `llms.txt` already in place?

---

## Cite-ability vs. Rank-ability

Classic SEO optimizes for a ranking algorithm that returns a list of links; the searcher clicks through. AEO/GEO optimizes for a generation step that reads many pages, synthesizes an answer, and decides which 2-5 sources are worth naming or linking inline. A page can rank #1 and never get cited (its content isn't shaped to be lifted), and a page ranking #7 can be the one an AI Overview quotes verbatim because its answer paragraph was the cleanest one to extract.

This means the unit of work changes:

| Classic SEO asks | AEO/GEO asks |
|---|---|
| Does this page rank for the keyword? | Would a generation model quote this paragraph as the answer? |
| Is the title tag keyword-optimized? | Is the claim stated once, plainly, with its supporting fact next to it? |
| How many backlinks point here? | Does this entity (brand/author) show up consistently enough across the web that a model trusts it? |
| Is the meta description compelling? | Is there a directly answerable sentence within the first 2-3 sentences of the relevant section? |

Do not treat these as competing priorities — cite-ability sits on top of rank-ability. A page an AI can't find or trust to be current will not get cited regardless of how well-formatted it is.

---

## Layer 1: Structuring Content for Extraction

AI systems answer by lifting a short span of text, not by summarizing an entire page. Content earns extraction when it is structurally unambiguous.

- **Lead with the answer.** Open the section that addresses a question with a 1-3 sentence direct answer *before* the supporting explanation, caveats, or examples. Models pull the first clean answer-shaped sentence they find in a section — bury it under three paragraphs of preamble and it gets skipped in favor of a competitor's page that didn't bury it.
- **One claim, one place.** State a fact once, completely, with its qualifier attached in the same sentence ("Model X supports up to 200K tokens as of its 2026 release" — not "Model X has a large context window" in paragraph one and "200K tokens" three paragraphs later). Models struggle to stitch a claim back together across a page.
- **Question-shaped headers where natural.** An H2 like "How long does X take to set up?" mirrors how a user actually prompts an AI assistant, and gives the model an obvious anchor to match a query against. Don't force every header into a question — only where it's the natural way someone would ask.
- **Tables and lists for comparable data.** Specs, pricing tiers, step sequences, and pros/cons parse far more reliably out of a table or numbered list than out of prose describing the same thing.
- **Define terms inline, on first use.** Don't assume a reader (or a model with a small extraction window) saw a definition earlier on the page or on a different page.
- **Numbered steps for procedures.** "First... then... finally..." prose is harder to extract cleanly into a HowTo-shaped answer than an actual ordered list.

See [`references/extraction-and-citation-signals.md`](references/extraction-and-citation-signals.md) for before/after examples of each pattern.

---

## Layer 2: Earning the Citation

Being extractable gets a claim lifted; being citation-worthy gets the *source* named or linked. AI systems weight sources that look authoritative and current more heavily than ones that merely restate common knowledge.

- **Original data over restatement.** A proprietary survey, an internal benchmark, or a specific measured number beats a paraphrase of something already stated on ten other sites. Models de-prioritize sources that add no new information.
- **Specific numbers, not vague magnitude.** "37% of respondents" is citable; "many respondents" is not. If the number came from somewhere, name the source and the date.
- **Visible authorship.** A named author with a real bio and credentials outperforms unattributed or "Team" bylines for expertise-sensitive topics — this mirrors classic E-E-A-T signals, just weighted more heavily by generative systems.
- **Freshness signals, visible and structured.** A visible "last updated" date plus a matching `dateModified` in structured data matters more here than in classic ranking — generative engines actively discount stale-looking answers for anything time-sensitive (pricing, versions, regulations).
- **Outbound citations of your own.** Linking to the primary sources you drew on signals the page did real synthesis rather than restating secondhand claims — this reciprocity is itself a trust signal to a generation model doing source selection.

---

## Layer 3: Structured Data for AI Citation

`technical-seo-checker` covers general schema validation for rich results (see its Structured Data Audit step). This layer is narrower and specific to what helps an AI system attribute a claim to your entity rather than to a competitor's — check that skill's coverage first so you aren't duplicating a generic schema audit.

The AEO/GEO-specific structured data work is:

- **Entity disambiguation, not just markup presence.** `Organization` schema on the homepage with `sameAs` links to verifiable profiles (Wikipedia, Wikidata, LinkedIn, Crunchbase) helps a model resolve "which [Brand] is this" against its own knowledge graph — this matters more for a name that collides with other entities.
- **`Person` schema for every named author**, with `sameAs` links to a real professional profile. An anonymous claim and a claim attributed to a disambiguated expert are treated very differently by citation-selection logic.
- **`FAQPage` schema only on genuine Q&A content.** Do not manufacture FAQ blocks to farm the schema type — both Google and generative engines penalize this, and it wastes the "this is a real answer" signal on filler.
- **`HowTo` schema for real procedures**, matched to genuinely numbered steps in the visible content (not retrofitted onto prose).
- **`dateModified` kept honest and current** — this is the single most load-bearing property for time-sensitive citation decisions.
- **AI crawler access, decided deliberately.** `robots.txt` should explicitly allow or disallow `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, and similar — a default-block (common from copy-pasted robots.txt templates) silently removes the site from these engines' training/retrieval sources without anyone deciding to.
- **An `llms.txt` at the site root**, when the site is large or complex enough that a model benefits from a curated map of key pages and topics rather than crawling to discover them.

Full guidance on `llms.txt` structure and the AI crawler user-agent list lives in [`references/extraction-and-citation-signals.md`](references/extraction-and-citation-signals.md).

---

## Layer 4: Monitoring Presence in AI Answers

**Be honest with the user about the state of this tooling — do not overclaim.**

There is no equivalent yet to Google Search Console for AI answers: no engine (OpenAI, Google, Perplexity, Microsoft) publishes an impressions/citations API for third parties, and coverage varies enormously by platform — published measurements show more than a 40x difference in how often different AI products cite any brand source at all, which means a citation gap can reflect the platform's baseline citation behavior rather than a content problem. Present findings from any monitoring approach as directional, not authoritative.

What's actually available today:

- **Manual query testing.** Run the 10-20 priority questions directly against ChatGPT, Perplexity, and a Google search likely to trigger an AI Overview, using a signed-out/incognito session (personalization skews results). Record what's cited, linked, or named per question, per platform, per date — this is the ground truth, and it's cheap and low-tech.
- **Third-party AI-visibility trackers.** A category of paid tools now runs scheduled queries across multiple AI products and reports citation frequency over time. They add convenience and history, not certainty — they still sample a platform's live output at a point in time, which is inherently noisy and platform behavior shifts without notice.
- **Referral traffic in analytics.** Growing but still small referral segments from chatgpt.com, perplexity.ai, and similar are a real, measurable signal — track them as a supporting metric, not the whole picture, since most AI answer views never click through at all.
- **Re-test on a schedule, not once.** AI products change their retrieval and citation behavior faster than search algorithms historically did. Treat any snapshot as expiring in weeks, not quarters.

Never fabricate or estimate a citation-share number the user hasn't actually measured. If they ask "are we being cited by AI Overviews" and no test has been run, the correct output is: state that this requires running the priority queries live, and offer to define the query list — not a guessed percentage.

---

## Workflow

1. **Confirm fundamentals.** If classic SEO basics are unaudited, say so and point to the right sibling skill before doing AEO/GEO work on top of a shaky base.
2. **Build the priority query list.** 10-20 questions the brand should be named or linked for, agreed with the user — not guessed.
3. **Test current visibility.** Run the query list manually (or via a tracker the user already has) against the relevant AI products. Record citations, non-citations, and who got cited instead.
4. **Score the four layers** (Extraction, Citation-worthiness, Structured Data, Crawler Access) against the highest-priority pages — call out concrete gaps per page, not a generic score.
5. **Produce a remediation plan**, ordered by effort vs. likely impact, covering rewrites for extractability, missing schema, `llms.txt`/`robots.txt` changes, and any citation-worthiness gaps (missing author, stale dates, no original data).
6. **Set a re-test cadence.** Recommend re-running the priority queries on a recurring schedule (monthly for fast-moving topics, quarterly otherwise) since platform behavior drifts.

---

## Output Format

**AEO/GEO Assessment**

- **Fundamentals check**: classic SEO readiness — pass, or defer to `seo-audit`/`technical-seo-checker`/`on-page-seo-auditor` first
- **Priority queries**: the agreed list of 10-20 questions
- **Current visibility**: per-query, per-platform citation status, dated, marked as directional (see Layer 4)
- **Layer scorecard**: Extraction / Citation-worthiness / Structured Data / Crawler Access, each with concrete findings, not just a score
- **Remediation plan**: ordered list, each item with Issue, Fix, and Effort/Impact
- **Re-test schedule**: explicit next date to re-run the query list

---

## Reference Files

- [`references/extraction-and-citation-signals.md`](references/extraction-and-citation-signals.md): extraction pattern before/after examples, `llms.txt` structure, and the AI crawler user-agent list for `robots.txt`

## Related Skills

- **seo-audit**: classic technical + on-page + content audit — run this first if fundamentals are unverified
- **technical-seo-checker**: crawlability, indexation, Core Web Vitals, and general schema validation
- **on-page-seo-auditor**: title tags, headers, images, internal links — scored on-page report
- **seo-content-writer**: for drafting the actual replacement content once a rewrite is scoped here
- **seo-growth-orchestrator**: for sequencing AEO/GEO work alongside the rest of an organic growth program
