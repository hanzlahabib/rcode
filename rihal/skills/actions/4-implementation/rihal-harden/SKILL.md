---
name: rihal-harden
internal: true
description: Security hardening checklist for SaaS applications.
triggers:
  - "harden this"
  - "security check"
  - "auth audit"
  - "tenant isolation"
  - "keycloak ad sync"
  - "secure this endpoint"
  - "owasp"
  - "before we ship"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Pre-launch security pass for SaaS code. Not a generic OWASP checklist — opinionated for the rcode-default stack (Next.js / Strapi / Postgres / Keycloak / Sentry). Especially focused on the failure modes that have actually bitten Rihal projects: Keycloak ↔ AD sync drift, multi-tenant query leaks, and JWT-as-source-of-truth bugs.

## Workflow

1. **Map the attack surface.** List every endpoint, file upload, third-party webhook, and background job. If you can't enumerate them, you can't audit them.
2. **Per surface, run the checklist** below.
3. **Triage findings:** Critical (block launch), High (fix before next sprint), Medium (track in `incidents/known-issues.md`).
4. **Verify fixes** end-to-end — most security bugs are caught by writing the malicious test case, not by code review alone.

## Checklist (applied per surface)

### Authentication

- JWT verified on every request, not just `POST /login`. The token can be forged otherwise.
- Issuer (`iss`), audience (`aud`), expiry (`exp`), and signature all checked. Missing any one is a compromise.
- For Keycloak: re-fetch the JWKS keys, don't pin them — Keycloak rotates.
- AD sync: every Keycloak login should re-validate the user against AD; stale Keycloak users post-AD-deactivation is the documented Rihal incident.
- Session invalidation on password change actually clears all sessions, not just the current one.

### Authorization

- Role checks AT the resource handler, not in the URL or query layer.
- Tenant isolation: every query that reads tenant data MUST filter by tenant_id derived from the JWT, never from a request parameter.
- "Admin" routes require role check + audit log write, in that order.

### Input validation

- All request bodies validated at the boundary (zod / joi / strapi schema).
- File uploads: MIME-sniff the content, don't trust `Content-Type`; cap size; quarantine before processing.
- Path parameters: reject `..`, absolute paths, and URL-encoded variants.

### Data handling

- Secrets in env vars, not in code. CI scans for committed secrets.
- PII redacted from logs and Sentry breadcrumbs (`beforeSend` filter).
- Encryption at rest on Postgres for any table holding government-sensitive data.

### External integrations

- Webhook signatures verified on receipt; replay-attack window enforced (timestamp + nonce).
- Outbound API calls have a timeout; no infinite waits.
- Third-party SDKs pinned to a known-good version; renovate-bot PRs reviewed manually.

## Output Format

```
Surfaces audited: <count>

Critical (block launch):
  ✗ <surface> — <issue> — <exploit path>

High (fix this sprint):
  ⚠ <surface> — <issue>

Medium (track):
  · <surface> — <issue>

Memory Bank update:
  → wrote <count> entries to .rihal/memory/incidents/known-issues.md
  → wrote audit summary to .rihal/memory/change-records/<date>-001.md
```

## Examples

**Happy path** — Pre-launch audit of a tenant-isolated dashboard → finds 2 queries missing `WHERE tenant_id = $1` (CRITICAL) → 1 webhook missing signature check (HIGH) → 3 medium findings. Block launch until critical findings fixed; reaudit.

**Edge case — Keycloak ↔ AD drift** — User deactivated in AD but their Keycloak token still works for 24h. Add: validate-against-AD step at every login + 5-minute Keycloak token TTL.

**Negative — "we'll add security later"** — Refuse. Security retrofits are 10× the cost of building it in. Block until at least the Critical findings have a plan.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (auth layer detection), `.rihal/memory/incidents/post-mortems/` (prior auth/security incidents)
- **Writes:** `.rihal/memory/incidents/known-issues.md` (deferred findings); `.rihal/memory/change-records/YYYYMMDD-NNN.md` (the audit itself as a change record)
