# Memory Bank — `rcode`

> The Memory Bank is your project's persistent brain. It is loaded on demand, not automatically: run `/rcode-memory-init` to scaffold it, `/rcode-memory-update` after work happens, `/rcode-memory-distill` to regenerate the compressed distillates, and `/rcode-memory-audit` to check it for staleness. The `session-start` hook only emits a one-line phase-status primer from `.rcode/state.json` — it does not read this directory. Survives session resets, team changes, and AI memory limits, but only for agents that are told to open it.

**Last updated:** 2026-04-26

---

## Directory map

| Path | Purpose |
|---|---|
| [`project/stack.md`](project/stack.md) | Languages, frameworks, services in use |
| [`project/decisions.md`](project/decisions.md) | Append-only architectural decision log |
| [`project/glossary.md`](project/glossary.md) | Domain terms, internal names, acronyms |
| [`people/stakeholders.md`](people/stakeholders.md) | External contacts, decision authority, comms |
| [`people/team.md`](people/team.md) | Internal team, ownership, availability |
| [`milestones/current.md`](milestones/current.md) | Active milestone — goal, phase, blockers |
| [`milestones/archive/`](milestones/archive/) | Completed milestones, one file per |
| [`incidents/known-issues.md`](incidents/known-issues.md) | Active bugs and workarounds |
| [`incidents/post-mortems/`](incidents/post-mortems/) | Resolved incidents — root cause, fix, lessons |
| [`change-records/`](change-records/) | Change records — `YYYYMMDD-NNN.md` format |
| [`distillates/`](distillates/) | Generated, lossless compression for fast LLM loading |

---

## Token budget guide

- **`INDEX.md` only** (~500 tokens) — quick orientation
- **`INDEX.md` + `distillates/project.distillate.md`** (~5K tokens) — standard session start
- **Full `project/` directory** (~10–15K tokens) — deep planning
- **Full Memory Bank** (~30–50K tokens) — major refactor or onboarding

## Update cadence

- **`project/decisions.md`** — append every architectural choice as it's made
- **`milestones/current.md`** — update on milestone phase transitions
- **`incidents/known-issues.md`** — add when a workaround ships, remove when a real fix lands
- **`distillates/`** — regenerate via `/rcode-memory-distill` when source files change
- **Whole bank** — audit via `/rcode-memory-audit` at every milestone close

## Constraints

- No secrets, tokens, or PII
- This directory is checked into git
- Distillates are generated, not hand-edited
