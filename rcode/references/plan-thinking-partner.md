# plan.md — Thinking Partner for Architectural Tradeoffs

Extracted from `plan.md` step 11. Only loaded when `features.thinking_partner` is enabled — see the conditional include at that point in `plan.md`.

If `features.thinking_partner` is enabled, scan the checker's issues for architectural tradeoff keywords
("architecture", "approach", "strategy", "pattern", "vs", "alternative"). If found:

```
The sprint-checker flagged an architectural decision point:
{issue description}

Brief analysis:
- Option A: {approach_from_plan} — {pros/cons}
- Option B: {alternative_approach} — {pros/cons}
- Recommendation: {choice} aligned with {phase_goal}

Apply this to the revision? [Yes] / [No, I'll decide]
```

If yes: include the recommendation in the revision prompt. If no: proceed to revision loop as normal.
