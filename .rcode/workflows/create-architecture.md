# Workflow: rcode-create-architecture

<purpose>
Write an Architecture Decision Record (ADR) or system design document. Delegates to the rcode-create-architecture skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
if [ -f .rcode/skills/rcode-create-architecture/workflow.md ]; then
  printf '%s\n' ".rcode/skills/rcode-create-architecture/workflow.md"
else
  find .rcode/skills/actions -path "*rcode-create-architecture/workflow.md" 2>/dev/null | head -1
fi
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-plan — plan implementation phases from the architecture
/rcode-council — review the architecture with the full council
/rcode-discuss — discuss architectural tradeoffs

## ▶ Next Up

- /rcode-plan {phase}
- /rcode-council {architecture-question}
- /rcode-create-prd

## Next Up

- `/rcode-validate-prd` — validate the PRD before designing the system
- `/rcode-plan` — plan implementation once the architecture is approved
