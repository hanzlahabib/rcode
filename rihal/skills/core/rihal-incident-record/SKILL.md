---
name: rihal-incident-record
description: Generate a change record + post-mortem in one flow.
triggers:
  - "incident record"
  - "post mortem"
  - "change record"
  - "document this incident"
  - "write a postmortem"
  - "record this change"
  - "rca write up"
  - "incident summary"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Every production change deserves a record; every incident deserves a post-mortem. This skill produces both in the documented Rihal format, so the team builds an institutional memory rather than repeating the same Slack-message-as-archaeology pattern. Output goes to the Memory Bank automatically — `.rihal/memory/change-records/` for changes, `.rihal/memory/incidents/post-mortems/` for incidents.

## Two formats

### Change record (`change-records/YYYYMMDD-NNN.md`)

Mirrors the Rihal template at `template/docs/change_records/20250514-001.md`. Use for any deploy, schema change, infra change, or anything you'd want to find again in 6 months.

```markdown
### Change ID
`YYYYMMDD-NNN`

### Date of Change
YYYY-MM-DD

### Requester
<name + role>

### Change Owner
<name + team>

### Change Category
Backend (BE) | Frontend (FE) | Infra | Data | Security

### Change Type
Hotfix | Standard release | Schema migration | Config change

### Change Description
<one paragraph — what changed, why, what users see>

### Related Tickets / References
- GitHub PR: #N
- Issue: #M
- Related change records: <links>

### Risk Assessment
Low | Medium | High | Emergency
- <specific risks identified>

### Deployment Method
<Helm | Compose | manual | gradual rollout %>

### Approval
Approved by: <name>
Approval date: YYYY-MM-DD

### Rollback Plan
<exact steps to revert; test the rollback in staging first if possible>

### Verification & Outcome
Successful | Partial | Rolled back
- <verification steps and outcomes>

### Post-Change Notes
<anything useful for future-you>
```

### Post-mortem (`incidents/post-mortems/YYYYMMDD-<slug>.md`)

For resolved incidents. Format below.

```markdown
# Incident — <one-line headline>

**Date:** YYYY-MM-DD
**Duration:** <X minutes>
**Severity:** SEV1 (customer-facing data loss) | SEV2 (degraded service) | SEV3 (internal)
**Detection:** <how we noticed — Sentry alert, customer report, internal monitoring>
**Resolution:** <one sentence>

## Timeline

- HH:MM — <event>
- HH:MM — <event>
- HH:MM — <resolution>

## Root cause

<one paragraph, mechanism not symptom>

## Contributing factors

- <factor 1>
- <factor 2>

## What worked

- <what helped us recover quickly>

## What didn't

- <what slowed us down — be honest, not defensive>

## Action items

- [ ] <preventive measure> — owner — by when
- [ ] <detective measure> — owner — by when
- [ ] <documentation update> — owner — by when

## Memory Bank update

- known-issues.md: <removed | updated>
- decisions.md: <appended new decision if relevant>
```

## Workflow

1. **Detect type:** is this a planned change (change record) or a resolved incident (post-mortem)? Both can apply if a change caused an incident.
2. **Gather facts.** From Sentry, PRs, deploy logs, Slack threads. Quote verbatim where useful.
3. **Generate the document** using the appropriate template.
4. **Save to the Memory Bank** at the right path. ID format `YYYYMMDD-NNN` (sequence per day).
5. **Update related Memory Bank files:**
   - Remove the issue from `known-issues.md` if a real fix shipped.
   - Append a decision to `decisions.md` if the post-mortem produced one.
6. **Schedule a follow-up review** if action items remain — 1 week typical.

## Output Format

The skill writes the file directly. Output to the user is a confirmation:

```
✓ Change record saved to .rihal/memory/change-records/20260426-001.md
   Type: <type>
   Severity / Risk: <level>
   
Memory Bank updates:
  → known-issues.md: removed entry "<title>"
  → decisions.md: appended decision "<title>"

Action items: <count> open, <count> due this week
```

## Examples

**Happy path — change record** — Deployed Postgres 16 upgrade. Auto-generates change-records/20260426-001.md with risk: medium, rollback: Helm rollback to previous chart version, verification: ground-truth queries pass. Approved by Hanzla, deployed gradually with 24h soak.

**Happy path — post-mortem** — Login broke for Arabic usernames for 3h. Root cause: client_encoding mismatch on a new Postgres replica. Timeline + actions + Memory Bank update (remove the bug from known-issues, add a CI check that asserts client_encoding = utf8). One follow-up: add ground-truth tests for non-ASCII auth.

**Negative — "we resolved it on Slack, no need for a doc"** — Refuse. Slack threads decay; Memory Bank persists. The 10 minutes spent writing the post-mortem saves an hour the next time the same class of bug appears.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/incidents/known-issues.md` (so we know what to clean up)
- **Writes:** `.rihal/memory/change-records/YYYYMMDD-NNN.md` (changes); `.rihal/memory/incidents/post-mortems/YYYYMMDD-<slug>.md` (incidents); plus updates to `known-issues.md` and `decisions.md` as side-effects
