# Context Build Workflow

Load just-enough context for a specific task. The opposite of "read everything."

Principle: AI performs better with 2k tokens of relevant context than 50k tokens of mixed context.

<workflow>

<step n="1" goal="Identify the task type">
<ask>What are you about to do?
  1. Build a new feature
  2. Fix a bug
  3. Refactor existing code
  4. Review a PR
  5. Write docs / presentation
  6. Strategic decision
</ask>
</step>

<step n="2" goal="Determine context needs per task type">

<case task="feature">
  Load:
  - .rihal/context/active.md
  - .rihal/phases/{current}/brief.md
  - Design system (if UI work)
  - Relevant existing code (use grep, not full directory reads)
  - Closest existing similar feature (pattern reference)
  Do NOT load: unrelated modules, old phases, closed bugs
</case>

<case task="bug">
  Load:
  - .rihal/context/active.md
  - Bug report
  - ONLY the files in the failing path (trace the error)
  - Related tests
  Do NOT load: the entire codebase, design system, strategy docs
</case>

<case task="refactor">
  Load:
  - .rihal/context/active.md
  - ONLY the file being refactored
  - Files that import from it (grep for imports)
  - Related tests
  Do NOT load: unrelated features
</case>

<case task="review">
  Load:
  - .rihal/context/active.md
  - The diff only
  - Files touched by the diff (full content)
  - Related ADRs
  Do NOT load: unrelated code
</case>

<case task="docs">
  Load:
  - .rihal/context/active.md
  - The feature being documented
  - Target audience notes
  Do NOT load: implementation details unless writing internal docs
</case>

<case task="strategy">
  Load:
  - .rihal/context/active.md
  - Sadiq's prior analyses
  - Market research
  - OKRs
  Do NOT load: code files
</case>
</step>

<step n="3" goal="Monitor context usage">
<action>After loading, ask the user to check context usage (in Claude Code: `/context`)</action>
<check if="context usage > 70%">
  <action>Run context-reset workflow</action>
</check>
</step>

<step n="4" goal="Execute task with loaded context">
<action>Proceed with the task. AI has minimal, relevant context.</action>
</step>

<step n="5" goal="Archive session learnings">
<action>Append any new learnings to .rihal/progress/session-{date}.md</action>
<action>If a new pattern emerged, update .rihal/artifacts/patterns.md</action>
</step>

</workflow>
