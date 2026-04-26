# Workflow: rcode-memory-init

Bootstraps the rcode Memory Bank in the current project. Idempotent — re-running on an initialised project switches to a gap report instead of overwriting.

---

## Inputs

- **Project root** — current working directory; must contain a `.rihal/` folder (created by `rcode install`)
- **Templates source** — `.rihal/templates/memory/` (copied from `rihal/templates/memory/` on install)

## Preconditions

- `.rihal/` exists (rcode is installed in this project)
- `.rihal/templates/memory/` exists (templates ship with rcode)

## Halt conditions

- `.rihal/` missing → ask user to run `npx @hanzlaa/rcode install` first, then halt.
- `.rihal/templates/memory/` missing → report bug, halt.
- User cancels at any question → leave `.rihal/memory/` partially populated (whatever was seeded) and exit cleanly.

---

## Steps

### Step 1 — Detect existing Memory Bank

```bash
if [ -f ".rihal/memory/INDEX.md" ]; then
  # Switch to gap-report mode
  exit_with_gap_report
fi
```

If `INDEX.md` exists:
- List every file under `.rihal/memory/`
- For each, count non-template lines (lines that don't start with `<!--` or contain `_(...)_` placeholders)
- Print which files are empty / template-only and which are populated
- Suggest `/rcode:memory-update` for surgical edits and exit

### Step 2 — Copy templates

```bash
mkdir -p .rihal/memory
cp -R .rihal/templates/memory/. .rihal/memory/
```

Preserves the directory structure. Includes `.gitkeep` files in empty subdirs.

### Step 3 — Substitute placeholders

Replace in every `*.md` file under `.rihal/memory/`:
- `{{PROJECT_NAME}}` → derived from `package.json` `name`, fallback to directory basename
- `{{INIT_DATE}}` → today's date in `YYYY-MM-DD` format

### Step 4 — Five init questions

Ask each via AskUserQuestion. Accept short answers; do not push for paragraphs.

**Q1.** What is the one-sentence project goal? *(saved to `milestones/current.md` → Goal)*

**Q2.** Primary stack — frontend / backend / database? *(parsed into `project/stack.md` Runtime table)*

**Q3.** What is the current milestone name? *(saved to `milestones/current.md` → Milestone Name; default `M1 — Initial`)*

**Q4.** Primary external stakeholder name and role? *(appended to `people/stakeholders.md`)*

**Q5.** Any known production issue you'd warn a new teammate about today? *(appended to `incidents/known-issues.md`; "none" is acceptable)*

### Step 5 — Update state.json

Add or update the `memory_bank` block in `.rihal/state.json`:

```json
{
  "memory_bank": {
    "initialised_at": "<ISO datetime>",
    "version": 1
  }
}
```

### Step 6 — Print summary

Show:
- File tree of `.rihal/memory/`
- Files seeded vs files still empty
- Suggested next command: `/rcode:memory-distill`

---

## Post-conditions

- `.rihal/memory/INDEX.md` exists with project name + date filled in
- 4–5 of the seeded files have user-supplied content
- `.rihal/state.json` records initialisation
- The Diwan dashboard `/memory` route now renders content (Phase 3 dashboard work)

## Reversibility

Removing a botched init: `rm -rf .rihal/memory/` and `git checkout -- .rihal/state.json`. No external side effects.
