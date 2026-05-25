# Workflow: rcode-scaffold-project

<purpose>
Scaffold a new project from the official rcode template repo. Delegates to the rcode-scaffold-project skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rcode-scaffold-project/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-init — configure rcode for the scaffolded project
/rcode-new-project {name} — design the project with full facilitation
/rcode-create-prd — write the product requirements document

## ▶ Next Up

- /rcode-create-prd
- /rcode-new-milestone
- /rcode-do

## Next Up

- `/rcode-init` — initialize rcode in the scaffolded project
- `/rcode-new-project` — complete project setup with requirements and roadmap
