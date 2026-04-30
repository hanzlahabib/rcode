---
name: rihal-migrate
description: Plan and execute the move from MVP to production-grade infrastructure without rewriting from.
triggers:
  - "graduate the mvp"
  - "production grade infra"
  - "mvp to prod"
  - "scale this beyond demo"
  - "harden the stack"
  - "revamp the architecture"
  - "from prototype to product"
  - "ready for real users"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

MVPs are built to ship — corners get cut by design. Past a certain user count or revenue threshold, those cuts become tax: every new feature gets harder, every deploy is scary, every bug takes a day to root-cause. This skill plans the graduation in phases that ship continuously, never with a "we'll rewrite the whole thing" big bang.

## Workflow

1. **Audit the gaps.** Run a 30-minute MVP-vs-production gap report against the eight checks below.
2. **Triage by blast radius.** Which gap, if it stays, kills the next 3 sprints? Fix that one first. Cosmetic gaps wait.
3. **Plan in 1-week increments.** Each increment must leave the system shippable. No "we'll come back to fix this in 2 weeks" half-states.
4. **Bring the team along.** New patterns get documented in `decisions.md` and `glossary.md` so the next dev finds them.
5. **Each increment closes with a smoke-test deploy** and a metric showing the improvement.

## The eight production checks

For each: pass / partial / fail. "Partial" means it exists but isn't enforced; treat as fail for planning.

1. **Tests.** Unit + integration + at least one end-to-end happy-path test, all running in CI on every PR.
2. **CI/CD.** Push-to-deploy on a PR-merge basis, with a manual approval gate to production.
3. **Observability.** Errors land in Sentry (or equivalent) within 30s. Latency p95 graph exists. Logs are searchable.
4. **Authentication.** Real provider (Keycloak, Auth0, Clerk, Firebase). No "rolled our own JWT".
5. **Authorisation.** Tenant isolation enforced at the query layer, not just the URL.
6. **Database backups.** Automated, tested (restore drill within the last 90 days).
7. **Infrastructure as code.** Production reproducible from the repo (Helm + Terraform / Pulumi). No "I configured the load balancer manually".
8. **Documentation.** README + architecture diagram + change records. New devs onboard in <1 day.

## Gap → action mapping (defaults)

| Gap | First-week action | Skill to invoke |
|---|---|---|
| No tests | Cover the 3 most-used flows with E2E tests | `rihal-prove-it` |
| Manual deploys | Add GitHub Actions workflow that deploys on tag | `rihal-ci` |
| No Sentry | Drop in `@sentry/node` + `@sentry/nextjs`; PII redaction | `rihal-harden` |
| Hand-rolled JWT | Migrate to Keycloak / Clerk; flag old tokens for forced rotation | `rihal-harden` |
| Tenant leak risk | Add `tenant_id` to every query; enforce via Postgres RLS or middleware | `rihal-harden` |
| No backups | Configure automated `pg_dump` to S3 with 30-day retention | inline |
| Manual infra | Helm chart for the app + values per environment | `rihal-ci` |
| Stale README | Auto-generate architecture from code + write a 1-page onboarding | `rihal-trim` (for dead docs) |

## Output Format

```
MVP-vs-production gap report (<date>)

Pass:       <count> / 8
Partial:    <count>
Fail:       <count>

Critical gaps (block scaling):
  ✗ <gap> — <why this is critical now>

Plan (1-week increments):
  Week 1: <gap to close> — owner: <persona>
  Week 2: <gap to close> — owner: <persona>
  ...

Each week ends with: smoke-test deploy + metric showing improvement.
Each week is reversible: if anything goes sideways, the previous week's state ships fine.
```

## Examples

**Happy path** — Audit shows 3 gaps: no Sentry, manual deploys, no E2E tests. Week 1: add Sentry + PII filter. Week 2: GitHub Actions deploy-on-tag. Week 3: Playwright E2E for login + main flow. Each week ships independently.

**Edge case — partial backups** — `pg_dump` exists in cron but no one has tested restore. Treat as fail. Week's action: restore drill in a staging instance; document the runbook.

**Negative — "let's rewrite in $NEW_FRAMEWORK"** — Refuse. A rewrite is not graduation. Graduation means filling specific gaps in the current system. Rewrites take 6 months and break what worked.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (current state), `.rihal/memory/incidents/known-issues.md` (operational pain), `.rihal/memory/milestones/current.md`
- **Writes:** the gap report into `.rihal/memory/change-records/YYYYMMDD-NNN.md`; each week's plan as a phase entry under `.rihal/memory/milestones/current.md`
