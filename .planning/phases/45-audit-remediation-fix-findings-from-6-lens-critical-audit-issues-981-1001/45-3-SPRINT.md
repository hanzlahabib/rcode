---
phase: 45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001
plan_number: 3
wave: 1
depends_on: []
autonomous: true  # Task 45.3.1 is now a real checkpoint:human-verify task (edits
                  # CLAUDE.md, a meta-rules file, and requires human approval of the diff
                  # before it is folded into the sprint's final commit). Per execute-sprint.md's
                  # parse_segments step, the mere presence of a checkpoint task routes
                  # this file through Pattern B (segmented execution) regardless of this flag —
                  # `autonomous: true` here matches the precedent set by 31-2-SPRINT.md,
                  # 32-1-SPRINT.md, and 33-3-SPRINT.md, which also mix auto tasks with a
                  # checkpoint:human-verify task and keep `autonomous: true`. Tasks
                  # 45.3.2/45.3.3/45.3.4 are unaffected and run fully autonomously in their
                  # own segment.
files_modified:
  - CLAUDE.md
  - docs/skills-catalog.md
  - cli/lib/namespace-migrate.cjs
  - cli/uninstall.js
  - rcode/skills/agents/majlis-council/references.md
requirements: []
must_haves:
  truths:
    - CLAUDE.md's Scopes allowed list contains all 15 scopes present in AGENTS.md's list but missing from CLAUDE.md (init, agent-rules, cursor, i18n, phase, scaffold, campaign, ship, getting-started, do-router, milestone-health, modules, project-types, roadmapper, token)
    - docs/skills-catalog.md matches the live output of scripts/build-skills-catalog.cjs (96 skills across 5 buckets, not the stale committed 80/3)
    - cli/lib/namespace-migrate.cjs's findLegacyRihalArtifacts and cli/uninstall.js's agent cleanup both scan .claude/agents/ for rihal-* twins, not just .claude/skills/ and .claude/commands/
    - rcode/skills/agents/majlis-council/references.md's Dispatch Modes section no longer claims "Real mode (default)" subagent dispatch is currently available — it matches SKILL.md's own capability table (all 5 convene skills marked "planned — not yet implemented") and points to the actual live real-dispatch path (/rcode-council -> rcode/workflows/council.md)
  artifacts:
    - docs/skills-catalog.md — regenerated via the existing generator script
  key_links:
    - test/scope-history-parity.test.cjs and test/scope-list-parity.test.cjs already guard AGENTS.md<->CONTRIBUTING.md and commit-history<->AGENTS.md; CLAUDE.md is a third, currently-untested copy this sprint brings into sync (a follow-on test to guard it going forward is out of scope for this sprint — chore only)
    - rcode/workflows/council.md is the confirmed-live, working real-Task-tool-dispatch implementation reachable via the /rcode-council slash command — distinct from the majlis-council skill this sprint corrects
---

<objective>
Fix GitHub issues #987, #990, #991, #992 — four independent hand-maintained-list-drift and
agent-sprawl-cleanup findings from AUDIT-scope-consistency.md and AUDIT-agent-sprawl.md: CLAUDE.md is
a third, untested copy of the AGENTS.md scope list, currently missing 15 scopes; docs/skills-catalog.md
is a generated file that's drifted 16 skills stale because nothing ever re-runs the generator;
the rihal-* -> rcode-* namespace cleanup tooling has a directory-scope gap that leaves 45 stale
`rihal-*.md` agent files un-removable on any pre-rebrand install (confirmed live on this machine);
and the majlis-council skill's own two doc files contradict each other on whether real subagent
dispatch is implemented, when the actual answer (checkable by reading the separate, live
`/rcode-council` workflow) is that real dispatch exists — just not inside this skill.

This is a repo-maintenance/bugfix phase — no numbered requirement IDs apply (`requirements: []`).
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/audits/AUDIT-scope-consistency.md
@.planning/audits/AUDIT-agent-sprawl.md
</context>

<tasks>

