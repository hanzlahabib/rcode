# Verification Report Template

Used by `/rcode-verify-phase`. Goal-backward analysis of whether the phase actually delivered the goal stated in ROADMAP.md.

## Frontmatter

```yaml
---
phase: NN
phase_name: <slug>
verifier: <agent / human>
verified_at: <ISO date>
verdict: pass | fail | partial
goal_source: ROADMAP.md (commit-sha-at-phase-start)
---
```

## Sections

### Phase goal (verbatim)

> <paste the goal statement from ROADMAP.md exactly as written when this phase was planned>

### Goal decomposition

The goal as one sentence is too coarse to verify against. Decompose into checkable claims:

1. **Claim 1**: <one observable thing the goal implies>
2. **Claim 2**: ...
3. **Claim N**: ...

### Evidence per claim

For each claim, list:

- **Source of truth**: code path / file / endpoint / behavior
- **Verification method**: command / test name / manual step
- **Result**: ✅ / ❌ / ⚠️
- **Notes**: anything surprising

```
| # | Claim | Method | Result | Notes |
|---|-------|--------|:------:|-------|
| 1 | ... | ... | ✅ | ... |
```

### Coverage gaps

What the phase goal said but no evidence-trail covered. List explicitly:

- **<claim>** has no implementation that can be pointed to. Either:
  - The goal was aspirational and the phase didn't implement it (gap to file as follow-up)
  - The implementation exists but no test or doc covers it (gap to file as test debt)

### Side-effect audit

What the phase changed BEYOND the goal. Often these are silent:

- New dependencies added
- Schema changes
- API contract changes
- File-tree changes (new dirs, deleted files)

Each side effect should be intentional and documented.

### Verdict reasoning

One paragraph explaining why the verdict (pass / fail / partial) was chosen. Include any judgment calls.

### Follow-ups

Issues filed (or to file) for gaps surfaced during verification:

- #N — <title>
- (to file) — <description>

## Sign-off

```
Verifier: <name or agent id>
Date: <ISO>
Verdict: <verdict from frontmatter>
```
