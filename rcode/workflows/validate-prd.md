# Workflow: rcode-validate-prd

<purpose>
Validate an existing PRD for completeness, consistency, and testability. Delegates to the rcode-validate-prd skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rcode-validate-prd/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-new-milestone — build the roadmap from the validated PRD
/rcode-edit-prd — fix validation findings
/rcode-council — escalate ambiguous requirements to the council

## ▶ Next Up

- /rcode-new-milestone
- /rcode-edit-prd
- /rcode-council {prd-question}
