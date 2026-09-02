# Memory Bank — `rcode`

> The Memory Bank is your project's persistent brain. Full read/write access is on-demand: run `/rcode-memory-init` to scaffold it, `/rcode-memory-update` after work happens, `/rcode-memory-distill` to regenerate the compressed distillates, and `/rcode-memory-audit` to check it for staleness. Ambient injection also runs automatically (#958): the `session-start` hook emits its usual one-line phase-status primer from `.rcode/state.json`, then — when this directory exists and has content — a relevance-ranked selector (`rcode/bin/lib/memory-select.cjs`) scores every file here against the current phase, git branch, and recently touched files, and injects the top-scoring excerpts as `additionalContext` within a ~1500-token budget (override via `.rcode/config.yaml`'s `memory_inject_budget`). The `pre-compact` hook does the same with a smaller ~600-token budget as part of its survival context. This keeps agents grounded in relevant memory without a human having to run a `/rcode-memory-*` command first — full manual review is still the way to go deep.

**Last updated:** 2026-09-03

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

- **Ambient session-start injection** (~1.5K tokens, `memory_inject_budget`) — automatic, relevance-ranked, no command needed
- **Ambient pre-compact injection** (~600 tokens) — automatic survival context alongside `HANDOFF.json`
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
