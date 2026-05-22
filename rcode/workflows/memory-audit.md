# Workflow: rcode-memory-audit

<purpose>
Audit the Memory Bank for stale entries, contradictions, missing sections, and content that should be archived. Read-only by default with severity-tagged report; `--fix` patches trivial items per Phase 6 D-1 / D-2.
</purpose>

Audit the Memory Bank. Default mode is read-only (severity-tagged report).
Optional `--fix` flag patches trivial items in place per Phase 6 D-1 / D-2.

---

## Inputs

None required.

Optional flags:
- `--severity {critical|warn|info}` — filter report output
- `--fix` — opt-in auto-fix mode. Patches only items the auditor classifies
  as severity=trivial (typos, stale ISO dates, broken relative paths,
  factually-wrong-and-mechanically-correctable values). Hard-allowlisted
  in code: items above trivial are never patched. Default OFF.

```bash
FIX_MODE=false
if [[ "$ARGUMENTS" =~ (^|[[:space:]])--fix($|[[:space:]]) ]]; then
  FIX_MODE=true
fi
```

## Preconditions

- `.rcode/memory/INDEX.md` exists

## Halt conditions

- Memory Bank not initialised → instruct to run `/rcode-memory-init` first

---

## Steps

### Step 1 — Catalogue files

Walk `.rcode/memory/` and build a list of every file plus its size and modification time. Include `.gitkeep` files for empty-subdir detection.

### Step 2 — Check 1: Stale milestone

Read `milestones/current.md`. Parse the "Target close" date. If `(today - target_close).days >= 30`, emit a `warn` finding.

### Step 3 — Check 2: Resolved issues lingering

For each entry in `incidents/known-issues.md`:
- Parse "Real fix planned for" field
- If it names a milestone that has been moved to `milestones/archive/`, emit a `warn` finding

### Step 4 — Check 3: Template placeholders unfilled

For each `*.md` file under `.rcode/memory/`:
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
- If mismatch, emit a `warn` finding suggesting `/rcode-memory-distill`

### Step 8 — Render report

Group findings by severity (critical → warn → info), then by file within each severity group. For each finding, print:
- File path
- One-line description
- One-line `Fix:` suggestion (which skill to run, or manual action)

If `--severity` filter passed, hide findings below the threshold.

If zero findings: print `✓ Memory Bank is healthy. 0 findings.`

### Step 9 — Apply fixes (only when `--fix` is set)

<step name="apply_fixes">
Skip if `FIX_MODE` is false.

For each finding from the audit:
- If severity is `trivial` (typo, stale ISO date, dead relative path,
  provably-wrong factual value with an unambiguous replacement), patch in place.
- For all other severities (`info`, `warn`, `critical`), leave for human review
  and keep them in the report — never patch.

Patching rule (HARD): use file Read+Edit (NOT regex sed) so fixes are exact
string replacements that fail loudly on ambiguity. Sed-based mass-replace is
forbidden because it silently rewrites unintended occurrences.

Atomic commit per fix:

```bash
git add <file>
git commit -m "fix(memory): <what was stale> → <what's true now>"
```

After the loop, log: `Memory --fix applied {N} trivial corrections across {M} commits.`

If a finding marked trivial fails to patch (file changed mid-flight, ambiguous
replacement, etc.), log it under "Skipped fixes" in the final report and
continue with the next finding — never abort the whole run on a single failure.
</step>

---

## Guardrails

- `--fix` NEVER patches above trivial severity, even with a `--force` flag (don't accept --force here)
- `--fix` uses Read+Edit, not regex sed
- `--fix` commits each correction atomically (no batched commits)
- Default behavior (no `--fix`) is unchanged: report-only

## Post-conditions

- When `--fix` is OFF: no files modified; report printed to stdout
- When `--fix` is ON: only trivial items modified; each as its own commit; report still printed

## Reversibility

- Default mode: read-only — no state to revert.
- `--fix` mode: each fix is its own atomic git commit, so individual fixes can be reverted with `git revert <hash>`.

## Success criteria

- [ ] Default behavior unchanged — `--fix` off by default; report-only path preserved
- [ ] `--fix` patches only trivial items, each as atomic commit prefixed `fix(memory):`
- [ ] Report still printed even in `--fix` mode (so user sees what was/wasn't patched)
