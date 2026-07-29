# Execution Summary

**Phase:** 45 — Audit remediation: fix findings from 6-lens critical audit (issues #981-#1001)
**Sprint:** 45.3 — hand-maintained-list-drift and agent-sprawl-cleanup fixes (#987, #990, #991, #992)
**Completed:** 2026-07-30
**Executor:** claude-sonnet-5

## What Was Built

Four independent, unrelated repo-maintenance fixes from `AUDIT-scope-consistency.md`
and `AUDIT-agent-sprawl.md`:

1. **CLAUDE.md scope-list sync (#987)** — CLAUDE.md's `Scopes allowed:` line was a
   third, untested, hand-maintained copy of AGENTS.md's list and had drifted 15
   scopes stale. Added the missing `init`, `agent-rules`, `cursor`, `i18n`, `phase`,
   `scaffold`, `campaign`, `ship`, `getting-started`, `do-router`, `milestone-health`,
   `modules`, `project-types`, `roadmapper`, `token` scopes, appended at the end of
   CLAUDE.md's existing list, before the "plus numeric phase/sprint scopes" clause.
   This was a `checkpoint:human-verify` task — the exact diff was presented and the
   user replied "approved" before it was committed.

2. **docs/skills-catalog.md regeneration (#990)** — the committed catalogue was
   stale at 80 skills across 3 buckets; nothing had re-run the generator since
   skills were added. Ran `node scripts/build-skills-catalog.cjs`, which
   overwrote the file in place from the live `rcode/skills/` tree — now 96 skills
   across 5 buckets.

3. **rihal-\* → rcode-\* agent-scan gap (#991)** — `findLegacyRihalArtifacts()` in
   `cli/lib/namespace-migrate.cjs` only scanned `.claude/skills/` and
   `.claude/commands/`, never `.claude/agents/`, so `rihal-*.md` agent twins were
   invisible to `rcode doctor`'s duplication report. Added a third scan block for
   `.claude/agents/`, matching each `rihal-*.md` file against its `rcode-*.md`
   twin, returning a new `agents` array alongside `skills`/`commands` (additive —
   existing `{ skills, commands }` destructuring callers are unaffected).
   `cli/uninstall.js`'s agent-cleanup pass (`buildPlan`) only filtered
   `.claude/agents/` entries by `name.startsWith('rcode-')`; it now also collects
   `rihal-*.md` entries into the same `plan.claude.agents` removal list, closing
   the gap that left 45 stale `rihal-*.md` agent files un-removable by
   `rcode uninstall` on this machine.

4. **majlis-council false real-dispatch claim (#992)** — `references.md`'s
   "Dispatch modes" section claimed "Real mode (default)" Task-tool subagent
   dispatch was available, directly contradicting `SKILL.md`'s own capability
   table (all 5 convene sub-skills marked "planned — not yet implemented").
   Rewrote the section to state plainly that real dispatch isn't implemented in
   this skill yet, and points users at the separate, confirmed-live
   `/rcode-council` slash command (`rcode/workflows/council.md`) for genuine
   parallel Task-tool dispatch. Fast mode (single-Claude roleplay) is now
   correctly described as the only mode this skill currently supports.

## Stories Completed

| ID | Title | Type | Status |
|----|-------|------|--------|
| 45.3.1 | Sync CLAUDE.md's scope list with AGENTS.md's | checkpoint:human-verify | done — approved |
| 45.3.2 | Regenerate docs/skills-catalog.md from the live skill tree | auto | done |
| 45.3.3 | Extend rihal-* cleanup tooling to scan .claude/agents/ | auto | done |
| 45.3.4 | Correct majlis-council references.md's false dispatch claim | auto | done |

## Files Modified

| File | Change |
|------|--------|
| `CLAUDE.md` | `Scopes allowed:` line — 15 scopes added |
| `docs/skills-catalog.md` | Fully regenerated (machine-generated, not hand-edited) — 80/3 → 96/5 |
| `cli/lib/namespace-migrate.cjs` | `findLegacyRihalArtifacts` extended with an `agents` scan block; return value gained an `agents` key |
| `cli/uninstall.js` | Agent-cleanup filter in `buildPlan` now also matches `rihal-*.md` twins into `plan.claude.agents` |
| `rcode/skills/agents/majlis-council/references.md` | "Dispatch modes" section corrected to match SKILL.md's honest capability table and point to `/rcode-council` |

## Deviations from Plan

None — plan executed exactly as written. One scope note worth recording: the
sprint's task 45.3.3 action text asserted that `migrateNamespace()` in
`namespace-migrate.cjs` "already consumes whatever `findLegacyRihalArtifacts`
returns," implying the new `agents` array would automatically be swept up by
the destructive migrate path. On inspection, `migrateNamespace()` actually
hardcodes separate `removeAll()` calls for `.skills` and `.commands` only —
it does not generically consume every key `findLegacyRihalArtifacts` returns,
and `scanNamespaceDuplication()`'s counts (`legacySkillCount`,
`legacyCommandCount`) don't include agents either. This sprint's task scope
and verify gate were explicitly limited to the scan layer (`findLegacyRihalArtifacts`
returning an `agents` key, plus `cli/uninstall.js`'s agent-cleanup pass) — not
to wiring `migrateNamespace`/`scanNamespaceDuplication` to act on it — so no
change was made there. Flagging as a follow-on gap: `rcode doctor`'s duplication
report and `rcode migrate-namespace`/`rcode update` still won't count or remove
stale `rihal-*.md` agents; only `rcode uninstall` (via `cli/uninstall.js`) does,
after this sprint's change.

## Blockers Encountered

None.

## Next Steps

- Follow-on (out of scope for this sprint, noted above): wire `migrateNamespace()`
  and `scanNamespaceDuplication()` in `cli/lib/namespace-migrate.cjs` to also
  back up/remove/count the new `agents` array, so `rcode doctor` and
  `rcode migrate-namespace`/`rcode update` — not just `rcode uninstall` — close
  the stale `rihal-*.md` agent gap.
- A regression test guarding CLAUDE.md's scope list against AGENTS.md (mirroring
  the existing `test/scope-history-parity.test.cjs` / `test/scope-list-parity.test.cjs`
  pattern) was explicitly called out as a reasonable follow-up but out of scope
  for this chore-only sprint.
- Remaining phase 45 sprints (45.1, 45.2, 45.4, 45.5) are unaffected by this
  sprint's changes and can proceed independently.

## Verification

- `for s in init agent-rules cursor i18n phase scaffold campaign ship getting-started do-router milestone-health modules project-types roadmapper token; do grep -q "\`$s\`" CLAUDE.md || echo "MISSING: $s"; done` — prints nothing
- `LIVE_COUNT=$(find rcode/skills -name SKILL.md | wc -l | tr -d ' '); grep -q "${LIVE_COUNT} skills" docs/skills-catalog.md && ! grep -q '\*\*80 skills\*\* across 3 buckets' docs/skills-catalog.md` — PASS (96 skills across 5 buckets)
- `node --check cli/lib/namespace-migrate.cjs && node --check cli/uninstall.js` — PASS
- `node -e "console.log(Object.keys(require('./cli/lib/namespace-migrate.cjs').findLegacyRihalArtifacts(require('os').homedir()+'/.claude')))"` — includes `'agents'`
- `grep -q "Real mode (default)" rcode/skills/agents/majlis-council/references.md` — fails (claim removed, as required)
- `grep -q "/rcode-council" rcode/skills/agents/majlis-council/references.md && grep -q "not yet implemented" rcode/skills/agents/majlis-council/references.md` — PASS
- All acceptance criteria per 45-3-SPRINT.md met per task
