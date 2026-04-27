# Plan Revision Loop

When `workflow.plan_checker` is enabled (`/rihal-settings`), `/rihal-plan`
runs the rihal-plan-checker after the planner. Findings drive a bounded
revision loop:

1. Planner produces PLAN.md.
2. Plan-checker scores against goal-backward criteria.
3. If BLOCK / FLAG: planner revises with the findings as added input.
4. Up to 2 revision rounds. After that, surface to user for manual
   confirmation rather than loop indefinitely.
