# Design Tokens Discipline

Shared reference `@`-included by `rihal-code-reviewer` and `rihal-haitham`. Designed by Haitham to close #660.

## The rule

**If a token is missing for a stated semantic role, ADD the token to the design system. Do NOT inline hex.**

A semantic role is anything named like `.order-status-paid`, `.btn-danger`, `.alert-warning`, `.badge-pending` — the class name encodes a meaning the design system should own.

## What this catches

**Anti-pattern (real incident, Phase 07):**
```css
.order-status-paid {
  background: #D1FAE5;   /* ✗ raw hex outside :root */
  color: #065F46;        /* ✗ raw hex outside :root */
}
```

The class is asking for `--paid-bg` and `--paid-fg` tokens. Inlining hex silently defeats tokenization and creates a hole the next dev will repeat.

**Correct fix:**
```css
:root {
  --paid-bg: #D1FAE5;
  --paid-fg: #065F46;
}

.order-status-paid {
  background: var(--paid-bg);
  color: var(--paid-fg);
}
```

## Regex (two-stage; single regex can't express block context)

**Stage A — candidate scan** in `*.css`, `*.scss`, `*.sass`, `*.less`, styled-components in `*.{ts,tsx,js,jsx}`, Tailwind config files:

```
(#[0-9a-fA-F]{3,8}\b)|(\b(?:rgb|rgba|hsl|hsla)\s*\()
```

**Stage B — context filter** (drop matches where ANY of these hold):

1. Match is inside a `:root { … }`, `@theme { … }`, `:where(:root) { … }`, or `[data-theme] { … }` block (track brace depth from file start).
2. The line is a CSS-custom-property declaration: `^\s*--[a-z0-9-]+\s*:`.
3. Match is inside `url(...)`, `content:`, `font-family:`, `background-image: url(...)`.
4. Match is preceded by `//` or inside `/* … */`.
5. Match is an HTML/URL fragment: `href="#...`, `id="#...`, or `#` followed by non-hex chars.
6. File path appears in `.rcode/design-tokens-allowlist.txt`.
7. The exact `file:line:value` triple appears in `.rcode/design-tokens-allowlist.txt`.

**Named-color trap** (`color: red`, `background: white`): flag too, but only for the CSS-named-color set in property positions:

```
(?:color|background(?:-color)?|border(?:-[a-z]+)?-color|fill|stroke)\s*:\s*(red|blue|green|orange|purple|pink|yellow|black|white|gray|grey|cyan|magenta|brown|teal|navy|olive|maroon|silver|aqua|fuchsia|lime)\b
```

## When violations are found — failure banner

```
✗ Design-token bypass (Lens 11 · Karpathy)

  apps/web/styles/orders.css:42 — hex literal used outside token block: #D1FAE5
  apps/web/styles/orders.css:43 — hex literal used outside token block: #065F46

  Why this fails:
    A semantic role (.order-status-paid) is missing tokens.
    Inlining hex silently defeats the design system and creates a hole that repeats.

  Fix path:
    1. Add to :root      →  --paid-bg: #D1FAE5;  --paid-fg: #065F46;
    2. Replace in class  →  background: var(--paid-bg); color: var(--paid-fg);
    3. Or waive          →  echo "apps/web/styles/orders.css:42:#D1FAE5" >> .rcode/design-tokens-allowlist.txt

  Files: 1 · Violations: 2 · Waived: 0
```

## Allowlist file format

`.rcode/design-tokens-allowlist.txt` — one waiver per line, blank lines and `#` comments allowed:

```
# Print stylesheet — Pantone-mandated for the PDF export
apps/web/styles/print.css
# Specific match (file:line:value) — narrowest waiver, prefer this form
apps/web/styles/legacy/calendar.css:88:#0A0A0A
```

## Why a check vs a pre-commit hook

This rule lives in `/rcode-lens-audit` (Lens 11 — Karpathy) because the violation is a Karpathy-shaped defect: code that looks fine but silently degrades a system contract. Users opt in by running the lens or `all`.

A pre-commit hook would catch it sooner but adds friction every commit. The recommended workflow:

- Run `/rcode-lens-audit 11` before opening a PR.
- Add the regex above to `pre-commit` if your team wants enforcement at commit time.
