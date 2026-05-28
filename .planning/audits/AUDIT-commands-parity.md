# AUDIT — Commands Parity (rcode ↔ rihal)

**Date:** 2026-05-28
**Branch:** audit-commands-parity
**Auditor:** automated (Claude)

## Verdict: TASK PREMISE INVALID — NO PARALLEL NAMESPACE EXISTS

The brief assumed `rcode/commands/*.md` and `rihal/commands/*.md` are parallel source directories that should mirror each other. **This is false in the current repo.**

### Evidence

1. `rcode/commands/` exists with **116 files** (unprefixed: `add-phase.md`, `audit.md`, etc.).
2. `rihal/commands/` **does not exist**. There is no `rihal/` directory anywhere in the source tree (verified via `find . -type d -iname "rihal*" -not -path "*/node_modules/*"` — zero hits outside `.planning/` and `audit/` historical reports).
3. No source files match `rihal-*.md` anywhere in the tree.
4. Commit **`4da7c1e refactor!: rename rihal → rcode across entire codebase — v4.0 prep`** (Fri May 22 2026) is the explicit, breaking, one-way rename:
   - `rihal/` → `rcode/`
   - `/rihal-*` slash commands → `/rcode-*`
   - 45 agents, 85 skills renamed
   - Marked `BREAKING CHANGE` in commit body
5. The `rcode-` and `rihal-` slash-command prefixes the user sees at session start come from **install-time generation**, not parallel source dirs:
   - `cli/install.js:1277` writes `.claude/commands/rcode-{name}.md` from `rcode/commands/{name}.md`.
   - The `rihal-*` slash commands present in this session's available-skills list are installed from the user's **global** `~/.claude/` (a prior install of the pre-v4 namespace), not from this repo.

### What "parity" would actually mean

If the goal is to **restore** a dual-namespace install (rcode + rihal as siblings, both supported), that is a **product/architecture decision** — not a mechanical audit fix. It requires:
- Decision: is rihal a deprecated alias, a full second namespace, or removed-for-good?
- If alias: install-time generation should emit both `rcode-{name}.md` and `rihal-{name}.md` from a single source.
- If full second namespace: needs sustained maintenance burden (every command edit doubled).
- If removed-for-good: the available-skills shim from `~/.claude/` should be cleaned up at user level, not in this repo.

This is a P1 product question for the maintainer, not a parity-fix campaign.

## Sections (per brief) — N/A

- **missing-in-rcode:** N/A — no rihal source to diff against.
- **missing-in-rihal:** all 116 rcode commands, trivially — because the directory doesn't exist.
- **broken-targets:** not audited — Phase 1 step 2 (verify each command's dispatch target) was not performed because the parity premise collapsed at step 1. A standalone "do all 116 rcode commands dispatch to real skills/workflows/agents" audit is a valid follow-up but is **not what was asked**, and per project rules (`CLAUDE.md` — "No Theoretical Suggestions") I will not silently expand scope.
- **contamination:** N/A.
- **behavioral-drift:** N/A.

## Phase 2 fixes applied

**None.** Every fix category in the brief depends on the two-namespace premise.

## Phase 3

This document is the only artifact committed.

## Recommended next steps (for the maintainer, not this agent)

1. Confirm: is the rihal namespace deprecated, aliased, or to be revived? Close the question before any parity work.
2. If a "verify all rcode commands dispatch to real targets" audit is wanted, request it as a fresh task — it's a different shape (single-namespace integrity check, not parity diff).
3. The global `~/.claude/` install of pre-v4 `rihal-*` commands on the maintainer's machine is a stale install — `cli/uninstall.js` or a manual purge would clean it up.
