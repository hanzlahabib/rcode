<purpose>
Sub-step of plan.md — Step 8 Spawn rihal-planner Agent. Spawns rihal-planner with full context to generate SPRINT.md plans. Includes deep-work rules and downstream consumer spec.
</purpose>

<filename_convention>
Issue #657 — every SPRINT.md, including the first plan in a phase, uses the
sequence-numbered form `{phase}-{plan}-SPRINT.md` (no leading zeros per #652).
Examples: `8-1-SPRINT.md`, `8-2-SPRINT.md`. Do NOT emit a bare `{phase}-SPRINT.md`
or `{phase}-PLAN.md` for the first plan — that creates an inconsistent series
when a second plan is added later. The plan-number computation in plan.md uses
`NEXT_PLAN_NUMBER=$((EXISTING_PLAN_COUNT + 1))` and starts at 1 for new phases.
</filename_convention>

## 8. Spawn rihal-planner Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► PLANNING PHASE {X}
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

<files_to_read>
- {state_path} (Project State)
- {roadmap_path} (Roadmap)
- {requirements_path} (Requirements)
- {context_path} (USER DECISIONS from /rihal-discuss-phase — read `<decisions>` for locked choices AND `<code_context>` for existing code patterns, reusable assets, and architectural notes gathered during discuss-phase)
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
Output consumed by /rihal-execute. Plans need:
- Frontmatter (wave, depends_on, autonomous, **files_modified** — aggregated list of all file paths from `<files>` blocks across every task; used by executor for intra-wave parallel-safety overlap detection)
- Tasks in XML format with read_first, files, acceptance_criteria, verify (with `<automated>` child), and done fields (MANDATORY on every task)
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<deep_work_rules>
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

3. **`<acceptance_criteria>`** — Verifiable conditions that prove the task was done correctly. Rules:
   - Every criterion must be checkable with grep, file read, test command, or CLI output
   - NEVER use subjective language ("looks correct", "properly configured", "consistent with")
   - ALWAYS include exact strings, patterns, values, or command outputs that must be present
   - Examples:
     - Code: `auth.py contains def verify_token(` / `test_auth.py exits 0`
     - Config: `.env.example contains DATABASE_URL=` / `Dockerfile contains HEALTHCHECK`
     - Docs: `README.md contains '## Installation'` / `API.md lists all endpoints`
     - Infra: `deploy.yml has rollback step` / `docker-compose.yml has healthcheck for db`

4. **`<verify>`** — Shell commands that PROVE the acceptance criteria are met. Run by executor after task completes and by verifier during post-execution check. The block MUST contain an `<automated>` child with the exact commands to run (Dimension 8 hard-blocks without it). Rules:
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
- [ ] SPRINT.md files created in phase directory
- [ ] Each plan has valid frontmatter including `files_modified:` array aggregating all `<files>` paths across tasks (consumed by execute.md intra-wave overlap checker)
- [ ] Tasks are specific and actionable
- [ ] Every task has `<read_first>` with at least the file being modified
- [ ] Every task has `<files>` listing exact files this task will modify or create
- [ ] Every task has `<acceptance_criteria>` with grep-verifiable conditions
- [ ] Every task has `<verify>` with an `<automated>` child containing at least one shell command (Dimension 8 blocker)
- [ ] Every task has `<done>` with a single observable acceptance sentence (Dimension 2 requirement)
- [ ] Every `<action>` contains concrete values (no "align X with Y" without specifying what)
- [ ] Tasks extending existing code have `<interfaces>` with relevant signatures
- [ ] Dependencies correctly identified
- [ ] Waves assigned for parallel execution
- [ ] must_haves derived from phase goal
</quality_gate>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="rihal-planner",
  model="sonnet",
  model="{planner_model}",
  description="Plan Phase {phase}"
)
```

