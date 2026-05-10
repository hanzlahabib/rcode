# Sprint Checker Playbook

Loaded by `rihal-sprint-checker` via `@-include`. Contains the full
verification methodology: project context loading, upstream input
handling, core verification principle, 12 verification dimensions,
execution steps, mandatory output markers, and constraints.

CRITICAL: The "Mandatory output markers" section is load-bearing.
The orchestrator malfunction guard checks for `issues:` and
`verified_files:` YAML blocks in every agent return. Copy this
section verbatim — no reformatting.

<project_context>
Before verifying, discover project context:

**Project instructions:** Read `./CLAUDE.md` if it exists in the working directory. Follow all project-specific guidelines, security requirements, and coding conventions.

**Project skills:** Check `.agent/skills/` or `.agents/skills/` directory if either exists:
1. List available skills (subdirectories)
2. Read `SKILL.md` for each skill (lightweight index ~130 lines)
3. Load specific `rules/*.md` files as needed during verification
4. 
5. Verify sprints account for project skill patterns

This ensures verification checks that sprints follow project-specific conventions.
</project_context>

<upstream_input>
**CONTEXT.md** (if exists) — User decisions from `/rihal-discuss-phase`

| Section | How You Use It |
|---------|----------------|
| `## Decisions` | LOCKED — sprints MUST implement these exactly. Flag if contradicted. |
| `## the agent's Discretion` | Freedom areas — planner can choose approach, don't flag. |
| `## Deferred Ideas` | Out of scope — sprints must NOT include these. Flag if present. |

If CONTEXT.md exists, add verification dimension: **Context Compliance**
- Do sprints honor locked decisions?
- Are deferred ideas excluded?
- Are discretion areas handled appropriately?
</upstream_input>

<core_principle>
**Sprint completeness =/= Goal achievement**

A task "create auth endpoint" can be in the sprint while password hashing is missing. The task exists but the goal "secure authentication" won't be achieved.

Goal-backward verification works backwards from outcome:

1. What must be TRUE for the phase goal to be achieved?
2. Which tasks address each truth?
3. Are those tasks complete (files, action, verify, done)?
4. Are artifacts wired together, not just created in isolation?
5. Will execution complete within context budget?

Then verify each level against the actual sprint files.

**The difference:**
- `rihal-verifier`: Verifies code DID achieve goal (after execution)
- `rihal-sprint-checker`: Verifies sprints WILL achieve goal (before execution)

Same methodology (goal-backward), different timing, different subject matter.
</core_principle>

<verification_dimensions>


1. Requirement Coverage
2. Task Completeness
3. Dependency Correctness
4. Key Links Planned
5. Scope Sanity
6. Verification Derivation
7. Context Compliance (only if CONTEXT.md present)
8. Nyquist Compliance
9. Cross-Sprint Data Contracts
10. CLAUDE.md Compliance
11. File References Verification
12. Evidence Grounding (issue #649) — every task body MUST include an `<evidence>` block citing real grep hit counts, real `path:line` ranges, or an explicit `creates:` justification. A task that names a file count, component, or pattern with no traceable codebase query is **theoretical** and rejected. Run a sample of the cited greps yourself; if the planner's claimed "13 hits" actually returns 4, downgrade to BLOCKER.

Each dimension has pass/partial/fail criteria, remediation guidance, and output format requirements.

</verification_dimensions>

## Execution (Slim)

1. **Load context** — Read phase SCOPE.md, CONTEXT.md (if present), RESEARCH.md, and all SPRINT.md files.
2. **Run dimensions** — For each verification dimension, collect evidence and classify (pass / partial / fail).
3. **Programmatic evidence check (issue #649)** — call:
   ```
   node .rihal/bin/rihal-tools.cjs plan validate-evidence <phase> --spot-check
   ```
   Exit code 0 = pass, 1 = at least one task violation. Inline the JSON `violations[]` into dimension 12 of CHECK.md verbatim — these are authoritative and must not be paraphrased away.
4. **Synthesize** — Produce CHECK.md with overall verdict, per-dimension scores, remediation asks.
5. **Return** — Block execution if critical dimensions fail (Evidence Grounding is critical); proceed with cautions if only partials.

## Mandatory output markers (per #440 / #445 fix)

Every return from this agent MUST include at least one of these YAML markers — they prove tool invocation actually happened. The orchestrator's malfunction guard in `plan.md` blocks execution if none are present.

```yaml
issues:           # always emit, even if empty (issues: [])
  - dimension: <name>
    severity: BLOCKER | WARNING | INFO
    path: <file:line>
    finding: <short text>

verified_files:   # list every file actually read during verification
  - path: <relative path>
    bytes: <int>
```

If you have not invoked `Read`, `Bash`, `Grep`, or `Glob` during execution, do NOT return — instead, report the failure and stop. Empty narrative output is treated as malfunction, not pass.

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Full dimension definitions with examples, checks, output formats | `.rihal/agents-rules/sprint-checker/dimensions.md` |
| Step-by-step verification process (Steps 1-9.5) | `.rihal/agents-rules/sprint-checker/process.md` |

Read these only when actually performing the check. Don't preemptively load.

## Constraints

- Never modify sprints — read-only analysis
- Produce CHECK.md at `.planning/phases/{phase}/{phase}-{sprint}-CHECK.md`
- Block execution on critical fails (missing coverage, broken deps, unverifiable outcomes)
