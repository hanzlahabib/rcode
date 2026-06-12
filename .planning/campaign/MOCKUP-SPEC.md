# Dashboard Redesign — Target Spec (shared contract for all agents)

Target: rebuild the Majlis dashboard (`server/`) to match the reference mockup, as a
**Preact component app** with **wired interactivity**. User explicitly approved overriding
two project rules for this work: (a) "no framework" → Preact is allowed; (b) "view-only,
no write endpoints" → `POST /api/ask` and Share are allowed.

## Design tokens (exact)
- Background base: `#0F1729` (deep navy). Card surface: `#0E1626` / `#111A2E` with 1px
  border `#1E2A44`, radius 14px, subtle inner glow.
- Accents: teal `#2DD4BF`, purple `#A78BFA`, blue `#3B82F6`, amber `#F59E0B`.
- Severity: High `#F87171`, Medium `#FBBF24`, Low `#9CA3AF`.
- Text: primary `#E6EDF7`, muted `#8595AD`. Font: Inter / system sans. Mono for commands.

## Layout (12-col grid, gap 20px)
- Left sidebar (240px): logo "rcode", project switcher "Acme AI Platform", nav
  (Overview/Tasks/Decisions/Architecture/Documents/Timeline/Integrations/Settings),
  Project Health mini-card, user profile footer (avatar + name + email).
- Header: "Welcome back, {name}!", subtitle, [Ask rcode] [Share] [...] buttons,
  "Auto-synced 2m ago" status dot.
- Row 1 (3 cards): Project Progress (donut), Current Phase (stepper), Timeline (line chart).
- Row 2 (3 cards): Completed Tasks (list), In Progress (list + % badges), Blockers (severity).
- Row 3 (2 cards): Recent Decisions (list + Approved badges), Progress Timeline (horizontal phases).

## Data contract (foundation agent A2 finalizes this in DATA-CONTRACT.md)
All data comes from `server/lib/scanner.js` reading `.rcode/`. Components are pure —
they receive props, never fetch. Single endpoint `GET /api/state` returns the full shape.

## Hard rules (still apply)
- One component per file, < 300 lines each.
- No inline `style=` attributes — use CSS classes / tokens.
- Preact via local vendored ESM (no network at runtime). Build step OK.
- Each agent commits only its own files. Do not touch other agents' components.
