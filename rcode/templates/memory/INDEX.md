# Memory Bank — `{{PROJECT_NAME}}`

> The Memory Bank is your project's persistent brain. Full read/write access is on-demand: run `/rcode-memory-init` to scaffold it, `/rcode-memory-update` after work happens, `/rcode-memory-distill` to regenerate the compressed distillates, and `/rcode-memory-audit` to check it for staleness. Ambient injection also runs automatically (#958): the `session-start` hook emits its usual one-line phase-status primer from `.rcode/state.json`, then — when this directory exists and has content — a relevance-ranked selector (`rcode/bin/lib/memory-select.cjs`) scores every file here against the current phase, git branch, and recently touched files, and injects the top-scoring excerpts as `additionalContext` within a ~1500-token budget (override via `.rcode/config.yaml`'s `memory_inject_budget`). The `pre-compact` hook does the same with a smaller ~600-token budget as part of its survival context. This keeps agents grounded in relevant memory without a human having to run a `/rcode-memory-*` command first — full manual review is still the way to go deep.
>
> A `post-commit` hook runs a lightweight drift check after every commit (#958): it compares `project/stack.md` and `project/decisions.md` claims against the last 10 commits and the current working tree — removed/added dependencies, referenced files/dirs that no longer exist, and an `INDEX.md` older than 30 days. If it finds anything, it nudges you toward `/rcode-memory-update` once per session. Run `rcode-hooks drift` (or `node .rcode/bin/rcode-hooks.cjs drift` if the CLI isn't on your PATH) anytime for the full report.

**Last updated:** {{INIT_DATE}}

---

## Directory map

| Path | Purpose |
|---|---|
| [`project/stack.md`](project/stack.md) | Languages, frameworks, services in use |
| [`project/decisions.md`](project/decisions.md) | Append-only architectural decision log |
| [`project/glossary.md`](project/glossary.md) | Domain terms, internal names, acronyms |
| [`project/design-system.md`](project/design-system.md) | Visual tokens, canonical components, conventions — read by `ui-phase`, `frontend-design`, `clone-website` |
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
- **Drift check** — runs automatically on every commit; run `rcode-hooks drift` manually anytime, or after a large dependency/refactor change

## Constraints

- No secrets, tokens, or PII
- This directory is checked into git
- Distillates are generated, not hand-edited
