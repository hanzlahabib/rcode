# UAT.md — User Acceptance Test Template

Each phase produces a UAT.md alongside its SUMMARY.md. UAT documents how a non-developer can verify the phase delivered what it promised.

## Frontmatter

```yaml
---
phase: NN
phase_name: <slug>
generated: <ISO date>
status: pending | passed | partial | diagnosed | blocked | skipped | human_needed
last_run: <ISO date>
---
```

## Sections

### Phase goal (verbatim from ROADMAP.md)

One paragraph copied straight from the phase's roadmap entry. No paraphrase.

### What to verify

A bullet list. Each bullet is one observable behavior:

- ✅ **<feature>** — open <screen / endpoint / file>, do <action>, observe <expected outcome>
- ✅ **<feature>** — run `<exact command>`, expect output containing `<exact substring>`

Every bullet must be runnable without reading the source code.

### Setup steps

If the verifier needs to seed data, set env vars, or start services:

```bash
# 1. install
npx @hanzlaa/rcode install
# 2. seed
node .rihal/bin/rihal-tools.cjs ...
# 3. ready
open http://localhost:3000/foo
```

### Per-criterion result

After running, fill in:

| # | Criterion | Result | Notes |
|---|-----------|:------:|-------|
| 1 | <copy from "What to verify"> | ✅ / ⚠️ / ❌ | <one line> |
| 2 | ... | ... | ... |

### Outstanding items

Anything that could not be verified, or where the verifier hit a blocker:

- **<criterion>**: status = `blocked` because <reason>; needs <action> from <owner>.

### Sign-off

```
Verified by: <name>
Date: <ISO>
Verdict: PASSED | PARTIAL | FAILED
```

## Status values

- `pending` — UAT.md generated but not yet run.
- `passed` — every criterion green.
- `partial` — some criteria green, some not. Note which.
- `diagnosed` — failed criteria have a known cause + a fix is in flight.
- `blocked` — failed criteria need external work (data, infra, API access).
- `skipped` — verifier intentionally did not run a criterion (with reason).
- `human_needed` — automated check inconclusive; needs subjective human judgment.

## Audit

`/rihal:audit-uat` aggregates UAT.md files across all phases and surfaces outstanding items in one report.
