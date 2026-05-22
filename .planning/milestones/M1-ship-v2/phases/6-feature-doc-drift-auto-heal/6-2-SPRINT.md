---
phase: 6
plan_number: 2
title: classifier extension for audit/drift intent + do.md routing
wave: 1
depends_on: []
files_modified:
  - rcode/bin/rcode-tools.cjs
  - rcode/workflows/do.md
autonomous: true
sequential: false
requirements: [phase-6-routing]
---

<objective>
Extend the question classifier so `/rcode-do` routes "audit / drift / re-audit / extend artifact" intent correctly to `/rcode-feature-drift` instead of falling through to inline execution (which #458 already partially mitigated). Adds the missing intent type.
</objective>

<must_haves>
- `cmdClassifyQuestion` (or `classifyScope`) recognizes "drift", "audit", "re-audit", "extend artifact", "fill out", "verify docs vs code" as a distinct type
- `/rcode-do` routing table has an entry mapping that intent to `/rcode-feature-drift`
- The new intent type is documented in the classifier function's JSDoc
</must_haves>

<task id="6.2.1">
<title>Extend classifyScope to detect drift/audit intent</title>
<read_first>
- rcode/bin/rcode-tools.cjs (specifically `classifyScope` function near line 2340 and `cmdClassifyQuestion` near line 394)
- .planning/phases/6-feature-doc-drift-auto-heal/6-CONTEXT.md (D-4 + classifier extension surface mention)
</read_first>

<action>
In `rcode/bin/rcode-tools.cjs`, modify the `classifyScope` function. The current function returns one of: `'ticket' | 'feature' | 'phase' | 'initiative'`. Add a new branch that returns `'drift'` BEFORE the existing initiative/phase/feature/ticket cascade. Concretely:

After the initial `text` lowercase normalization and BEFORE the `if (/\b(milestone|initiative|...)/.test(text))` initiative check, insert:

```js
  // Drift / audit / re-audit / extend-existing-artifact intent.
  // Routes /rcode-do to /rcode-feature-drift instead of falling through to
  // inline execution (closes #458's edge case).
  if (/\b(drift|re-?audit|stale|out[- ]of[- ]date|fill out (the|this|existing)|extend (audit|plan|phase)|verify (docs|claims) vs (code|reality))\b/i.test(text)) {
    return 'drift';
  }
```

Then update the JSDoc above `classifyScope` to add `'drift'` to the documented return values.

Also update `cmdClassifyQuestion` (line ~394) — find the spot where it returns the JSON. Ensure when scope === 'drift', the returned `type` is also 'drift' (or add a mapping). Look at the existing function body for pattern; do not refactor — only add the drift branch alongside existing branches.
</action>

<acceptance_criteria>
- `node rcode/bin/rcode-tools.cjs classify-question "audit feature docs for drift"` returns JSON containing `"type":"drift"` or `"scope":"drift"`
- `node rcode/bin/rcode-tools.cjs classify-question "fill out existing audit"` returns drift type
- `node rcode/bin/rcode-tools.cjs classify-question "fix typo"` still returns ticket (negative test — no false positive)
- File contains literal string `return 'drift'`
</acceptance_criteria>
</task>

<task id="6.2.2">
<title>Add /rcode-feature-drift entry to do.md routing table</title>
<read_first>
- rcode/workflows/do.md (specifically the routing table starting at line ~270 and the audit entry I added in #458 fix)
</read_first>

<action>
In `rcode/workflows/do.md`, find the existing line that maps audit/extend intent to `/rcode-audit`:

`| Audit / re-audit / extend / fill out / expand an existing artifact (audit doc, plan, phase list) | \`/rcode-audit\` | Unified audit entry — picks artifact type and re-runs |`

Replace it with TWO rows so feature-drift gets its own primary route:

`| Drift / out-of-date / "verify docs vs code" / "audit feature docs" / "fill out existing PRD/epics/stories" | \`/rcode-feature-drift\` | Detects PRD↔epics↔stories↔code drift; --fix patches trivial items |`
`| General audit / re-audit / extend / fill out / expand an existing artifact | \`/rcode-audit\` | Unified audit entry — picks artifact type and re-runs |`

Also update the classifier-fallback section (line ~310) where it says "Parse `type` from JSON — map codebase/team/release → `/rcode-discuss`; market/discovery/greenfield → `/rcode-council`. Default: `/rcode-discuss`." Add: `; drift → /rcode-feature-drift`.
</action>

<acceptance_criteria>
- File `rcode/workflows/do.md` contains literal string `/rcode-feature-drift`
- File contains both rows: drift-specific and general-audit
- File classifier-fallback section includes `drift → /rcode-feature-drift`
</acceptance_criteria>
</task>
