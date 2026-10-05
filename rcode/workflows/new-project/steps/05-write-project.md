# new-project - step 05: Write PROJECT.md

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 4. Write PROJECT.md

**If auto mode:** Synthesize from provided document. No "Ready?" gate was shown — proceed directly to commit.

Synthesize all context into `.planning/PROJECT.md`. If `.rcode/templates/project.md` exists, use it. Otherwise use this inline template:

```markdown
# Project: {name}

## What This Is

{1-2 sentence description}

## Core Value

{The ONE thing that must work}

## Requirements

### Validated

{For greenfield: "(None yet — ship to validate)"}
{For brownfield: list existing capabilities}

### Active

- [ ] {Requirement 1}
- [ ] {Requirement 2}
- [ ] {Requirement 3}

### Out of Scope (Non-Goals)

*What this project is NOT and will NOT do. This does outsized work downstream —
it is what prevents the "let me also add this nearby thing" failure at every
level: phase, sprint, task, and code. An unstated exclusion reappears later as a
gap; a stated one ends the argument before it starts.*

- {Exclusion 1} — {why}
- {Exclusion 2} — {why}

**Scope dial:** hobby/solo — the two or three things you keep being tempted by.
Internal tool — plus anything a stakeholder has already asked for and been told
no. Launch — plus the "we are not becoming X" statements about the product's
identity.

## Glossary

*Every domain noun this project uses, defined once. Downstream agents and
documents use these terms verbatim — introducing a synonym anywhere is a
discipline violation, because two names for one thing is how a codebase ends up
with two implementations of it.*

- **{Term}** — {definition}. {relationship to other terms, cardinality if it matters}

**Scope dial:** hobby/solo — only terms that are genuinely ambiguous, often 2-3.
Internal tool — every domain noun. Launch — every domain noun plus the ones the
team argues about.

## Key Decisions

| Decision | Premise (what makes it right) | Rationale | Outcome |
|----------|-------------------------------|-----------|---------|
| {Choice} | {the condition this rests on} | {Why} | — Pending |

*The **Premise** column is load-bearing. A decision is valid only while its
premise holds — when the project pivots, every decision whose premise the pivot
invalidated goes back to the user. A decision whose reason has expired is not
locked, it is stale.*

## Assumptions Index

*Every `[ASSUMPTION]` tag in this document and in REQUIREMENTS.md, gathered here
for explicit confirmation. An assumption the user never saw is a decision nobody
made.*

| # | Assumption | Where | Status |
|---|-----------|-------|--------|
| A-1 | {what was inferred} | §{section} | unconfirmed |

**This table is walked with the user before the document is treated as settled.**
Each row ends as confirmed, corrected, or deferred with an owner. Auto mode does
not skip the walk; it defers it to the first interactive turn.

**Scope dial:** the table exists at every stakes level. Hobby/solo may resolve it
in one exchange; launch resolves it row by row.

## Constraints

- {Budget / timeline / tech}

## Context

{Current state, tech stack, user feedback themes}

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/rcode-discuss-phase` + `/rcode-plan`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions, WITH its premise
5. "What This Is" still accurate? → Update if drifted
6. New domain nouns introduced? → Add to Glossary in the same pass
7. Any `[ASSUMPTION]` resolved or added? → Update the Assumptions Index
8. Did anything invalidate a recorded premise? → That decision reopens

**After each milestone** (via `/rcode-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
5. Assumptions Index — any row still `unconfirmed` after a whole milestone is a
   finding, not a formality. Resolve or escalate it
6. Key Decisions — check every premise still holds
7. **Memlog audit** — `rcode-tools.cjs memlog open` lists every assumption,
   override, and blocker logged during the milestone. Walk it: each one is
   captured in PROJECT.md, resolved, or explicitly deferred with an owner.
   Entries that survive a whole milestone unexamined are the ones that turn into
   "nobody knows why this is like this" 

---
*Last updated: {date} after initialization*
```

**Scale every section to the stakes answer from Step 3.** The template is one
document that serves a weekend project and a launch; the scope dials on each
section say how. Running the launch-grade depth on a hobby project is its own
failure — the user abandons the process, not the project.

| Stakes | PROJECT.md target |
|---|---|
| Hobby / solo | About a page. Glossary only where terms are ambiguous |
| Internal tool | Two to four pages. Every section present, lightly filled |
| Launch | As long as the requirements and concerns need |

Never pad a section to look thorough, and never drop one silently — if a section
genuinely does not apply, say so in one line where it would have been.

**For greenfield projects:** Initialize requirements as hypotheses (all Active).

**For brownfield projects (codebase map exists):** Read `.planning/codebase/ARCHITECTURE.md` and `STACK.md`. Identify what the codebase already does — these become the initial Validated set.

**Key Decisions:** Initialize with any decisions made during questioning.

Do not compress. Capture everything gathered.

**Commit PROJECT.md (guarded):**

```bash
mkdir -p .planning
if git check-ignore -q .planning/PROJECT.md 2>/dev/null; then
  echo "ℹ .planning/ gitignored — PROJECT.md written, not committed"
else
  git add .planning/PROJECT.md \
    && git commit -m "docs: initialize project" 2>/dev/null \
    || echo "ℹ PROJECT.md written; commit skipped (not a git repo or no change)"
fi
```

Next: Read `.rcode/workflows/new-project/steps/06-workflow-prefs.md` before starting it (skip it if its Read-when condition is false).
