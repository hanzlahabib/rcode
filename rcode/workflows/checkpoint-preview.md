# Workflow: rcode-checkpoint-preview

<purpose>
Human-in-the-loop change review. Make sense of a diff, focus attention where it matters, and walk through testing. Delegates to the rcode-checkpoint-preview skill for the full review protocol.
</purpose>

Read and follow the `rcode-checkpoint-preview` skill (`.claude/skills/rcode-checkpoint-preview/SKILL.md`). It ships with the same bundle as this command, so the workflow is only reachable when the file exists.

## Next Up

- `/rcode-verify-work` — run UAT after approving the diff
- `/rcode-ship` — ship if the review passed and UAT is green
