# Verification Report

```yaml
---
phase: {{phase}}
verified: {{date}}
verifier: rcode-verifier
status: passed | gaps_found | human_needed
---
```

`status` is the ONLY key `execute.md`'s `uat_gate` step reads (`grep -qE "^status:[[:space:]]*passed"`). Do not
substitute `result`, `verdict`, or `outcome` — a wrong key silently strands the phase at `status: executed` forever.

## Goal Achievement

Did the phase deliver what it promised? Goal-backward analysis.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| | ✅/❌ | |

## Artifact Check

| Artifact | Expected | Found | Status |
|----------|----------|-------|--------|
| | | | ✅/❌ |

## Behavioral Spot Checks

Commands or interactions verified to work end-to-end.

- [ ] 
- [ ] 
- [ ] 

## Gaps Found

Anything promised that wasn't delivered. Each gap should become a GitHub issue.

| Gap | Severity | Issue # |
|-----|----------|---------|
| | | |

## Status

**passed** — Phase goal achieved, all acceptance criteria met.

OR

**gaps_found** — The following critical items are not met: ...

OR

**human_needed** — All automated checks pass but items need human testing.
