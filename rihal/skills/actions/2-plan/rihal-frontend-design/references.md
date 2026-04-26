# Frontend Design — Detailed Reference

Detailed aesthetic guidelines for [`SKILL.md`](SKILL.md).

---

## Typography

Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive, characterful choices that elevate the frontend's aesthetics. Pair a distinctive display font with a refined body font.

For Rihal / Omani work, consider Latin + Arabic pairs that work together:

**Latin display & body:** PP Neue Montreal, IBM Plex, Söhne, Editorial New, GT Sectra, Tiempos, Recoleta.
**Arabic companions:** IBM Plex Arabic, Adelle Sans Arabic, Readex Pro, Tajawal, Cairo, El Messiri, Noto Naskh Arabic.

---

## Colour & theme

Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colours with sharp accents outperform timid, evenly-distributed palettes.

Rihal's official palette (when brand alignment matters): Rihal blue `#1e3a8a`, gold `#f59e0b`. For original work, use these as optional anchors — don't force them.

---

## Motion

Use animation for effects and micro-interactions. Prioritise CSS-only solutions for HTML; use Motion library for React when available. Focus on high-impact moments: **one well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions.** Use scroll-triggering and hover states that surprise.

---

## Spatial composition

Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density — pick a philosophy and execute it.

---

## Backgrounds & visual details

Create atmosphere and depth instead of defaulting to solid colours. Add contextual effects and textures that match the aesthetic: gradient meshes, noise textures, geometric patterns (Islamic geometric art fits well for Omani work), layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays.

---

## What to avoid

Never use generic AI-generated aesthetics:

- Overused fonts: Inter, Roboto, Arial, system fonts. **Space Grotesk is extremely overused — never use as default.**
- Clichéd colour schemes: purple gradients on white, "AI blue" defaults.
- Predictable layouts: hero + three-column features + CTA.
- Cookie-cutter Tailwind defaults without customisation.
- Cookie-cutter shadcn/ui without restyling.
- Centred stacks with identical spacing.
- Emoji as primary visual element.

**Interpret creatively.** Make unexpected choices that feel genuinely designed for the context. No two designs should be the same. Vary between light and dark, fonts, aesthetics. **Never converge on common choices across generations.**

---

## Implementation philosophy

Match implementation complexity to the aesthetic vision:
- Maximalist designs need elaborate code with extensive animations and effects.
- Minimalist or refined designs need restraint, precision, careful attention to spacing, typography, subtle details.
- Elegance comes from executing the vision well, not from decorating a weak idea.

Don't hold back — show what can be created when committing fully to a distinctive vision.

---

## Rihal-specific guidelines

When designing for Rihal (government clients, enterprise dashboards, Arabic audiences):

1. **RTL is foundational, not retrofitted.** Use logical CSS properties (`padding-inline-start`, not `padding-left`) from day one.
2. **Arabic typography needs different scale.** Arabic glyphs are visually denser; bump line-height +10%, let letter-spacing breathe.
3. **Cultural context.** Islamic geometric patterns; Omani colours (desert sand, turquoise, gold, deep blue); bilingual parity — not token gestures.
4. **Government dashboards** favour authoritative restraint over playful chaos. Enterprise dashboards can be more confident.
5. **Never compromise accessibility** for aesthetic impact. WCAG AA minimum, AAA where feasible.
