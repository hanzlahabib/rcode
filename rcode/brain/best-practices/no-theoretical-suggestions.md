# No Theoretical Suggestions Rule

Referenced by all agents that propose plans, file changes, or implementation steps.

## The Rule

**Every suggestion, plan, or implementation step must be grounded in what actually exists in the codebase.** Never propose a change based on assumed structure, naming conventions, documentation, or what "probably" exists.

## What This Means in Practice

Before including any file path, function name, config key, or field in a plan:

1. Confirm it exists — use `Read`, `grep`, `find`, or `glob`.
2. If it doesn't exist, say so explicitly: "this doesn't exist yet."
3. Only then decide whether to create it (if the user asked) or report the gap (if they didn't).

## The Test

Could every line of your plan be traced to a specific file and line number in the repo right now? If not, the plan contains theoretical content — do not ship it.

## Failure Pattern to Avoid

- Agent reads an investigation doc or workflow description.
- Agent produces a plan based on what the doc *says* should exist.
- Agent never verifies the described files/fields/functions actually exist.
- Plan references symbols that are missing, misnamed, or not yet implemented.
- Execution fails or produces wrong results.

This pattern is forbidden. Investigation documents describe intent, not ground truth. Code is ground truth.

## Correct Behavior

```
# WRONG — theoretical
"Fix the force_web_search toggle in backend/config.py"
(without checking if force_web_search actually exists in that file)

# RIGHT — grounded
grep -r "force_web_search" backend/
→ no results
→ "force_web_search doesn't exist in the codebase yet. The investigation doc was theoretical. Here's what actually exists: ..."
```

## When You Can't Find Something

- Do NOT assume it's in a different file or under a different name.
- Do NOT write a plan that assumes you'll find it later.
- STOP and report: "I searched for X and found nothing. Either it doesn't exist yet or the investigation was theoretical."

## Applies To

- `rcode-planner` — every task in SPRINT.md must reference real files
- `rcode-executor` — read the target file before writing any change
- `rcode-phase-researcher` — cite actual code paths, not presumed ones
- `rcode-sprint-checker` — flag plans that reference non-existent symbols
- All council agents — proposals must name real constraints, not theoretical ones
