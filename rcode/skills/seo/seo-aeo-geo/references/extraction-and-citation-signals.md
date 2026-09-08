# Extraction and Citation Signals

Reference detail for the AEO/GEO skill: before/after extraction patterns, `llms.txt` structure, and the AI crawler list for `robots.txt`. Read the main `SKILL.md` first — this file expands Layers 1 and 3.

---

## Contents
- Extraction Pattern Examples (Direct-Answer Opening, Atomic Claims, Question Headers, Tables Over Prose, Numbered Steps)
- Citation-Worthiness Checklist
- `llms.txt` Structure and Example
- AI Crawler User Agents for robots.txt
- Structured Data Property Checklist for AI Citation
- Common Mistakes

---

## Extraction Pattern Examples

### Direct-Answer Opening

**Before** (answer buried after context-setting):
> When teams first start evaluating time-tracking software, they often don't realize how many hidden costs come with per-seat pricing models, and it can take weeks of trial-and-error before the real number becomes clear. In our experience working with mid-size teams, the flat-rate model tends to work out significantly cheaper once you account for..." Flat-rate time tracking costs about $49/month for up to 25 users, versus roughly $200/month for the same team on a $8/seat plan.

**After** (answer first, context after):
> Flat-rate time tracking costs about $49/month for up to 25 users, versus roughly $200/month for the same team on a $8/seat plan. This gap widens as the team grows, because per-seat pricing scales linearly while flat-rate plans usually have a single ceiling. [supporting detail continues below]

The second version gives an extraction system a complete, correct answer in the first sentence. The first version makes the model guess where the answer starts, or skip the paragraph.

### Atomic Claims

**Before** (claim split across the page):
> Paragraph 1: "Our platform has a generous context window for handling large documents."
> Paragraph 4: "...which is especially useful given the 200K token limit."

**After** (claim stated once, completely):
> The platform supports up to 200,000 tokens of context per request (as of the 2026 release), enough to process roughly 500 pages of text in a single call.

### Question Headers (used naturally, not forced)

**Good**: "How long does onboarding take?" / "What does the free plan include?" — matches how people actually prompt AI assistants.

**Forced and worth avoiding**: turning a header like "Pricing" into "What Is Our Pricing?" adds no clarity and reads as keyword-stuffed to a human reader.

### Tables Over Prose for Comparable Data

Pricing tiers, feature comparisons, spec sheets, and step sequences should be tables or lists, not paragraphs describing the same data. A model can parse `| Plan | Price | Seats |` far more reliably than "the Pro plan costs $49 and includes up to 10 seats, while the Team plan is $99 for up to 25 seats."

### Numbered Steps for Procedures

**Before**: "First you'll want to connect your account, and once that's done you can go ahead and import your existing data, after which you'll be ready to invite your team."

**After**:
1. Connect your account
2. Import existing data
3. Invite your team

---

## Citation-Worthiness Checklist

Run this against a page that should be earning citations:

- [ ] Does the page state at least one specific, sourced number (not a vague magnitude)?
- [ ] Is there a named author with a real bio, or a clear organizational voice with contact/about information?
- [ ] Is a "last updated" date visible on the page **and** does it match `dateModified` in structured data?
- [ ] Does the page link out to the primary sources it draws on?
- [ ] If the page claims original research or data, is the methodology briefly disclosed?
- [ ] Would this page still be useful if the reader already read three competitor pages on the same topic — or does it just restate them?

---

## `llms.txt` Structure and Example

`llms.txt` is a plain-markdown file at the site root (`/llms.txt`) that gives an AI system a curated map of what the site covers and where, similar in spirit to a sitemap but written for a language model rather than a crawler. It is one input among many, not a guarantee of citation — treat it as a convenience layer on top of solid content, not a substitute for it.

Minimum useful structure:

```markdown
# [Site or Product Name]

> One or two sentence description of what this site/product is and who it's for.

## Docs
- [Getting Started](https://example.com/docs/getting-started): what it covers in a few words
- [API Reference](https://example.com/docs/api): what it covers

## Guides
- [Pricing Guide](https://example.com/guides/pricing): what it covers

## Optional
- [Changelog](https://example.com/changelog): lower-priority context
```

Guidelines:
- List only pages worth a model reading — this is a curated index, not a full sitemap dump.
- Keep descriptions factual and specific, not marketing copy — a model uses these to decide whether to fetch the page.
- Update it when major content sections are added or restructured; a stale `llms.txt` pointing at moved or deleted pages is worse than none.
- An optional `llms-full.txt` (a fuller content export) exists as a pattern some sites use, but only publish it if the site is comfortable with that content being consumed wholesale — it is a bigger commitment than the curated index file.

---

## AI Crawler User Agents for robots.txt

Decide deliberately whether to allow or block each of these — a default-deny inherited from a generic robots.txt template silently opts a site out of these engines without anyone choosing to:

| User agent | Operator | Purpose |
|---|---|---|
| `GPTBot` | OpenAI | Training data / content access |
| `ChatGPT-User` | OpenAI | Live retrieval during a ChatGPT browsing session |
| `OAI-SearchBot` | OpenAI | ChatGPT search indexing |
| `ClaudeBot` | Anthropic | Training data / content access |
| `Claude-User` / `Claude-SearchBot` | Anthropic | Live retrieval during Claude use |
| `Google-Extended` | Google | Controls use in Gemini and AI Overviews training (separate from classic `Googlebot`) |
| `PerplexityBot` | Perplexity | Live retrieval for Perplexity answers |
| `Amazonbot` | Amazon | Alexa / retrieval |
| `Applebot-Extended` | Apple | Apple Intelligence training use |
| `Bytespider` | ByteDance | Training data collection |

Example `robots.txt` block allowing AI answer engines that can drive citations while still controlling bulk training crawlers separately:

```
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /
```

Verify the current directive names against each operator's published documentation before publishing — these lists are added to and renamed as new AI products launch.

---

## Structured Data Property Checklist for AI Citation

Beyond what a general schema validator checks for rich-result eligibility, these properties specifically affect whether a generative engine can resolve and trust the source:

- `Organization.sameAs` → links to Wikipedia, Wikidata, LinkedIn, Crunchbase, or other profiles that help disambiguate the entity
- `Person.sameAs` on every byline → links to a verifiable professional profile for the named author
- `Article.dateModified` → kept accurate; the single highest-leverage freshness signal for time-sensitive queries
- `Article.author` → a `Person` or `Organization` reference, never omitted
- `FAQPage` → only on pages with genuine, visibly-present question/answer pairs
- `HowTo.step` → only matched to real numbered steps already visible in the content

---

## Common Mistakes

- Manufacturing `FAQPage` schema on pages with no real FAQ content, to farm the schema type — this wastes a trust signal and both classic and generative engines increasingly discount it.
- Publishing `llms.txt` once and never updating it as the site restructures.
- Blocking AI crawlers by accident via a copy-pasted `robots.txt` that predates the current AI user-agent list.
- Hiding the actual answer behind heavy client-side rendering — AI crawlers render JavaScript less reliably than Googlebot, so critical answer content should be present in server-rendered or pre-rendered HTML.
- Reporting a citation-share percentage to a stakeholder that was never actually measured — see Layer 4 of the main skill on monitoring honesty.
