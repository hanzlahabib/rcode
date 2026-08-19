# Executor Playbook

Loaded by `rcode-executor` via `@-include`. Contains the full execution
methodology, project-specific constraint loading, deviation rules, checkpoint
formats, and on-demand rule table.

The agent stub holds the role definition, core constraints, and @-include list.

---

## Project-specific constraints to load (every invocation)

Before executing any commits, load these constraints — they're what new executors get wrong on day one (see #444 for the original incident):

- **`.planning/` may be gitignored.** Many rcode-style projects gitignore the planning directory. To commit SUMMARY.md, VERIFICATION.md, or any other artefact under `.planning/`, you must use `git add -f <path>`. Without `-f`, the file is silently not staged and your commit doesn't include it.
- **Read `.rcode/config.yaml`** — if `workflow.commit_planning: true`, planning artefacts SHOULD be committed; use `git add -f` for each file under `.planning/`. If `commit_planning: false`, skip the commit step for those files entirely.
- **Read `.rcode/context/active.md`** — the user may have logged additional project-specific constraints there (deploy gates, secret-handling rules, branch-naming overrides). Honour them.

If you commit a file under `.planning/` and `git status` afterwards still shows it as modified or untracked, you forgot the `-f` flag. Re-stage with `git add -f` and amend the commit (a NEW commit; never `git commit --amend` on a pushed commit).

---

## Execution Flow (Slim)

1. **Load state** — Extract executor config, phase info, sprint list. Read STATE.md for position/blockers.
2. **Load sprint** — Parse SPRINT.md frontmatter (phase, sprint, type, autonomous, wave, depends_on). Honor CONTEXT.md if referenced.
3. **Determine pattern** — Pattern A (no checkpoints → execute all), B (has checkpoints → stop at first), C (continuation → resume).
4. **Execute stories** — For each story: if `type="auto"`, execute and commit. If `type="checkpoint:*"`, STOP and return checkpoint. Update story status via `rcode-tools.cjs state story move --id NN.S.TT --status done`.
5. **Create SUMMARY** — After all auto stories complete, write `.planning/phases/XX-name/{phase}-{sprint}-SUMMARY.md`. This is the *only* completion artefact. Never write a parallel status/handoff doc (`AGENT_X_DONE.md`, `HANDOFF.md`, a root-level `*_DONE.md`) — if the run involves multiple parallel executors, each still records its own SUMMARY.md under its own sprint; there is no separate hand-off format.
6. **Update state** — Run state tools to record metrics, mark stories complete, advance sprint.
7. **Final commit** — Commit SUMMARY.md, STATE.md, ROADMAP.md with docs message.

For detailed execution flow, read `.rcode/agents-rules/executor/execution-flow.md`

---

## Deviation Rules (Slim)

**RULE 1: Auto-fix bugs** — Logic errors, null checks, validation, security issues. Auto-fix immediately.
**RULE 2: Auto-add critical features** — Missing error handling, validation, auth, rate limiting, indexes. Auto-add.
**RULE 3: Auto-fix blockers** — Missing dependency, broken import, missing env var, DB error, build config. Auto-fix.
**RULE 4: Ask about architecture** — New DB table, schema change, new service, library switch, auth approach, breaking changes. STOP and checkpoint.

**Priority:** Rule 4 → STOP. Rules 1-3 → Fix. Unsure → Rule 4.
**Scope:** Only auto-fix issues DIRECTLY caused by this task. Log out-of-scope to `deferred-items.md`. After 3 attempts: STOP.

For detailed deviation rules with examples, read `.rcode/agents-rules/executor/deviation-rules.md`

---

## Core Guardrails

- **Analysis paralysis guard:** After 5+ Read/Grep/Glob without Edit/Write/Bash, STOP and state why.
- **Authentication gates:** "Not authenticated", "401", "403", "Set ENV_VAR" are gates (human-action checkpoints), not failures.
- **Auto mode detection:** Check `workflow._auto_chain_active` and `workflow.auto_advance`. If true, auto-approve human-verify and auto-select first decision.
- **Checkpoint protocol:** Automate first. Users never run CLI, only visit URLs, click UI, provide secrets.
- **Correctness hazard self-audit:** if this plan's diff touched async code, shared/mutable state, or a third-party library's async API, read `.rcode/agents-rules/executor/correctness-hazard-scan.md` BEFORE writing SUMMARY.md. Concurrency races, React state-updater purity, and async-library footguns pass `npm test`/`tsc` but reliably get caught in human PR review — catch them here instead.

---

## Checkpoint Return Format (Exact)

```markdown
## CHECKPOINT REACHED

**Type:** [human-verify | decision | human-action]
**Sprint:** {phase}-{sprint}
**Progress:** {completed}/{total} stories complete

### Completed Stories

| Story | Name | Commit | Files |
| ----- | ---- | ------ | ----- |
| 1     | [name] | [hash] | [files] |

### Current Story
**Story {N}:** [name]
**Status:** [blocked | awaiting verification | awaiting decision]
**Blocked by:** [blocker]

### Checkpoint Details
[Type-specific content]

### Awaiting
[What user needs to do/provide]
```

---

## Completion Format (Exact)

```markdown
## SPRINT COMPLETE

**Sprint:** {phase}-{sprint}
**Stories:** {completed}/{total}
**SUMMARY:** {path}

**Commits:**
- {hash}: {message}

**Duration:** {time}
```

---

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Full execution flow with all steps | `.rcode/agents-rules/executor/execution-flow.md` |
| Detailed deviation rules with examples | `.rcode/agents-rules/executor/deviation-rules.md` |
| Auth gate handling patterns | `.rcode/agents-rules/executor/authentication-gates.md` |
| Commit workflow and multi-repo handling | `.rcode/agents-rules/executor/task-commit-protocol.md` |
| SUMMARY creation template and checklist | `.rcode/agents-rules/executor/summary-creation.md` |
| TDD RED/GREEN/REFACTOR flow | `.rcode/agents-rules/executor/tdd-flow.md` |
| Stub detection and tagging | `.rcode/agents-rules/executor/stub-detection.md` |
| Pre-SUMMARY verification checklist | `.rcode/agents-rules/executor/self-check.md` |
| Correctness hazard scan (concurrency/state/async-library) | `.rcode/agents-rules/executor/correctness-hazard-scan.md` |

Read these ONLY when the current task needs them. Don't preemptively load.
