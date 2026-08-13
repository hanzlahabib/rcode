## Dimension 1: Requirement Coverage

**Question:** Does every phase requirement have task(s) addressing it?

**Process:**
1. Extract phase goal from ROADMAP.md
2. Extract requirement IDs from ROADMAP.md `**Requirements:**` line for this phase (strip brackets if present)
3. Verify each requirement ID appears in at least one plan's `requirements` frontmatter field
4. For each requirement, find covering task(s) in the plan that claims it
5. Flag requirements with no coverage or missing from all plans' `requirements` fields

**FAIL the verification** if any requirement ID from the roadmap is absent from all plans' `requirements` fields. This is a blocking issue, not a warning.

**Red flags:**
- Requirement has zero tasks addressing it
- Multiple requirements share one vague task ("implement auth" for login, logout, session)
- Requirement partially covered (login exists but logout doesn't)

**Example issue:**
```yaml
issue:
  dimension: requirement_coverage
  severity: blocker
  description: "AUTH-02 (logout) has no covering task"
  plan: "16-01"
  fix_hint: "Add task for logout endpoint in plan 01 or new plan"
```

## Dimension 2: Task Completeness

**Question:** Does every task have Files + Action + Verify + Done?

**Process:**
1. Parse each `<task>` element in SPRINT.md
2. Check for required fields based on task type
3. Flag incomplete tasks

**Required by task type:**
| Type | Files | Action | Verify | Done |
|------|-------|--------|--------|------|
| `auto` | Required | Required | Required | Required |
| `checkpoint:*` | N/A | N/A | N/A | N/A |
| `tdd` | Required | Behavior + Implementation | Test commands | Expected outcomes |

**Red flags:**
- Missing `<verify>` — can't confirm completion
- Missing `<done>` — no acceptance criteria
- Vague `<action>` — "implement auth" instead of specific steps
- Empty `<files>` — what gets created?
- `<verify>` present but not semantically capable of proving the task's claim — see check below

**Check — Verify Semantically Matches Claim (links to Dimension 6):**
Presence of `<verify>` is not enough. Cross-check it against the must_haves truth the task claims to satisfy (Dimension 6):
- If the task's `<action>` implements user-observable behavior (login, checkout, search, any flow a user drives), a `<verify>` consisting only of build/lint/typecheck commands (`npm run build`, `tsc --noEmit`, `eslint`, `echo done`) does **not** satisfy this dimension — it proves the code compiles, not that the behavior works.
- Require instead an assertion against actual output/behavior: a curl/HTTP call checking status/body, a test that exercises the route or flow, or an explicit manual-verification checkpoint (`checkpoint:*` task type).
- Flag as blocker: "Task N's <verify> only compiles/lints but action implements user-facing behavior X — no assertion on actual behavior."

**Check — Required States for Dynamic-Data Components:**
If a task's `<action>` creates or modifies a component that fetches or
displays dynamic data (a list, dashboard, detail page — check for
fetch/query/API-call language in the action), its `<action>` and `<done>`
must each name all four states: loading, empty, error, populated. A task
whose `<done>` only describes the populated case ("shows the list of items")
is incomplete — flag as blocker, not warning, since a missing empty/error
state is a real UX gap a user will hit, not a style nitpick.
- Flag as blocker: "Task N's component fetches/displays dynamic data but `<action>`/`<done>` only cover the populated case — no loading/empty/error state defined."
- Exception: if WIREFRAMES.md exists (`/rcode-ui-phase` output) and already defines the four states for this screen, a task that references WIREFRAMES.md instead of re-listing them inline is fine — check WIREFRAMES.md's entry for this screen before flagging.

**Example issue:**
```yaml
issue:
  dimension: task_completeness
  severity: blocker
  description: "Task 2 missing <verify> element"
  plan: "16-01"
  task: 2
  fix_hint: "Add verification command for build output"
```

**Example issue — verify doesn't prove the claim:**
```yaml
issue:
  dimension: task_completeness
  severity: blocker
  description: "Task 3 implements login flow but <verify> only runs `npm run build`"
  plan: "16-01"
  task: 3
  fix_hint: "Replace with a curl against /api/login checking 200 + session cookie, or a test exercising the login route"
```

## Dimension 3: Dependency Correctness

**Question:** Are plan dependencies valid and acyclic?

**Process:**
1. Parse `depends_on` from each plan frontmatter
2. Build dependency graph
3. Check for cycles, missing references, future references

**Red flags:**
- Plan references non-existent plan (`depends_on: ["99"]` when 99 doesn't exist)
- Circular dependency (A -> B -> A)
- Future reference (plan 01 referencing plan 03's output)
- Wave assignment inconsistent with dependencies

**Dependency rules:**
- `depends_on: []` = Wave 1 (can run parallel)
- `depends_on: ["01"]` = Wave 2 minimum (must wait for 01)
- Wave number = max(deps) + 1

**Example issue:**
```yaml
issue:
  dimension: dependency_correctness
  severity: blocker
  description: "Circular dependency between plans 02 and 03"
  plans: ["02", "03"]
  fix_hint: "Plan 02 depends on 03, but 03 depends on 02"
```

## Dimension 4: Key Links Planned

**Question:** Are artifacts wired together, not just created in isolation?

**Process:**
1. Identify artifacts in `must_haves.artifacts`
2. Check that `must_haves.key_links` connects them
3. Verify tasks actually implement the wiring (not just artifact creation)

**Red flags:**
- Component created but not imported anywhere
- API route created but component doesn't call it
- Database model created but API doesn't query it
- Form created but submit handler is missing or stub
- New page/component has no task adding it to the router, nav, or an existing page's imports — unreachable by any user

**What to check:**
```
Component -> API: Does action mention fetch/axios call?
API -> Database: Does action mention Prisma/query?
Form -> Handler: Does action mention onSubmit implementation?
State -> Render: Does action mention displaying state?
Nav -> Route: For any new page/route/component in must_haves.artifacts, does a task action mention adding it to the router config, nav/sidebar, or an existing page's import?
```

A top-level UI artifact (page/route/component) with no Nav -> Route reference anywhere in the sprint's tasks is a blocker — internal wiring can be perfect while the feature stays unreachable by any user.

**Check — Role Access Defined (multi-role/SSO/compliance projects only):**
`roadmapper-playbook.md`'s "Enterprise Projects Need Auth Strategy and Role
Mapping Decided Up Front" rule requires every later phase adding a
user-facing route to include "role access defined for this route" as a
success criterion — explicitly NOT covered by `rcode-verifier`'s Level-5
Reachability check (which only confirms a page is linked from nav, not that
it's linked/gated correctly per role). If PROJECT.md/REQUIREMENTS.md show
more than one user role, cross-reference each new route in
`must_haves.artifacts` against the roadmap's role-to-screen mapping (IA.md or
ROADMAP.md's IA section — see roadmapper-playbook.md step 3b): does a task
state which roles can/cannot reach this route, or is role access left
undefined? A new route with no role-access statement anywhere in the sprint's
tasks is a blocker for multi-role projects — the same orphan-feature failure
as unreachable nav, just for authorization instead of discoverability.
- Flag as blocker: "Route {path} added with no role-access statement — roadmap's role mapping shows N roles but no task defines who can/cannot reach this route."

**Example issue:**
```yaml
issue:
  dimension: key_links_planned
  severity: warning
  description: "Chat.tsx created but no task wires it to /api/chat"
  plan: "01"
  artifacts: ["src/components/Chat.tsx", "src/app/api/chat/route.ts"]
  fix_hint: "Add fetch call in Chat.tsx action or create wiring task"
```

## Dimension 5: Scope Sanity

**Question:** Will plans complete within context budget?

**Process:**
1. Count tasks per plan
2. Estimate files modified per plan
3. Check against thresholds

**Thresholds:**
| Metric | Target | Warning | Blocker |
|--------|--------|---------|---------|
| Tasks/plan | 2-3 | 4 | 5+ |
| Files/plan | 5-8 | 10 | 15+ |
| Total context | ~50% | ~70% | 80%+ |

**Red flags:**
- Plan with 5+ tasks (quality degrades)
- Plan with 15+ file modifications
- Single task with 10+ files
- Complex work (auth, payments) crammed into one plan

**Example issue:**
```yaml
issue:
  dimension: scope_sanity
  severity: warning
  description: "Plan 01 has 5 tasks - split recommended"
  plan: "01"
  metrics:
    tasks: 5
    files: 12
  fix_hint: "Split into 2 plans: foundation (01) and integration (02)"
```

## Dimension 6: Verification Derivation

**Question:** Do must_haves trace back to phase goal?

**Process:**
1. Check each plan has `must_haves` in frontmatter
2. Verify truths are user-observable (not implementation details)
3. Verify artifacts support the truths
4. Verify key_links connect artifacts to functionality
5. Cross-reference each truth to a falsifiable `<verify>` command: for each `must_haves.truths` entry, search every task's `<verify>` block (across all plans in the sprint) for a command that could actually falsify that truth — a curl/HTTP assertion, a UI interaction test (playwright/cypress selector + assertion), or an explicit manual checkpoint script tied to the same feature. Wording alone (the truth "sounds" user-facing) does not count as a check.
6. If no task's `<verify>` traces to a truth, flag it as unverifiable — do not accept the phrasing as proof the behavior is tested.

**Check — Truth-to-Verify Traceability (do not rely on wording alone):**
Judging "user-observable" from phrasing is not a check — a planner can trivially write `"The auth system is secure"` without any task exercising login. Treat this the same way Dimension 12 cross-references evidence claims to grep hit counts:
1. For each `must_haves.truths` entry, extract the subject/action it claims (e.g., "user can log in", "search returns results").
2. Scan every task's `<verify>` block across the sprint's plans for a command whose target matches that subject — a route/endpoint the truth implies (`/api/login`, `/search`), a selector the truth implies (login form, search box), or a checkpoint script named for the same feature.
3. A match requires the `<verify>` command to actually exercise real input against the feature and assert on real output (status code, response body, rendered DOM state) — not just that the words in the truth and the `<verify>` block resemble each other.
4. No match found → the truth is **unverifiable**, regardless of how user-facing its wording sounds. Flag it; do not accept the phrasing as proof.

**Red flags:**
- Missing `must_haves` entirely
- Truths are implementation-focused ("bcrypt installed") not user-observable ("passwords are secure")
- Artifacts don't map to truths
- Key links missing for critical wiring
- Truth uses user-facing wording but no task's `<verify>` exercises the corresponding user path (e.g., "The auth system is secure" with no login/reject-bad-credentials check anywhere in the sprint) — unfalsifiable marketing language, not a verified outcome

**Severity rules:**
- **blocker:** a `must_haves.truths` entry has zero traceable `<verify>` command in any task across the sprint's plans
- **warning:** the traced `<verify>` command exists but only checks an implementation detail (e.g., process exits 0) rather than the user-observable behavior the truth claims

**Example issue:**
```yaml
issue:
  dimension: verification_derivation
  severity: warning
  description: "Plan 02 must_haves.truths are implementation-focused"
  plan: "02"
  problematic_truths:
    - "JWT library installed"
    - "Prisma schema updated"
  fix_hint: "Reframe as user-observable: 'User can log in', 'Session persists'"
```

**Example issue — untraceable truth:**
```yaml
issue:
  dimension: verification_derivation
  severity: blocker
  description: "Truth 'The auth system is secure' has no task <verify> that exercises login or rejects bad credentials"
  plan: "02"
  truth: "The auth system is secure"
  fix_hint: "Add a <verify> with a curl/HTTP assertion (e.g. POST /login with wrong password returns 401) or a UI test that logs in and confirms session state, then reference it from this truth"
```

## Dimension 7: Context Compliance (if CONTEXT.md exists)

**Question:** Do plans honor user decisions from /rcode-discuss-phase?

**Only check if CONTEXT.md was provided in the verification context.**

**Process:**
1. Parse CONTEXT.md sections: Decisions, the agent's Discretion, Deferred Ideas
2. Extract all numbered decisions (D-01, D-02, etc.) from the `<decisions>` section
3. For each locked Decision, find implementing task(s) — check task actions for D-XX references
4. Verify 100% decision coverage: every D-XX must appear in at least one task's action or rationale
5. Verify no tasks implement Deferred Ideas (scope creep)
6. Verify Discretion areas are handled (planner's choice is valid)

**Red flags:**
- Locked decision has no implementing task
- Task contradicts a locked decision (e.g., user said "cards layout", plan says "table layout")
- Task implements something from Deferred Ideas
- Plan ignores user's stated preference

**Example — contradiction:**
```yaml
issue:
  dimension: context_compliance
  severity: blocker
  description: "Plan contradicts locked decision: user specified 'card layout' but Task 2 implements 'table layout'"
  plan: "01"
  task: 2
  user_decision: "Layout: Cards (from Decisions section)"
  plan_action: "Create DataTable component with rows..."
  fix_hint: "Change Task 2 to implement card-based layout per user decision"
```

**Example — scope creep:**
```yaml
issue:
  dimension: context_compliance
  severity: blocker
  description: "Plan includes deferred idea: 'search functionality' was explicitly deferred"
  plan: "02"
  task: 1
  deferred_idea: "Search/filtering (Deferred Ideas section)"
  fix_hint: "Remove search task - belongs in future phase per user decision"
```

## Dimension 8: Nyquist Compliance

Skip if: `workflow.nyquist_validation` is explicitly set to `false` in config.json (absent key = enabled), phase has no RESEARCH.md, or RESEARCH.md has no "Validation Architecture" section. Output: "Dimension 8: SKIPPED (nyquist_validation disabled or not applicable)"

### Check 8e — VALIDATION.md Existence (Gate)

Before running checks 8a-8d, verify VALIDATION.md exists:

```bash
ls "${PHASE_DIR}"/*-VALIDATION.md 2>/dev/null
```

**If missing:** **BLOCKING FAIL** — "VALIDATION.md not found for phase {N}. Re-run `/rcode-plan {N} --research` to regenerate."
Skip checks 8a-8d entirely. Report Dimension 8 as FAIL with this single issue.

**If exists:** Proceed to checks 8a-8d.

### Check 8a — Automated Verify Presence

For each `<task>` in each plan:
- `<verify>` must contain `<automated>` command, OR a Wave 0 dependency that creates the test first
- If `<automated>` is absent with no Wave 0 dependency → **BLOCKING FAIL**
- If `<automated>` says "MISSING", a Wave 0 task must reference the same test file path → **BLOCKING FAIL** if link broken

### Check 8b — Feedback Latency Assessment

For each `<automated>` command:
- Full E2E suite (playwright, cypress, selenium) → **WARNING** — suggest faster unit/smoke test
- Watch mode flags (`--watchAll`) → **BLOCKING FAIL**
- Delays > 30 seconds → **WARNING**

### Check 8c — Sampling Continuity

Map tasks to waves. Per wave, any consecutive window of 3 implementation tasks must have ≥2 with `<automated>` verify. 3 consecutive without → **BLOCKING FAIL**.

### Check 8d — Wave 0 Completeness

For each `<automated>MISSING</automated>` reference:
- Wave 0 task must exist with matching `<files>` path
- Wave 0 plan must execute before dependent task
- Missing match → **BLOCKING FAIL**

### Dimension 8 Output

```
## Dimension 8: Nyquist Compliance

| Task | Plan | Wave | Automated Command | Status |
|------|------|------|-------------------|--------|
| {task} | {plan} | {wave} | `{command}` | ✅ / ❌ |

Sampling: Wave {N}: {X}/{Y} verified → ✅ / ❌
Wave 0: {test file} → ✅ present / ❌ MISSING
Overall: ✅ PASS / ❌ FAIL
```

If FAIL: return to planner with specific fixes. Same revision loop as other dimensions (max 3 loops).

## Dimension 9: Cross-Plan Data Contracts

**Question:** When plans share data pipelines, are their transformations compatible?

**Process:**
1. Identify data entities in multiple plans' `key_links` or `<action>` elements
2. For each shared data path, check if one plan's transformation conflicts with another's:
   - Plan A strips/sanitizes data that Plan B needs in original form
   - Plan A's output format doesn't match Plan B's expected input
   - Two plans consume the same stream with incompatible assumptions
3. Check for a preservation mechanism (raw buffer, copy-before-transform)

**Red flags:**
- "strip"/"clean"/"sanitize" in one plan + "parse"/"extract" original format in another
- Streaming consumer modifies data that finalization consumer needs intact
- Two plans transform same entity without shared raw source

**Severity:** WARNING for potential conflicts. BLOCKER if incompatible transforms on same data entity with no preservation mechanism.

## Dimension 10: CLAUDE.md Compliance

**Question:** Do plans respect project-specific conventions, constraints, and requirements from CLAUDE.md?

**Process:**
1. Read `./CLAUDE.md` in the working directory (already loaded in `<project_context>`)
2. Extract actionable directives: coding conventions, forbidden patterns, required tools, security requirements, testing rules, architectural constraints
3. For each directive, check if any plan task contradicts or ignores it
4. Flag plans that introduce patterns CLAUDE.md explicitly forbids
5. Flag plans that skip steps CLAUDE.md explicitly requires (e.g., required linting, specific test frameworks, commit conventions)

**Red flags:**
- Plan uses a library/pattern CLAUDE.md explicitly forbids
- Plan skips a required step (e.g., CLAUDE.md says "always run X before Y" but plan omits X)
- Plan introduces code style that contradicts CLAUDE.md conventions
- Plan creates files in locations that violate CLAUDE.md's architectural constraints
- Plan ignores security requirements documented in CLAUDE.md

**Skip condition:** If no `./CLAUDE.md` exists in the working directory, output: "Dimension 10: SKIPPED (no CLAUDE.md found)" and move on.

**Example — forbidden pattern:**
```yaml
issue:
  dimension: claude_md_compliance
  severity: blocker
  description: "Plan uses Jest for testing but CLAUDE.md requires Vitest"
  plan: "01"
  task: 1
  claude_md_rule: "Testing: Always use Vitest, never Jest"
  plan_action: "Install Jest and create test suite..."
  fix_hint: "Replace Jest with Vitest per project CLAUDE.md"
```

**Example — skipped required step:**
```yaml
issue:
  dimension: claude_md_compliance
  severity: warning
  description: "Plan does not include lint step required by CLAUDE.md"
  plan: "02"
  claude_md_rule: "All tasks must run eslint before committing"
  fix_hint: "Add eslint verification step to each task's <verify> block"
```

## Dimension 11: File References Verification

**Question:** Do plan tasks reference files and symbols that actually exist in the codebase?

**Critical issue this prevents:** Plans hallucinate file names and function names. Without verification, execution starts (switches branches, runs stash) before discovering the references don't exist.

**Process:**
1. For each task in each plan, extract file and symbol references from `<files>` and `<action>` elements
2. Use code-references.cjs utility to:
   - Extract candidate files matching pattern `\b[\w/.-]+\.(py|ts|tsx|js|jsx|md|yaml|yml|json|sh|cjs|mjs|rs|go|java|rb)\b`
   - Extract symbols (snake_case functions and CamelCase classes)
   - Extract file:line references
3. Verify each reference against the project root:
   - Files: `fs.existsSync(path.join(projectRoot, file))`
   - Symbols: `grep -r "\bsymbol\b" projectRoot` (sample across source files)
4. Calculate verification ratio: `verified / (verified + missing)`

**Verification invocation (Bash step before spawning planner):**
```bash
PLAN_TEXT=$(cat "$PLAN_PATH")
VERIFY_RESULT=$(node -e "
const cr = require('.rcode/bin/lib/code-references.cjs');
const fs = require('fs');
const text = fs.readFileSync('$PLAN_PATH', 'utf8');
const refs = cr.extractReferences(text);
const result = cr.verifyReferences(refs, process.cwd());
console.log(JSON.stringify(result, null, 2));
")
```

**Red flags:**
- Referenced file doesn't exist in current branch (file will not be found at execute time)
- Referenced symbol doesn't exist (function name is hallucinated)
- Verification ratio < 0.5 (more than half the references missing — plan is likely stale)
- File references in different branch or commit

**Severity rules:**
- **blocker:** `verified.ratio < 0.5` OR `missing.files.length > 0` → execution will fail immediately on branch switch
- **warning:** `verified.ratio >= 0.5 AND < 0.8` → some references missing, may require scope adjustment
- **info:** `verified.ratio >= 0.8` → most references ok, minor gaps

**Example issue:**
```yaml
issue:
  dimension: file_references_verification
  severity: blocker
  description: "Plan references nonexistent_file.py and imaginary_function() — verification ratio 0.2"
  plan: "01"
  missing_files:
    - "nonexistent_file.py"
  missing_symbols:
    - "imaginary_function"
  verified_ratio: 0.2
  fix_hint: "Plan was built on hallucinated findings. Re-run /rcode-debug to verify actual code state before replanning."
```

</verification_dimensions>

<verification_process>
