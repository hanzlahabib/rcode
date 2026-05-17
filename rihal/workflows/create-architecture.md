# Workflow: rihal-create-architecture

<purpose>
Write an Architecture Decision Record (ADR) or system design document. Delegates to the rihal-create-architecture skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rihal/skills/actions -path "*rihal-create-architecture/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-plan — plan implementation phases from the architecture
/rihal-council — review the architecture with the full council
/rihal-discuss — discuss architectural tradeoffs

## ▶ Next Up

- /rihal-plan {phase}
- /rihal-council {architecture-question}
- /rihal-create-prd
