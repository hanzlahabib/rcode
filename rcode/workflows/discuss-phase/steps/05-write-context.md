# discuss-phase - step 05: Write CONTEXT.md

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="write_context">
Create CONTEXT.md capturing decisions made.

**Also generate DISCUSSION-LOG.md** — a full audit trail of the discuss-phase Q&A.
This file is for human reference only (software audits, compliance reviews). It is NOT
consumed by downstream agents (researcher, planner, executor).

**Find or create phase directory:**

Use values from init: `phase_dir`, `phase_slug`, `padded_phase`.

If `phase_dir` is null (phase exists in roadmap but no directory):
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

**File location:** `${phase_dir}/${padded_phase}-CONTEXT.md`

**Structure the content by what was discussed:**

```markdown
# Phase [X]: [Name] - Context

**Gathered:** [date]
**Status:** Ready for planning

<domain>
## Phase Boundary

[Clear statement of what this phase delivers — the scope anchor]

</domain>

<decisions>
## Implementation Decisions

### [Category 1 that was discussed]
- **D-01:** [Decision or preference captured]
- **D-02:** [Another decision if applicable]

### [Category 2 that was discussed]
- **D-03:** [Decision or preference captured]

### Claude's Discretion
[Areas where user said "you decide" — note that Claude has flexibility here]

### Folded Todos
[If any todos were folded into scope from the cross_reference_todos step, list them here.
Each entry should include the todo title, original problem, and how it fits this phase's scope.
If no todos were folded: omit this subsection entirely.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

[MANDATORY section. Write the FULL accumulated canonical refs list here.
Sources: ROADMAP.md refs + REQUIREMENTS.md refs + user-referenced docs during
discussion + any docs discovered during codebase scout. Group by topic area.
Every entry needs a full relative path — not just a name.]

### [Topic area 1]
- `path/to/adr-or-spec.md` — [What it decides/defines that's relevant]
- `path/to/doc.md` §N — [Specific section reference]

### [Topic area 2]
- `path/to/feature-doc.md` — [What this doc defines]

[If no external specs: "No external specs — requirements fully captured in decisions above"]

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [Component/hook/utility]: [How it could be used in this phase]

### Established Patterns
- [Pattern]: [How it constrains/enables this phase]

### Integration Points
- [Where new code connects to existing system]

</code_context>

<specifics>
## Specific Ideas

[Any particular references, examples, or "I want it like X" moments from discussion]

[If none: "No specific requirements — open to standard approaches"]

</specifics>

<deferred>
## Deferred Ideas

[Ideas that came up but belong in other phases. Don't lose them.]

### Reviewed Todos (not folded)
[If any todos were reviewed in cross_reference_todos but not folded into scope,
list them here so future phases know they were considered.
Each entry: todo title + reason it was deferred (out of scope, belongs in Phase Y, etc.)
If no reviewed-but-deferred todos: omit this subsection entirely.]

[If none: "None — discussion stayed within phase scope"]

</deferred>

---

*Phase: XX-name*
*Context gathered: [date]*
```

Write file.
</step>

Next: Read `.rcode/workflows/discuss-phase/steps/06-confirm-commit-state.md` before starting it (skip it if its Read-when condition is false).
