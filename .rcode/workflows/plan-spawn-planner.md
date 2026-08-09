<purpose>
Sub-step of plan.md — Step 8 Spawn rcode-planner Agent. Spawns rcode-planner with full context to generate SPRINT.md plans. Includes deep-work rules and downstream consumer spec.
</purpose>

<filename_convention>
Every SPRINT.md, including the first plan in a phase, uses the
sequence-numbered form `{phase}-{plan}-SPRINT.md` (no leading zeros).
Examples: `8-1-SPRINT.md`, `8-2-SPRINT.md`. Do NOT emit a bare `{phase}-SPRINT.md`
or `{phase}-PLAN.md` for the first plan — that creates an inconsistent series
when a second plan is added later. The plan-number computation in plan.md uses
`NEXT_PLAN_NUMBER=$((EXISTING_PLAN_COUNT + 1))` and starts at 1 for new phases.
</filename_convention>

## 8. Spawn rcode-planner Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PLANNING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning planner...
```

**Gap-closure planner prompt (when `GAPS_MODE=true`):**

When `GAPS_MODE=true`, use the prompt below in place of the standard planner prompt. The planner must emit **exactly one** new plan file at `${GAP_PLAN_PATH}` that closes the listed gaps. Do not create CONTEXT.md or RESEARCH.md references — gaps are grounded in already-shipped code.

```markdown
<planning_context>
**Phase:** {phase_number}
**Mode:** gap_closure
**Phase goal:** {goal from ROADMAP.md}

<files_to_read>
- {VERIFICATION_FILE} (Authoritative verification report — source of truth for gaps)
- {state_path} (Project State)
- {roadmap_path} (Roadmap)
- {requirements_path} (Requirements)
- Existing plan files in this phase: {EXISTING_PLAN_FILES}
- Existing summary files in this phase: {EXISTING_SUMMARY_FILES}
</files_to_read>

${AGENT_SKILLS_PLANNER}

<gap_list>
{Serialized GAP_LIST — for each gap include id, title, expected behavior, actual behavior, status (gap_found|partial), and source section.}
</gap_list>

<output>
Write a single new plan file to: {GAP_PLAN_PATH}

Frontmatter MUST include:
---
phase: {phase_number}
plan_number: {NEXT_PLAN_NUMBER}
gap_closure: true
wave: 1
depends_on: []
files_modified: [...]
autonomous: true|false
---

Each gap in the list MUST be addressed by at least one task. Use the anti-shallow execution rules below.
</output>
</planning_context>
```

Proceed to the standard planner Task invocation below, but pass the gap-closure prompt above. After the planner returns, the normal plan-checker / revision loop (step 10+) runs unchanged.

---

**Standard planner prompt (when `GAPS_MODE=false`):**

Planner prompt:

```markdown
<planning_context>
**Phase:** {phase_number}
**Mode:** {standard | gap_closure | reviews}

## Scope

Default: `phase` (one SPRINT.md, up to 8 stories — see Scope-Driven Sizing in your role instructions).

**Self-upgrade to `initiative` mid-decomposition** if, once you've read CONTEXT.md/ROADMAP.md and started breaking down the work, it splits into independent waves or work-streams (e.g. shared-primitive foundation → feature-local migrations → cleanup/tests) and total stories would exceed 8. When that happens, emit multiple SPRINT.md files (`{phase}-1-SPRINT.md`, `{phase}-2-SPRINT.md`, ...) in this same run instead of one oversized plan. Do not wait for rcode-sprint-checker's "scope exceeds context budget" rejection to force a resharding pass — that costs a full extra planner run. Decide the split now, while you're already looking at the file/story list.

<files_to_read>
- {state_path} (Project State)
- {roadmap_path} (Roadmap)
- {requirements_path} (Requirements)
- {context_path} (USER DECISIONS from /rcode-discuss-phase — read `<decisions>` for locked choices AND `<code_context>` for existing code patterns, reusable assets, and architectural notes gathered during discuss-phase)
- {research_path} (Technical Research)
- {verification_path} (Verification Gaps - if --gaps)
- {uat_path} (UAT Gaps - if --gaps)
- {reviews_path} (Cross-AI Review Feedback - if --reviews)
- {UI_SPEC_PATH} (UI Design Contract — visual/interaction specs, if exists)
${CONTEXT_WINDOW >= 500000 ? `
**Cross-phase context (1M model enrichment — most recent 5 phases only to avoid context overflow):**
- Prior phase CONTEXT.md files (locked decisions from earlier phases — maintain consistency). Cap: read the 5 most recent phases by phase number only.
- Prior phase SUMMARY.md files (what was actually built — reuse patterns, avoid duplication). Cap: read the 5 most recent phases by phase number only. Specifically check **Provides** sections: these list functions, APIs, and models from earlier phases that this phase can reuse without rebuilding.
` : ''}
</files_to_read>

