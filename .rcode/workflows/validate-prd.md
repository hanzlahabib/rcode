# Workflow: rihal-validate-prd

<purpose>
Validate an existing PRD for completeness, consistency, and testability. Delegates to the rihal-validate-prd skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rihal-validate-prd/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-create-milestone — build the roadmap from the validated PRD
/rihal-edit-prd — fix validation findings
/rihal-council — escalate ambiguous requirements to the council

## ▶ Next Up

- **PRD valid:** `/rihal-create-milestone` — design M1..Mn roadmap
- **Gaps found:** `/rihal-edit-prd` — fill in missing sections
- **Need council review:** `/rihal-council {prd-question}` — debate key decisions
