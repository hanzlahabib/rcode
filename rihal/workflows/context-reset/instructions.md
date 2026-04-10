# Context Reset Workflow

Clear stale context and reload only what's needed. Run this when:
- Claude's responses feel "off-topic" or making wrong assumptions
- Switching between phases or tasks
- Context window over 70% used (check `/context` in Claude Code)

<workflow>

<step n="1" goal="Save current state">
<action>Ensure .rihal/state.json reflects the current reality</action>
<action>Append current progress to .rihal/progress/session-{date}.md</action>
</step>

<step n="2" goal="Compact the active context">
<action>Read .rihal/context/active.md (if exists)</action>
<action>Read .rihal/state.json</action>
<action>Read current phase brief and sprints</action>
<action>Synthesize into a new .rihal/context/active.md (under 2000 tokens):

  # Active Context
  ## Project: {name}
  ## Phase: {current_phase}
  ## Goal: {phase_goal}

  ## Last completed
  - {last 3 items from progress}

  ## In progress
  - {current tasks with owners}

  ## Blockers
  - {any blockers}

  ## Next steps
  - {next 3 items}

  ## Key decisions (recent)
  - {last 3 ADRs}

  ## Do NOT reload
  - Files outside current phase
  - Old sprint details
  - Resolved bugs
</action>
</step>

<step n="3" goal="Clear AI context">
<ask>Tell the user to run `/clear` in Claude Code now.</ask>

<critical>The context reset only works if you actually clear the AI's context window. Do not skip.</critical>
</step>

<step n="4" goal="Reload minimal context">
<action>Instruct user to tell AI:
"Read .rihal/context/active.md ONLY. Do not load other files unless I explicitly ask."
</action>

<action>This loads ~1500 tokens instead of the 40,000+ tokens of full state.</action>
</step>

<step n="5" goal="Verify">
<action>Ask user to test: "Where are we in the project?"</action>
<action>If AI summarizes active.md correctly → reset successful</action>
<action>If AI is confused → active.md is missing info, refine and retry</action>
</step>

</workflow>
