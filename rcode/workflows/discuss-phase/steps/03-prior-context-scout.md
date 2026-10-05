# discuss-phase - step 03: Load prior context, cross-reference todos, scout codebase

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="load_prior_context">
Read project-level and prior phase context to avoid re-asking decided questions and maintain consistency.

**Step 1: Read project-level files**

Only the sections actually used below are worth paying for — PROJECT.md and REQUIREMENTS.md are usually small, but STATE.md is a full `state.json` dump and can run into the tens of thousands of tokens, so never `cat` it whole:

```bash
# PROJECT.md — Vision, principles/non-negotiables, user preferences
awk '/^## /{p=(tolower($0) ~ /vision|principle|non-negotiable|rule|preference/)} p' .planning/PROJECT.md 2>/dev/null

# REQUIREMENTS.md — Acceptance criteria, constraints, must-haves vs nice-to-haves
awk '/^## /{p=(tolower($0) ~ /accept|constraint|must-have|scope/)} p' .planning/REQUIREMENTS.md 2>/dev/null

# STATE.md — Current progress only (milestone/phase/plan/sprint/blockers), not the raw JSON dump
node .rcode/bin/rcode-tools.cjs state get milestone current_phase current_plan current_sprint blockers 2>/dev/null
```

Extract from these:
- **PROJECT.md** — Vision, principles, non-negotiables, user preferences
- **REQUIREMENTS.md** — Acceptance criteria, constraints, must-haves vs nice-to-haves
- **STATE.md** — Current progress, any flags or session notes

**Step 2: Read prior CONTEXT.md files (most recent 5 phases — cap prevents context overflow)**
```bash
# Find CONTEXT.md files from phases before current, limit to 5 most recent
(find .planning/phases -name "*-CONTEXT.md" 2>/dev/null || true) | sort | tail -5
```

For each CONTEXT.md where phase number < current phase (max 5):
- Read the `<decisions>` section — these are locked preferences
- Read `<specifics>` — particular references or "I want it like X" moments
- Note any patterns (e.g., "user consistently prefers minimal UI", "user rejected single-key shortcuts")

**Step 3: Build internal `<prior_decisions>` context**

Structure the extracted information:
```
<prior_decisions>
## Project-Level
- [Key principle or constraint from PROJECT.md]
- [Requirement that affects this phase from REQUIREMENTS.md]

## From Prior Phases
### Phase N: [Name]
- [Decision that may be relevant to current phase]
- [Preference that establishes a pattern]

### Phase M: [Name]
- [Another relevant decision]
</prior_decisions>
```

**Usage in subsequent steps:**
- `analyze_phase`: Skip gray areas already decided in prior phases
- `present_gray_areas`: Annotate options with prior decisions ("You chose X in Phase 5")
- `discuss_areas`: Pre-fill answers or flag conflicts ("This contradicts Phase 3 — same here or different?")

**If no prior context exists:** Continue without — this is expected for early phases.
</step>

<step name="cross_reference_todos">
Check if any pending todos are relevant to this phase's scope. Surfaces backlog items that might otherwise be missed.

**Load and match todos:**
```bash
TODO_MATCHES=$(node ".rcode/bin/rcode-tools.cjs" todo match-phase "${PHASE_NUMBER}")
```

Parse JSON for: `todo_count`, `matches[]` (each with `file`, `title`, `area`, `score`, `reasons`).

**If `todo_count` is 0 or `matches` is empty:** Skip silently — no workflow slowdown.

**If matches found:**

Present matched todos to the user. Show each match with its title, area, and why it matched:

```
📋 Found {N} pending todo(s) that may be relevant to Phase {X}:

{For each match:}
- **{title}** (area: {area}, relevance: {score}) — matched on {reasons}
```

Use AskUserQuestion (multiSelect) asking which todos to fold into this phase's scope:

```
Which of these todos should be folded into Phase {X} scope?
(Select any that apply, or none to skip)
```

**For selected (folded) todos:**
- Store internally as `<folded_todos>` for inclusion in CONTEXT.md `<decisions>` section
- These become additional scope items that downstream agents (researcher, planner) will see

**For unselected (reviewed but not folded) todos:**
- Store internally as `<reviewed_todos>` for inclusion in CONTEXT.md `<deferred>` section
- This prevents future phases from re-surfacing the same todos as "missed"

**Auto mode (`--auto`):** Fold all todos with score >= 0.4 automatically. Log the selection.
</step>

<step name="scout_codebase">
Lightweight scan of existing code to inform gray area identification and discussion. Uses ~10% context — acceptable for an interactive session.

**Step 1: Check for existing codebase maps**
```bash
ls .planning/codebase/*.md 2>/dev/null || true
```

**If codebase maps exist:** Read the most relevant ones (CONVENTIONS.md, STRUCTURE.md, STACK.md based on phase type). Extract:
- Reusable components/hooks/utilities
- Established patterns (state management, styling, data fetching)
- Integration points (where new code would connect)

Skip to Step 3 below.

**Step 2: If no codebase maps, do targeted grep**

Extract key terms from the phase goal (e.g., "feed" → "post", "card", "list"; "auth" → "login", "session", "token").

```bash
# Find files related to phase goal terms
grep -rl "{term1}\|{term2}" src/ app/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -10 || true

# Find existing components/hooks
ls src/components/ 2>/dev/null || true
ls src/hooks/ 2>/dev/null || true
ls src/lib/ src/utils/ 2>/dev/null || true
```

Read the 3-5 most relevant files to understand existing patterns.

**Step 3: Build internal codebase_context**

From the scan, identify:
- **Reusable assets** — existing components, hooks, utilities that could be used in this phase
- **Established patterns** — how the codebase does state management, styling, data fetching
- **Integration points** — where new code would connect (routes, nav, providers)
- **Creative options** — approaches the existing architecture enables or constrains

Store as internal `<codebase_context>` for use in analyze_phase and present_gray_areas. This is NOT written to a file — it's used within this session only.
</step>

Next: Read `.rcode/workflows/discuss-phase/steps/04-analyze-present-advisor.md` before starting it (skip it if its Read-when condition is false).
