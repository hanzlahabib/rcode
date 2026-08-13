# Design Library

Reference data consulted by `rcode-ux-designer` and `/rcode-ui-phase` when
producing UI-SPEC.md and WIREFRAMES.md — style/palette/typography options with
concrete values, UX do/don't rules per interface pattern, and category→pattern
decision rules for picking a design direction that fits the project, instead
of an agent inventing tokens from scratch.

## Source and license

Vendored from [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
by Next Level Builder, MIT licensed. Copyright (c) 2024 Next Level Builder.
Full license text: `LICENSE` in this directory. Data only — the upstream
project's Python CLI/scripts are not vendored; rcode agents read these CSVs
directly via Read/Grep, no Python dependency required.

## Files

| File | Contents |
|---|---|
| `styles.csv` | 67 UI style categories (Minimalism, Neumorphism, Glassmorphism, Brutalism, etc.) — keywords, color palette, effects, best-for/avoid-for, accessibility rating, framework compatibility, implementation checklist |
| `colors.csv` | Palette options with hex values and mood/use-case |
| `typography.csv` | Font pairings with scale, weight, and use-case |
| `ux-guidelines.csv` | Do/don't rules by category (Navigation, Forms, etc.) with good/bad code examples and severity |
| `ui-reasoning.csv` | Project-category → recommended pattern/style/color-mood/typography-mood decision rules, with anti-patterns to avoid |
| `web-interface.csv` | Web-specific interface pattern guidance |
| `icons.csv` | Icon system/library options |
| `charts.csv` | Chart/data-viz pattern options |

## How to use

Don't dump these into a prompt wholesale — they're too large. Grep for the
project's category/type in `ui-reasoning.csv` first to get a recommended
style + color mood + typography mood, then look up the specific style's row
in `styles.csv` for concrete values, then check `ux-guidelines.csv` for the
do/don't rules relevant to the screens being designed (Navigation, Forms,
etc.). See `rcode/workflows/ui-phase.md` for the concrete lookup sequence.
