# Workflow: rihal:create-epics-and-stories

<purpose>
Parse a PRD, PROJECT.md, or project document to generate numbered epic files in `.planning/epics/`. Each epic file contains user stories with acceptance criteria, development notes, and effort estimates. Output is ready for `/rihal:sprint-planning`.
</purpose>

<available_agent_types>
- `rihal-roadmapper` — reads PRD and generates epic structure
</available_agent_types>

## Step 0 — Validation

**If no arguments:**

```
Usage: /rihal:create-epics-and-stories <prd.md | PROJECT.md> [--prefix <name>]

Examples:
  /rihal:create-epics-and-stories .planning/PROJECT.md
  /rihal:create-epics-and-stories prd.md --prefix myapp
```

Stop and wait for arguments.

**Validate input file exists:**

```bash
if [[ ! -f "$INPUT_FILE" ]]; then
  echo "Error: File not found: $INPUT_FILE"
  exit 1
fi
```

**Parse flags:**

- `--prefix` (optional): prefix for epic filenames. Default: derived from input filename (e.g., `PROJECT.md` → prefix `project`)

## Step 1 — Load References

```bash
@.rihal/references/checklist-story-draft.md
@.rihal/references/commit-conventions.md
```

## Step 2 — Spawn Epic Generator

Call `rihal-roadmapper` to read the PRD and produce epic structure:

```
You are reading a project requirements document to extract epics and stories.

## Your task

Read the provided document and generate a structured list of epics. Each epic contains 3-5 user stories.

## Document

{content of INPUT_FILE}

## Output format

Return JSON with this structure:

{
  "epics": [
    {
      "number": 1,
      "title": "Epic title",
      "description": "2-3 sentence description of this epic's scope",
      "stories": [
        {
          "id": "EPIC-1.1",
          "title": "Story title",
          "persona": "Named persona (e.g., 'Alice (Product Manager)')",
          "action": "as a [persona], I want to [action]",
          "outcome": "so that [business value]",
          "acceptance_criteria": [
            "Testable condition 1",
            "Testable condition 2"
          ],
          "out_of_scope": [
            "What this does NOT do"
          ],
          "effort": "S|M|L",
          "effort_rationale": "why this size",
          "dev_notes": "Technical considerations, risks, dependencies"
        }
      ]
    }
  ]
}
```

## Output requirements

1. Generate 3-8 epics (adjust based on scope)
2. Each epic has 3-5 stories
3. Each story must pass checklist-story-draft.md checks
4. Effort estimates realistic (S=1-2 days, M=3-5 days, L=1+ weeks)
5. All effort estimates must be verifiable (not all S, not all L)
6. User personas must be named and specific
7. Acceptance criteria must be independently testable
```

Wait for the roadmapper response (JSON).

## Step 3 — Validate Epic Structure

```bash
EPIC_JSON=$(# roadmapper response from Step 2)
EPIC_COUNT=$(echo "$EPIC_JSON" | jq '.epics | length')

if [[ $EPIC_COUNT -lt 3 ]]; then
  echo "Warning: Generated only $EPIC_COUNT epics (expected 3-8). Ask roadmapper to expand."
  # Re-run Step 2 with prompt: "Expand to 5-8 epics. Split large stories into smaller ones."
fi
```

Validate each story passes draft checklist:
- Persona named ✓
- Action/outcome specified ✓
- 3+ acceptance criteria ✓
- Out-of-scope listed ✓
- Effort estimated ✓

If any story fails, ask roadmapper to fix.

## Step 4 — Generate Epic Files

Create `.planning/epics/` directory:

```bash
mkdir -p .planning/epics
```

For each epic in the JSON, generate a numbered file `EPIC-{n}.md`:

```bash
for epic in $(echo "$EPIC_JSON" | jq -r '.epics[] | @base64'); do
  NUMBER=$(echo "$epic" | base64 -d | jq -r '.number')
  TITLE=$(echo "$epic" | base64 -d | jq -r '.title')
  FILENAME=".planning/epics/EPIC-$(printf "%02d" $NUMBER).md"
  
  # Generate file content (see template below)
  node .rihal/bin/rihal-tools.cjs generate-epic "$epic" > "$FILENAME"
done
```

**Epic file template (EPIC-01.md, EPIC-02.md, etc.):**

```markdown
# Epic {N}: {Title}

**Scope:** {description}

**Stories:** {count}

---

## Story {EPIC-N.1}: {Story title}

**Persona:** {Named persona}

**Action:** As a {persona}, I want to {action} so that {outcome}.

### Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

### Out of Scope

- {Exclusion 1} — {why}
- {Exclusion 2} — {why}

### Effort

**Estimate:** {S | M | L}

**Rationale:** {why this size}

### Dev Notes

{Technical considerations, risks, dependencies, implementation hints}

---

## Story {EPIC-N.2}: ...

[Same structure as Story N.1, repeat for each story in epic]

---

## Summary

| Story | Persona | Effort | Status |
|-------|---------|--------|--------|
| EPIC-{N}.1 | ... | S | — |
| EPIC-{N}.2 | ... | M | — |

**Total Epic Effort:** {sum of all story efforts}

---

*Generated: {timestamp}*
*Generated from: {input filename}*
*Ready for: /rihal:create-story, /rihal:sprint-planning*
```

## Step 5 — Create Index

Create `.planning/epics/INDEX.md`:

```markdown
# Epics & Stories

Generated from: {input filename}
Date: {ISO date}

## Epics

| Epic | Title | Stories | Total Effort |
|------|-------|---------|--------------|
| EPIC-01 | {Title} | 4 | M + M + S + S = 1.5w |
| EPIC-02 | {Title} | 3 | L + M + S = 2.5w |
| ... | | | |

**Total Project Effort (sum of all stories):** {estimated weeks}

**Key Stories (must complete before others can start):**

- EPIC-01.1: Setup infrastructure
- EPIC-02.1: Authentication

**Nice-to-Have Stories (can slip if needed):**

- EPIC-05.3: Analytics dashboard
- EPIC-08.2: Premium features

---

## Next Steps

1. Run `/rihal:sprint-planning` to organize epics into sprints
2. Run `/rihal:create-story [epic-file]` to enter detailed development mode
3. Run `/rihal:dev-story` to wrap a story for AI-coder execution

---

*Use this index as the master roadmap. Update after each sprint.*
```

## Step 6 — Commit Epic Files

```bash
git add .planning/epics/
git commit -m "feat(epics): generate epic structure from $(basename $INPUT_FILE)"
```

Print:

```
📊 Epic structure generated

Location: .planning/epics/
Files: {count} epic files + INDEX.md
Total stories: {count}
Total estimated effort: {weeks}

Next: /rihal:sprint-planning to organize into sprints
```

## Errors

- **Input file not found:** print error and exit
- **Roadmapper returns invalid JSON:** ask roadmapper to fix and re-run
- **Fewer than 3 epics:** warn and ask roadmapper to expand
- **Story missing acceptance criteria:** mark with ⚠️ and ask roadmapper to add
