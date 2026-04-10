# Code Review Workflow

<workflow>

<step n="1" goal="Load minimal context">
<action>Run context-build with task="review"</action>
</step>

<step n="2" goal="Gather the diff">
<ask>Provide git diff, PR URL, or changed files list</ask>
<action>Load ONLY the changed files and their direct dependencies</action>
</step>

<step n="3" goal="Omar — implementation review">
<action>Load omar.engineer.agent.md</action>
Check:
- Does it follow existing patterns?
- Naming clarity
- Unnecessary complexity
- Missing edge cases
- Test coverage
</step>

<step n="4" goal="Ahmed — architectural review">
<action>Load ahmed.cto.agent.md (only if non-trivial change)</action>
Check:
- Respects existing architecture
- No new dependencies added silently
- Security implications
- Backward compatibility
</step>

<step n="5" goal="Fatima — test quality review">
<action>Load fatima.qa.agent.md</action>
Check:
- Tests cover happy path AND edge cases
- No tests only for coverage (verify they actually assert meaningful things)
- No mocking of what should be tested
</step>

<step n="6" goal="Consolidated verdict">
<action>Produce review as table:
| File | Line | Severity | Comment | Reviewer |
</action>

<action>Final verdict: APPROVE / REQUEST CHANGES / BLOCK</action>

<action>Save to .rihal/artifacts/reviews/{pr-id}.md</action>
</step>

</workflow>
