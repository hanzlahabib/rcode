# Planner Playbook

Loaded by `rcode-planner` via `@-include`. Contains the full sprint
planning methodology: quick reference, task anatomy, SPRINT.md
templates, dependency graph rules, codebase discovery protocol,
file-existence verification, plan structure template, and constraints.

The agent stub holds the role definition, scope-driven sizing rules,
hierarchical ID format, and output routing.

## Quick Reference

### Context Fidelity
- **Locked Decisions** (CONTEXT.md): MUST implement exactly. Reference decision ID (D-01, D-02) in task actions.
- **Reference, don't restate.** A decision ID is a pointer, not a license to re-paste the rationale. `<action>` explains WHAT to do and cites the ID for WHY (`"per D-02's flattening rule"`) — it does not re-explain the decision's reasoning, alternatives, or findings inline. The full "why" already lives in CONTEXT.md/RESEARCH.md; the executor opens those if they need it. A task whose `<action>` reads like a design doc (multi-paragraph rationale, full alternatives-considered writeups) is a sign the planner copied instead of pointed — cut it down to the instruction + the ID.
- **Deferred Ideas**: MUST NOT appear in plans.
- **Agent's Discretion**: Use judgment, document choices.

### Discovery Levels
- **Level 0:** Pure internal, existing patterns only. Skip research.
- **Level 1:** Single known lib. Use Context7 resolve + query-docs (2-5 min).
- **Level 2:** Choose between 2-3 options. Route to discovery workflow (15-30 min).
- **Level 3:** Architecture decision, novel problem. Full research (1+ hour).

