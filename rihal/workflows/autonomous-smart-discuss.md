<purpose>
Sub-step of autonomous.md — smart discuss loop for a single phase. Proposes grey area answers in batch tables; user accepts or overrides. Produces identical CONTEXT.md output to regular discuss-phase.
</purpose>

<step name="smart_discuss">

## Smart Discuss

Run smart discuss for the current phase. Proposes grey area answers in batch tables — the user accepts or overrides per area. Produces identical CONTEXT.md output to regular discuss-phase.

**Inputs:** `PHASE_NUM` (local loop alias for `PHASE_NUMBER` from the iterate loop) from execute_phase. Resolve phase paths:

```bash
PHASE_NUM="${PHASE_NUM}"  # local alias; other workflows use PHASE_NUMBER from init JSON
PADDED_PHASE=$(printf "%02d" "${PHASE_NUM%.*}")
PHASE_DIR=".planning/phases/${PADDED_PHASE}-${PHASE_SLUG}"
```

---

### Sub-step 1: Load prior context

Read project-level and prior phase context to avoid re-asking decided questions.

**Read project files:**

```bash
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/STATE.md 2>/dev/null || true
```

Extract from these:
- **PROJECT.md** — Vision, principles, non-negotiables, user preferences
- **REQUIREMENTS.md** — Acceptance criteria, constraints, must-haves vs nice-to-haves
- **STATE.md** — Current progress, decisions logged so far

**Read prior CONTEXT.md files (most recent 5 phases — cap prevents context overflow on large projects):**

```bash
(find .planning/phases -name "*-CONTEXT.md" -o -name "CONTEXT.md" 2>/dev/null || true) | sort | tail -5
```

For each CONTEXT.md where phase number < current phase (max 5):
- Read the `<decisions>` section — these are locked preferences
- Read `<specifics>` — particular references or "I want it like X" moments
- Note patterns (e.g., "user consistently prefers minimal UI", "user rejected verbose output")

**Build internal prior_decisions context** (do not write to file).

If no prior context exists, continue without — expected for early phases.

---

### Sub-step 2: Scout Codebase

Lightweight codebase scan to inform grey area identification. Keep under ~5% context.

**Check for existing codebase maps:**

```bash
ls .planning/codebase/*.md 2>/dev/null || true
```

**If codebase maps exist:** Read the most relevant ones (CONVENTIONS.md, STRUCTURE.md, STACK.md based on phase type).

**If no codebase maps, do targeted grep:**

```bash
grep -rl "{term1}\|{term2}" src/ app/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -10 || true
ls src/components/ src/hooks/ src/lib/ src/utils/ 2>/dev/null || true
```

Read the 3-5 most relevant files to understand existing patterns.

**Build internal codebase_context** (do not write to file):
- **Reusable assets** — existing components, hooks, utilities usable in this phase
- **Established patterns** — how the codebase does state management, styling, data fetching
- **Integration points** — where new code connects (routes, nav, providers)

---

### Sub-step 3: Analyze Phase and Generate Proposals

Extract `goal`, `requirements`, `success_criteria` from ROADMAP.md for this phase.

**Infrastructure detection — check FIRST:**

A phase is pure infrastructure when ALL are true:
1. Goal keywords match: "scaffolding", "plumbing", "setup", "configuration", "migration", "refactor", "rename", "restructure", "upgrade", "infrastructure"
2. AND success criteria are all technical: "file exists", "test passes", "config valid", "command runs"
3. AND no user-facing behavior is described (no "users can", "displays", "shows", "presents")

**If infrastructure-only:** Skip Sub-step 4. Jump directly to Sub-step 5 with minimal CONTEXT.md. Display:

```
Phase ${PHASE_NUM}: Infrastructure phase — skipping discuss, writing minimal context.
```

**If NOT infrastructure — generate grey area proposals:**

