# Phase 11: CLI Subcommand Sweep — High-Impact #465 Items

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** Express (locked from #467)

<domain>
## Phase Boundary

Implement the next 5 highest-impact missing CLI subcommands from #465. Each is referenced by a workflow file but produces `Unknown subcommand` at runtime today. Targets:

1. `generate-claude-md` — bootstrap CLAUDE.md scaffold (used by new-project-roadmap.md)
2. `check-implementation-readiness` — verify preconditions before phase planning (self-named workflow)
3. `commit-to-subrepo` — atomic commit in a git subrepo (extends cmdCommit; used by execute-sprint.md)
4. `context refresh` — refresh `.rihal/context/` cache (used by init.md)
5. `classify-tech` — classify tech stack from keywords (used by ui-phase.md)

**Out of scope:** the remaining 9 missing subcommands (audit-uat, find-phase, learnings copy, phase-plan-index, phases, frontmatter, requirements mark-complete, todo match-phase, uat render-checkpoint). Phase 14+ if their consuming workflows get exercised.
</domain>

<decisions>
## Implementation Decisions

- **D-1:** Each subcommand is self-contained and minimal. Don't over-engineer. Match the consuming workflow's exact expectations from its grep references.
- **D-2:** Where a subcommand has natural overlap with `cmdCommit` (e.g., `commit-to-subrepo`), reuse internals rather than duplicate.
- **D-3:** All subcommands follow the existing patterns: throw on invalid input, return JSON when machine-readable, no auto-push.
- **D-4:** `generate-claude-md` writes a project-aware CLAUDE.md skeleton — pulls project name from package.json or directory name. Doesn't overwrite if file already exists (use `--force` to override).
- **D-5:** `check-implementation-readiness` returns `{ ready: bool, blockers: [...] }` after checking: PRD exists, ROADMAP has the phase, no blocking anti-patterns, dependencies satisfied. Workflow consumes this structure to gate execution.
- **D-6:** `commit-to-subrepo` accepts `--subrepo <path>` flag, runs the same conventional-commits validation as `commit`, but cd's into the subrepo before staging/committing.
- **D-7:** `context refresh` clears + rebuilds the in-project context cache from `.rihal/sources.yaml`. No-op gracefully if no sources configured.
- **D-8:** `classify-tech --keywords "<keywords>"` returns `{ stack: "react|vue|...", category: "frontend|backend|...", confidence: 0.0-1.0 }`. Uses an extension of the existing `classifyScope` taxonomy.

</decisions>

<canonical_refs>
## Canonical References

- `#467` — umbrella for Phase 11
- `#465` — original 15-subcommand audit umbrella
- `rihal/workflows/new-project-roadmap.md` — consumes generate-claude-md
- `rihal/workflows/check-implementation-readiness.md` — consumes self-named subcommand
- `rihal/workflows/execute-sprint.md` — consumes commit-to-subrepo
- `rihal/workflows/init.md` — consumes context refresh
- `rihal/workflows/ui-phase.md` — consumes classify-tech
- `rihal/bin/rihal-tools.cjs` — host file for all new cmd functions

</canonical_refs>

<deferred>
- 9 remaining #465 subcommands → Phase 14+
- Subrepo discovery logic (auto-detect vs explicit `--subrepo` flag) → defer until consumed in production
</deferred>

---

*Phase: 11-cli-subcommand-sweep-high-impact-465-items*