<task id="45.3.1" type="checkpoint:human-verify">
<title>Sync CLAUDE.md's scope list with AGENTS.md's (add 15 missing scopes) — human approval required before commit</title>
<read_first>
- CLAUDE.md line 27 (70 backtick-quoted scopes)
- AGENTS.md line 27 (85 backtick-quoted scopes)
</read_first>
<files>CLAUDE.md</files>
<action>
Re-grep the `Scopes allowed:` line in both files before editing (line number may have shifted).

Add the 15 scopes present in AGENTS.md:27 but absent from CLAUDE.md:27 — `init`, `agent-rules`, `cursor`, `i18n`, `phase`, `scaffold`, `campaign`, `ship`, `getting-started`, `do-router`, `milestone-health`, `modules`, `project-types`, `roadmapper`, `token` — to CLAUDE.md's `Scopes allowed:` line, in the same backtick-quoted, comma-separated format AGENTS.md uses, preserving CLAUDE.md's existing scope order and appending the missing ones before the trailing "plus numeric phase/sprint scopes" clause. Do not remove any scope currently in CLAUDE.md. Do not touch AGENTS.md or CONTRIBUTING.md — both already agree with each other per the existing passing `test/scope-list-parity.test.cjs`.

Run the automated `<verify>` gate below and confirm it passes before proceeding to the checkpoint.

CLAUDE.md is a meta-rules file. CLAUDE.md's own Red Flags section states: "About to
edit AGENTS.md, CONTRIBUTING.md, or CLAUDE.md — these are meta-rules; stop and
confirm." Per this task's `checkpoint:human-verify` type (see execute-sprint.md's
checkpoint_protocol step and .rcode/references/checkpoints.md), automate the edit
above first, then present the checkpoint:

- What was built: CLAUDE.md's `Scopes allowed:` line now includes the 15
  previously-missing scopes, and the automated verify gate below passes.
