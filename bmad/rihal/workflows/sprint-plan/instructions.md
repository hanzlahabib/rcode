# Sprint Plan Workflow

<workflow>

<step n="1" goal="Load context">
<action>Load .rihal/state.json and current phase brief</action>
</step>

<step n="2" goal="Define sprint goal">
<action>Load hussain.pm.agent.md</action>
<ask>What's the single sprint goal? (one sentence, measurable)</ask>
<ask>Sprint duration? (1 week / 2 weeks)</ask>
</step>

<step n="3" goal="Pull candidate stories">
<action>Read .rihal/phases/{current}/stories/ — list all unstarted stories</action>
<action>Rank by priority (Sadiq's RICE if available)</action>
</step>

<step n="4" goal="Estimate capacity">
<ask>How many people on the sprint?</ask>
<ask>Any PTO / blockers / meetings eating time?</ask>
<action>Calculate: people × days × 6 productive hours/day × 0.7 (focus factor)</action>
</step>

<step n="5" goal="Commit to stories">
<action>Select stories fitting capacity</action>
<action>Each story has an owner (NOT "team")</action>
<action>Leave 20% buffer for unknowns</action>
</step>

<step n="6" goal="Write sprint plan">
<action>Save to .rihal/phases/{current}/sprint-{number}.md:
  - Sprint goal
  - Duration: {start} → {end}
  - Stories committed (with owners)
  - Capacity used / available
  - Known risks
  - Definition of done
</action>
</step>

<step n="7" goal="Update state">
<action>Update state.json: active_sprint = {sprint_number}</action>
<action>Update .rihal/context/active.md with sprint goal</action>
</step>

</workflow>
