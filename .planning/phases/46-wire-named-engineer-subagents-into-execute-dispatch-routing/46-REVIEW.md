---
status: issues_found
phase: 46
critical: 0
high: 0
medium: 1
low: 2
generated: 2026-08-06T11:56:51Z
---

# Phase 46 Code Review — Wire named-engineer subagents into execute dispatch routing

## Scope reviewed

- `rcode/workflows/execute.md` (`<available_agent_types>` allowlist addition + blank-line collapse)
- `rcode/workflows/execute-waves.md` (step 3 classification/routing logic)
- `.rcode/workflows/execute.md` (mirror)
- `.rcode/workflows/execute-waves.md` (mirror)
- Cross-checked: `git diff 063de75 1f082db -- <4 files>` (exact pre-phase → post-phase diff), `.rcode/_config/agent-manifest.csv`, `~/.claude/agents/`, `rcode/agents/rcode-{hanzla,yousef,haitham,omar}.md`

## Summary

The diff matches the plan (46-1-SPRINT.md) and SUMMARY.md claims exactly — verified via `git diff HEAD~5` for `execute.md` and `git diff 063de75 1f082db` for all four files: only the described additive lines and blank-line-run collapses are present, nothing else changed. `rcode/workflows/execute.md` ⟷ `.rcode/workflows/execute.md` are byte-identical (`diff -q` exit 0, 996 lines each, ≤1000-line CLAUDE.md cap respected, zero remaining double-blank-line runs). `rcode/workflows/execute-waves.md` ⟷ `.rcode/workflows/execute-waves.md` differ by exactly the pre-existing, intentionally-untouched 6-line "Pseudocode quality checklist" block — confirmed via `diff`. The `rcode-executor` fallback is genuinely preserved (`| other | rcode-executor |` row, plus the literal string still appears in prose/table, only the `Task(subagent_type=...)` call itself was parameterized). Both worktree-mode and sequential-mode Task() calls share the same parameterized `{subagent_type}` — sequential mode explicitly says it "uses the same structure as worktree mode," so no second hardcoded call was left behind. End-to-end sanity check: all four personas (`rcode-hanzla`/`rcode-yousef`/`rcode-haitham`/`rcode-omar`) are registered in `.rcode/_config/agent-manifest.csv` and installed under `~/.claude/agents/`, so routing to these `subagent_type` values will actually resolve rather than silently falling back to `general-purpose`.

No critical or high-severity issues. One medium-severity logical flaw in the classification heuristic itself, and two low-severity/cosmetic notes.

## Medium

### 1. Substring (not path-segment) matching in FRONTEND_GLOBS/BACKEND_GLOBS causes false-positive misclassification

**File:** `rcode/workflows/execute-waves.md:80-81` (and `.rcode/workflows/execute-waves.md:74-75`, identical text)

```
FRONTEND_GLOBS = ["*.tsx", "*.jsx", "*.css"] + paths containing "client" or "ui"
BACKEND_GLOBS  = paths containing "api", "server", "db", or "service"
```

"Paths containing X" is described as bare substring containment, not a path-segment or word-boundary match. Several common, plausible file/directory names contain these substrings incidentally:
- `"ui"` is a substring of `build/`, `guide`, `quick`, `require`, `prerequisite` — none of these are frontend-related paths, but each would flip `touches_frontend = true`.
- `"api"` is a substring of `rapid`, `capital`, `therapist` — e.g. a component file like `RapidLoader.tsx` or `CapitalizeText.tsx` would trip `touches_backend = true` purely from the filename, even though the file is also a `.tsx` frontend file. That combination silently produces `classification = "full-stack"` and routes to `rcode-hanzla` instead of the more accurate `rcode-haitham`, and — because the keyword-fallback only fires when classification is `"other"` — this false "full-stack" result is never corrected by the `<objective>` keyword fallback.
- `"db"` is a substring of `sandbox`, `adobe`, `handbook` — a purely-frontend file like `sandbox-utils.ts` would trip `touches_backend = true`.

**Impact:** graceful degradation only (the plan still gets executed, just by a less-ideal specialist persona, or misrouted to `rcode-hanzla`/`rcode-yousef` instead of `rcode-haitham`/vice versa) — not a hard failure, since every routed persona is a competent engineer and `rcode-executor` remains the safety net for true ambiguity. That's why this is medium, not high.