### Task Anatomy
- `<files>`: Exact paths (not "relevant components")
- `<action>`: Specific instructions, what to avoid & WHY
- `<verify>`: <automated> command < 60 sec (REQUIRED by Nyquist Rule)
- `<done>`: Measurable acceptance criteria
- `<evidence>`: **REQUIRED** (issue #649). Must show codebase grounding — at minimum one of:
    - `grep:` a literal grep/Glob pattern + count of matches that justified this task ("`rg '\\.alert' apps/web/src` → 13 hits across 9 files")
    - `lines:` exact `path:line-line` ranges of code being modified
    - `creates:` the file paths being created from scratch (with one-line justification why no existing file fits)
  A task without `<evidence>` is theoretical and MUST NOT be written.

### Task Types
| Type | When | Autonomy |
|------|------|----------|
| `auto` | Everything agent does independently | Fully autonomous |
| `checkpoint:human-verify` | Visual/functional verification | Pauses for user |
| `checkpoint:decision` | Implementation choices | Pauses for user |
| `checkpoint:human-action` | Unavoidable manual (2FA, auth link) | Pauses for user |

### Task Sizing
- **15-60 min:** Right size
- **< 15 min:** Combine with related task
- **> 60 min:** Split into smaller tasks

### TDD vs Standard
- **TDD (dedicated plan):** Can write `expect(fn(input)).toBe(output)` before `fn`. Complex business logic.
- **Standard:** UI layout, config, glue code, simple CRUD.

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Goal-backward methodology | `.rcode/agents-rules/planner/goal-backward-thinking.md` |
| Task templates by type | `.rcode/agents-rules/planner/task-templates.md` |
| Dependency analysis | `.rcode/agents-rules/planner/dependency-analysis.md` |
| Plan verification checklist | `.rcode/agents-rules/planner/plan-verification.md` |
| Common planning patterns | `.rcode/agents-rules/planner/common-patterns.md` |

Read ONLY when current task needs them. Don't preemptively load.

## SPRINT.md Frontmatter Template

**`rcode/templates/sprint.md` is the single canonical template — read it now, don't improvise a different structure.** It is not optional/decorative; it is what `execute-sprint.md`'s `owner_agent_resolution` step and its per-task dashboard-state-sync step parse via `grep '^owner:'`/`^phase:'`/`^sprint:'`. A SPRINT.md that free-styles a different structure (bold-label metadata, `### Story N — Title` headings, or any shape without the exact `phase:`/`sprint:`/`owner:` YAML frontmatter block) silently breaks that parsing — the sprint still executes and commits real code, but the dashboard never learns it happened (confirmed live, issue class closed by #1034-#1036's fixes — do not reintroduce it by drifting from the template).

**`owner:` field.** If this plan is grounded in a council session (a `.planning/council-sessions/council-*.md` file is referenced in `<context>` as the authoritative decision), set `owner:` to the id of that session's lead/highest-consensus technical persona for THIS sprint's dominant work — one of `haitham`, `hanzla`, `omar`, `waleed`, `yousef` (the engineer personas with execute permission; `sadiq`/`fatima`/others are advisory-only and never valid here). Pick by domain match: a sprint whose `files_modified` is mostly `src/routes|services|models` → `yousef` (backend); mostly `src/components|pages` → `haitham` (frontend); architecture-level, cross-cutting → `waleed`; general/full-stack with no clear split → `hanzla`. If there was no council session, or the domain split is genuinely ambiguous, omit `owner:` entirely — `execute-sprint.md` defaults to the generic `rcode-executor` when the field is absent. Do not guess an owner just to fill the field; an absent `owner:` is the correct, safe default.

## Dependency Graph Rules

**For each story:**
- What does it NEED before running?
- What does it CREATE for others?
- Can it run independently?

**Wave assignment:**
```
if depends_on is empty: wave = 1
else: wave = max(waves of dependencies) + 1
```

**Vertical slices (PREFER):** User feature (model+API+UI) as one plan. Parallel.
**Horizontal layers (AVOID):** All models, then all APIs, then all UIs. Sequential.

**File ownership:** No overlap in files_modified → can run parallel. Overlap → later depends on earlier.

## Codebase Discovery (BLOCKER — added after issue #649)

**Before writing any task body, you MUST query the actual codebase.** Plans built on
guessed file counts, imagined components, or "probably the dashboard does X" content
are theoretical and rejected by sprint-checker.

For every claim a task makes about the codebase, run a real query and capture the
result in the task's `<evidence>` field:

| Claim shape | Required query |
|---|---|
| "migrate N files away from X" | `rg -l '<X>' <scope>` — record exact file count + paths |
| "modify component Y" | `Read` the file; record `path:line-line` ranges |
| "replace pattern P" | `rg '<P>'` — record hit count + a representative match |
| "add Z where there's no Z today" | `rg '<Z>'` returning 0 hits is the evidence |
| "create new file F" | confirm F does NOT exist + state why no existing file fits |

**Hard stops:**

- Did NOT grep for a symbol the task says it modifies? → drop the task or mark as `<evidence>investigation needed</evidence>` BLOCKER.
- File count cited but never measured? → run the grep, write the real number, never use round numbers like "13 files" without a grep behind them.
- Claim references "the dashboard / the orders page / the POS" without reading the file? → Read the file first, cite line ranges.

**Smell test before writing each task:**
> "Could every line of this task body be traced back to a specific file and line in the repo?"
>
> If not, the task is theoretical. Drop it.

The orchestrator (`/rcode-plan`) MUST pass this checklist forward to sprint-checker
which fails the plan if any task lacks `<evidence>`.

## File-existence verification (BLOCKER — added in v3.1.0 after #441)

Before writing each entry into `files_modified`, you MUST verify the file actually exists in the project. Plans with fictional file names cause executors to scramble at runtime.

For every candidate path:

```bash
# Try the exact name first
test -f "<candidate>" && echo "OK" && exit 0

# Then try a fuzzy match for renamed/moved files
find . -type f \( -name "<basename>" -o -iname "*$<short-slug>*" \) \
  -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null
```

Apply these rules to every path you put in `files_modified`:

- **Exact match exists** → use the verified path verbatim
- **No exact match, fuzzy match found** → use the fuzzy match's path AND log a note in the SPRINT.md frontmatter (`renamed_from: <original candidate>`)
- **Neither exact nor fuzzy match** → DO NOT add the path to `files_modified`. Either:
  - Mark it as a CREATE story (the executor will create the file fresh) — set `creates: [<path>]` in the story body
  - OR raise a BLOCKER finding for sprint-checker to surface: file referenced by name but not present and not flagged for creation

Sprint-checker enforces this — see `rcode-sprint-checker.md` Mandatory Output Markers section. Plans that claim to modify non-existent files without a CREATE marker are rejected.

## Plan Structure

```markdown
---
phase: {phase}
plan_number: {N}
wave: {N}
depends_on: []
autonomous: true|false
files_modified: [...]
requirements: [...]
must_haves: {truths, artifacts, key_links}
---

## Sprint {phase}.{plan}: {one-line sprint goal, plain English, no jargon}

{2-4 sentence plain-English recap: what this sprint builds and why, written for someone who will never open the XML tags below}

**Tasks:**
1. {task 1 title, plain English — copy the <title> text verbatim, no XML}
2. {task 2 title}
3. {task N title}

_Below this line is the execution prompt the agent reads — task bodies, read-first file lists, verification commands. Not meant for skimming._

---

<objective>...</objective>
<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>
<context>...</context>
<tasks>
<task id="{phase}.{plan}.{N}" type="auto">
<title>...</title>
<read_first>...</read_first>
<files>...</files>
<action>...</action>
<verify><automated>...</automated></verify>
<done>...</done>
<evidence>...</evidence>
</task>
</tasks>
<verification>...</verification>
<success_criteria>...</success_criteria>
<output>Create `.planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md`</output>
```

**Summary block cost/rule:** the plain-English recap above the `---` divider is 1 title line + 2-4 sentences + a numbered list of task titles you're already writing for each `<title>` tag — copy, don't re-derive. Do not summarize `<action>` bodies, do not restate `<verify>` commands, do not add anything not already stated elsewhere in the file. If a sprint has more than ~10 tasks, list only the first 8 titles plus `...and N more (see tasks below)` rather than growing the summary unboundedly.

## Common Planning Mistakes to Avoid

1. **Empty requirements:** Every plan MUST list requirement IDs from ROADMAP. No empty requirements field.
2. **Vague tasks:** "Add authentication" → "Create POST /api/login with JWT, 15-min access, 7-day refresh"
3. **Missing verify:** Every task needs <automated> command < 60 sec (Nyquist Rule)
4. **Over-splitting:** Ticket-sized work → ONE plan, not three
5. **No dependency graph:** Tasks look independent but aren't
6. **Context anxiety:** Plans bloat when context > 50%. Keep to 2-3 tasks.
7. **Theoretical content (BLOCKER, issue #649):** Writing a task that names files, counts, components, or patterns you have not actually grepped or read. If you can't quote a real `path:line` or a real grep hit count, you are guessing. Drop the task or downgrade it to an investigation BLOCKER.

## Constraints

- Apply Karpathy guidelines (truthfulness, specificity, no fluff)
- Never produce vague, abstract task descriptions
- Document all design decisions (why library X not Y)
- Every locked decision (D-01, D-02) must appear in at least one task
- Every plan must address >= 1 requirement ID from ROADMAP
- No empty <requirements> field
