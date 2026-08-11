---
phase: {phase_dir}
sprint: {sprint_id}
type: execute | tdd
wave: {N}
depends_on: [{sprint_id}, ...]
files_modified: [{paths...}]
autonomous: true | false
requirements: [{REQ-01, REQ-02}]
owner: {haitham|hanzla|omar|waleed|yousef}    # OPTIONAL — omit if no council session grounds this plan or the domain split is ambiguous; see planner-playbook.md's "owner: field" section

must_haves:
  truths: [{observable outcomes from the user's perspective}]
  artifacts: [{files/models that must exist}]
  key_links: [{critical connections, breakage points}]
---

## Sprint {sprint_id}: {one-line sprint goal, plain English, no jargon}

{2-4 sentence plain-English recap: what this sprint builds and why, written for someone who will never open the XML tags below}

**Tasks:**
1. {task 1 title — copy the <title> attribute text verbatim}
2. {task 2 title}
3. {task N title}

_Below this line is the execution prompt the agent reads — task bodies, read-first file lists, verification commands. Not meant for skimming._

---

<objective>{what this sprint delivers and why, grounded in the council session or codebase scan}</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>{council session reference if one grounds this plan, else key codebase facts verified by Read}</context>

<!-- One <task> block per story. id= and title= are REQUIRED (scanner.js's primary parse path — do not use nested <title> tags or "### Story N — name" headings, those are legacy formats scanner.js only supports as a fallback). -->
<tasks>
<task id="{sprint_id}.{NN}" type="auto">
<title>{story title}</title>
<read_first>{files + line ranges the executor must read before writing}</read_first>
<files>{exact paths this task creates/modifies}</files>
<action>{specific implementation instructions}</action>
<verify>
  <automated>{command < 60 sec}</automated>
</verify>
<done>{measurable acceptance criteria}</done>
<evidence>{grep/lines/creates evidence per issue #649}</evidence>
</task>
</tasks>

<verification>{how to confirm the whole sprint, not just individual tasks, actually works}</verification>
<success_criteria>{bullet list — what must be true for this sprint to count as done}</success_criteria>
<output>Create `.planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md`</output>
