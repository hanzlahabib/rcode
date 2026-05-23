# Workflow: rihal-settings

<purpose>
View and edit Rihal project settings stored in `.rcode/config.yaml`. Closes
#233 — replaces the previous broken implementation that wrote flat keys
nothing read and corrupted the nested `workflow:` / `git:` sections on every
save.

The single source of truth for config keys is the table in Step 1.5. All keys
documented there are consumed somewhere in the codebase — settings that the
wizard writes are settings that workflows actually honour.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rihal-settings              # show current + interactive edit
/rihal-settings show         # show current only
/rihal-settings get <key>    # read a single dotted key (e.g. workflow.discuss_mode)
/rihal-settings set <key> <value>   # write a single dotted key
```

**Examples:**
```
/rihal-settings show
/rihal-settings get workflow.research_by_default
/rihal-settings set workflow.research_by_default true
/rihal-settings set git.branching_strategy feature-branch
```

## Step 1 — Resolve mode

Parse `$ARGUMENTS`:
- `show` (or empty) → run Step 1.5 then Step 2 (interactive)
- `get <key>` → Step 1.7 then STOP
- `set <key> <value>` → Step 1.8 then STOP
- anything else → print usage from Step 0 and STOP

## Step 1.5 — Show current settings

Read each known key via `rihal-tools.cjs config-get <dotted.key>` (the
nested-safe reader in `rihal/bin/lib/config.cjs`). **Do not** call the legacy
`config set` — it uses a flat YAML parser and corrupts nested sections.

```bash
TOOL="node .rcode/bin/rcode-tools.cjs"
$TOOL config-get user_name                            || echo "(unset)"
$TOOL config-get communication_language               || echo "(unset)"
$TOOL config-get mode                                 || echo "(unset)"
$TOOL config-get model_profile                        || echo "(unset)"
$TOOL config-get workflow.research_by_default         || echo "(unset)"
$TOOL config-get workflow.plan_checker                || echo "(unset)"
$TOOL config-get workflow.post_execute_gates          || echo "(unset)"
$TOOL config-get workflow.ui_safety_gate              || echo "(unset)"
$TOOL config-get workflow.discuss_mode                || echo "(unset)"
$TOOL config-get git.branching_strategy               || echo "(unset)"
$TOOL config-get git.commit_docs                      || echo "(unset)"
$TOOL config-get output.verbose                       || echo "(unset)"
```

Render as a table:

```
Current Rihal Settings (.rcode/config.yaml)

  Identity
    user_name                       : {value}
    communication_language          : {value}

  Execution
    mode                            : {value}    # guided | yolo
    model_profile                   : {value}    # quality | balanced | budget | inherit

  Workflow gates
    workflow.research_by_default    : {value}    # true | false
    workflow.plan_checker           : {value}    # true | false
    workflow.post_execute_gates     : {value}    # true | false
    workflow.ui_safety_gate         : {value}    # true | false
    workflow.discuss_mode           : {value}    # adaptive | discuss | skip

  Output
    output.verbose                  : {value}    # false (slim, default) | true (full detail)

  Git
    git.branching_strategy          : {value}    # none | feature-branch | worktree-isolation
    git.commit_docs                 : {value}    # true | false
```

If invoked as `/rihal-settings show`, STOP here.

## Step 1.7 — `get <key>`

```bash
node .rcode/bin/rcode-tools.cjs config-get "$KEY"
```

Print the result (empty output means unset). STOP.

## Step 1.8 — `set <key> <value>`

Validate the key against the table in Step 1.5 — reject unknown keys with
the table printed.

Validate the value:
- `mode` ∈ {guided, yolo}
- `model_profile` ∈ {quality, balanced, budget, inherit}
- `workflow.discuss_mode` ∈ {adaptive, discuss, skip}
- `git.branching_strategy` ∈ {none, feature-branch, worktree-isolation}
- `workflow.*` booleans ∈ {true, false}
- `output.verbose` ∈ {true, false}

```bash
node .rcode/bin/rcode-tools.cjs config-set "$KEY" "$VALUE"
```

Print:
```
✓ {key} = {value}
```

STOP.

## Step 2 — Interactive edit

After Step 1.5 prints the table, use the **`AskUserQuestion` tool** to prompt:

```
Which setting would you like to change?

  1. mode (guided / yolo)
  2. model_profile (quality / balanced / budget / inherit)
  3. workflow.research_by_default (true / false)
  4. workflow.plan_checker (true / false)
  5. workflow.post_execute_gates (true / false)
  6. workflow.ui_safety_gate (true / false)
  7. workflow.discuss_mode (adaptive / discuss / skip)
  8. git.branching_strategy (none / feature-branch / worktree-isolation)
  9. git.commit_docs (true / false)
  10. communication_language
  11. output.verbose (true / false)
  0. Done — exit
```

When the user picks a number, use **`AskUserQuestion` tool** again to ask for
the new value, showing the allowed values for that key.

Then call:

```bash
node .rcode/bin/rcode-tools.cjs config-set "{dotted.key}" "{value}"
```

After each successful write, re-display the affected row so the user sees the
change took effect.

Use **`AskUserQuestion`** again to loop — ask which setting to change next —
until the user picks `0` or `done`.

## Step 3 — Closing summary

Print:

```
✓ Settings saved to .rcode/config.yaml

Tip: settings take effect on the next workflow run. Use /rihal-settings show
to verify, or /rihal-resume-work to reload context.
```

## Success Criteria

- [ ] `/rihal-settings show` prints all 11 keys (no `(unset)` for keys with defaults)
- [ ] `/rihal-settings set workflow.discuss_mode discuss` round-trips: `config-get` returns `discuss`
- [ ] After any save, sibling keys in `workflow:` and `git:` blocks are preserved (no nesting corruption)
- [ ] Unknown keys are rejected with the allowed-keys table

## On Error

- **`.rcode/config.yaml` missing:** print "No config found. Run /rihal-init first." and STOP.
- **Invalid key:** print the allowed keys from Step 1.5 and STOP.
- **Invalid value:** print the allowed values for that key and STOP.
- **`rihal-tools.cjs` missing:** print "Run: npx @hanzlaa/rcode install ." and STOP.
