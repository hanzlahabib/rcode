---
name: rcode-deploy-unify
description: Detect and unify multiple deployment paths in a single project.
triggers:
  - "deploy unify"
  - "multiple deploy paths"
  - "which deploy is production"
  - "deploy chaos"
  - "consolidate deployments"
  - "kubernetes vs compose"
  - "single deploy path"
  - "deployment audit"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

Multiple deploy paths is a shipping-risk multiplier. Every path is one more thing that can drift from the others, deploy stale code, or "I thought you ran it" through ops. The rcode Siraaj incident was a textbook case — Docker Compose for some services, Helm for others, manual `ssh && pull` for the rest, and no one knew which combination was production.

## Workflow

1. **Inventory every deploy path.** Look in:
   - `docker-compose.yml`, `docker-compose.*.yml`
   - `helm/`, `charts/`, `k8s/`
   - `Makefile`, `scripts/deploy*`
   - `.github/workflows/deploy*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`
   - Vercel / Netlify project links
   - Anything in `infra/` or `deployment/`
2. **Classify each:** dev / staging / production. If you can't classify it, that's the bug.
3. **Identify drift.** For each pair (dev↔staging, staging↔prod):
   - Different env vars?
   - Different image tags?
   - Different replica counts?
   - Different healthchecks?
   - Different secret-management?
4. **Pick ONE canonical path per environment.** Helm + values per env is the rcode default. Compose is dev-only. No "and also a Jenkinsfile that does it differently".
5. **Deprecate the others** with a clear timeline. Don't delete on day one — leave them as `*.deprecated` and observe for 2 weeks before removal.
6. **Document the canonical path** in `.rcode/memory/project/decisions.md` and a top-level `DEPLOYMENT.md`.

## Common drift patterns to look for

| Symptom | Root cause | Fix |
|---|---|---|
| "Works in staging, breaks in prod" | Different env vars between paths | Single source of truth (Helm values + sealed-secrets) |
| Image tags lag behind git SHA | Manual `docker push` mid-week | Tag-based deploys via CI only |
| Healthchecks pass in compose, fail in K8s | Compose uses HTTP, K8s uses TCP | Align probe definitions |
| "Deploy" doesn't restart all services | Some compose, some bare metal | One orchestrator |
| Secrets diverge | `.env` files copied manually | External Secrets Operator or sealed-secrets only |

## Output Format

```
Deploy paths discovered: <count>
  - <path 1> — <classification>
  - <path 2> — <classification>
  ...

Drift findings:
  ✗ <pair> — <specific drift>
  ✗ <pair> — <specific drift>

Canonical path proposal:
  dev:        <one path>
  staging:    <one path>
  production: <one path>

Deprecation plan:
  Week 1: mark <X> as deprecated, route docs to canonical
  Week 2: remove <X> if no fallback usage observed

Memory Bank update:
  → .rcode/memory/project/decisions.md (canonical path decision)
  → DEPLOYMENT.md (the runbook)
```

## Examples

**Happy path — Siraaj-style mess** — 4 deploy paths found: docker-compose (dev), Helm (staging), manual script (prod-mostly), Jenkinsfile (sometimes prod). Drift: 6 envs differ between staging and prod. Canonical: Helm with `values.staging.yaml` and `values.production.yaml`. Compose stays dev-only. Manual + Jenkinsfile deprecated, removed 2 weeks later.

**Edge case — legitimate dual path** — Mobile app uses TestFlight + Play Console; web uses Vercel. These are different surfaces, not deploy-path drift. Document why each surface uses what it does; don't try to unify across surfaces.

**Negative — "let's just delete the old paths"** — Refuse without observation period. Some "deprecated" paths are actually the only thing that works for a specific service. Mark, observe, then delete.

## Memory Bank Hooks

- **Reads:** `.rcode/memory/incidents/post-mortems/` (prior deploy incidents)
- **Writes:** `.rcode/memory/project/decisions.md` (canonical path decision); `.rcode/memory/change-records/YYYYMMDD-NNN.md` (the unification itself as a change record)