Determine domain type from the phase goal:
- Something users **SEE** → visual: layout, interactions, states, density
- Something users **CALL** → interface: contracts, responses, errors, auth
- Something users **RUN** → execution: invocation, output, behavior modes, flags
- Something users **READ** → content: structure, tone, depth, flow
- Something being **ORGANIZED** → organization: criteria, grouping, exceptions, naming

Check prior_decisions — skip grey areas already decided in prior phases.

Generate **3-4 grey areas** with **~4 questions each**. For each question:
- **Pre-select a recommended answer** based on: prior decisions, codebase patterns, domain conventions, ROADMAP success criteria
- Generate **1-2 alternatives** per question
- **Annotate** with prior decision context and code context

---

### Sub-step 4: Present Proposals Per Area

Present grey areas **one at a time**. For each area (M of N), display a table:

```
### Grey Area {M}/{N}: {Area Name}

| # | Question | ✓ Recommended | Alternative(s) |
|---|----------|---------------|-----------------|
| 1 | {question} | {answer} — {rationale} | {alt1}; {alt2} |
| 2 | {question} | {answer} — {rationale} | {alt1} |
| 3 | {question} | {answer} — {rationale} | {alt1}; {alt2} |
| 4 | {question} | {answer} — {rationale} | {alt1} |
```

Then prompt via **AskUserQuestion**:
- **header:** "Area {M}/{N}"
- **question:** "Accept these answers for {Area Name}?"
- **options:** Build dynamically — always "Accept all" first, then "Change Q1" through "Change QN" for each question (up to 4), then "Discuss deeper" last. Cap at 6 explicit options max.

**On "Accept all":** Record all recommended answers. Move to next area.

**On "Change QN":** Use AskUserQuestion with the alternatives for that specific question:
- **options:** List the 1-2 alternatives plus "You decide" (maps to Claude's Discretion)

Record the user's choice. Re-display updated table. Re-present acceptance prompt.

**On "Discuss deeper":** Switch to interactive mode — ask questions one at a time using AskUserQuestion with 2-3 concrete options per question plus "You decide". After 4 questions, prompt:
- **options:** "More questions" / "Next area"

**On "Other" (free text):** Interpret as a change request or general feedback. Incorporate, re-display, re-present.

**Scope creep handling:** If user mentions something outside the phase domain:

```
"{Feature} sounds like a new capability — that belongs in its own phase.
I'll note it as a deferred idea.

Back to {current area}: {return to current question}"
```

Track deferred ideas internally for inclusion in CONTEXT.md.

---

### Sub-step 5: Write CONTEXT.md

After all areas are resolved (or infrastructure skip), write the CONTEXT.md file.

**File path:** `${PHASE_DIR}/${PADDED_PHASE}-CONTEXT.md`

Use **exactly** this structure:

```markdown
# Phase {PHASE_NUM}: {Phase Name} - Context

**Gathered:** {date}
**Status:** Ready for planning

<domain>
## Phase Boundary

{Domain boundary statement from analysis}

</domain>

<decisions>
## Implementation Decisions

### {Area 1 Name}
- {Accepted/chosen answer for Q1}
- {Accepted/chosen answer for Q2}

### {Area 2 Name}
- {Accepted/chosen answer for Q1}

### Claude's Discretion
{Any "You decide" answers collected}

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- {From codebase scout}

### Established Patterns
- {From codebase scout}

### Integration Points
- {From codebase scout}

</code_context>

<specifics>
## Specific Ideas

{Any specific references from discussion}
{If none: "No specific requirements — open to standard approaches"}

</specifics>

<deferred>
## Deferred Ideas

{Ideas captured but out of scope}
{If none: "None — discussion stayed within phase scope"}

</deferred>
```

Write the file.

**Commit (guarded):**

```bash
git add "${PHASE_DIR}/${PADDED_PHASE}-CONTEXT.md" 2>/dev/null \
  && git commit -m "docs(${PADDED_PHASE}): smart discuss context" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — context written, not committed"
```

Display confirmation:

```
Created: {path}
Decisions captured: {count} across {area_count} areas
```

</step>
