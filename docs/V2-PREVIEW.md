# V2 Preview

`rihal/v2/` is the next-generation Rihal Code methodology — currently in active development and **not yet the default path**.

## Status

- 36 agents, 67 workflows, 69 commands (much larger than v1)
- Not wired into the CLI — `npx rihal-code` commands still route to v1
- Latest commits on the `v2-prototype` branch

## Should you use it?

- **Using Rihal Code to ship a real project?** → No. Stick with v1 (see [`TIERS.md`](./TIERS.md)).
- **Exploring / contributing?** → Open `rihal/v2/` and browse. Expect rapid change.

## What v2 changes

Rough direction (subject to change):
- File-shipping install with more multi-IDE support
- Parallel subagents and cross-talk
- Question classification for smarter routing
- Hierarchical numeric IDs for phases/plans/tasks/milestones
- Lazy-loaded agent rules (smaller context per invocation)

## How to find current state

```bash
git log --oneline -- rihal/v2 | head -20
```

The top of that log reflects the most recent v2 work.

## Migration plan

Not yet finalized. Until v2 is wired into the CLI and documented end-to-end here, treat it as preview-only.

---

**TL;DR:** Ignore `rihal/v2/` unless you're actively prototyping the next version. Everything a real user needs today lives in v1 — see [`TIERS.md`](./TIERS.md).
