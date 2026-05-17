# Workflow: rihal-edit-prd

<purpose>
Update an existing PRD with revisions or clarifications. Delegates to the rihal-edit-prd skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rihal/skills/actions -path "*rihal-edit-prd/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-validate-prd — validate after edits
/rihal-plan — re-plan phases from the updated PRD
/rihal-create-prd — start fresh if edits are too extensive

## ▶ Next Up

- /rihal-validate-prd
- /rihal-create-milestone
- /rihal-create-epics-and-stories
