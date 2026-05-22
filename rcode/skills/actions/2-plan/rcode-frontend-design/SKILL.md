---
name: rcode-frontend-design
internal: true
description: >
  Create distinctive, production-grade frontend interfaces with a committed
  aesthetic direction — typography, colour, motion, spatial composition,
  backgrounds, visual details — that avoid generic "AI slop". Activates when
  the user says "design this UI", "build a beautiful frontend", "distinctive
  design", "creative UI", "unforgettable interface", "award-winning design",
  "not generic", "bold aesthetic", "brutalist", "editorial", "maximalist",
  "minimalist luxury", "design a landing page", "standout hero section",
  "make this look amazing", or "frontend design". Pairs with rcode-clone-website
  (for copying) and rcode-agent-zahra (branding). Do NOT use for: cloning
  existing sites (use rcode-clone-website), pure backend, or documentation.
triggers:
  - "AI slop"
  - "design this UI"
  - "build a beautiful frontend"
  - "distinctive design"
  - "creative UI"
  - "unforgettable interface"
  - "award-winning design"
  - "not generic"
  - "bold aesthetic"
  - "brutalist"
  - "editorial"
  - "maximalist"
license: Adapted from Anthropic's frontend-design skill
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

Builds **original** frontend interfaces with a committed aesthetic direction. Goal: interfaces someone actually remembers. Different from `rcode-clone-website` (which replicates existing sites pixel-for-pixel). Pairs with `rcode-agent-zahra` for brand alignment. Detailed aesthetic guidelines, type pair recommendations, "what to avoid" list, and rcode-specific RTL guidance live in [`references.md`](references.md).

## Design Thinking — commit before coding

Before writing any code, lock these:

- **Purpose** — what problem does this UI solve? Who uses it?
- **Tone** — pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic, luxury-refined, playful, editorial, brutalist, art-deco, soft pastel, industrial, Omani-modern. **Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.**
- **Constraints** — framework, performance, accessibility, Arabic RTL support.
- **Differentiation** — what's the one thing someone will remember?

Then implement code that is production-grade, visually striking, cohesive, refined in detail, and bilingual-ready (RTL from day one for rcode work).

## Workflow

1. **Understand context** — ask about purpose, audience, constraints, brand alignment.
2. **Commit to a direction** — state the aesthetic in one sentence before writing code.
3. **Check brand alignment** — if rcode branding matters, invoke Zahra (`rcode-agent-zahra`) for brand tokens.
4. **Select type pair** — display + body, with Arabic companion if bilingual.
5. **Define colour system** — dominant + accents, not a rainbow.
6. **Design motion choreography** — what animates when, what's the hero moment.
7. **Implement with precision** — every detail refined, every pixel intentional.
8. **Verify at all viewports** — desktop, tablet, mobile, RTL.
9. **Stress-test content** — long names, empty states, error states, loading states.

## Output Format

- Markdown explanation + fenced code blocks (language-tagged)
- Start with a one-sentence aesthetic statement before any code
- Show complete files, not fragments
- React / Next.js: Server Components by default, Client Components only when needed
- Tailwind: custom config extensions, not raw class spam
- CSS: variables for tokens

Do NOT include: Inter or Space Grotesk as default fonts, generic purple/blue gradients, centred cookie-cutter layouts, "looks fine" designs, undifferentiated shadcn/ui. Do NOT ship without a specified type pair, colour system, and motion direction.

## Examples

**Happy path — original landing**
"Design a landing page for an Omani heritage tourism startup" → aesthetic: "editorial-magazine with Islamic geometric motifs, warm desert palette, slow cinematic type reveals" → type pair GT Sectra Display + Tajawal → colours `#2C1810 / #D4A574 / #0F3B3C / #F5EFE0` → hero h1 staggered per-word → asymmetric grid → Arabic RTL mirrored → complete Next.js + Tailwind code.

**Happy path — dashboard**
"Ministry of Energy analytics dashboard" → "authoritative Omani-modern, deep navy + desert gold, IBM Plex for gravitas, zero playfulness" → IBM Plex Sans + Arabic → restrained motion → dense grid → AAA contrast + keyboard navigation.

**Edge case — brand conflict**
"Build a playful colourful landing for a rcode government client" → flag the conflict. Government audiences expect restraint. Offer alternatives or invoke Zahra to verify brand fit.

**Edge case — generic request**
"Design a landing page, modern and clean" — refuse. Ask the user to pick an extreme or describe a site they love.

**Negative — wrong skill**
"Clone https://linear.app" → cloning is `rcode-clone-website`'s job, redirect.

## Memory Bank Hooks

- **Reads:** `.rcode/memory/project/stack.md` (frontend framework), brand tokens from Zahra if available
- **Writes:** the implemented frontend files; consider noting design system choices in `.rcode/memory/project/decisions.md`

## Detailed reference

See [`references.md`](references.md) for: typography pairings (Latin + Arabic), colour philosophy, motion principles, spatial composition rules, the "what to avoid" list, and rcode-specific RTL + government-client guidelines.
