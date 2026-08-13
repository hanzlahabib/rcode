# Workflow: rcode-ui-phase

<purpose>
Produce two artifacts before any UI code gets written: UI-SPEC.md (formalized design contract — color tokens, typography, component inventory, interaction states, accessibility requirements) and WIREFRAMES.md (per-role screen inventory — what exists, who sees it, loading/empty/error states for each). Grounds design choices in `rcode/references/design-library/` (vendored style/palette/typography/UX-rules data — see that directory's README) instead of an agent inventing tokens from nothing. Detects frontend keywords (React, Next.js, Vue, Tailwind, CSS, UI) and suggests this workflow early if UI-SPEC.md is absent.
</purpose>


## Step 0a — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-ui-phase <argument-here>
```

**Examples:**
```
/rcode-ui-phase example 1
/rcode-ui-phase example 2
```

STOP — do not proceed.

<available_agent_types>
- `rcode-ux-designer` — UI specification generator
</available_agent_types>

## Step 0b — Initialize

```bash
INIT=$(node .rcode/bin/rcode-tools.cjs init ui-phase "$ARGUMENTS" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

If `INIT` is empty or `INIT.ok` is false, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Parse:
- `flags.existing_ui` — path to existing design system or Figma export
- `flags.design_system` — path to design tokens file
- `ui_spec_path` — `.rcode/UI-SPEC.md` (output location)
- `wireframes_path` — `.rcode/WIREFRAMES.md` (output location)

## Step 1 — Detect Existing UI Assets

If `flags.existing_ui` or `flags.design_system` provided:
```bash
EXISTING=$(node .rcode/bin/rcode-tools.cjs find-files --type=design-tokens)
```

Load existing design system, extract into `EXISTING_DESIGN_SYSTEM_DATA` (a text block passed verbatim into Step 2's prompt):
- Color palette (hex, variable names)
- Typography scales (font family, sizes, weights, line heights)
- Component list (buttons, forms, layouts, modals, etc.)
- Interaction patterns (hover, focus, active, disabled states)

If `$EXISTING` is empty or extraction finds nothing usable, treat this the
same as "no existing system found" and fall through to Step 1b — don't leave
`EXISTING_DESIGN_SYSTEM_DATA` half-populated.

If an existing design system was found and `EXISTING_DESIGN_SYSTEM_DATA` is populated, skip Step 1b (don't override what's already decided) and go straight to Step 2.

## Step 1b — Ground the design in the reference library (no existing system found)

Don't let the agent invent a palette/style from nothing. If PROJECT.md and
ROADMAP.md are both missing, stop here and say so: "No PROJECT.md/ROADMAP.md
found — run `/rcode-new-project-research` or `/rcode-new-project-roadmap`
first so there's a project category to ground the design in." Otherwise look up:

1. **Category match** — grep the project's category (from PROJECT.md/ROADMAP.md — e.g. "B2B SaaS Enterprise", "Analytics Dashboard", "Fintech (Banking)") against `rcode/references/design-library/ui-reasoning.csv`'s `UI_Category` column. This returns a recommended style/color-mood/typography-mood and explicit anti-patterns to avoid — read the row, don't guess a category if none matches closely; fall back to the closest match and say so. Capture the result as `CATEGORY_MATCH`.
2. **Style detail** — take the recommended style name from step 1 and look it up in `styles.csv` for concrete hex values, effects, accessibility rating, and an implementation checklist. Capture as `STYLE_DETAIL`.
3. **UX rules** — grep `ux-guidelines.csv` for the categories relevant to this project's screens (Navigation, Forms, etc.) for concrete do/don't rules with code examples. Capture as `UX_RULES`.

`CATEGORY_MATCH` + `STYLE_DETAIL` + `UX_RULES` together are what Step 2's
prompt calls `DESIGN_LOOKUP_RESULT` below — assemble them into one text block
before spawning the agent.

## Step 2 — Spawn UI Designer

Spawn `rcode-ux-designer` subagent:

```
Task tool call:
  subagent_type: "rcode-ux-designer"
  description: "Generate UI-SPEC.md and WIREFRAMES.md"
  prompt: |
    Ground every choice below in {EXISTING_DESIGN_SYSTEM_DATA if Step 1 found one, else DESIGN_LOOKUP_RESULT from Step 1b} —
    do not invent a palette/style from nothing when reference data or an existing system exists.

    Write UI-SPEC.md with:
    1. **Design Direction** — which style/category this follows (from the reference library lookup) and why, one paragraph
    2. **Color Tokens** — semantic variable names, hex values, accessibility contrast ratios
    3. **Typography** — font family, scales (12px, 14px, 16px, 18px, 20px, 24px, etc.), weights, line heights
    4. **Component Inventory** — list of UI components with property variants (size, color, state, disabled)
    5. **Interaction States** — hover, focus, active, disabled, loading for interactive elements
    6. **Accessibility** — WCAG 2.1 AA compliance checklist, color contrast requirements, keyboard navigation rules
    7. **Responsive Breakpoints** — mobile, tablet, desktop breakpoints and stacking rules

    Write to: {ui_spec_path}
```

## Step 2b — Spawn Wireframes (per-role screen inventory)

Read REQUIREMENTS.md/PROJECT.md for the project's user roles (if any) and the
IA decision — `roadmapper-playbook.md`'s Information Architecture step (Workflow
step 3b) says this is persisted as either a standalone `.planning/IA.md` or a
`## Information Architecture` section in ROADMAP.md, so check both locations,
not just ROADMAP.md. If neither has an IA decision, this step cannot produce a
real result — stop and say so: "No Information Architecture decision found in
ROADMAP.md or IA.md — the roadmapper needs to produce one first
(`/rcode-new-project-roadmap` for a brand-new project, `/rcode-new-milestone`
to regenerate the roadmap for an existing one — both invoke rcode-roadmapper,
which owns the IA step)."

Spawn `rcode-ux-designer` subagent (same agent, second artifact):

```
Task tool call:
  subagent_type: "rcode-ux-designer"
  description: "Generate WIREFRAMES.md"
  prompt: |
    For each top-level IA section and each screen it contains, write one entry:

    ### {Screen name} — {route/path}
    **Roles that see it:** {role list, or "all authenticated users"}
    **Purpose:** {one line — what the user accomplishes here}
    **Layout:** {ASCII or textual wireframe — header/nav placement, primary content
    area, key actions, not a pixel-perfect mockup}
    **Required states** (do not omit any that apply):
    - Loading: {what renders while data is fetching}
    - Empty: {what renders when there's no data yet — never a blank screen}
    - Error: {what renders on fetch/action failure — never a silent failure}
    - Success/populated: {the normal case}
    **Primary actions:** {buttons/links a user takes from here, and where they go}

    Cover EVERY screen implied by the roadmap's phases, not just Phase 1's.
    A screen with no role that can see it, or with only a "populated" state and
    no loading/empty/error state defined, is an incomplete entry — fix it before
    writing, don't ship the gap.

    Write to: {wireframes_path}
```

## Step 3 — Store Reference in State

Update state with both artifact locations:
```bash
node .rcode/bin/rcode-tools.cjs state set --ui-spec-path ".rcode/UI-SPEC.md"
node .rcode/bin/rcode-tools.cjs state set --wireframes-path ".rcode/WIREFRAMES.md"
```

Print:
```
✓ UI-SPEC.md generated: {ui_spec_path}
✓ WIREFRAMES.md generated: {wireframes_path}

UI-SPEC.md contains:
  • Design Direction (grounded in design-library lookup, not invented)
  • Color Tokens
  • Typography System
  • Component Inventory
  • Interaction States
  • Accessibility Checklist
  • Responsive Breakpoints

WIREFRAMES.md contains:
  • Every screen from the roadmap's IA, with role visibility
  • Loading/empty/error/success state for each screen — no screen ships
    without all four defined

These specs guide component development, design consistency, and give
sprint-checker something concrete to verify state-completeness against.
```

## Step 4 — Modify plan.md Detection (one-time setup, not per-invocation)

This step is setup documentation for `plan.md`, not part of `/rcode-ui-phase`'s
own run sequence — it does not re-run every time `/rcode-ui-phase` is
invoked. Before applying it, check whether `plan.md` already has this
detection step (grep for "ui_safety_gate" or "Detect frontend keywords");
skip if present.

In plan.md workflow, add Step 0.6 — **Detect frontend keywords and suggest UI safety gate**

```bash
FRONTEND_KEYWORDS=$(node .rcode/bin/rcode-tools.cjs classify-tech --keywords "react,next.js,vue,tailwind,css,ui,component,design,frontend" "$ARGUMENTS")
```

**If `FRONTEND_KEYWORDS.has_frontend == true` AND UI-SPEC.md missing:**

Check `config.yaml` for `workflow.ui_safety_gate`:
```yaml
workflow:
  ui_safety_gate: true  # default true
```

If enabled, print:
```
⚠ Frontend project detected. Before planning, create a design contract:

/rcode-ui-phase

This ensures consistent UI patterns, accessibility, and design tokens across all components.
```

Offer via AskUserQuestion:
```
header: "UI Safety Gate"
question: "Should we define UI-SPEC.md before planning component development?"
options:
  - "Yes, run /rcode-ui-phase first"
  - "Skip for now, continue planning"
```

If "Yes, run /rcode-ui-phase first":
```
Run /rcode-ui-phase, then return to /rcode-plan
```

## Success Criteria

- UI-SPEC.md created with all 7 sections, design direction grounded in `design-library/` lookup (or an existing design system), not invented
- Color tokens documented with contrast ratios
- Component inventory complete with variants
- Accessibility checklist included
- WIREFRAMES.md created covering every screen implied by the roadmap's IA, each with role visibility and all four states (loading/empty/error/success) defined
- State updated with both UI-SPEC.md and WIREFRAMES.md paths

## On Error

- If subagent fails: provide template UI-SPEC.md
- If frontend detection fails: skip suggestion
- If config.yaml missing ui_safety_gate: default to true (suggest)
- If no IA decision exists in ROADMAP.md or IA.md yet: WIREFRAMES.md cannot be produced meaningfully — stop Step 2b and say so rather than writing a screen list with no basis

## Next Up

- `/rcode-plan` — plan the UI implementation phase against the spec
- `/rcode-execute` — implement UI once the spec is approved
