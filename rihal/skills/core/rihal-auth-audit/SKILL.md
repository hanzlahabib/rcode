---
name: rihal-auth-audit
description: Audit Keycloak ↔ Active Directory sync, JWT validation, and tenant isolation in multi-org Postgres.
triggers:
  - "auth audit"
  - "keycloak ad sync"
  - "users disappearing"
  - "ghost session"
  - "tenant leak"
  - "jwt validation check"
  - "stale token"
  - "session not invalidating"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Authentication bugs are usually silent — the user just gets logged out, or worse, sees someone else's data. This skill encodes the specific failure modes that have actually bitten Rihal projects, with a runnable 10-minute checklist. Default scope is Keycloak + Active Directory + Postgres; adapt the specifics to whatever provider is in use.

## The 10-minute checklist

### Keycloak ↔ AD sync (the load-bearing one)

- [ ] Keycloak's AD federation is configured with **periodic sync ENABLED**, not just on-login. Without periodic sync, a user deactivated in AD keeps working in Keycloak until their token expires.
- [ ] Sync interval ≤ 1 hour for production. Longer windows are how the Rihal incident happened.
- [ ] Sync errors land in Sentry, not just Keycloak's internal log. If sync silently fails, no one notices for weeks.
- [ ] On AD deactivation, the corresponding Keycloak session is **explicitly invalidated** — don't rely on the JWT expiring.

### JWT validation

- [ ] `iss`, `aud`, `exp`, signature — all four checked on every protected request.
- [ ] JWKS keys are **fetched dynamically with caching**, not pinned. Keycloak rotates them.
- [ ] Clock-skew tolerance is ≤ 60s. Larger windows give attackers reuse room.
- [ ] Token revocation list (or short TTL + refresh) is in place. Stateless JWTs are a CVE waiting for "logout doesn't actually log out".

### Tenant isolation in Postgres

- [ ] Every query that reads tenant data has `WHERE tenant_id = $1` where `$1` is **derived from the JWT**, never from a request parameter or cookie.
- [ ] Postgres Row-Level Security (RLS) policies are enabled OR a query middleware enforces tenant_id (belt + suspenders preferred).
- [ ] No raw SQL strings interpolate tenant_id — always parameterised.
- [ ] Audit log captures the tenant_id from the JWT for every write.

### Session lifecycle

- [ ] Password change → ALL sessions for that user invalidated (not just the current device).
- [ ] Permission change (role removed) → token re-validation forced on next request.
- [ ] Logout actually deletes the server-side session record, not just the cookie.

## Workflow

1. **Inventory the auth surfaces.** Login, refresh, password reset, role change, permission change, logout, OAuth callbacks if present.
2. **Run the checklist** above for each surface. Cite the actual file and line for each pass / fail.
3. **For each fail:** write a malicious test case before fixing — the test is the proof of regression-locked.
4. **Persist findings** to `.rihal/memory/incidents/known-issues.md` if not fixable in this session, or `.rihal/memory/change-records/` if fixed.

## Output Format

```
Auth audit — <date>
Surfaces: <count>

Keycloak ↔ AD sync:
  ✓ periodic sync enabled (interval: <X>)
  ✗ sync errors not in Sentry
  ⚠ <other findings>

JWT validation:
  ✓ all 4 fields checked
  ⚠ <other>

Tenant isolation:
  ✗ <table>.<query> missing tenant_id filter — file:line

Session lifecycle:
  ✓ <findings>

Critical (block launch / production): <count>
High (fix this sprint): <count>
Medium (track in known-issues.md): <count>
```

## Examples

**Happy path — sync drift caught** — Audit shows Keycloak sync is configured but interval is 24h, and errors aren't in Sentry. Findings: 2 critical. Fix: drop interval to 1h + wire sync errors to Sentry. Verify by deactivating a test user in AD and confirming Keycloak removes them within 1h.

**Edge case — RLS enabled but middleware bypasses it** — Postgres RLS is on, but the Strapi controllers use a service-role connection that bypasses RLS. Findings: critical. Fix: switch to per-request connections with the user's JWT-derived role.

**Negative — "we use OAuth so we're fine"** — Refuse. OAuth ≠ correctly-configured. Run the checklist anyway.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/incidents/post-mortems/` (prior auth incidents), `.rihal/memory/project/stack.md` (auth provider)
- **Writes:** `.rihal/memory/incidents/known-issues.md` (deferred); `.rihal/memory/change-records/YYYYMMDD-NNN.md` (the audit itself)
