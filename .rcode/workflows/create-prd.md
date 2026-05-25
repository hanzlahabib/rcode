# Workflow: rcode-create-prd

<purpose>
Create a Product Requirements Document from scratch through guided facilitation. Delegates to the rcode-create-prd skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rcode-create-prd/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-validate-prd — validate the PRD for completeness
/rcode-new-milestone — build the milestone roadmap from the PRD
/rcode-edit-prd — revise the PRD

## Next Up

- `/rcode-validate-prd` — validate the new PRD for completeness and testability
- `/rcode-create-architecture` — design the system architecture once the PRD is approved