- How to verify: show the user the exact diff to CLAUDE.md (e.g. `git diff CLAUDE.md`).
- Resume signal: wait for the user to reply "approved" (or equivalent, e.g. "looks
  good") before this file is included in any commit. If the user instead describes
  issues, fix them and re-present the diff.

Do not fold CLAUDE.md into a silent, unattended commit alongside 45.3.2/45.3.3/45.3.4
— those tasks execute in their own autonomous segment and may still commit without a
pause. Per execute-sprint.md's segment_execution step, the sprint-wide SUMMARY and
commit only happen once, after ALL segments (including this checkpoint) complete —
so this checkpoint's approval gates the entire sprint's single final commit,
including CLAUDE.md.
</action>
<acceptance_criteria>
- For each of the 15 scopes listed above, `` grep -q '`SCOPE`' CLAUDE.md `` succeeds
- `diff <(grep -o '`[a-z0-9-]*`' AGENTS.md | sort -u) <(grep -o '`[a-z0-9-]*`' CLAUDE.md | sort -u)` shows no scope present in AGENTS.md but absent from CLAUDE.md (CLAUDE.md may still lack unrelated non-scope backtick tokens; this diff is a sanity check on the scope set only)
- The user has explicitly approved the CLAUDE.md diff (e.g. "approved") before it is committed
</acceptance_criteria>
<verify>
<automated>
MISSING=0
for s in init agent-rules cursor i18n phase scaffold campaign ship getting-started do-router milestone-health modules project-types roadmapper token; do
  grep -q "\`$s\`" CLAUDE.md || MISSING=1
done
[ "$MISSING" -eq 0 ] && echo PASS
</automated>
</verify>
<done>CLAUDE.md's Scopes allowed line contains all 15 previously-missing scopes; every scope in AGENTS.md's list now also appears in CLAUDE.md's; the user has explicitly approved the diff before it is committed.</done>
<evidence>AUDIT-scope-consistency.md finding 1: "CLAUDE.md is a THIRD hand-maintained copy of the scope list, untested, and currently drifted by 15 scopes... Currently missing from CLAUDE.md:27 but present in AGENTS.md:27 (15 scopes, verified programmatically)." Confirmed via direct grep this session (CLAUDE.md:27 vs AGENTS.md:27, exact 15-scope diff reproduced).</evidence>
</task>

<task id="45.3.2" type="auto">
<title>Regenerate docs/skills-catalog.md from the live skill tree</title>
<read_first>
- docs/skills-catalog.md line 1 (`<!-- DO NOT EDIT — generated by scripts/build-skills-catalog.cjs -->`)
- scripts/build-skills-catalog.cjs (the generator — confirm its CLI invocation, e.g. `node scripts/build-skills-catalog.cjs` with no args, or check for a `--write`/output-path flag before running)
</read_first>
<files>docs/skills-catalog.md</files>
<action>
Run the existing generator script exactly as its own banner instructs (`node scripts/build-skills-catalog.cjs`) and let it overwrite `docs/skills-catalog.md` in place. Do not hand-edit the file — it is machine-generated. If the script writes to stdout instead of the file directly, redirect its output to `docs/skills-catalog.md`. After running, diff the result against the pre-run committed version to confirm the skill/bucket counts moved from the stale 80/3 to the live tree's actual count (96/5 as of the audit date — re-verify the live count at execution time since new skills may have been added since).
</action>
<acceptance_criteria>
- `node scripts/build-skills-catalog.cjs` (or equivalent invocation per the script's own usage) exits 0
- `docs/skills-catalog.md` no longer contains the real stale marker — the committed text is `**80 skills** across 3 buckets.` (bold markdown + trailing period), NOT the bare string "80 skills across 3 buckets" (a naive substring grep for the un-bolded phrase never matches either before or after the fix, since the literal text always has `**`/`**` around "80 skills" and a period after "buckets" — that grep would be vacuously true regardless of whether regeneration happened)
- The regenerated file's declared skill count (`N skills` in the catalogue's summary line) matches the live count of `find rcode/skills -name SKILL.md | wc -l` at execution time — this is the authoritative pass/fail check, not a hardcoded before/after string, since the live skill count can change as skills are added after this sprint is planned
</acceptance_criteria>
<verify>
<automated>
LIVE_COUNT="$(find rcode/skills -name SKILL.md | wc -l | tr -d ' ')"
grep -q "${LIVE_COUNT} skills" docs/skills-catalog.md && \
! grep -q '\*\*80 skills\*\* across 3 buckets' docs/skills-catalog.md && \
echo PASS
</automated>
</verify>
<done>docs/skills-catalog.md is regenerated from the live rcode/skills/ tree, matching the actual current skill count and bucket count — no stale trigger-phrase lists remain for any individual skill.</done>
<evidence>AUDIT-scope-consistency.md finding 3: "Confirmed currently stale by running the real generator against the real rcode/skills/ tree and diffing against the committed file... docs/skills-catalog.md (committed): '**80 skills** across 3 buckets.' / scripts/build-skills-catalog.cjs (live): '96 skills across 5 buckets'... 16 skills and 2 entire buckets are missing." (Note: the committed text is bold-markdown-wrapped with a trailing period, not the bare phrase — a naive grep for the un-bolded string never matches either state, so the verify gate here checks the live skill count instead.) The audit explicitly reverted its own test run (`git checkout`) — this task performs the regeneration for real and commits it.</evidence>
</task>

<task id="45.3.3" type="auto">
<title>Extend rihal-* cleanup tooling to scan .claude/agents/ (live bug, this machine)</title>
<read_first>
- cli/lib/namespace-migrate.cjs lines 34-66 (`findLegacyRihalArtifacts` — scans only `claudeDir/skills` and `claudeDir/commands`, never `claudeDir/agents`)
- cli/uninstall.js lines 261-267 (agent cleanup filters `.claude/agents/` entries by `name.startsWith('rcode-')` only — never matches or removes `rihal-*.md`)
</read_first>
<files>cli/lib/namespace-migrate.cjs, cli/uninstall.js</files>
<action>
1. `cli/lib/namespace-migrate.cjs` — in `findLegacyRihalArtifacts(claudeDir)` (currently builds `skills` and `commands` arrays), add a third scan block for `path.join(claudeDir, 'agents')`: for every file matching `rihal-*.md`, check whether the twin `rcode-<name>.md` exists in the same `agents/` directory; if so, push `{ name, twin, srcPath, kind: 'agent' }` into a new `agents` array. Return `{ skills, commands, agents }` (extend the existing return object — do not break existing callers that destructure `{ skills, commands }`, since adding a key is additive).
2. `cli/uninstall.js` — near lines 261-267, after the existing `rcode-*` filter that builds `plan.claude.agents`, add a second filter pass over the same `agentsDir` listing for `name.startsWith('rihal-') && name.endsWith('.md')`, and append matches into `plan.claude.agents` (or a new `plan.claude.legacyRihalAgents` array if the existing removal logic downstream needs to distinguish/report on legacy vs current agents — check how `plan.claude.agents` is consumed later in the file before deciding).
3. Confirm both changes are read-only scan additions (no new deletion behavior beyond what already exists for `commands`/`skills`) — the destructive `migrateNamespace()` / uninstall removal path already consumes whatever `findLegacyRihalArtifacts` / `plan.claude.agents` returns, so extending the scan is sufficient to close the gap without adding new deletion logic.
</action>
<acceptance_criteria>
- `grep -q "agents" cli/lib/namespace-migrate.cjs` shows a new scan block referencing `path.join(claudeDir, 'agents')` inside `findLegacyRihalArtifacts`
- `node --check cli/lib/namespace-migrate.cjs` and `node --check cli/uninstall.js` both pass
- Running `node -e "console.log(Object.keys(require('./cli/lib/namespace-migrate.cjs').findLegacyRihalArtifacts(require('os').homedir()+'/.claude')))"` includes `'agents'` in its output keys
</acceptance_criteria>
<verify>
<automated>
node --check cli/lib/namespace-migrate.cjs && node --check cli/uninstall.js && \
node -e "const r = require('./cli/lib/namespace-migrate.cjs').findLegacyRihalArtifacts(require('os').homedir()+'/.claude'); if (!('agents' in r)) process.exit(1);" && \
echo PASS
</automated>
</verify>
<done>findLegacyRihalArtifacts and cli/uninstall.js's agent-cleanup pass both scan .claude/agents/ for rihal-* twins alongside skills/ and commands/ — the same scan gap that let 45 stale rihal-*.md agent files survive on this machine two months after being flagged is closed for future scans.</done>
<evidence>AUDIT-agent-sprawl.md finding 3: "ls ~/.claude/agents/ on this machine right now returns 45 rihal-*.md files, one exact twin per rcode-*.md agent... cli/lib/namespace-migrate.cjs:34-66 (findLegacyRihalArtifacts...) scans only claudeDir/skills and claudeDir/commands. No agents directory is ever checked... cli/uninstall.js:261-267... filters .claude/agents/ entries with name.startsWith('rcode-') only... It will never touch a rihal-*.md file." Confirmed via direct read this session (namespace-migrate.cjs:34-66, uninstall.js:261-267) — this machine's own ~/.claude/agents/ still has the 45 stale files as of this planning session.</evidence>
</task>

<task id="45.3.4" type="auto">
<title>Correct majlis-council references.md's false "real mode (default)" dispatch claim</title>
<read_first>
- rcode/skills/agents/majlis-council/SKILL.md lines 44-48 (Capabilities table: all 5 dispatch-mode skills — CV, CVF, QC, DM, CM — marked "[planned — not yet implemented]")
- rcode/skills/agents/majlis-council/references.md lines 33-40 (Dispatch modes: "Real mode (default). Dispatches actual subagents via the Task tool... Fast mode... Fallback for harnesses without subagent support")
- rcode/workflows/council.md lines 1-4 (the SEPARATE, live `/rcode-council` slash-command workflow: "parallel Task-tool spawning (not sequential roleplay)" — confirmed real, working real-mode dispatch, but implemented here, not inside the majlis-council skill)
</read_first>
<files>rcode/skills/agents/majlis-council/references.md</files>
<action>
Re-grep the `## Dispatch modes` section before editing.

Replace the "Real mode (default)" / "Fast mode" description with wording that matches SKILL.md's own honest capability table and points to the actual live path:
```markdown
## Dispatch modes

Within this skill, the CV/CVF/QC/DM/CM convene-mode sub-skills listed in SKILL.md's
Capabilities table are **not yet implemented** — do not claim real Task-tool dispatch
is available through this skill today.

**For genuine parallel, isolated-context subagent dispatch, use the separate
`/rcode-council` slash command** (`rcode/workflows/council.md`) — a different,
already-working implementation: deterministic panel scoring, parallel Task-tool
spawning (not sequential roleplay), and structured artifact output to
`.planning/council-sessions/`.

**Fast mode (the only mode this skill currently supports).** Single-Claude
structured roleplay following each agent's SKILL.md principles, in shared context.
Use this skill (phrase-triggered: "convene the majlis", "consult the team", etc.)
only when a `/rcode-council` slash-command invocation isn't available or a quick
sanity check is enough.

When real, isolated-context dispatch matters, prefer `/rcode-council` over this skill.
```
Do not edit `rcode/skills/agents/majlis-council/SKILL.md` — its capability table is already the honest, accurate source that this task brings `references.md` into agreement with. Do not edit `rcode/workflows/council.md` — it is the confirmed-live implementation and out of scope for this fix.
</action>
<acceptance_criteria>
- `! grep -q "Real mode (default)" rcode/skills/agents/majlis-council/references.md`
- `grep -q "/rcode-council" rcode/skills/agents/majlis-council/references.md`
- `grep -q "not yet implemented" rcode/skills/agents/majlis-council/references.md`
</acceptance_criteria>
<verify>
<automated>
! grep -q "Real mode (default)" rcode/skills/agents/majlis-council/references.md && \
grep -q "/rcode-council" rcode/skills/agents/majlis-council/references.md && \
grep -q "not yet implemented" rcode/skills/agents/majlis-council/references.md && \
echo PASS
</automated>
</verify>
<done>references.md no longer claims this skill defaults to real subagent dispatch; it now agrees with SKILL.md's capability table and correctly points users at the separate, confirmed-live /rcode-council workflow for genuine parallel Task-tool dispatch.</done>
<evidence>AUDIT-agent-sprawl.md finding 4: "references.md:35,37... contradicts the capability table: 'Real mode (default). Dispatches actual subagents via the Task tool...' This describes real-mode subagent dispatch as the working default, while the capability table two files up says the real-mode skill doesn't exist yet." Resolved by direct read this session: rcode/workflows/council.md:1-4 (a separate, live file) confirms real parallel Task-tool dispatch DOES exist in this codebase — just not inside the majlis-council skill, which is what references.md incorrectly implied.</evidence>
</task>

</tasks>

<verification>
- `for s in init agent-rules cursor i18n phase scaffold campaign ship getting-started do-router milestone-health modules project-types roadmapper token; do grep -q "\`$s\`" CLAUDE.md || echo "MISSING: $s"; done` prints nothing
- `LIVE_COUNT=$(find rcode/skills -name SKILL.md | wc -l | tr -d ' '); grep -q "${LIVE_COUNT} skills" docs/skills-catalog.md && ! grep -q '\*\*80 skills\*\* across 3 buckets' docs/skills-catalog.md` succeeds (file regenerated, real stale marker gone, declared count matches the live tree)
- `node --check cli/lib/namespace-migrate.cjs && node --check cli/uninstall.js` passes
- `grep -q "Real mode (default)" rcode/skills/agents/majlis-council/references.md` fails (claim corrected)
</verification>

<success_criteria>
- CLAUDE.md, AGENTS.md, and CONTRIBUTING.md all agree on the allowed scope list
- docs/skills-catalog.md matches the live rcode/skills/ tree
- The rihal-* cleanup tooling can find and remove stale .claude/agents/ twins on the next migrate/update/uninstall run
- majlis-council's two doc files no longer contradict each other on whether real dispatch exists
</success_criteria>

<output>
Create `.planning/phases/45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001/45-3-SUMMARY.md`
</output>

## Files Touched

**Creates:**
<!-- none -->

**Modifies:**
- `CLAUDE.md` — Scopes allowed line, 15 scopes added
- `docs/skills-catalog.md` — fully regenerated (machine-generated, not hand-edited)
- `cli/lib/namespace-migrate.cjs` — findLegacyRihalArtifacts extended with an `agents` scan
- `cli/uninstall.js` — agent cleanup extended to match `rihal-*.md` twins
- `rcode/skills/agents/majlis-council/references.md` — Dispatch modes section corrected

**Tests:**
<!-- none — no existing test covers CLAUDE.md's scope list, the skills-catalog freshness, or namespace-migrate's directory scope; adding one is a reasonable follow-up but out of scope for this chore-only sprint -->
