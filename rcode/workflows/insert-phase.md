# Workflow: rcode-insert-phase

<purpose>
Insert a decimal phase for urgent work discovered mid-milestone between existing integer phases. Uses decimal numbering (2.1, 2.2, etc.) to preserve the logical sequence of planned phases while accommodating urgent insertions without renumbering subsequent phases. Maintains phase array in `.rcode/state.json` in sort order.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:
- Print the usage block below
- STOP — do not proceed to Step 0.5

**Usage:**
```
/rcode-insert-phase <N.M> <name>
```

**Examples:**
```
/rcode-insert-phase 2.1 urgent-fix
/rcode-insert-phase 3.2 critical-security-patch
/rcode-insert-phase 1.1 blocking-issue
```

Only after the user provides arguments, proceed to Step 0.5.

## Step 0.5 — Validate N.M format

Parse the first argument as `N.M` (integer.decimal format).

Validate using regex: `^\d+\.\d+$`

If validation fails:
```
ERROR: Phase number must be in N.M format (e.g., 2.1, 3.2)
Usage: /rcode-insert-phase <N.M> <name>
```

Exit.

Extract `N` (integer part) and `M` (decimal part) for later use.

## Step 1 — Call rcode-tools

Invoke the state subcommand to insert the phase:

```bash
RESULT=$(node .rcode/bin/rcode-tools.cjs state insert-phase --number <N.M> --name <name>)
```

Parse the JSON response for:
- `ok` — success flag
- `phase_number` — the inserted phase number (should match N.M)
- `name` — phase name
- `slug` — lowercase-hyphenated slug generated from name
- `directory` — absolute path to created directory (`.planning/phases/<N.M>-<slug>/`)

If `ok` is false, print error message and exit.

## Step 2 — Create phase directory

Ensure the phase directory exists:

```bash
mkdir -p "<directory_from_result>"
```

If directory creation fails, print error and exit.

## Step 3 — Print confirmation

Present completion summary:

```
✓ Phase {phase_number} inserted: {name}
  Directory: .planning/phases/{phase_number}-{slug}/
  Status: Ready for planning

Next steps:
  /rcode-discuss-phase {phase_number}   — gather context
  /rcode-plan {phase_number}            — create detailed plan

Or continue with current work and return to this phase later.
```

## Anti-patterns

- Don't insert before Phase 1 (decimal 0.1 makes no sense)
- Don't renumber existing phases
- Don't create plans yet (that's `/rcode-plan`)
- Don't commit changes (user decides when to commit)
- Don't duplicate phase numbers (state insert-phase prevents this)

## Success criteria

Phase insertion is complete when:

- [ ] `rcode-tools.cjs state insert-phase` executed successfully
- [ ] Phase directory created at `.planning/phases/<N.M>-<slug>/`
- [ ] Phase array in state.json updated with new entry in sort order
- [ ] User informed of next steps

## Success Criteria

- [ ] Task completed as requested
- [ ] Output saved or reported
- [ ] State updated if necessary
- [ ] No errors encountered

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user

