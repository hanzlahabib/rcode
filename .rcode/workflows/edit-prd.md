# Workflow: rcode-edit-prd

<purpose>
Update an existing PRD with revisions or clarifications. Delegates to the rcode-edit-prd skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rcode-edit-prd/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-validate-prd — validate after edits
/rcode-plan — re-plan phases from the updated PRD
/rcode-create-prd — start fresh if edits are too extensive

## ▶ Next Up

- /rcode-validate-prd
- /rcode-new-milestone
- /rcode-create-epics-and-stories
