---
name: rihal-ci
internal: true
description: CI/CD setup and quality gates for the rcode-default stack — GitHub Actions for Node test matrix,.
triggers:
  - "set up ci"
  - "github actions"
  - "ci pipeline"
  - "quality gate"
  - "helm chart"
  - "docker compose"
  - "k8s deploy"
  - "release workflow"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

CI is the contract that keeps `main` green. This skill enforces a small, predictable set of gates rather than a sprawling pipeline. For deployment, the rcode-default path is: Docker Compose for dev → Helm chart for K8s production. The skill knows the common pitfalls (env drift, missing healthchecks, cold-start memory limits).

## CI pre-merge gates (in order)

1. **Lint / format.** Whatever the project uses (ESLint, Prettier, ruff). Auto-fixable issues block merge.
2. **Type check.** `tsc --noEmit` for TS projects, `mypy --strict` for Python.
3. **Test.** `node --test` / `pnpm test` / `pytest`. Across the supported runtime matrix (e.g. Node 18/20/22/24).
4. **Build.** Whatever produces shippable artefacts. Fails-on-warnings.
5. **Custom invariants.** rcode example: `zero-dep` job that asserts `package.json` has no runtime dependencies.

If any gate fails, no merge. No `--no-verify`. Fix the underlying issue.

## GitHub Actions template (Node project)

```yaml
name: test
on:
  push:    { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: ['18.x', '20.x', '22.x', '24.x']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node-version }}' }
      - run: node --test
```

Reference the production rcode workflow at `.github/workflows/test.yml` for the full pattern (zero-dep invariant + syntax-check job).

## Docker Compose dev environment

- **Healthchecks on every service.** Postgres, Redis, the app — all of them. Without healthchecks `depends_on` is a lie.
- **Volumes for source code only.** Don't volume-mount `node_modules`; use a named volume to avoid cross-host syncs.
- **Single `.env.example`** in the repo. CI doesn't load it, but new contributors copy from it.
- **One docker-compose.yml.** No "dev" / "prod" splits — production is Helm. Compose is for laptops only.

## Helm chart conventions (K8s production)

- **`values.yaml` documents every config knob.** No silent defaults.
- **Liveness AND readiness probes.** Liveness is "process alive"; readiness is "ready to serve". Different thresholds.
- **Resource limits.** Memory request = limit (no over-commit). CPU request realistic; limit forgiving.
- **`PodDisruptionBudget`** for any deployment with `replicas > 1`.
- **Secrets via External Secrets Operator** or sealed-secrets. Never plain `Secret` objects in git.

## Workflow

1. **Detect what's there.** Read `.github/workflows/`, `docker-compose.yml`, `helm/` (or wherever charts live).
2. **Map to the gates above.** What's missing? What's redundant?
3. **Add the smallest set of gates** that covers lint + types + tests + build + invariants.
4. **Verify locally first.** Every gate should runnable on the contributor's laptop with `act` (for Actions) or directly.
5. **Push, watch the run, fix.** Iterate until green on a real PR, not just locally.

## Output Format

```
Detected CI: <list of existing workflows>
Detected dev environment: <docker-compose | makefile | scripts>
Detected production: <helm | terraform | none>

Gates currently in place:
  ✓ <gate>
  ✗ missing: <gate>

Recommendations:
  1. <add or modify>
  2. ...

Next steps:
  - <commit + PR>
  - <verify run>
```

## Examples

**Happy path — fresh repo** — No CI yet. Add `.github/workflows/test.yml` with the matrix template. Add `docker-compose.yml` with Postgres + app + healthchecks. Open a PR; verify CI runs green.

**Edge case — flaky test in CI only** — Test passes locally, fails in CI 30% of the time. Bisect: is it a timeout? a race condition with the mock server? a CI-specific resource limit? Fix the root cause; don't add `retry: 3` as a workaround.

**Negative — "just disable the failing check"** — Refuse. The check exists for a reason. Either fix what's broken or remove the check with a documented rationale.

## When NOT to use this skill

Do NOT use this skill for application code changes, deployment infrastructure beyond CI (use rihal-deploy-unify), security hardening (use rihal-harden), or MVP-to-production migration (use rihal-migrate).

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (deploy target)
- **Writes:** when CI gains a new gate, append to `.rihal/memory/project/decisions.md` with the rationale
