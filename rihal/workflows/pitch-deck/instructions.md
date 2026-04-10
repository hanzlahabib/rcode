# Pitch Deck Workflow

Create a Rihal-style pitch deck for leadership or external stakeholders.

<workflow>

<step n="1" goal="Context">
<ask>Who's the audience? (Rihal leadership / external investor / government / internal team)</ask>
<ask>What's the single decision you need from them?</ask>
<ask>Time slot for the pitch? (5 / 10 / 20 minutes)</ask>
</step>

<step n="2" goal="Sadiq — strategic substance">
<action>Load sadiq.strategy.agent.md</action>
<action>Draft: problem, market, solution, why now, business model</action>
<action>Save drafts to .rihal/artifacts/pitch/{name}-substance.md</action>
</step>

<step n="3" goal="Waleed — technical credibility">
<check if="pitch includes technical component">
  <action>Load waleed.cto.agent.md</action>
  <action>Define: architecture overview, scale story, security posture, team capability</action>
</check>
</step>

<step n="4" goal="Noor — write the deck">
<action>Load noor.scribe.agent.md</action>
<action>Structure slides:
  1. Title (Arabic + English, Omani cultural touch)
  2. The problem (specific, quantified)
  3. Why now
  4. Solution (one sentence)
  5. How it works (3 steps)
  6. Market (TAM/SAM/SOM)
  7. Competitive landscape
  8. Our edge
  9. Business model
  10. Traction / milestones
  11. Team
  12. Roadmap
  13. The ask
  14. Thank you
</action>

<action>Rules:
  - 6 words per slide max
  - High contrast
  - Omani colors: blue #1e3a8a, gold #f59e0b
  - Arabic + English balance
</action>
</step>

<step n="5" goal="Layla — visual polish">
<action>Load layla.design.agent.md</action>
<action>Review deck for:
  - Visual hierarchy
  - Consistent type scale
  - Image quality (no stock cheese)
  - Whitespace discipline
</action>
</step>

<step n="6" goal="Export">
<action>Save final to .rihal/artifacts/pitch/{name}-final.md</action>
<action>Export HTML version if requested (can be screen-shared directly)</action>
<action>Update state.json with deck metadata</action>
</step>

</workflow>
