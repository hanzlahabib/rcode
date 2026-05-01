# Workflow: rihal-retrospective

<purpose>
Run an epic retrospective and produce owned action items. Delegates to the rihal-retrospective skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rihal/skills/actions -path "*rihal-retrospective/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-correct-course — act on retrospective findings
/rihal-plan {next} — plan the next phase with retro learnings applied
/rihal-note — capture retro summary in project memory

## ▶ Next Up

- **Retrospective complete:** `/rihal-new-milestone` — start the next milestone
- **Review project state:** `/rihal-progress` — see current roadmap position
- **Archive milestone:** `/rihal-complete-milestone` — if not already done
