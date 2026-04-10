# Design System — Rihal Method Dashboard

## Colors (Omani-inspired)

```css
--rihal-blue: #1e3a8a   /* primary */
--rihal-gold: #f59e0b   /* accent, highlights */
--bg:         #0a0e1a   /* background */
--card:       #131828   /* card background */
--border:     #1f2937   /* borders */
--text:       #e5e7eb   /* primary text */
--muted:      #9ca3af   /* secondary text */
--accent:     #3b82f6   /* interactive */
```

## Typography
- System font stack: `-apple-system, "Segoe UI", "Inter", sans-serif`
- Heading: 600-700 weight
- Body: 400 weight, 1.6 line-height

## Spacing
- 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48px scale
- Card padding: 20-24px
- Section gap: 24px

## Components
- Stat card (label + value + sub)
- Agent card (name + arabic + role)
- Item card (title + meta + preview with fade-out)
- Section (header with accent background + body)

## Cultural Touches
- Arabic text uses gold color (`--rihal-gold`)
- Headers include Arabic subtitles
- RTL-compatible with `dir="rtl"` on specific elements
