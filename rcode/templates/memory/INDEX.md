# Memory Bank — `{{PROJECT_NAME}}`

> The Memory Bank is your project's persistent brain. It is loaded on demand, not automatically: run `/rcode-memory-init` to scaffold it, `/rcode-memory-update` after work happens, `/rcode-memory-distill` to regenerate the compressed distillates, and `/rcode-memory-audit` to check it for staleness. The `session-start` hook only emits a one-line phase-status primer from `.rcode/state.json` — it does not read this directory. Survives session resets, team changes, and AI memory limits, but only for agents that are told to open it.
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
