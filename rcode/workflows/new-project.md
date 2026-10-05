<purpose>
Initialize a new project through unified flow: questioning, research (optional), requirements, roadmap. This is the most leveraged moment in any project — deep questioning here means better plans, better execution, better outcomes. One workflow takes you from idea to ready-for-planning.

</purpose>

<process>
This workflow is split into step files so only the step you are on is loaded. Execute the steps in order. Before each step, Read its file with the Read tool (paths below are plain paths, never `@`-includes). Do not read ahead, and skip a step only when its Read-when condition is false. Every instruction, gate, checkpoint, tool call, subagent allowlist and error path lives in the step files; the orchestrator never replaces them. If a step file says "Next:", follow it.

| # | Step | File | Read when |
|---|------|------|-----------|
| 01 | Required reading, output format, usage check, existing-project detection, auto mode detection | `.rcode/workflows/new-project/steps/01-preamble-detect.md` | Always, first |
| 02 | Setup, project type classification, brownfield discovery path | `.rcode/workflows/new-project/steps/02-setup-classify.md` | Always (brownfield branch only when selected) |
| 03 | Auto mode config (auto mode only) | `.rcode/workflows/new-project/steps/03-auto-config.md` | Only in --auto mode |
| 04 | Deep questioning, project type detection | `.rcode/workflows/new-project/steps/04-deep-questioning.md` | Always (skip questioning per auto-mode rules inside) |
| 05 | Write PROJECT.md | `.rcode/workflows/new-project/steps/05-write-project.md` | After questioning |
| 06 | Workflow preferences, sub-repo detection, model profile resolution | `.rcode/workflows/new-project/steps/06-workflow-prefs.md` | After PROJECT.md is written |
| 07 | Done banner, next-up routing, output, success criteria | `.rcode/workflows/new-project/steps/07-done.md` | Last |

Rules that hold for every step:
- Read step 01 first, in full, before taking any action: it carries the required reading, contract and pre-flight gates.
- Re-Read a step file if its content is no longer in context (for example after compaction or when looping back to an earlier step).
- Step files keep their original `<step>`/`<process>` tags and section numbering; references such as "go to handle_blocker" or "step 9.5" point into the step files above.
</process>
