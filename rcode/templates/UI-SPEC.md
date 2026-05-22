# UI-SPEC.md — Design Contract

**Project:** {project_name}  
**Generated:** {date}  
**Status:** draft

---

## 1. Color Tokens

Define semantic color variables with hex values and WCAG AA contrast ratios.

| Token Name | Hex | WCAG AA (on white) | Usage |
|---|---|---|---|
| `color-primary` | #0066CC | ✓ Pass | Primary actions, links |
| `color-success` | #00A651 | ✓ Pass | Success states, confirmations |
| `color-warning` | #F59E0B | ✓ Pass | Warnings, attention |
| `color-error` | #DC2626 | ✓ Pass | Errors, destructive actions |
| `color-neutral-900` | #111827 | ✓ Pass | Text, headings |
| `color-neutral-500` | #6B7280 | ✓ Pass | Secondary text |
| `color-neutral-100` | #F3F4F6 | ✓ Pass | Backgrounds, borders |

---

## 2. Typography

| Scale | Font Family | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| H1 | {font_family} | 32px | Bold (700) | 1.2 | Page titles |
| H2 | {font_family} | 28px | Bold (700) | 1.2 | Section titles |
| H3 | {font_family} | 24px | Semi-bold (600) | 1.3 | Subsections |
| Body | {font_family} | 16px | Regular (400) | 1.5 | Body text |
| Small | {font_family} | 14px | Regular (400) | 1.4 | Secondary text |
| Caption | {font_family} | 12px | Regular (400) | 1.4 | Labels, hints |

---

## 3. Component Inventory

### Buttons

| Component | Variants | States | Notes |
|---|---|---|---|
| Button | Primary, Secondary, Tertiary | Default, Hover, Active, Disabled, Loading | Icon-left, icon-right |
| IconButton | — | Default, Hover, Active, Disabled | 24px, 32px, 40px sizes |

### Forms

| Component | Properties | Accessibility |
|---|---|---|
| Input | Text, Email, Password, Number | Label required, error text, aria-describedby |
| Textarea | — | Label required, char counter |
| Select | Single, Multiple | Label required, screen reader support |
| Checkbox | — | Label adjacent, aria-label if icon-only |
| Radio | — | Grouped with fieldset, aria-label if icon-only |

### Layout

| Component | Usage | Notes |
|---|---|---|
| Container | Max-width wrapper | 1200px max-width, responsive padding |
| Grid | 12-column layout | Mobile: 4 cols, Tablet: 8 cols, Desktop: 12 cols |
| Stack | Flex container | Vertical or horizontal spacing (4px, 8px, 16px, 24px) |

---

## 4. Interaction States

All interactive elements must support:

- **Default** — Normal state, no interaction
- **Hover** — Cursor over element (desktop)
- **Focus** — Keyboard focus, visible focus ring (2px outline, color-primary)
- **Active** — Pressed or selected state
- **Disabled** — Non-interactive, opacity 50%, cursor not-allowed
- **Loading** — Spinner or progress indicator, disabled state

---

## 5. Accessibility (WCAG 2.1 AA)

**Color Contrast:**
- All text must meet WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text
- Do not rely on color alone to convey information

**Keyboard Navigation:**
- All interactive elements must be focusable via Tab key
- Focus order must be logical (top-to-bottom, left-to-right)
- Escape key closes modals and dropdowns

**Screen Readers:**
- Buttons must have `aria-label` if icon-only
- Form inputs must have associated `<label>` or `aria-label`
- Links must have descriptive text (not "Click here")
- Modal dialogs must use `role="dialog"` and `aria-labelledby`

**Semantic HTML:**
- Use `<button>` for buttons, `<a>` for links
- Use `<input type="...">` for form fields with proper types
- Use heading hierarchy: `<h1>` → `<h2>` → `<h3>` (never skip levels)

---

## 6. Responsive Breakpoints

| Device | Width | Columns | Font Scale | Note |
|---|---|---|---|---|
| Mobile | 320px–639px | 4 | 14px base | Stack all, single column |
| Tablet | 640px–1023px | 8 | 16px base | 2-column layouts |
| Desktop | 1024px+ | 12 | 16px base | 3-column layouts, full UI |

**Touch Targets:** Minimum 44×44px on mobile, 32×32px on desktop.

---

## 7. Implementation Notes

- **Framework:** {framework} (React, Vue, etc.)
- **CSS Approach:** {css_approach} (Tailwind, CSS Modules, Styled Components, etc.)
- **Icon Library:** {icon_library}
- **Package Management:** {package_manager} (npm, pnpm, yarn)
- **Design Tool:** {design_tool} (Figma, etc.)

---

**Approval Status:** Pending  
**Last Updated:** {date}
