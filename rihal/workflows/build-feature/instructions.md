# Build Feature Workflow

The main loop for implementing a feature. Run per feature, not per project.

<workflow>

<step n="1" goal="Precondition checks">
<check if=".rihal/state.json doesn't exist">
  <action>Run kickoff workflow first. Halt.</action>
</check>
<check if="no current_phase in state.json">
  <action>Ask user to set a current phase. Halt.</action>
</check>
</step>

<step n="2" goal="Load minimal context">
<action>Run context-build workflow for task type "feature"</action>
</step>

<step n="3" goal="Hussain — create user story">
<action>Load hussain.pm.agent.md</action>
<action>Invoke *story command to write the user story with acceptance criteria</action>
<action>Save to .rihal/phases/{current_phase}/stories/{story-id}.md</action>
</step>

<step n="4" goal="Ahmed — architectural decision (if non-trivial)">
<check if="feature touches multiple services OR introduces new pattern">
  <action>Load ahmed.cto.agent.md</action>
  <action>Invoke *adr to write decision record</action>
</check>
</step>

<step n="5" goal="Layla — design review (if UI)">
<check if="feature has UI">
  <action>Load layla.design.agent.md</action>
  <action>Define UI states, confirm against design system</action>
</check>
</step>

<step n="6" goal="Omar — implement">
<action>Load omar.engineer.agent.md</action>
<action>Rules:
  - Follow existing patterns (run *pattern first)
  - Keep files under 400 lines
  - Commit after each logical step
  - Update architecture.md if new pattern emerges
</action>
</step>

<step n="7" goal="Fatima — test">
<action>Load fatima.qa.agent.md</action>
<action>Invoke *cases to generate test cases</action>
<action>Verify against acceptance criteria from Step 3</action>
</step>

<step n="8" goal="Update progress">
<action>Append to .rihal/progress/session-{date}.md:
  - Feature: {name}
  - Status: implemented and tested
  - Files touched: {list}
  - Notes: {learnings}
</action>

<action>Update .rihal/state.json completed_features counter</action>

<action>Update .rihal/context/active.md "Last completed" section</action>
</step>

<step n="9" goal="Commit">
<action>git add {specific files}</action>
<action>git commit -m "feat: {feature name}"</action>
</step>

</workflow>
