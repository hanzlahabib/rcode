# Assumptions Analyzer Playbook

Loaded by `rihal-assumptions-analyzer` via `@-include`. Contains the calibration
tier definitions, analysis process, output format template, and rules.

The agent stub holds the role definition, input spec, anti_patterns, and
constraints.

---

## Calibration Tiers

The calibration tier controls output shape. Follow the tier instructions exactly.

### full_maturity
- **Areas:** 3-5 assumption areas
- **Alternatives:** 2-3 per Likely/Unclear item
- **Evidence depth:** Detailed file path citations with line-level specifics

### standard
- **Areas:** 3-4 assumption areas
- **Alternatives:** 2 per Likely/Unclear item
- **Evidence depth:** File path citations

### minimal_decisive
- **Areas:** 2-3 assumption areas
- **Alternatives:** Single decisive recommendation per item
- **Evidence depth:** Key file paths only

---

## Process

1. Read ROADMAP.md and extract the phase description
2. Read any prior CONTEXT.md files from earlier phases (find via `find .planning/phases -name "*-CONTEXT.md"`)
3. Use Glob and Grep to find files related to the phase goal terms
4. Read 5-15 most relevant source files to understand existing patterns
5. Form assumptions based on what the codebase reveals
6. Classify confidence: Confident (clear from code), Likely (reasonable inference), Unclear (could go multiple ways)
7. Flag any topics that need external research (library compatibility, ecosystem best practices)
8. Return structured output in the exact format below

---

## Output Format

Return EXACTLY this structure:

```
## Assumptions

### [Area Name] (e.g., "Technical Approach")
- **Assumption:** [Decision statement]
  - **Why this way:** [Evidence from codebase -- cite file paths]
  - **If wrong:** [Concrete consequence of this being wrong]
  - **Confidence:** Confident | Likely | Unclear

### [Area Name 2]
- **Assumption:** [Decision statement]
  - **Why this way:** [Evidence]
  - **If wrong:** [Consequence]
  - **Confidence:** Confident | Likely | Unclear

(Repeat for 2-5 areas based on calibration tier)

## Needs External Research
[Topics where codebase alone is insufficient -- library version compatibility,
ecosystem best practices, etc. Leave empty if codebase provides enough evidence.]
```

---

## Rules

1. Every assumption MUST cite at least one file path as evidence.
2. Every assumption MUST state a concrete consequence if wrong (not vague "could cause issues").
3. Confidence levels must be honest -- do not inflate Confident when evidence is thin.
4. Minimize Unclear items by reading more files before giving up.
5. Do NOT suggest scope expansion -- stay within the phase boundary.
6. Do NOT include implementation details (that's for the planner).
7. Do NOT pad with obvious assumptions -- only surface decisions that could go multiple ways.
8. If prior decisions already lock a choice, mark it as Confident and cite the prior phase.
