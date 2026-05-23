# V2 Preview — Historical Note

> **Status as of v1.0-beta:** v1 and v2 have been merged. This document is preserved for historical context only.

## What happened

rcode originally had two parallel systems:

- **v1** — Phrase-activated skills (e.g. "create a PRD" → rcode-create-prd). Conversational AI helpers.
- **v2** — Slash-command methodology (`/rcode-council`, `/rcode-plan`, `/rcode-execute`). Structured plan-execute-verify harness with council + karpathy-audit.

They lived side-by-side, with separate installers (`cli/init.js` vs `cli/install-v2.js`) and duplicate concepts (agents, workflows, team.yaml in both trees).

## v1.0-beta merge

In v1.0-beta we unified both into a single landscape under `rcode/`:

- `rcode/agents/` — 36 agents (from v2, replaces v1's 14)
- `rcode/commands/` — 70 slash commands (from v2)
- `rcode/workflows/` — 68 workflows (from v2)
- `rcode/skills/` — 22 action skills + 17 agent skills (preserved from v1)
- `rcode/references/`, `rcode/bin/`, `rcode/modules/`, `rcode/team.yaml` — v2 infrastructure

One install command (`pnpm dlx @hanzlaa/rcode install`) ships everything.

## Why keep this note?

Until v1.0 ships, downstream users and contributors may still have v2-prototype branches, v2-style install instructions, or references to `rcode/v2/` in cloned repos. This document explains where that came from.

## Rollback / Reference

If you need to see the pre-merge state, the backup tag `backup/pre-v1v2-merge` exists locally on the maintainer's machine. No v2 branch exists on origin after the unification.

---

For the current canonical structure, see [`TIERS.md`](./TIERS.md).
