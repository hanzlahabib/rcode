# rcode — Public Roadmap

This roadmap is published so every Rihalian (and every curious observer) can see where rcode is going next. Each release below has a scope, an acceptance signal, and is tracked in the GitHub milestone linked beside it.

All dates are targets, not commitments. Scope and dates shift when reality shifts; the roadmap gets updated in the same PR that lands the change.

---

## Shipped

### v1 — Methodology foundation (landed)
- 35+ agents with cultural identity and hard scope boundaries.
- 69 slash commands across research, planning, execution, verification, recovery.
- File-based state in `.rcode/`.
- Intent guards, plan verification, post-execute gates.
- Global agents at `~/.rcode/agents/` for customization.

---

## Current milestone

### v2.0 — rcode Brain in a Box
[Milestone #4](https://github.com/hanzlahabib/rihal-code/milestone/4) · active

**Goal:** Every Rihalian who installs rcode gets an AI assistant that already knows how rcode builds — PR standards, commit conventions, architecture patterns, PRD shape, sprint cadence.

| Phase | What it delivers | Issue |
|-------|------------------|-------|
| M1 — Repositioning | README + `docs/what-is-rcode.md` tell the new story | [#157](https://github.com/hanzlahabib/rihal-code/issues/157) |
| M2 — Brain ingestion | `rcode/brain/` + `rcode-tools brain pull` + install hook | [#158](https://github.com/hanzlahabib/rihal-code/issues/158) |
| M2.5 — Elegant /progress | CLI does the thinking, workflow does the rendering, intent-based Next Up | [#159](https://github.com/hanzlahabib/rihal-code/issues/159) |
| M3 — Role ownership | CODEOWNERS per role folder + CONTRIBUTING.md per-role guide | [#160](https://github.com/hanzlahabib/rihal-code/issues/160) |
| M4 — Release pipeline | Semver tags, `rcode:update v1.3.0` pinning, GitHub release bundle | [#161](https://github.com/hanzlahabib/rihal-code/issues/161) |
| M5 — Real rcode content | Fill `sources.yaml` with actual rcode GitHub + docs URLs | [#162](https://github.com/hanzlahabib/rihal-code/issues/162) |

### Kill criteria for v2.0
Binary — if either fires, we cut scope or pivot:

- After M5 ships, fewer than 3 role-owners open a single PR against their slice within 60 days → per-role contribution model has failed. Revisit.
- `brain pull` against the real rcode docs repo takes > 10s on fresh install → static model can't scale. Jump to MCP (v3.0) early.

---

## Next

### v2.1 — Per-role contribution onboarding
**Goal:** A new Rihalian can open a PR improving their role's skill in under 10 minutes, without reading the 5-component compliance doc first.

- In-editor templates (`rcode/skills/templates/role/`) that pre-fill the correct structure.
- `/rcode:scaffold-skill --role pm` command that generates a ready-to-fill skill.
- Automated compliance check in CI (no reviewer time spent on structural issues).

### v2.5 — Progress/status UX polish
**Goal:** Running `/rcode:progress` or `/rcode:status` on any project feels instantaneous and actionable — pre-computed CLI output, surfaced insights, and an intent-based Next Up menu instead of a single suggestion.

- Bundled into v2.0 as M2.5 (issue [#159](https://github.com/hanzlahabib/rihal-code/issues/159)) — listed here for the public roadmap view.
- Pre-computed CLI output, insight block for drift, intent-tree Next Up.
- Opt-in telemetry on skill invocations so we know what's actually used.

---

## On the horizon

### v3.0 — MCP server
**Goal:** No more `/rcode:update`. The rcode brain is queried live; every Rihalian's AI always sees the latest rcode standard the moment it's published.

- Hosted on rcode infra, authenticated via rcode SSO.
- Migration path: v2.0 and v3.0 run side-by-side for one release, then `brain pull` is deprecated.
- Design doc tracked in [#163](https://github.com/hanzlahabib/rihal-code/issues/163).

### v3.x — Internal rcode registry
**Goal:** Rihalians install from an internal source, not GitHub. Faster, access-controlled, audit-trailed.

- Replaces `npx @hanzlaa/rcode@latest` as the primary install path for rcode employees.
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
- Start a `/rcode:council` session in a rcode project to pressure-test the idea with multiple perspectives before filing.
- PRs that align with a milestone get priority review from the role owner (see CODEOWNERS after M3 lands).

The roadmap changes. This page is updated in the same PR that lands the change — never in isolation, never as a forward-promise without matching scope.
