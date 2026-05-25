# Workflow: rcode-retrospective

<purpose>
Run an epic retrospective and produce owned action items. Delegates to the rcode-retrospective skill.
</purpose>

## Execution

Locate and follow the installed skill:

```bash
find .rcode/skills/actions -path "*rcode-retrospective/workflow.md" 2>/dev/null | head -1
```

Read and follow the workflow at that path. If the path is empty:

```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-correct-course — act on retrospective findings
/rcode-plan {next} — plan the next phase with retro learnings applied
/rcode-note — capture retro summary in project memory

## ▶ Next Up

- /rcode-new-milestone
- /rcode-progress
- /rcode-complete-milestone

## Next Up

- `/rcode-new-milestone` — start the next milestone with retrospective learnings
- `/rcode-correct-course` — address action items surfaced by the retrospective
