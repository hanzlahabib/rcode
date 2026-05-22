# Workflow: rihal-diagnose-issues

<purpose>
Reusable diagnosis subroutine called from /rihal-verify-work when
verification fails. Walks symptom → hypothesis → evidence → minimal
repro and returns a structured finding. Not a top-level command.
</purpose>

## Step 1 — Symptom capture

Record:
- failing assertion / log line / wrong output
- file:line where divergence first appears
- last commit before symptom appeared (`git log -S<token>`)

## Step 2 — Hypotheses

List 2–3 plausible causes. For each:
- a one-line predicted mechanism
- the cheapest test that would falsify it

## Step 3 — Evidence

Run the falsifying tests in cheapest-first order. Stop at the first
hypothesis that matches all evidence.

## Step 4 — Minimal repro

Reduce to the smallest input that still triggers the bug. Save under
`.planning/diagnostics/<slug>.md`.

## Step 5 — Hand-off

Return JSON: `{ root_cause, repro_path, suggested_fix }` to the caller.
