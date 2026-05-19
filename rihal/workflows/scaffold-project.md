# Workflow: rihal-scaffold-project

<purpose>
Scaffold a new project from the official Rihal template repo. Delegates to the rihal-scaffold-project skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rihal/skills/actions -path "*rihal-scaffold-project/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-init — configure Rihal for the scaffolded project
/rihal-new-project {name} — design the project with full facilitation
/rihal-create-prd — write the product requirements document

## ▶ Next Up

- /rihal-create-prd
- /rihal-new-milestone
- /rihal-do
