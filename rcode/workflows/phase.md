<purpose>
Unified phase CRUD command. Routes to add (default — append integer phase to current milestone), insert (decimal phase under a parent — useful for urgent work mid-flight), or remove (delete an unstarted future phase + renumber). Replaces the muscle-memory pattern of remembering which of /rcode-add-phase, /rcode-insert-phase, /rcode-remove-phase to invoke.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is empty AND no flag is set:

```
/rcode-phase <name>                          # append next integer phase (default)
/rcode-phase --insert <parent> <name>        # insert decimal under <parent> (e.g. 14.1)
/rcode-phase --remove <id>                   # remove unstarted future phase + renumber
```

STOP — do not proceed.

## Step 1 — Disambiguate numeric arguments BEFORE routing

If `$ARGUMENTS` is a bare integer (e.g. `116`, `20`, `7`) with no other words or flags:

```bash
# Check if a phase directory matching this number already exists
PHASE_NUM="$ARGUMENTS"
EXISTING=$(find .planning/phases -maxdepth 1 -type d -name "${PHASE_NUM}-*" 2>/dev/null | head -1)
```

If `$EXISTING` is non-empty, the user typed a phase number that already exists — they almost certainly meant to operate on it, not create a new one. Stop and ask:

```
Phase {N} already exists: {directory name}

What did you mean to do?

  /rcode-execute {N}   — execute the sprint plan for this phase
  /rcode-plan {N}      — re-plan or view the plan for this phase
  /rcode-status        — see overall project status

  /rcode-phase "{description}"   — add a NEW phase (put the description in quotes)
```

Do NOT proceed to add/insert/remove. Wait for the user to clarify.

If `$ARGUMENTS` is a bare integer and `$EXISTING` is empty, it's an ambiguous but plausible new-phase name. Proceed to Step 2 but warn:

```
Note: "{N}" looks like a number. If you meant to execute/plan phase {N}, use /rcode-execute {N} or /rcode-plan {N}.
Adding a new phase named "{N}" — press Ctrl+C to cancel, or continue.
```

Then proceed to Step 2.

## Step 1b — Parse mode flags

Inspect `$ARGUMENTS`:

- `--insert <parent>` → insert mode (delegates to insert-phase workflow with the parent + name)
- `--remove <id>` → remove mode (delegates to remove-phase workflow)
- (none) → add mode (default, delegates to add-phase workflow)

Strip the mode flag and pass remaining args to the underlying workflow.

## Step 2 — Dispatch to underlying workflow (after disambiguation)

Each mode is implemented by an existing workflow:

- **add (default):** read and execute `@.rcode/workflows/add-phase.md`. Output identical to `/rcode-add-phase`.
- **insert (`--insert <parent>`):** read and execute `@.rcode/workflows/insert-phase.md`. Output identical to `/rcode-insert-phase`.
- **remove (`--remove <id>`):** read and execute `@.rcode/workflows/remove-phase.md`. Output identical to `/rcode-remove-phase`.

The underlying workflows are unchanged — `/rcode-phase` is a thin router. Behaviour, output format, and disk side-effects are byte-identical to invoking the underlying command directly.

## Step 3 — Footer

After the underlying workflow's output, append:

```
(rcode-phase: routed to {add|insert|remove} mode)
```

## Migration note

The three absorbed commands continue to work as first-class aliases. `/rcode-phase` exists as the unified entry. Future minor versions may consolidate further; until then, both invocation paths are supported.

## Acceptance

- [ ] `/rcode-phase "fix authentication"` produces the same artefacts as `/rcode-add-phase "fix authentication"`
- [ ] `/rcode-phase --insert 14 "hotfix wave"` produces the same artefacts as `/rcode-insert-phase 14 "hotfix wave"`
- [ ] `/rcode-phase --remove 99` produces the same artefacts as `/rcode-remove-phase 99`
- [ ] Unknown flag combinations produce a clear error