${AGENT_SKILLS_PLANNER}

**Phase requirement IDs (every ID MUST appear in a plan's `requirements` field):** {phase_req_ids}

**Project instructions:** Read ./CLAUDE.md if exists — follow project-specific guidelines
**Project skills:** Check .claude/skills/ or .agents/skills/ directory (if either exists) — read SKILL.md files, plans should account for project skill rules

</planning_context>

<downstream_consumer>
Output consumed by /rcode-execute. Plans need:
- Frontmatter (wave, depends_on, autonomous, **files_modified** — aggregated list of all file paths from `<files>` blocks across every task; used by executor for intra-wave parallel-safety overlap detection)
- Tasks in XML format with read_first, files, evidence, verify (with `<automated>` child), and done fields (MANDATORY on every task)
- Verification criteria
- must_haves for goal-backward verification
- **`## Files Touched`** section (see below) — required on every SPRINT.md

### Required: ## Files Touched Section

Every SPRINT.md must end with a `## Files Touched` section that the planner populates:

```markdown
## Files Touched

**Creates:**
- `exact/path/to/new/file.ts` — [one-line responsibility]

**Modifies:**
- `exact/path/to/existing.ts` — [what changes]

**Tests:**
- `tests/exact/path/test.ts` — [tests for]

**Aggregator files (append-only):**
- `packages/shared/src/index.ts` — adds export for Foo, Bar
```

This section is read by the wave-overlap checker and by human reviewers to quickly audit
cross-sprint file ownership before merging. If a file appears in `## Files Touched` for two
plans in the same wave, the later plan must declare `sequential: true`.
</downstream_consumer>

<deep_work_rules>
## File Structure Map (REQUIRED — before task decomposition)

Before writing any task, produce a file structure map listing every file this plan will create or modify:

```
FILES_TO_CREATE:
  - exact/path/to/new/file.ts  — responsibility: [one sentence]
FILES_TO_MODIFY:
  - exact/path/to/existing.ts  — what changes: [one sentence]
FILES_FOR_TESTS:
  - tests/exact/path/test.ts   — tests for: [one sentence]
```

Rules:
- Each file has one clear responsibility — if you can't describe it in one sentence, split the file
- Files that change together should live together (split by responsibility, not layer)
- This map is what informs task decomposition — each task should produce self-contained changes
- In existing codebases: follow established patterns; only restructure files if a file is genuinely unwieldy and the split is included as its own task

## File-Ownership & Conflict-Avoidance (MANDATORY)

**Evidence from overnight parallel builds (calorie-calculator-ai, 2026-05-26):**
- Sprints 1-2 and 3-1 both created `diary.py` with divergent content — 3-1's mock-history
  endpoints were silently lost at merge.
- Sprints 3-3 and 3-4 both created `HistoryScreen.tsx` — collision required manual triage.
- Sprints 1-4 and 1-5 both created `CalorieRing`, `MealSlotCard`, and related components.
- `packages/shared/src/index.ts` was modified by 4 independent sprints — every merge required
  conflict resolution.
- Wave-4 executors stubbed missing deps locally while master had an unmerged upstream; the
  stubs collided with canonical implementations at merge.

### Cross-Sprint File Manifest (produce before task decomposition)

After the File Structure Map, build a cross-sprint ownership table:

```
CROSS-SPRINT FILE MANIFEST:
  Sprint 1: creates [path/a.ts, path/b.ts]  modifies [path/c.ts]
  Sprint 2: creates [path/d.ts]             modifies [path/c.ts]   ← OVERLAP on path/c.ts
  Sprint 3: creates [path/b.ts]             modifies []             ← COLLISION — b.ts in sprint 1 too
  ...
  OWNERSHIP ASSIGNMENTS:
    path/c.ts — sprint 1 writes canonical, sprint 2 must be sequential_after: 1
    path/b.ts — DEFECT: only one sprint may create a file; merge or sequence
```

**Rules:**
- Only ONE sprint may _create_ a given file. Two sprints creating the same file is a plan defect — either merge the tasks into one sprint or sequence them and have the later sprint extend (not recreate).
- If two sprints in the same wave both _modify_ the same file, the later sprint MUST have `sequential: true` and `sequential_after: <earlier_sprint_id>` in its frontmatter.
- Frontmatter `files_modified:` must list ALL files from `<files>` blocks — this is the source-of-truth for the executor's intra-wave overlap checker.

### Aggregator-File Rule

These files are known aggregators — multiple sprints always want to add to them:

| Pattern | Examples |
|---------|---------|
| Barrel exports | `**/index.ts`, `**/index.tsx` |
| State store | `**/store/index.ts`, `**/store/index.js` |
| Types barrel | `**/types/index.ts`, `**/types.ts` |
| Python entrypoints | `main.py`, `app.py`, `router/__init__.py`, `**/__init__.py` |
| Package manifest | `package.json` (scripts / deps blocks) |

**Hard rule:** For aggregator files, the `<action>` block MUST say:

> "Append to existing exports — do NOT overwrite or replace the full file. Use `Edit`
> (old_string / new_string) with a targeted insertion. Preserve all existing content."

Never use `Write` on an aggregator file in a plan that other sprints also touch.

### Verify-Command Accuracy

In every `<verify><automated>` block, prefer `pnpm run <script>` over raw tool invocations
to avoid the mismatch where the planner writes `tsc --noEmit` but the project calls it `type-check`:

| Raw invocation (avoid) | pnpm script form (prefer) |
|------------------------|--------------------------|
| `tsc --noEmit` | `pnpm run type-check` or `pnpm run typecheck` |
| `eslint .` | `pnpm run lint` |
| `jest` / `vitest` | `pnpm run test` |
| `python -m pytest` | check `pyproject.toml` for script alias |

Check `package.json` scripts before writing a verify command. If `package.json` is not yet
read, add it to `<read_first>` for any task that writes a verify command.

## No-Placeholders Rule (HARD BLOCKER)

Every step must contain the actual content the executor needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases" (without code)
- "Write tests for the above" (without actual test code)
- "Similar to Task N" — copy the code; executor may read tasks out of order
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not yet defined in any task in this plan

If a step would require TBD content, either: (a) do the research now and fill it in, or (b) split into a research task that outputs a decision, followed by an implementation task that consumes it.

## Anti-Shallow Execution Rules (MANDATORY)

Every task MUST include these fields — they are NOT optional:

1. **`<read_first>`** — Files the executor MUST read before touching anything. Always include:
   - The file being modified (so executor sees current state, not assumptions)
   - Any "source of truth" file referenced in CONTEXT.md (reference implementations, existing patterns, config files, schemas)
   - Any file whose patterns, signatures, types, or conventions must be replicated or respected

2. **`<files>`** — Exact files this task will modify or create. One path per line. Used by:
   - Wave conflict checker (detects parallel tasks touching the same file)
   - Verifier (confirms per-task file changes were actually made)
   - Executor checkpoint (knows what to stage after each task)
   - Example: `src/auth/auth.service.ts`, `tests/auth/auth.service.test.ts`

3. **`<evidence>`** — REQUIRED (issue #649). Must show codebase grounding proving the task is real, not theoretical. At minimum one of:
   - `grep:` a literal grep/Glob pattern + count of matches that justified this task (e.g. `` `rg '\.alert' apps/web/src` → 13 hits across 9 files ``)
   - `lines:` exact `path:line-line` ranges of code being modified
   - `creates:` the file paths being created from scratch (with one-line justification why no existing file fits)
   A task without `<evidence>` is theoretical and MUST NOT be written. (Matches `rcode/references/planner-playbook.md`'s "Task Anatomy" section — single source of truth for this rule.)

4. **`<verify>`** — Shell commands that PROVE the `<done>` criteria are met. Run by executor after task completes and by verifier during post-execution check. The block MUST contain an `<automated>` child with the exact commands to run (Dimension 8 hard-blocks without it). Rules:
   - `<automated>` commands must exit 0 on success, non-zero on failure
   - Prefer `grep -q` for presence checks, `test -f` for file existence, project test runner for behavior
   - Keep commands short and composable — one check per line
   - If test file doesn't exist yet (TDD tasks), write `<automated>MISSING</automated>` and add a Wave 0 task to create the test
   - Example structure:
     ```xml
     <verify>
       <automated>
         grep -q 'def verify_token' src/auth.py
         python -m pytest tests/test_auth.py -x -q 2>&1 | grep -q 'passed'
         test -f src/components/Button.tsx
       </automated>
     </verify>
     ```

5. **`<done>`** — Observable acceptance state: a single sentence describing what is TRUE when this task is complete. Must be user/output-observable, not implementation-focused. Examples:
   - `auth.py exports verify_token() and tests pass`
   - `Button.tsx renders with correct className, no inline styles`
   - `.env.example contains DATABASE_URL and REDIS_URL entries`

6. **`<action>`** — Must include CONCRETE values, not references. Rules:
   - NEVER say "align X with Y", "match X to Y", "update to be consistent" without specifying the exact target state
   - ALWAYS include the actual values: config keys, function signatures, SQL statements, class names, import paths, env vars, etc.
   - If CONTEXT.md has a comparison table or expected values, copy them into the action verbatim
   - The executor should be able to complete the task from the action text alone, without needing to read CONTEXT.md or reference files (read_first is for verification, not discovery)

**Optional — use when the task extends or implements existing code:**

7. **`<interfaces>`** — Relevant class/function/type signatures from existing code that this task must implement, extend, or call. Embed the actual signatures here so the executor does not burn tool calls re-reading files.
   - Extract from `<read_first>` files during planning (planner already reads them)
   - Include only what the executor needs: method signatures, interface definitions, relevant types
   - Do NOT include full file contents — only the contract boundary
   - Example:
     ```typescript
     // src/services/auth.service.ts
     interface AuthService {
       verifyToken(token: string): Promise<User>
       refreshSession(userId: string): Promise<Session>
     }
     ```

**Why this matters:** Executor agents work from the plan text. Vague instructions like "update the config to match production" produce shallow one-line changes. Concrete instructions with `<files>`, `<verify>` commands, and embedded `<interfaces>` give the executor everything needed to do complete, correct work without extra tool calls.
</deep_work_rules>

<quality_gate>
- [ ] File structure map written before first task (files_to_create / files_to_modify / files_for_tests)
- [ ] Cross-sprint file manifest built — no file in 2+ same-wave sprints without `sequential: true`
- [ ] No file created by more than one sprint (creation collision = plan defect)
- [ ] Aggregator files (index.ts, __init__.py, main.py, package.json, etc.) use append-only `Edit`, not `Write`
- [ ] Verify commands use `pnpm run <script>` not raw tool invocations (tsc, eslint, jest)
- [ ] No placeholder patterns: no TBD/TODO/implement-later, no "similar to Task N", no code steps without code
- [ ] SPRINT.md files created in phase directory
- [ ] Each plan has valid frontmatter including `files_modified:` array aggregating all `<files>` paths across tasks (consumed by execute.md intra-wave overlap checker)
- [ ] Each plan's `## Files Touched` section populated with create/modify/test lists
- [ ] Tasks are specific and actionable
- [ ] Every task has `<read_first>` with at least the file being modified
- [ ] Every task has `<files>` listing exact files this task will modify or create
- [ ] Every task has `<evidence>` with grep/lines/creates codebase grounding per issue #649 — not a prose checklist tag (none exists in the real plan schema)
- [ ] Every task has `<verify>` with an `<automated>` child containing at least one shell command (Dimension 8 blocker)
- [ ] Every task has `<done>` with a single observable acceptance sentence (Dimension 2 requirement)
- [ ] Every `<action>` contains concrete values (no "align X with Y" without specifying what)
- [ ] Tasks extending existing code have `<interfaces>` with relevant signatures
- [ ] Type/name consistency: function names, types, and method signatures match across all tasks (no rename drift)
- [ ] Dependencies correctly identified
- [ ] Waves assigned for parallel execution
- [ ] must_haves derived from phase goal
</quality_gate>

<self_review>
After writing the complete plan, review the spec with fresh eyes before handing off:

1. **Spec coverage** — skim each requirement in the phase goal / CONTEXT.md decisions. Can you point to a task that implements it? List any gaps; add tasks if needed.
2. **Placeholder scan** — search the plan for the no-placeholder patterns listed above. Fix any found inline.
3. **Type consistency** — check that function names, types, and method signatures used in later tasks match what earlier tasks define. A method called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

Fix issues inline. No sub-agent needed — this is a quick self-check before the sprint-checker runs.
</self_review>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="rcode-planner",
  model="{planner_model}",
  description="Plan Phase {phase}"
)
```


## Next Up

- `/rcode-execute` — execute the SPRINT.md the planner just produced
