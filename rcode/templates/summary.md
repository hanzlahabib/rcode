# SUMMARY.md Template

Each plan or sprint task produces a SUMMARY.md when it completes. The summary is the unit of work's lasting record — what was done, why, what remains, what other work it affects.

## Frontmatter

```yaml
---
phase: NN
plan: NN.M             # if applicable
sprint: N              # if applicable
story_id: NN.M         # if dev-story produced this
generated: <ISO date>
status: complete | partial | blocked
verified: false        # flips to true after /rcode:verify-work passes
---
```

## Sections

### One-liner

A single line describing what was accomplished. Goes into `/rcode:progress` recent-work bullets, council recaps, milestone summaries. Be specific:

> ❌ "Added some dashboard improvements"
> ✅ "Wired live engagement metrics to dashboard top-3 tweets card; updates every 30s via SSE"

### Outcomes

What changed as a result of this work, observable from outside:

- ...

### Files touched

```
src/dashboard/Card.tsx        new
src/dashboard/index.tsx       modified — added engagement subscription
src/lib/sse.ts                new — SSE client wrapper
test/dashboard.test.ts        new — 4 tests
```

### Decisions

Decisions made during execution that aren't already in `state.decisions[]`:

- **<decision>**: chose A over B because <one-line reason>. Tradeoff: <what we gave up>.

### Issues encountered

Problems hit during execution and how they were resolved:

- **<problem>**: <one-line description>. Resolved by <action>. Time spent: <approx>.

If a problem was NOT resolved, it goes here AND becomes a follow-up filed below.

### Follow-ups

GH issues filed (or to file) for work that this story surfaced but didn't ship:

- #N — <title>
- (to file) — <description>

### Verification

How a verifier confirms this story is actually done:

- Run `<command>`, expect `<output>`
- Open `<UI element>`, click `<button>`, observe `<state change>`

This block feeds into UAT.md when the phase completes.

### Status

- **complete** — all acceptance criteria green, follow-ups filed.
- **partial** — some AC green, others deferred. Document which AC are open.
- **blocked** — couldn't proceed. Owner of unblock + ETA.
