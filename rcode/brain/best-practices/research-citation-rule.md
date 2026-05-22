# Research & Citation Rule

Referenced by any step-file workflow that writes content derived from external sources (competitor pricing, API tiers, market sizing, benchmark numbers, vendor claims, etc.).

## The Rule

If an output artifact (PRD, research note, architecture doc, roadmap) contains a specific external claim — a price, a percentage, a named competitor feature, an API limit — then **every such claim must be traceable to a `WebFetch` (or equivalent document-fetch) call made in the same session**. `WebSearch` snippets alone are not sufficient evidence because snippets are paraphrased and may be stale.

## What This Means in Practice

Before writing a claim like *"Competitor X costs $12.50/mo"*:

1. Run `WebFetch` on the source URL (not just `WebSearch` for a snippet).
2. Quote the exact sentence from the fetched content in your internal reasoning.
3. Include the URL in the citations block of the artifact.
4. If the URL is paywalled, login-walled, or returns a different claim than expected, drop the number — do not paraphrase from memory or search-result previews.

## The Trap to Avoid

Observed failure pattern (rcode session, social-poster-x PRD generation):

- Agent ran two `WebSearch` calls.
- Agent wrote a PRD citing four specific URLs with specific dollar amounts.
- Agent never ran `WebFetch` on any of the four URLs.
- Numbers may be accurate-looking hallucinations.

This pattern is forbidden. A citation block without `WebFetch` evidence is a lie to the reader.

## If the User Is Running Autonomously

`mode: yolo` and `/rcode-do --auto` bypass halt-at-menu, but they do **not** bypass this rule. A fully-autonomous run still has to fetch every cited URL before writing the claim.

## Checklist Before Writing a Citation

- [ ] `WebFetch` was called on this URL in this session.
- [ ] The fetched content contains the specific number / claim being cited.
- [ ] The claim in the artifact matches the fetched content verbatim (or is a clearly labeled summary).

If any box is unchecked: remove the claim, replace with *"(needs source)"*, and flag to the user.
