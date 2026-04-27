---
name: rihal-clone-website
description: >
  Reverse-engineer and clone any website pixel-perfectly — extracts assets,
  exact CSS via getComputedStyle, content section-by-section, and dispatches
  parallel builder agents in worktrees. Activates when the user says "clone
  this website", "clone this site", "rebuild this page", "replicate this
  UI", "pixel-perfect clone", "make exact UI like this", "copy this site",
  "reverse engineer this site", "build me a clone of", "aisi website banao",
  "yeh site clone karo", or "exact same UI chahiye like [URL]". Provide the
  target URL as input. Do NOT use for: creating original designs from scratch
  (use rihal-create-ux-design with Layla), writing new components from a
  brief (use rihal-dev-story with Hanzla), or inspiration-only references
  without rebuild intent.
triggers:
  - "clone this website"
  - "clone this site"
  - "rebuild this page"
  - "replicate this UI"
  - "pixel-perfect clone"
  - "make exact UI like this"
  - "copy this site"
  - "reverse engineer this site"
  - "build me a clone of"
  - "aisi website banao"
  - "yeh site clone karo"
  - "exact same UI chahiye like [URL]"
argument-hint: "<url>"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Reverse-engineer a target URL into a working Next.js + shadcn/ui + Tailwind clone. The skill is **foreman-style**: extract a section, write a spec file, dispatch a builder agent in a worktree, move on to the next section. Extraction is meticulous (computed CSS, real assets, both static and behavioral) — building runs in parallel. Detailed principles, scripts, and templates live in [`references.md`](references.md).

## Process

1. **Pre-flight** — Chrome MCP available, Next.js + shadcn scaffold builds clean, output dirs exist.
2. **Phase 1 — Reconnaissance** — full-page screenshots (desktop + mobile), global extraction (fonts, colors, favicons), mandatory interaction sweep (scroll, click, hover, responsive), page topology map.
3. **Phase 2 — Foundation build** — fonts, `globals.css`, TypeScript types, SVG icons, downloaded assets. Sequential, must compile.
4. **Phase 3 — Component spec & dispatch** — for each section: extract DOM + computed CSS + states + content + assets → write `docs/research/components/<name>.spec.md` → dispatch builder agent with full spec inline. Don't wait between sections.
5. **Phase 4 — Page assembly** — wire components in `src/app/page.tsx`, implement page-level behaviours (scroll-snap, smooth scroll, theme transitions). Build must pass.
6. **Phase 5 — Visual QA diff** — side-by-side screenshots vs original at 1440px and 390px. Re-extract on discrepancies.

## Output Format

```
Total sections built:        N
Total components created:    N
Total spec files written:    N   (must match component count)
Total assets downloaded:     N   (images / videos / SVGs / fonts)
Build status:                PASS | FAIL
Visual QA discrepancies:     <list of remaining diffs>
```

Do NOT include: vague status like "mostly done", builders dispatched without spec files, or estimated CSS values.

## Examples

**Happy path** — `clone https://linear.app` → reconnaissance → foundation → spec each section → dispatch builders → assemble → visual QA. ~6 phases, parallel where possible.

**Edge case — missing Chrome MCP** — STOP immediately and tell the user to enable it. Without browser automation we'd be guessing from HTML, which produces bad clones.

**Edge case — scroll-driven site** — during interaction sweep, scroll BEFORE clicking. If content switches on scroll, document as "INTERACTION MODEL: scroll-driven (IntersectionObserver)" and do NOT build click-based tabs. This is the #1 expensive mistake.

**Negative — original design request** — "Design a new landing page" is not a clone. Redirect to Layla (UX) or Hanzla (direct build).

## Memory Bank Hooks

- **Reads:** `package.json` and existing `src/` to detect scaffold; `.rihal/memory/project/stack.md` if present (records the stack used)
- **Writes:** `docs/research/` (artefacts, persistent), `docs/design-references/` (screenshots), nothing in `.rihal/memory/` directly

## Detailed reference

See [`references.md`](references.md) for: the 9 guiding principles, the asset discovery script, the CSS extraction script, the component spec template, the pre-dispatch checklist, and the "what NOT to do" list.
