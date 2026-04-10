# Strategy Session Workflow

<workflow>

<step n="1" goal="Frame the question">
<ask>What decision are we trying to make?</ask>
<ask>What's the reversibility? (one-way door / two-way door)</ask>
<ask>By when do we need to decide?</ask>
</step>

<step n="2" goal="Sadiq — analysis">
<action>Load sadiq.strategy.agent.md</action>
Choose lens:
- Market question → *market command
- Prioritization → *prioritize command
- Positioning → *swot command
- Customer → *jtbd command
</step>

<step n="3" goal="Waleed — technical feasibility (if applicable)">
<check if="decision has technical component">
  <action>Load waleed.cto.agent.md</action>
  <action>Assess: feasibility, effort, risk</action>
</check>
</step>

<step n="4" goal="Hussain — resourcing reality">
<action>Load hussain.pm.agent.md</action>
<action>Assess: team capacity, timeline, scope trade-offs</action>
</step>

<step n="5" goal="Synthesize">
<action>Consolidate all agent inputs into a decision doc:
  - Question
  - Options considered (at least 3)
  - Recommendation
  - Reasoning
  - Trade-offs
  - Success criteria
  - Kill criteria
  - Review date
</action>

<action>Save to .rihal/decisions/strat-{date}-{slug}.md</action>
</step>

<step n="6" goal="Document dissent">
<ask>Did any agent disagree with the recommendation? Document dissenting views.</ask>
<action>Include dissent in the decision doc — this makes future review honest.</action>
</step>

</workflow>
