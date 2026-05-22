---
name: rcode-memory-init
description: >
  Bootstrap the rcode Memory Bank for a project. Copies templates from
  `rcode/templates/memory/` into `.rcode/memory/`, then asks 5 questions to
  populate the most-used files (stack, current milestone, primary stakeholder).
  Activates when the user says "init memory bank", "bootstrap memory",
  "set up memory bank", "/rcode-memory-init", "create memory bank",
  "memory bank initialise", "memory bank kaise banayen". Do NOT use for:
  updating an existing Memory Bank (use rcode-memory-update), regenerating
  distillates (use rcode-memory-distill), or finding stale entries (use
  rcode-memory-audit).
triggers:
  # English
  - "init memory bank"
  - "bootstrap memory"
  - "set up memory bank"
  - "create memory bank"
  - "memory bank initialise"
  - "/rcode-memory-init"
  - "/rcode-memory-init"
  # Roman Urdu / Hindi
  - "memory bank kaise banayen"
  - "memory bank banao"
  - "memory bank shuru karo"
  - "memory init karo"
  # Arabic native
  - "هيّئ ذاكرة المشروع"
  - "أنشئ بنك الذاكرة"
  - "ابدأ ذاكرة ريحال"
  - "إعداد بنك الذاكرة"
user-invocable: false
---
@.rcode/references/karpathy-guidelines.md


## Overview

Initialise the `.rcode/memory/` directory in the current project. Copies the template scaffold, fills `INDEX.md` with the project name and date, and asks five short questions to seed the most useful files. Skill is idempotent: re-running on an initialised project will not overwrite existing entries — it reports gaps instead.

## Workflow

1. **Check for existing Memory Bank.** If `.rcode/memory/INDEX.md` exists, switch to "report mode": list files, show which sections are still empty, and exit. Do not overwrite.
2. **Copy templates.** Recursively copy `rcode/templates/memory/` → `.rcode/memory/`, preserving the directory structure.
3. **Substitute placeholders.** Replace `{{PROJECT_NAME}}` with the directory name (or `package.json` `name` if present), and `{{INIT_DATE}}` with today's ISO date.
4. **Ask the 5 init questions** (one at a time, accept short answers):
   1. One-sentence project goal → seeds `milestones/current.md` Goal field
   2. Primary stack (frontend / backend / database) → seeds `project/stack.md` Runtime table
   3. Current milestone name → seeds `milestones/current.md` Milestone Name
   4. Primary external stakeholder (name + role) → seeds `people/stakeholders.md`
   5. Any known production issue today → seeds `incidents/known-issues.md`
5. **Print the summary.** Show the file tree, where to add more, and recommend running `/rcode-memory-distill` once `project/stack.md` is fleshed out.
6. **Update `.rcode/state.json`** to record `memory_bank.initialised_at` so the dashboard shows it as live.

## Output Format

```
✓ Memory Bank initialised at .rcode/memory/

Files seeded from your answers:
  • milestones/current.md  — goal + milestone name
  • project/stack.md       — runtime stack
  • people/stakeholders.md — 1 contact
  • incidents/known-issues.md — 1 entry

Files still empty (fill as you go):
  • project/glossary.md
  • project/design-system.md   — visual tokens + components (read by ui-phase / frontend-design)
  • people/team.md
  • change-records/

Next step: run /rcode-memory-distill to generate fast-load distillates.
```

## Examples

**Happy path**
User: `/rcode-memory-init`
Skill: asks 5 questions, populates files, prints summary, updates state.json. Total time: under two minutes.

**Already initialised**
User: `/rcode-memory-init` on a project that already has `.rcode/memory/INDEX.md`.
Skill: refuses to overwrite. Lists files, shows which are still empty, suggests `/rcode-memory-update` for surgical edits.

**Negative — wrong skill**
User wants to "update the stakeholder list". Do not use this skill. Use `rcode-memory-update`.

## Memory Bank Hooks

- **Reads:** `package.json` (for project name), existing `.rcode/state.json`
- **Writes:** every file under `.rcode/memory/` (from templates), `.rcode/state.json` (`memory_bank.initialised_at`)
