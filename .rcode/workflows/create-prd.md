# Workflow: rcode-create-prd

<purpose>
Create a Product Requirements Document from scratch through guided facilitation. Delegates to the rihal-create-prd skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rihal-create-prd/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-validate-prd — validate the PRD for completeness
/rihal-create-milestone — build the milestone roadmap from the PRD
/rihal-edit-prd — revise the PRD
