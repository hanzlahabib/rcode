<purpose>
Unified capture command. Routes a single user gesture to the right Memory Bank surface based on flags: todo (default — actionable item), note (passive observation), seed (forward-looking idea with trigger conditions), or list (show pending todos). Replaces the muscle-memory pattern of remembering which of /rihal-add-todo, /rihal-note, /rihal-plant-seed, /rihal-check-todos to invoke.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is empty AND no flag is set:

```
/rihal-capture <text>                        # save as todo (default)
/rihal-capture --note <text>                 # passive observation
/rihal-capture --seed <text>                 # forward-looking with trigger
/rihal-capture --list [--area <area>]        # show pending todos
```

STOP — do not proceed.

## Step 1 — Parse mode flags

Inspect `$ARGUMENTS` for mode flags. Exactly one mode applies:

- `--note` → note mode (delegates to add-note workflow)
- `--seed` → seed mode (delegates to plant-seed workflow)
- `--list` → list mode (delegates to check-todos workflow)
- (none) → todo mode (default, delegates to add-todo workflow)

After determining mode, strip the mode flag from `$ARGUMENTS` and pass the remaining text to the underlying workflow.

## Step 2 — Dispatch to underlying workflow

Each mode is implemented by an existing workflow. Load and execute end-to-end:

- **todo (default):** read and execute `@.rcode/workflows/add-todo.md` with the cleaned `$ARGUMENTS`. Output identical to `/rihal-add-todo`.
- **note (`--note`):** read and execute `@.rcode/workflows/note.md`. Output identical to `/rihal-note`.
- **seed (`--seed`):** read and execute `@.rcode/workflows/plant-seed.md`. Output identical to `/rihal-plant-seed`.
- **list (`--list`):** read and execute `@.rcode/workflows/check-todos.md`. Output identical to `/rihal-check-todos`.

The underlying workflows are unchanged — `/rihal-capture` is a thin router. Behaviour, output format, and side effects are byte-identical to invoking the underlying command directly. This means `/rihal-add-todo "X"` and `/rihal-capture "X"` produce the same disk writes and the same console output.

## Step 3 — Footer

After the underlying workflow's normal output, append a single line indicating the mode that was selected:

```
(rihal-capture: routed to {todo|note|seed|list} mode)
```

This is invisible polish — confirms to the user that the dispatch was correct.

## Migration note

The four absorbed commands continue to work and are not deprecated yet — they remain canonical aliases. `/rihal-capture` exists as the unified entry for users who want one command to remember instead of four. Future minor versions may consolidate further; until then, both invocation paths are first-class.

## Acceptance

- [ ] `/rihal-capture "fix nav"` produces the same artefacts as `/rihal-add-todo "fix nav"`
- [ ] `/rihal-capture --note "hex codes everywhere"` produces the same artefacts as `/rihal-note "hex codes everywhere"`
- [ ] `/rihal-capture --seed "scale to 1k users"` produces the same artefacts as `/rihal-plant-seed "scale to 1k users"`
- [ ] `/rihal-capture --list` produces the same output as `/rihal-check-todos`
- [ ] No flag combinations are silently ignored — unknown flags surface as a clear error
