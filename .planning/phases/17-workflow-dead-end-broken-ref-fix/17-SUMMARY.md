---
phase: 17
status: complete
completed: 2026-05-01
commit: TBD
---

# Phase 17 — Workflow Dead-End & Broken-Ref Fix

## What was done

Closed all dead-end, broken-ref, and orphan gaps in `rihal/workflows/` surfaced by dogfood audit on 2026-05-01.

Note: Two gaps were fixed before this phase was registered (init.md RIHLA.md recovery + execute.md add-tests offer). This phase closed the remaining 18.

## Files changed

**Wave 1 — Dead ends fixed (On Completion added):**
- rihal/workflows/add-todo.md
- rihal/workflows/debug.md
- rihal/workflows/diff.md
- rihal/workflows/session-report.md
- rihal/workflows/show.md
- rihal/workflows/audit-fix.md
- rihal/workflows/memory-distill.md
- rihal/workflows/review-adversarial.md
- rihal/workflows/workstream.md

**Wave 2 — Missing chains fixed:**
- rihal/workflows/scan.md — On Completion section added
- rihal/workflows/verify-work.md — gap-closure routing to execute + add-tests added

**Wave 3 — Thin workflow stubs created (6 new files):**
- rihal/workflows/create-prd.md
- rihal/workflows/edit-prd.md
- rihal/workflows/validate-prd.md
- rihal/workflows/create-architecture.md
- rihal/workflows/scaffold-project.md
- rihal/workflows/retrospective.md

**Wave 4 — Orphaned workflows surfaced in help.md:**
- rihal/workflows/help.md — 11 entries added (karpathy-audit, check-implementation-readiness, review-edge-case-hunter, diagnose-issues, discuss-phase-power, new-project-research, new-project-roadmap, memory-init, memory-update, memory-audit, memory-distill)

**Planning:**
- .planning/ROADMAP.md — Phase 17 registered
- .planning/phases/17-workflow-dead-end-broken-ref-fix/17-1-SPRINT.md
- .planning/phases/17-workflow-dead-end-broken-ref-fix/17-SUMMARY.md

## Outcome

Every workflow in rihal/workflows/ now has a path forward for the user. No more silent completions with no next step.
