# Dos & Don'ts (read before any play)

The judgment layer. The plays tell you *what to run*; this tells you *how not to wreck the account or mislead the client*. Distilled from the practitioner's repeated warnings + standard SEO safety.

## ✅ DO

- **DO clarify to ≥95% confidence before producing.** End every research/strategy prompt with "ask me clarifying questions one at a time until you are ≥95% confident, then proceed." This is the #1 quality multiplier in the whole playbook.
- **DO pull real data first.** GSC for keywords already ranking, the live SERP for competition, the actual competitor pages for gaps, real reviews for voice-of-customer. Recommendations ride on evidence, not the model's prior.
- **DO treat GBP as the primary asset for local.** Categories, posts (weekly), reviews, and NAP consistency pay faster than any blog post.
- **DO stagger GBP category changes.** Add the highest-correlation / lowest-risk categories first, then more a week later. Bulk-changing categories overnight looks manipulative and risks a flag. Keep the original primary category.
- **DO build one dedicated page per service × city.** Pages rank, not sites. A location page stack is the highest-ROI build for multi-area local businesses.
- **DO mine page-2 keywords (avg position 8–20).** They are the cheapest wins — already ranking, just need title/H1/first-100-words/internal-link nudges.
- **DO use the customers' own language.** Mine 100+ reviews per competitor for fear/outcome/recommendation phrases and put that exact vocabulary in copy, GBP description, FAQs, and review-request scripts.
- **DO set honest timelines.** GBP + service/city pages + reviews → results in ~30 days. New cornerstone blog content → 60–180 days. Say this out loud; never imply a brand-new post ranks in 30 days.
- **DO keep a human in the loop on strategy.** Auto-format and auto-publish are fine; auto-deciding categories, claims, and what's "true about the business" is not.
- **DO verify keyword volume/difficulty against a real source** (GSC, Ahrefs/SEMrush, or an API) before betting budget on it.
- **DO scope the Goals Protocol to ONE deliverable** with output spec + numeric acceptance criteria + constraints + stop-and-verify (see `goals-protocol.md`).
- **DO disclose tool costs and that some are paid third parties** (Arvo, Blotato) — present them as optional, not required.

## ❌ DON'T

- **DON'T trust AI-estimated search volume / KD as ground truth.** The transcript's own demos run "without Ahrefs connected — usually pretty close." *Usually close* ≠ correct. Label any non-API number as an estimate and verify before spending money or time on it.
- **DON'T buy backlinks.** Explicitly called out as a don't. Earn them (guest posts, citations, local links, genuinely linkable content / exchanges within ToS).
- **DON'T mass-publish thin blog posts.** 50 low-quality posts < a few strong cornerstone pages. Quality and search-intent match win.
- **DON'T chase national/head keywords for a local business.** Stay local; you can't out-authority national players, and local intent converts.
- **DON'T obsess over keyword tools** or endless research. Cap the research phase (≤48h in the sprint) and start publishing/optimizing.
- **DON'T bulk-edit GBP** (categories, name, address) all at once or stuff keywords into the business name — flag/suspension risk.
- **DON'T let NAP drift.** Name/Address/Phone must be byte-identical across every directory; abbreviations ("Ste" vs "Suite") count as inconsistencies.
- **DON'T auto-send outreach email.** Draft only; the human reviews and sends. (Also a deliverability/spam safeguard.)
- **DON'T ship AI blog content without the on-page SEO layer** (title/meta, H1–H3, internal links to money pages, alt text, schema). Raw Claude prose lacks it — add it via `on-page-seo-auditor` + `schema-markup-generator` + `internal-linking-optimizer`, or a tool that bakes it in.
- **DON'T jam multiple goals into one Goals Protocol run.** #1 cause of failure. One goal, sequenced.
- **DON'T present a tool as a silver bullet or shill it.** Recommend a workflow; name tools as one option with their tradeoffs and price.
- **DON'T promise rankings.** SEO is probabilistic. Promise process and leading indicators (indexation, impressions, position movement, leads), not guaranteed positions.
- **DON'T scrape GSC/GBP without the user's own logged-in session.** Use their authenticated browser tab; never enter credentials from a screenshot.

## The 3 prompt-quality tests (apply to every prompt you write)

1. **Stranger test** — could a stranger read the prompt and know exactly what "done" looks like? If they'd need follow-ups, the criteria are weak.
2. **Spreadsheet test** — could every acceptance criterion be a spreadsheet column answered yes/no or a number? Fuzzy words fail.
3. **Runway test** — if the agent misinterprets in the worst way, would your constraints catch it within minutes? If not, add guard rails.
