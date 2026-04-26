# Workflow: rcode-memory-audit

Read-only audit of the Memory Bank. Produces a severity-tagged report. Never modifies files.

---

## Inputs

None required. Optional `--severity {critical|warn|info}` to filter output.

## Preconditions

- `.rihal/memory/INDEX.md` exists

## Halt conditions

- Memory Bank not initialised → instruct to run `/rcode:memory-init` first

---

## Steps

### Step 1 — Catalogue files

Walk `.rihal/memory/` and build a list of every file plus its size and modification time. Include `.gitkeep` files for empty-subdir detection.

### Step 2 — Check 1: Stale milestone

Read `milestones/current.md`. Parse the "Target close" date. If `(today - target_close).days >= 30`, emit a `warn` finding.

### Step 3 — Check 2: Resolved issues lingering

For each entry in `incidents/known-issues.md`:
- Parse "Real fix planned for" field
- If it names a milestone that has been moved to `milestones/archive/`, emit a `warn` finding

### Step 4 — Check 3: Template placeholders unfilled

For each `*.md` file under `.rihal/memory/`:
- Count occurrences of `{{` literally (template placeholders)
- Count occurrences of `_(e.g.` (italicised template hints)
- If either is non-zero, emit an `info` finding listing the file and count

### Step 5 — Check 4: Stack vs decisions contradiction

For each decision entry in `project/decisions.md` that mentions a technology name:
- Extract candidate tech terms (proper nouns, capitalised + version)
- Search `project/stack.md` for the term
- If not found, emit a `critical` finding

### Step 6 — Check 5: Empty subdirectories

For `change-records/`, `incidents/post-mortems/`, `milestones/archive/`:
- If only file is `.gitkeep`, emit an `info` finding (not a problem, just visibility)

### Step 7 — Check 6: Distillate freshness

For each `distillates/*.distillate.md`:
- Read frontmatter `source-digest`
- Recompute digest of current source files (per `rcode-memory-distill` rules)
- If mismatch, emit a `warn` finding suggesting `/rcode:memory-distill`

### Step 8 — Render report

Group findings by severity (critical → warn → info), then by file within each severity group. For each finding, print:
- File path
- One-line description
- One-line `Fix:` suggestion (which skill to run, or manual action)

If `--severity` filter passed, hide findings below the threshold.

If zero findings: print `✓ Memory Bank is healthy. 0 findings.`

---

## Post-conditions

- No files modified
- Report printed to stdout

## Reversibility

Read-only — no state to revert.
