# Brainstorm: Dashboard ko interactive banana

**Method:** Reverse Brainstorm
**Date:** 2026-04-25
**Constraints:** View-only (no write endpoints), Node stdlib only, WSL/browser users

## Generated Ideas

### Round 1 — Bad Ideas (how to make it WORSE)

1. Show data that's always stale — never refresh, never indicate when last updated
2. Display raw file paths instead of readable names
3. Make all numbers unlabelled — no context for what each stat means
4. No way to know if the server is connected or showing stale data
5. Force full page reload to see anything new — no refresh, no polling
6. Hide blockers and sprint status at the bottom behind scrolling
7. Show all phases as equal weight — no visual distinction between done/active/blocked
8. No drill-down — every stat is a dead end
9. Make the URL/port unguessable — user can't reopen easily
10. No search or filter — scroll through 20 agents and 15 phases

### Round 2 — The Flips (good ideas)

| Bad Idea | Good Idea |
|----------|-----------|
| Always stale data | **Auto-refresh header** — show "Last updated Xs ago" + manual refresh button (hot-reload state) |
| Raw file paths | **Human-readable rendering** — parse and display friendly names |
| Unlabelled numbers | **Labelled stat cards** with icons and clear units |
| No connection indicator | **Live status badge** — green dot "Live" / grey dot "Disconnected" via SSE |
| Full page reload required | **SSE push or 10s polling** — dashboard updates in-place without reload |
| Blockers buried at bottom | **Blocker banner at top** — red alert bar is first thing you see if blockers exist |
| Phases look equal | **Phase status chips** — color-coded: green (done), amber (active), red (blocked), grey (pending) |
| No drill-down | **Expandable phase rows** — click to see tasks, agents, acceptance criteria inline |
| Port hard to remember | **Copyable URL button** — one-click copies `http://localhost:7717` to clipboard |
| No search | **Live filter input** — type to filter phases/agents/decisions (pure JS, no server calls) |

### Bonus Ideas

- **Keyboard shortcuts** — `R` to refresh, `F` to focus filter, `B` to jump to blockers
- **Dark/light toggle** — CSS class swap, persisted in `localStorage`
- **Collapsible sections** — agents, decisions, council sessions
- **"Open in editor" links** — each phase/agent card has a `vscode://` or file path link
- **Sprint countdown** — if sprint end date in state, show "3 days left in sprint"
- **Export snapshot** — download current state as JSON or copy as Markdown summary

## Synthesis

16 ideas total (10 flipped + 6 bonus). All stay within constraints:
- View-only — no write endpoints needed
- Node stdlib only — SSE, polling, CSS tricks need zero npm packages
- WSL/browser — clipboard API, localStorage, vscode:// links work in browser

## Priority Tiers

**High impact, low effort:**
1. Auto-refresh header with "last updated" timestamp + manual refresh button
2. Blocker banner at top
3. Phase status chips (color-coded)
4. Live filter input

**High impact, medium effort:**
5. SSE live push (or 10s polling fallback)
6. Expandable phase rows (drill-down)
7. Live status badge

**Nice to have:**
8. Keyboard shortcuts
9. Dark/light toggle
10. Copyable URL button
11. Export snapshot

## Next Steps

- `/rihal-plan dashboard interactive features` — implementation sprint
- `/rihal-council is SSE worth it or just use polling?` — architecture decision
