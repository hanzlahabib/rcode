# Progress Check Workflow

Review where the project stands across all phases. Run weekly.

<workflow>

<step n="1" goal="Scan state">
<action>Read .rihal/state.json</action>
<action>Read all files in .rihal/phases/*/sprints.md</action>
<action>Read .rihal/progress/status-*.md (last 4 weeks)</action>
</step>

<step n="2" goal="Hussain — generate status">
<action>Load hussain.pm.agent.md</action>
<action>Invoke *status command</action>
<action>Report:
  - Phases: active / paused / completed
  - Current sprint progress (X/Y stories done)
  - Velocity trend
  - Top 3 risks
  - Top 3 asks
</action>
</step>

<step n="3" goal="Fatima — quality pulse">
<action>Load fatima.qa.agent.md</action>
<action>Check bug backlog trend, test coverage delta, any flakiness</action>
</step>

<step n="4" goal="Khalid — ops pulse">
<action>Load khalid.devops.agent.md</action>
<action>Report: recent deploys, incidents, SLO status, cost trend</action>
</step>

<step n="5" goal="Write progress report">
<action>Save to .rihal/progress/report-{date}.md</action>
<action>Noor formats for stakeholder consumption if requested</action>
</step>

<step n="6" goal="Identify action items">
<action>Each risk → owner + deadline</action>
<action>Each blocker → escalation path</action>
<action>Add to .rihal/phases/{current}/action-items.md</action>
</step>

</workflow>
