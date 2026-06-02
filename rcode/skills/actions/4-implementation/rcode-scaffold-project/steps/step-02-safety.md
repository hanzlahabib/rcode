# Step 2: Safety Check

## Goal
Ensure the target directory is safe to scaffold into.

---

## Brownfield Mode (`{brownfield_mode}` = true)

### Case D — `.rcode/` already exists
- Check if `{target_path}/.rcode/` already exists.
- If yes: **STOP.**
  > "rcode is already initialized in this directory. Run `/rcode-init` to reconfigure, or `/rcode-update` to update skills."
- Do not proceed further.

### Case E — `.rcode/` does not exist (proceed with consent)
- Inform the user what will be created:
  > "I'll add the following to `{target_path}` (existing files will NOT be touched):
  > - `.rcode/` — rcode config and skills directory
  > - `.rcode/config.json` — project config (name, language, etc.)
  >
  > Shall I proceed?"
- Wait for explicit confirmation before proceeding.
- On confirmation: proceed to `step-03-brownfield.md`.

---

## Greenfield Mode (`{brownfield_mode}` = false)

### Case A — Directory does not exist
- Safe to proceed.
- Inform user: "Folder doesn't exist yet — I'll create it."
- Proceed to `step-03-clone.md`.

### Case B — Directory exists and is EMPTY
- Safe to proceed.
- Inform user: "Folder exists and is empty — proceeding."
- Proceed to `step-03-clone.md`.

### Case C — Directory exists and is NOT EMPTY
- **STOP. Do not touch anything.**
- Present the user with options:

  > "The folder `{target_path}` already has files in it. For safety I won't touch it.
  >
  > What would you like to do?
  > **A)** Create a new folder called `{project_name}-new` instead
  > **B)** Give me a different folder name
  > **C)** Empty the folder yourself first, then tell me when it's ready
  > **D)** Add rcode to this existing project instead (`--here` mode)"

- Wait for user response. Do NOT proceed until user explicitly confirms.
- If user chooses **A**: set `{target_path}` = `{cwd}/{project_name}-new`, proceed to step-03-clone.md.
- If user chooses **B**: ask for new name, loop back to step-01-target.md logic.
- If user chooses **C**: wait. When user says "ready" or "done", re-check the folder. Only proceed if it is now empty.
- If user chooses **D**: set `{brownfield_mode}` = `true`, proceed to Case E above (brownfield consent).

## Security Note
**NEVER delete, move, or modify files in an existing directory.** The user must take that action themselves. This skill only creates new content.
