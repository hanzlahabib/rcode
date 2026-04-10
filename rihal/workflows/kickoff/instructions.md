# Kickoff Workflow

Initialize a new project phase. Run this first.

<workflow>

<step n="1" goal="Initialize state directory">
<action>Check if .rihal/ exists. If not, create:
  .rihal/
    state.json
    phases/
    plans/
    decisions/
    artifacts/
    progress/
    context/
</action>

<action>Initialize state.json:
{
  "project_name": "{ask user}",
  "created": "{iso-date}",
  "current_phase": null,
  "phases": [],
  "active_agents": [],
  "context_version": 1
}
</action>
</step>

<step n="2" goal="Sadiq (Strategy) — define the why">
<action>Load sadiq.strategy.agent.md</action>
<ask>What problem are we solving? For whom specifically?</ask>
<ask>What does success look like (measurable)?</ask>
<ask>Kill criteria: when would we stop this project?</ask>
<action>Save answers to .rihal/phases/{phase_id}/brief.md</action>
</step>

<step n="3" goal="Ahmed (CTO) — lock technical direction">
<action>Load ahmed.cto.agent.md</action>
<ask>What's the expected scale? Timeline? Team capacity?</ask>
<action>Recommend stack with trade-offs</action>
<action>Write ADR to .rihal/decisions/001-stack-selection.md</action>
</step>

<step n="4" goal="Hussain (PM) — break into sprints">
<action>Load hussain.pm.agent.md</action>
<action>Decompose the phase into 3-5 sprints</action>
<action>Each sprint: goal, duration, deliverable</action>
<action>Save to .rihal/phases/{phase_id}/sprints.md</action>
</step>

<step n="5" goal="Layla (Design) — initial UX direction">
<action>Load layla.design.agent.md</action>
<action>Define design system baseline (colors, typography, spacing)</action>
<action>Save to .rihal/artifacts/design-system.md</action>
</step>

<step n="6" goal="Update state">
<action>Update state.json:
  - current_phase: {phase_id}
  - phases: append new phase
  - active_agents: [sadiq, ahmed, hussain, layla]
  - last_updated: now
</action>

<action>Create .rihal/context/active.md with phase summary — this is the "compacted context" AI reads in future sessions</action>
</step>

<step n="7" goal="Commit">
<action>git add .rihal/ && git commit -m "feat: kickoff phase {phase_id} — {phase_name}"</action>
<action>Inform user: "Phase ready. Run *sprint to plan first sprint, or *serve to view dashboard."</action>
</step>

</workflow>
