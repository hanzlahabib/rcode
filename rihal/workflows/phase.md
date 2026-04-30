<purpose>
Unified phase CRUD command. Routes to add (default — append integer phase to current milestone), insert (decimal phase under a parent — useful for urgent work mid-flight), or remove (delete an unstarted future phase + renumber). Replaces the muscle-memory pattern of remembering which of /rihal-add-phase, /rihal-insert-phase, /rihal-remove-phase to invoke.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is empty AND no flag is set:

```
/rihal-phase <name>                          # append next integer phase (default)
/rihal-phase --insert <parent> <name>        # insert decimal under <parent> (e.g. 14.1)
/rihal-phase --remove <id>                   # remove unstarted future phase + renumber
```

STOP — do not proceed.

## Step 1 — Parse mode flags

Inspect `$ARGUMENTS`:

- `--insert <parent>` → insert mode (delegates to insert-phase workflow with the parent + name)
- `--remove <id>` → remove mode (delegates to remove-phase workflow)
- (none) → add mode (default, delegates to add-phase workflow)

Strip the mode flag and pass remaining args to the underlying workflow.

## Step 2 — Dispatch to underlying workflow

Each mode is implemented by an existing workflow:

- **add (default):** read and execute `@.rihal/workflows/add-phase.md`. Output identical to `/rihal-add-phase`.
- **insert (`--insert <parent>`):** read and execute `@.rihal/workflows/insert-phase.md`. Output identical to `/rihal-insert-phase`.
- **remove (`--remove <id>`):** read and execute `@.rihal/workflows/remove-phase.md`. Output identical to `/rihal-remove-phase`.

The underlying workflows are unchanged — `/rihal-phase` is a thin router. Behaviour, output format, and disk side-effects are byte-identical to invoking the underlying command directly.

## Step 3 — Footer

After the underlying workflow's output, append:

```
(rihal-phase: routed to {add|insert|remove} mode)
```

## Migration note

The three absorbed commands continue to work as first-class aliases. `/rihal-phase` exists as the unified entry. Future minor versions may consolidate further; until then, both invocation paths are supported.

## Acceptance

- [ ] `/rihal-phase "fix authentication"` produces the same artefacts as `/rihal-add-phase "fix authentication"`
- [ ] `/rihal-phase --insert 14 "hotfix wave"` produces the same artefacts as `/rihal-insert-phase 14 "hotfix wave"`
- [ ] `/rihal-phase --remove 99` produces the same artefacts as `/rihal-remove-phase 99`
- [ ] Unknown flag combinations produce a clear error
