---
name: rihal-theme-system
description: Audit a frontend's design tokens BEFORE launch. Catches inconsistent colours, scattered hex values, hardcoded spacing, font drift, and missing dark/RTL mode support. Specifically encodes Rihal's "had to do complete rebranding mid-project" pain — themes accumulated drift until a full pass was the only fix. Pairs with rihal-rebrand if a rebrand becomes unavoidable.
triggers:
  - "theme audit"
  - "design tokens"
  - "scattered colours"
  - "hardcoded hex"
  - "design system audit"
  - "before launch design check"
  - "consistent theme"
  - "css variable audit"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Theme drift is silent until launch — then someone notices that "the brand blue" is 4 different blues across pages, and now you're rebranding under deadline. This skill catches drift early: every colour, font, spacing value, and animation duration must come from a token, not a literal. A 30-minute audit before launch is cheaper than a 3-week rebrand after.

## The 7 token categories

For each, the audit checks: where do values live, are they used consistently, is dark mode + RTL supported.

### 1. Colour

- [ ] All colours defined as CSS custom properties in one location (`globals.css` or `tokens.css`).
- [ ] No raw hex / rgb in component files (grep for `#[0-9a-f]{3,8}`).
- [ ] Each colour has a semantic name (`--color-primary`) AND a literal name (`--rihal-blue`).
- [ ] Dark mode tokens defined alongside light, not retrofitted.

### 2. Typography

- [ ] Font families loaded once (via `next/font` or `<link>` in head).
- [ ] Font sizes use a scale (`--text-xs`, `--text-sm`, etc.), not arbitrary px values.
- [ ] Arabic font has explicit line-height bump (Arabic glyphs are denser).
- [ ] Fallback stack defined for every font family.

### 3. Spacing

- [ ] Spacing scale defined (`--space-1` through `--space-12`).
- [ ] No raw px values for margin/padding in components.
- [ ] Logical properties used (`padding-inline-start`, not `padding-left`) for RTL.

### 4. Radii & shadows

- [ ] Radii scale (`--radius-sm`, `--radius-lg`).
- [ ] Shadow tokens, not inline `box-shadow: 0 4px 6px ...` strings.

### 5. Motion

- [ ] Duration scale (`--duration-fast: 150ms`, `--duration-slow: 400ms`).
- [ ] Easing tokens (`--ease-out`, `--ease-spring`).
- [ ] Reduced-motion media query honoured.

### 6. Breakpoints

- [ ] Breakpoint tokens defined and used everywhere.
- [ ] Mobile (390px), tablet (768px), desktop (1440px) all tested.

### 7. RTL

- [ ] `dir="rtl"` toggle exists and works at the root.
- [ ] Logical properties used throughout (CSS Logical Properties Level 1).
- [ ] Icons that imply direction (arrows, slashes) flipped via `transform: scaleX(-1)` or RTL-specific assets.
- [ ] Mixed-content (Arabic + English in same line) tested.

## Workflow

1. **Inventory token locations.** Should be one file per category, plus a root index.
2. **Grep for literals.** Every match in a component file is a finding.
3. **Diff against design.** If Layla / Zahra / the brand guide has tokens that aren't in code, add them. If code has tokens not in the brand guide, flag them.
4. **Test dark + RTL** per page if they're shipping.
5. **Generate the fix list** ordered by frequency (a hardcoded `#1e3a8a` in 12 files is more urgent than one in 1).

## Output Format

```
Theme audit — <date>
Pages reviewed: <count>

Token coverage:
  Colour:        <X%>  ✗ <count> raw hex literals
  Typography:    <X%>  ⚠ <findings>
  Spacing:       <X%>
  Radii/shadows: <X%>
  Motion:        <X%>
  Breakpoints:   <X%>
  RTL:           ✓/✗

Top offenders (by file):
  src/components/Hero.tsx — 8 raw hex values
  src/app/page.tsx — 4 hardcoded font sizes

Fix order (by impact):
  1. Replace #1e3a8a → var(--rihal-blue) — 12 occurrences across 8 files
  2. ...

Memory Bank update:
  → .rihal/memory/project/decisions.md (token system canonicalised)
```

## Examples

**Happy path — pre-launch audit** — Page count: 12. Coverage: colour 60%, typography 80%, spacing 50%, RTL 0%. Plan: extract tokens (1 day), migrate components (2 days), add RTL toggle (1 day). Catch the rebrand BEFORE launch.

**Edge case — design partial alignment** — Brand guide has 3 blues, code has 7. Some are intentional shades; some are drift. Walk each with Zahra (`rihal-agent-zahra`) to canonicalise.

**Negative — "we'll add dark mode later"** — Refuse silent commitment. Either ship dark mode now or document the decision in `decisions.md` so it doesn't become a "why don't we have dark mode?" argument in 3 months.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (frontend layer), brand tokens from Zahra if available
- **Writes:** `.rihal/memory/project/decisions.md` (canonical token system); `.rihal/memory/change-records/YYYYMMDD-NNN.md` (the audit itself)
