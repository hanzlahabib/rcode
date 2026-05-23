# rcode — Public Roadmap

This roadmap is published so every Rihalian (and every curious observer) can see where rcode is going next. Each release below has a scope, an acceptance signal, and is tracked in the GitHub milestone linked beside it.

All dates are targets, not commitments. Scope and dates shift when reality shifts; the roadmap gets updated in the same PR that lands the change.

---

## Shipped

### v1–v3 — Methodology foundation (landed)
- Phrase-activated skills, slash-command methodology, council/chain/discuss modes.
- File-based state in `.rcode/`.
- Intent guards, plan verification, post-execute gates.
- Global agents at `~/.rcode/agents/` for customization.

### v4.0.0 — `rihal-*` → `rcode-*` rename + populated Memory Bank (current)
- Hard rename across the entire stack: `.rihal/` → `.rcode/`, `/rihal-*` → `/rcode-*`, agent and skill prefixes.
- 45 agents, 116 slash commands, 85 skills, file-based state in `.rcode/`.
- Memory Bank ships populated (rcode dogfoods its own bank under `.rcode/memory/`).
- `brain pull` working end-to-end against real sources.
- Install via `pnpm dlx @hanzlaa/rcode install`.

---

## Next

### v4.x — Per-role contribution onboarding
**Goal:** A new contributor can open a PR improving their role's skill in under 10 minutes, without reading the 5-component compliance doc first.

- In-editor templates (`rcode/skills/templates/role/`) that pre-fill the correct structure.
- `/rcode-scaffold-skill --role pm` command that generates a ready-to-fill skill.
- Automated compliance check in CI (no reviewer time spent on structural issues).

### v4.x — Progress/status UX polish
**Goal:** Running `/rcode-progress` or `/rcode-status` on any project feels instantaneous and actionable — pre-computed CLI output, surfaced insights, and an intent-based Next Up menu instead of a single suggestion.

- Pre-computed CLI output, insight block for drift, intent-tree Next Up.
- Opt-in telemetry on skill invocations so we know what's actually used.

---

## On the horizon

### v5.0 — MCP server
**Goal:** No more `/rcode-update`. The rcode brain is queried live; every Rihalian's AI always sees the latest rcode standard the moment it's published.

- Hosted on rcode infra, authenticated via rcode SSO.
- Migration path: v4.x and v5.0 run side-by-side for one release, then `brain pull` is deprecated.

### v5.x — Internal rcode registry
**Goal:** Rihalians install from an internal source, not GitHub. Faster, access-controlled, audit-trailed.

- Replaces `pnpm dlx @hanzlaa/rcode@latest` as the primary install path for rcode employees.
- GitHub release stays available for non-Rihalian contributors and for transparency.

---

## Further out (not scheduled)

These are ideas that have been raised but have no owner and no window. If you see one that matters, open an issue and make the case.

- Multi-language brain content — Arabic versions of key docs for non-English-preferring contributors.
- IDE-specific adapters beyond Claude Code / Cursor (JetBrains, Zed, VS Code native extension).
- rcode dashboard showing aggregate brain-content adoption across installed projects (opt-in).
- rcode council-as-a-service — spin up a council session from any rcode project with one command.

---

## How to influence the roadmap

- Open an issue with the `enhancement` label and a clear "why now" statement.
- Start a `/rcode-council` session in a rcode project to pressure-test the idea with multiple perspectives before filing.
- PRs that align with a milestone get priority review from the role owner (see CODEOWNERS after M3 lands).

The roadmap changes. This page is updated in the same PR that lands the change — never in isolation, never as a forward-promise without matching scope.
