---
name: rihal-mvp-graduate
description: Move an MVP to production-grade infrastructure incrementally.
triggers:
  - "graduate this mvp"
  - "mvp to prod plan"
  - "real users now"
  - "scale beyond demo"
  - "post-mvp infrastructure"
  - "revamp mvp"
  - "hardening pass"
  - "ready for production"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

This skill is the strategic version of `rihal-migrate`: same gap analysis, but framed as a multi-week plan with stakeholder sequencing rather than a one-week-per-gap engineering checklist. Use this when the conversation starts with the founder/CEO; use `rihal-migrate` when the conversation starts with the engineer.

## The graduation framework

### Phase A — Stop the bleeding (week 1)

If any of these are missing, ship them first. Skip the "feature factory" until they're in place.

1. **Sentry (or equivalent).** Until you can see what's breaking in production, every bug is a guess.
2. **Automated backups.** Daily. Tested restore. No "we have backups but never tried to use them".
3. **CI on every PR.** Even just "the tests pass". Manual deploys with no test gate is shipping blind.
4. **Single source of truth for env vars.** No "Hanzla has the prod env in his Notion".

### Phase B — Lock down auth + tenant isolation (weeks 2-3)

The Rihal incident makes this non-negotiable for anything multi-org.

1. Real auth provider (Keycloak / Clerk / Auth0). Drop hand-rolled JWT.
2. Tenant isolation enforced at the query layer (RLS or middleware), not the URL.
3. Run `rihal-auth-audit` end-to-end before declaring this phase done.

### Phase C — Operational maturity (weeks 4-5)

1. Healthchecks → liveness + readiness, distinct.
2. Resource limits → memory request = limit, no overcommit.
3. PodDisruptionBudget for replica > 1 deployments.
4. Logs are structured (JSON) and searchable.

### Phase D — Documentation + onboarding (week 6)

1. README that gets a new dev to a working local environment in < 1 day.
2. Architecture diagram (Mermaid in `docs/`, regenerated, not hand-drawn).
3. Runbooks for the 5 most common ops events (deploy, rollback, restart, restore, scale).
4. `.rihal/memory/` populated — this skill writes the project-summary as the deliverable.

### Phase E — Performance + cost (weeks 7-8)

Run `rihal-perf` against the top 5 slowest pages / queries. Do the cost math: which K8s pods are over-provisioned? Which queries are scanning when they could index?

## Stakeholder sequencing

Each phase has a different audience:

- Phase A: founder/CEO buy-in (it's not features, but it stops the bleeding)
- Phase B: legal / compliance / security (especially for government clients)
- Phase C: ops on-call (whoever wakes up at 3am)
- Phase D: future hires / external contributors
- Phase E: finance + perf-sensitive users

Sequence the conversations accordingly.

## Workflow

1. **Run `rihal-migrate`'s 8-check audit.** Output is the gap report.
2. **Map gaps to A-E phases.** Phase A first, no exceptions.
3. **Calendar the phases.** 1-2 weeks each, no parallel phases unless they're truly independent.
4. **Each week ends with a demo to the relevant stakeholder** — not just a Slack post.
5. **Persist the plan** to `.rihal/memory/milestones/current.md` so future sessions track progress.

## Output Format

```
MVP graduation plan — <project name>

Current state (MVP→prod gap report from rihal-migrate):
  Pass: <count> / 8
  Critical gaps: <list>

Plan:
  Phase A (week 1) — Stop the bleeding
    Owner: <stakeholder>
    Tasks: <list>

  Phase B (weeks 2-3) — Auth + tenant isolation
    ...

  Phase C-E ...

Risk register:
  - <risk> — <mitigation>

Demo schedule:
  Week 1: Sentry + backups working — demo to founder
  Week 3: tenant-isolation audit clean — demo to legal/security
  Week 6: new-dev onboarding < 1 day — demo with a real new dev
```

## Examples

**Happy path — government client product** — MVP shipped 6 months ago, 3 government clients now. Gap report: missing Sentry, hand-rolled JWT, no automated backups, no Helm chart. Phases A→D mapped over 6 weeks. Each phase signs off with a stakeholder.

**Edge case — pivoting MVP** — Founder wants to pivot. Run gap report anyway — even a pivoted MVP needs the same foundation. The pivot doesn't reset the technical floor.

**Negative — "let's just rewrite in $NEW_FRAMEWORK"** — Refuse. A rewrite isn't graduation, it's restart. Ship the foundation against the existing codebase first; rewrites can come later if the pivot demands it.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md`, `.rihal/memory/incidents/known-issues.md`, `.rihal/memory/people/stakeholders.md` (for sequencing)
- **Writes:** `.rihal/memory/milestones/current.md` (the graduation plan); `.rihal/memory/change-records/YYYYMMDD-NNN.md` (the kickoff change record)