**Recommended fix:** match on path segments/boundaries instead of raw substring containment — e.g. `/ui/`, `-ui-`, `ui.` as directory/file-boundary patterns, or restrict "ui"/"api"/"db" to whole path segments (`path.split('/')` membership) rather than `str.includes()`. Since this is prose-pseudocode consumed by an LLM at runtime rather than compiled code, a lighter fix is acceptable: rephrase "paths containing X" to "path segments equal to X" or "directory named X" to steer the executing LLM away from literal substring matching.

## Low

### 2. New allowlist entries use a double-em-dash format, inconsistent with the block's existing single-dash convention

**File:** `rcode/workflows/execute.md:209-212` (and `.rcode/workflows/execute.md:209-212`)

The 11 pre-existing `<available_agent_types>` entries all follow `- {agent-name} — {one-line description}` (single em-dash separator), e.g.:
```
- rcode-executor — Executes plan tasks, commits, creates SUMMARY.md
```
The 4 new entries use two em-dashes each — `{agent-name} — {Title} — {role description}`:
```
- rcode-hanzla — Senior Full-Stack Engineer — full-stack plans spanning both frontend and backend
```
This is exactly what 46-1-SPRINT.md's task 46.1.1 literally specified, so it's not an execution deviation, but it breaks the convention documented in that same task's `<read_first>` ("11 existing entries, each one line: `- {agent-name} — {one-line description}`"). Not functionally harmful — this block is prose read by an LLM, not machine-parsed — but worth normalizing to a single em-dash (e.g. fold the title into the description: `rcode-hanzla — Senior Full-Stack Engineer for full-stack plans spanning both frontend and backend`) for visual/grep consistency with the other 11 entries.

### 3. FRONTEND_GLOBS/BACKEND_GLOBS omit common same-stack file extensions

**File:** `rcode/workflows/execute-waves.md:80-81` (and `.rcode/workflows/execute-waves.md:74-75`)

`FRONTEND_GLOBS` covers `*.tsx`/`*.jsx`/`*.css` but not `*.scss`/`*.less`/`*.vue`/`*.svelte`/`*.html`; `BACKEND_GLOBS` has no extension-based patterns at all (`*.py`, `*.go`, `*.sql`, `*.java`), relying entirely on directory/keyword substrings. A plan that only touches e.g. `styles/theme.scss` or `worker.py` would miss the glob match and fall through to the `<objective>` keyword fallback — which works, but only if the objective text happens to contain one of the listed keywords (React/component/UI/CSS/Tailwind/... or API/endpoint/database/schema/...). A plan with a terse objective and no glob match would land on `classification = "other"` → `rcode-executor`, which is the documented safety net, so this degrades gracefully rather than breaking — informational only, not a required fix for this phase.

## Not flagged (verified correct)

- Fallback preservation: `| other | rcode-executor |` row present in both source and mirror; `! grep -q 'subagent_type="rcode-executor"'` passes only because the *hardcoded call* was replaced — the identifier still appears in the routing table and prose, which is correct per the plan's own acceptance criteria.
- Task() prompt template integrity: `<worktree_branch_check>`, `<parallel_execution>` locking, `<execution_context>`, `<files_to_read>`, `<done_field_protocol>`, `<success_criteria>`, sequential-mode block, commit-lock logic, and steps 4–9 are byte-identical before/after (confirmed via full-file diff against `063de75`).
- Mirror consistency: `.rcode/workflows/execute.md` is byte-identical to `rcode/workflows/execute.md` (`diff -q` exit 0); `.rcode/workflows/execute-waves.md` differs from its source by exactly the pre-existing "Pseudocode quality checklist" block and nothing else.
- No accidental content deletion: `git diff 063de75 1f082db` for all four files shows only additive lines plus the 5 documented blank-line-run collapses (`-` lines are all blank).
- 1000-line cap: both `execute.md` files are 996 lines; zero runs of 2+ consecutive blank lines remain in either.
- Runtime resolvability: all four `subagent_type` values used in the routing table are registered in `.rcode/_config/agent-manifest.csv` and installed under `~/.claude/agents/`, so the routing is not a no-op.
