# Clone Website — Detailed Reference

Detailed principles, scripts, templates, and checklists for [`SKILL.md`](SKILL.md). Keep this file open in another tab while running the skill.

---

## 9 Guiding Principles

These are the truths that separate a successful clone from a "close enough" mess.

### 1. Completeness beats speed
Every builder agent must receive **everything** it needs: screenshot, exact CSS values, downloaded assets with local paths, real text content, component structure. If a builder has to guess any value, extraction failed. One extra minute of extraction beats an incomplete brief.

### 2. Small tasks, perfect results
Builder prompts ≤150 lines of spec. If a section's spec exceeds that, split it: one agent per sub-component plus one for the wrapper. Don't override with "but it's all related."

### 3. Real content, real assets
Extract actual text, images, videos, SVGs from the live site. Use `element.textContent`, download every `<img>` and `<video>`, extract inline `<svg>` as React components. Layered assets matter — a section that looks like one image is often multiple layers (background, foreground UI mockup, overlay icon). Inspect the full DOM tree.

### 4. Foundation first
Sequential and non-negotiable: global CSS with the target's design tokens, TypeScript types for content structures, global assets (fonts, favicons). Everything after this can be parallel.

### 5. Extract how it looks AND how it behaves
Static CSS alone produces dead-feeling clones. For every element extract appearance (`getComputedStyle`) AND behaviour (what changes, what triggers it, how the transition runs). Behaviours to watch: scroll-shrink navbars, viewport-entry animations, scroll-snap, parallax, hover transitions, modals/accordions, auto-play carousels, scroll-driven tab switching, smooth-scroll libraries (Lenis, Locomotive Scroll).

### 6. Identify the interaction model before building
The single most expensive mistake: building click-based UI when the original is scroll-driven (or vice versa).
- Scroll first, slowly. Watch for self-changing elements.
- If something changes on scroll, it's scroll-driven. Extract the mechanism.
- Only THEN test for click/hover-driven interactivity.
- Document the interaction model explicitly in every spec.

### 7. Extract every state, not just the default
For tabbed/stateful content: click each tab via Chrome MCP, extract per state. For scroll-dependent elements: capture at scroll position 0 and after crossing the trigger threshold.

### 8. Spec files are the source of truth
Every component gets a spec file in `docs/research/components/` BEFORE any builder is dispatched. The builder receives the spec contents inline; the file persists as an auditable artefact.

### 9. Build must always compile
Every builder verifies `npx tsc --noEmit` before finishing. After merging worktrees, you verify `npm run build` passes. No red merges.

---

## Asset Discovery Script (Chrome MCP)

```javascript
JSON.stringify({
  images: [...document.querySelectorAll('img')].map(img => ({
    src: img.src || img.currentSrc,
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
    parentClasses: img.parentElement?.className,
    position: getComputedStyle(img).position,
    zIndex: getComputedStyle(img).zIndex
  })),
  videos: [...document.querySelectorAll('video')].map(v => ({
    src: v.src || v.querySelector('source')?.src,
    poster: v.poster,
    autoplay: v.autoplay, loop: v.loop, muted: v.muted
  })),
  backgroundImages: [...document.querySelectorAll('*')].filter(el => {
    const bg = getComputedStyle(el).backgroundImage;
    return bg && bg !== 'none';
  }).map(el => ({
    url: getComputedStyle(el).backgroundImage,
    element: el.tagName + '.' + el.className?.split(' ')[0]
  })),
  fonts: [...new Set([...document.querySelectorAll('*')].slice(0, 200).map(el => getComputedStyle(el).fontFamily))],
  favicons: [...document.querySelectorAll('link[rel*="icon"]')].map(l => ({ href: l.href, sizes: l.sizes?.toString() }))
});
```

---

## CSS Extraction Script (per section, replace `SELECTOR`)

