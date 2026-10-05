# plan - step 04: Nyquist artifacts check, file-ownership and conflict avoidance (planner spawn inputs)

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 7.5. Verify Nyquist Artifacts

Skip if `nyquist_validation_enabled` is false OR `research_enabled` is false.

Also skip if all of the following are true:
- `research_enabled` is false
- `has_research` is false
- no `--research` flag was provided

In that no-research path, Nyquist artifacts are **not required** for this run.

```bash
VALIDATION_EXISTS=$(ls "${PHASE_DIR}"/*-VALIDATION.md 2>/dev/null | head -1)
```

If missing and Nyquist is still enabled/applicable — ask user:
1. Re-run: `/rcode-plan {PHASE} --research ${RCODE_WS}`
2. Disable Nyquist with the exact command:
   `node ".rcode/bin/rcode-tools.cjs" config-set workflow.nyquist_validation false`
3. Continue anyway (plans fail Dimension 8)

Proceed to Step 8 only if user selects 2 or 3.


@.rcode/workflows/plan-spawn-planner.md

## 8.5. File-Ownership & Conflict-Avoidance

After the planner returns SPRINT.md files, run these checks before advancing to step 9.
These rules were added after overnight parallel builds exposed silent merge-time data loss
(calorie-calculator-ai, 2026-05-26). The wave-overlap CLI check in step 12.5 catches
same-wave/same-file issues mechanically; this step catches plan-level ownership gaps earlier.

**Step 1 — Build the cross-sprint file manifest.**

Read each SPRINT.md produced this run and collect its `files_modified:` frontmatter list.
Produce a de-duplicated map: `file → [sprint_ids that touch it]`.

```bash
# Quick grep of frontmatter to build the manifest
grep -A 50 "^files_modified:" "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null
```

**Step 2 — Flag collisions.**

For each file that appears in 2+ sprint lists:

| Type | Rule |
|------|------|
| Two sprints **create** the same file | Plan defect — merge tasks or sequence; only one sprint may create a file |
| Two same-wave sprints **modify** the same file | Later sprint MUST have `sequential: true` + `sequential_after:` in frontmatter |
| An aggregator file touched by multiple sprints | Each sprint's `<action>` must use append-only `Edit`, not `Write` |

Aggregator patterns (known high-collision targets):
- `**/index.ts`, `**/index.tsx` (barrel exports)
- `**/store/index.ts`, `**/store/index.js`
- `**/types/index.ts`, `**/types.ts`
- `main.py`, `app.py`, `router/__init__.py`, `**/__init__.py`
- `package.json` (scripts / deps blocks)

**Step 3 — Verify-command accuracy.**

Scan every `<verify><automated>` block for raw tool invocations (`tsc --noEmit`, `eslint .`,
`jest`, `vitest`). If found, check `package.json` scripts and replace with the `pnpm run <script>`
equivalent. Mismatch example from overnight build: plan wrote `tsc --noEmit` but the project's
script was named `type-check`.

**Step 4 — Report and gate.**

If any creation collision found → **BLOCK plan acceptance**. Edit the colliding sprint to remove
the duplicate creation task (have the second sprint import/extend from the first sprint's output).

If any modify-collision found in the same wave → edit the later sprint's frontmatter immediately:
```yaml
sequential: true
sequential_after: <earlier_sprint_id>
conflicting_files: [<shared_files...>]
```

Display a summary:
```
File-Ownership Check:
  ✓ N files with single owner
  ⚠ M aggregator files — append-only instructions verified
  ✗ K creation collisions (blocked — fixed inline)
  ~ J sequential flags added
```

If no issues: `File-Ownership Check: ✓ no collisions.`

**This check is informational for warnings and blocking for creation collisions.**
It never silently passes a plan where two sprints create the same file.

Track `FILE_OWNERSHIP_COLLISIONS` = the sum of creation collisions (K) and
modify-collisions requiring a sequential flag (J) found above (0 if the check
reported "✓ no collisions"). Step 9's Post-Plan Effort-Tier Gate (#950) reads
this to decide whether a single-sprint phase is clean enough to auto-skip
verification.

Next: Read `.rcode/workflows/plan/steps/05-planner-return-panel.md` before starting it (skip it if its Read-when condition is false).
