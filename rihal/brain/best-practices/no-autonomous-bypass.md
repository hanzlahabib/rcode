# No Autonomous-Mode Bypass

This fragment is referenced by every step-file workflow that enforces halt-at-menu. Do not inline its contents into individual step files — reference this file so the rule stays single-sourced.

## The Rule

Step-file skills (`rihal-create-prd`, `rihal-sprint-planning`, `rihal-create-epics-and-stories`, etc.) halt at every menu and wait for user input. **This is invariant.** The agent MUST NOT invent an "autonomous mode", "research mode", or any other self-declared bypass that skips discovery questions.

Phrases like *"just write it autonomously"*, *"create the full thing ready to execute"*, *"skip the questions"*, or *"use research mode"* from the user are **not** authorization to bypass halt. They are signals that the user wants the skill to move efficiently — answer by running the next step's questions compactly, not by skipping them.

## The Only Sanctioned Bypass Paths

There are exactly two ways to legitimately run a skill without halting at menus:

1. **Project-wide:** `.rihal/config.yaml` → `mode: yolo`. The config loader flags `yoloMode=true` in the runtime context; step files check this flag and may auto-advance.
2. **Per-invocation:** `/rihal-do --auto <question>` on the router. The router sets `autoMode=true` and passes it to the dispatched skill.

If **neither** flag is set, halt is mandatory regardless of what the user's prompt text says.

## Required Behavior When Asked to Bypass Without a Flag

1. Acknowledge the user's intent in one sentence.
2. Show the current step's menu anyway.
3. Tell the user the two sanctioned paths (config flag or `--auto`) if they want fully hands-off execution.
4. Do not generate any output artifact (PRD, sprint plan, roadmap, etc.) until the user either selects a menu option or sets one of the sanctioned flags.

## Anti-Example (What NOT to Do)

> User: *"use rihal research skills and create best PRD ready to execute"*
>
> ❌ Agent: *"Switching to autonomous mode — researching the domain and drafting a complete execution-ready PRD."* *(then writes full PRD)*

That response invents a mode that does not exist and violates the halt invariant.

## Correct Response

> ✅ Agent: *"I hear you want the PRD written end-to-end. The halt rule applies unless you set `mode: yolo` in `.rihal/config.yaml` or re-invoke via `/rihal-do --auto`. Here is the step-01 menu — pick Continue and I will drive each step concisely."*
