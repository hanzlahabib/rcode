<purpose>
Unified capture command. Routes a single user gesture to the right Memory Bank surface based on flags: todo (default — actionable item), note (passive observation), seed (forward-looking idea with trigger conditions), or list (show pending todos). Replaces the muscle-memory pattern of remembering which of /rcode-add-todo, /rcode-note, /rcode-plant-seed, /rcode-check-todos to invoke.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is empty AND no flag is set:

```
/rcode-capture <text>                        # save as todo (default)
/rcode-capture --note <text>                 # passive observation
/rcode-capture --seed <text>                 # forward-looking with trigger
/rcode-capture --list [--area <area>]        # show pending todos
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

- **todo (default):** read and execute `@.rcode/workflows/add-todo.md` with the cleaned `$ARGUMENTS`. Output identical to `/rcode-add-todo`.
- **note (`--note`):** read and execute `@.rcode/workflows/note.md`. Output identical to `/rcode-note`.
- **seed (`--seed`):** read and execute `@.rcode/workflows/plant-seed.md`. Output identical to `/rcode-plant-seed`.
- **list (`--list`):** read and execute `@.rcode/workflows/check-todos.md`. Output identical to `/rcode-check-todos`.

The underlying workflows are unchanged — `/rcode-capture` is a thin router. Behaviour, output format, and side effects are byte-identical to invoking the underlying command directly. This means `/rcode-add-todo "X"` and `/rcode-capture "X"` produce the same disk writes and the same console output.

## Step 3 — Footer

After the underlying workflow's normal output, append a single line indicating the mode that was selected:

```
(rcode-capture: routed to {todo|note|seed|list} mode)
```

This is invisible polish — confirms to the user that the dispatch was correct.

## Migration note

The four absorbed commands continue to work and are not deprecated yet — they remain canonical aliases. `/rcode-capture` exists as the unified entry for users who want one command to remember instead of four. Future minor versions may consolidate further; until then, both invocation paths are first-class.

## Acceptance

- [ ] `/rcode-capture "fix nav"` produces the same artefacts as `/rcode-add-todo "fix nav"`
- [ ] `/rcode-capture --note "hex codes everywhere"` produces the same artefacts as `/rcode-note "hex codes everywhere"`
- [ ] `/rcode-capture --seed "scale to 1k users"` produces the same artefacts as `/rcode-plant-seed "scale to 1k users"`
- [ ] `/rcode-capture --list` produces the same output as `/rcode-check-todos`
- [ ] No flag combinations are silently ignored — unknown flags surface as a clear error