```javascript
(function(selector) {
  const el = document.querySelector(selector);
  if (!el) return JSON.stringify({ error: 'Element not found: ' + selector });
  const props = [
    'fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','color',
    'textTransform','textDecoration','backgroundColor','background',
    'padding','paddingTop','paddingRight','paddingBottom','paddingLeft',
    'margin','marginTop','marginRight','marginBottom','marginLeft',
    'width','height','maxWidth','minWidth','maxHeight','minHeight',
    'display','flexDirection','justifyContent','alignItems','gap',
    'gridTemplateColumns','gridTemplateRows',
    'borderRadius','border','borderTop','borderBottom','borderLeft','borderRight',
    'boxShadow','overflow','overflowX','overflowY',
    'position','top','right','bottom','left','zIndex',
    'opacity','transform','transition','cursor',
    'objectFit','objectPosition','mixBlendMode','filter','backdropFilter',
    'whiteSpace','textOverflow','WebkitLineClamp'
  ];
  function extractStyles(element) {
    const cs = getComputedStyle(element);
    const styles = {};
    props.forEach(p => {
      const v = cs[p];
      if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)') styles[p] = v;
    });
    return styles;
  }
  function walk(element, depth) {
    if (depth > 4) return null;
    const children = [...element.children];
    return {
      tag: element.tagName.toLowerCase(),
      classes: element.className?.toString().split(' ').slice(0, 5).join(' '),
      text: element.childNodes.length === 1 && element.childNodes[0].nodeType === 3 ? element.textContent.trim().slice(0, 200) : null,
      styles: extractStyles(element),
      images: element.tagName === 'IMG' ? { src: element.src, alt: element.alt, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight } : null,
      childCount: children.length,
      children: children.slice(0, 20).map(c => walk(c, depth + 1)).filter(Boolean)
    };
  }
  return JSON.stringify(walk(el, 0), null, 2);
})('SELECTOR');
```

---

## Component Spec Template

Save to `docs/research/components/<component-name>.spec.md`:

```markdown
# <ComponentName> Specification

## Overview
- **Target file:** `src/components/<ComponentName>.tsx`
- **Screenshot:** `docs/design-references/<screenshot-name>.png`
- **Interaction model:** <static | click-driven | scroll-driven | time-driven>

## DOM Structure
<hierarchy>

## Computed Styles (exact values)
### Container
- display, padding, maxWidth, etc.

### <Child element>
- every relevant property

## States & Behaviors
### <Behavior name>
- **Trigger:** <exact mechanism>
- **State A (before):** CSS values
- **State B (after):** CSS values
- **Transition:** transition CSS
- **Implementation approach:** <CSS transition | IntersectionObserver | etc.>

## Assets
- Background/overlay images with paths
- Icons used from icons.tsx

## Text Content (verbatim)
<copy-pasted from live site>

## Responsive Behavior
- Desktop (1440px): <layout>
- Tablet (768px): <changes>
- Mobile (390px): <changes>
- Breakpoint: ~<N>px
```

---

## Pre-Dispatch Checklist (every builder, every time)

- [ ] Spec file written with ALL sections filled
- [ ] Every CSS value is from `getComputedStyle()`, not estimated
- [ ] Interaction model identified and documented
- [ ] All states captured (not just default)
- [ ] Scroll/hover triggers with before/after/transition recorded
- [ ] All images identified including overlays
- [ ] Responsive behavior documented
- [ ] Text content verbatim
- [ ] Builder prompt ≤150 lines

---

## What NOT to Do

- Don't build click-based tabs when the original is scroll-driven
- Don't extract only the default state of tabbed content
- Don't miss overlay/layered images
- Don't build HTML mockups for content that's actually videos / Lottie / canvas
- Don't approximate CSS classes — extract exact values
- Don't build monolithic commits
- Don't reference external docs from builder prompts — inline everything
- Don't skip asset extraction
- Don't give a builder too much scope
- Don't bundle unrelated sections into one agent
- Don't skip responsive extraction at 1440 / 768 / 390
- Don't forget smooth scroll libraries (Lenis, Locomotive)
- Don't dispatch builders without a spec file

---

## Final Completion Report Format

```
Total sections built:        N
Total components created:    N
Total spec files written:    N   (must match components)
Total assets downloaded:     N   (images / videos / SVGs / fonts)
Build status:                PASS | FAIL
Visual QA discrepancies:     <remaining diffs>
Known gaps / limitations:    <list>
```
