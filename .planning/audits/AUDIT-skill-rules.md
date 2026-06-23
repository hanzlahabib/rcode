# AUDIT — herdr-orchestration skill doc-gap edits (Agent A)

Branch: `gap/herdr-skill-rules`. Eight commits, one per issue (final commit = this audit doc).
All edits scoped to `rcode/skills/actions/4-implementation/rcode-herdr-orchestration/`.
Incremental additions only — no existing content rewritten. Skill compliance check passes
(Output Format, Examples, triggers, Overview all present).

## Commits

### #898 — shared mid-wave scratchpad
- `rules/wave-design.md`: added `### Shared coordination doc` — every wave agent reads
  `.planning/campaign/SHARED.md` before starting and appends a one-line claim
  (`area — agent N — status`) so same-wave agents don't duplicate work.
- `SKILL.md`: added matching one-line mention in the MODE 2 summary.

### #899 — verify beyond TSC + resolvable provenance
- `rules/merge-strategy.md`: added `### Per-agent verification gate (beyond compile)`
  (task doc exists, scoped tests pass, lint clean, diff non-trivial/on-topic) and
  `### Resolvable provenance` (openable evidence ref required; gate FAILS if unresolvable;
  cites the `[object Object]` "94% confidence" false-verify failure mode).

### #900 — wave token/cost budget
- `rules/orchestrator-rhythm.md`: added cost-ceiling stop condition — estimate
  `agents × wave-duration` before dispatch, stop/ask if it exceeds the ceiling.
- `rules/wave-design.md`: added `### Log cost per wave` — one-line cost/agent-count note
  to `.planning/campaign/STATE.md` per wave.

### #901 — optional reviewer/anti-drift agent
- `rules/wave-design.md`: added `### Optional reviewer agent` — for overlapping areas or
  campaigns >3 waves, a reviewer runs after coders, reads branch diffs, flags
  conflicts/drift/duplication before merge. Kept optional; flat fan-out stays default.

### #902 — blast-radius/safety framing
- `SKILL.md`: added `## Safety — blast radius of skip-permissions agents` near Golden rules —
  scope each agent to its worktree+area; worktree isolation is the only containment under
  skip-permissions; never point an autonomous agent at a shared/important tree.

### #903 — pane status false-positive risk
- `rules/orchestrator-rhythm.md`: added `### Pane status is text-scraping` anti-pattern —
  status is inferred from pane text, a stuck agent can read `working` forever; made the
  25-min stuck-working → read pane → `C-c` + re-dispatch a rule; suggested heartbeat marker.

### #904 — cross-campaign learning
- `rules/backlog-building.md`: added `### Campaign retro (optional)` — append
  `.planning/campaign/RETRO.md` at campaign end (wave sizes, what stalled, what merged clean);
  flagged the YAGNI/over-engineering tension (Lens 16) explicitly.

### audit (this file)
- `.planning/audits/AUDIT-skill-rules.md`: this summary (force-added; `.planning/` may be gitignored).

## Not pushed
Per task instructions, no `git push` was run. Eight local commits on `gap/herdr-skill-rules`.
