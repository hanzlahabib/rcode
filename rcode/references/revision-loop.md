# Revision Loop

When a plan is reviewed (by `rcode-plan-checker`, by a council, or by the user) and the verdict is "needs changes", the planner must run the revision loop — not silently accept the feedback and move on.

## The loop

1. **Receive feedback.** Capture every reviewer concern as a structured list:
   - Source (which reviewer / agent / user)
   - Concern (one-sentence summary)
   - Suggested change (if any)
   - Severity (blocker / warning / suggestion)

2. **Triage.** For each concern, classify:
   - **Accept** — change the plan as suggested.
   - **Counter** — disagree, document why, keep original plan.
   - **Defer** — out of scope for this phase; file as follow-up.

3. **Apply.** Make the accepted changes to SPRINT.md. Mark the diff in a "Revision N" section so reviewers can see what changed.

4. **Re-circulate.** Send the revised plan back to the reviewer that surfaced the blocker. If a council reviewed, send to the same panel.

5. **Iterate or proceed.**
   - All blockers resolved → proceed to execute.
   - Any blocker still standing → either escalate (to user) or stop the phase.

## Loop bound

Three revisions is the soft cap. If a plan needs four revisions, the underlying disagreement isn't about the plan — it's about scope, requirements, or strategy. Halt the loop, run `/rcode-discuss-phase` or `/rcode-council` to resolve the upstream disagreement, then start a fresh plan.

## What never happens

- Silent acceptance. If a concern is rejected ("counter"), it's documented with a reason in the SPRINT.md revision history.
- Blanket revisions. Each round addresses specific concerns from specific reviewers. Don't bundle "various improvements" into a single revision.
- Skipping the loop because the planner thinks they know better. The loop exists because reviewers catch what planners miss.

## Output of the loop

A SPRINT.md with a "Revision history" section showing each round, what changed, and who signed off. This becomes the audit trail when the phase ships and someone asks "why did we build it this way?"
