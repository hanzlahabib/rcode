---
name: rihal-memory-distill
description: >
  Generate or regenerate Memory Bank distillates — token-optimised, lossless
  compressions of Memory Bank source files for fast LLM context loading.
  Produces `distillates/project.distillate.md` and `distillates/stack.distillate.md`.
  Activates when the user says "distill memory bank", "regenerate distillates",
  "refresh distillates", "/rcode:memory-distill", "compress memory bank",
  "memory bank ko compress karo". Do NOT use for: bootstrap (use rcode-memory-init),
  surgical updates (use rcode-memory-update), or finding stale entries (use
  rcode-memory-audit). For non-Memory-Bank document compression, use the
  existing rihal-distillator skill.
triggers:
  - "distill memory bank"
  - "regenerate distillates"
  - "refresh distillates"
  - "compress memory bank"
  - "memory bank ko compress karo"
  - "/rcode:memory-distill"
user-invocable: true
---

## Overview

Read the Memory Bank source files and produce two LLM-optimised distillates: a full project distillate (`distillates/project.distillate.md`) and a stack-only distillate (`distillates/stack.distillate.md`). Distillates are lossless: every fact, decision, constraint, and relationship from the source files is preserved, but presentation overhead (headings, tables, prose connective tissue) is stripped to minimise token cost. Reuses the same compression principle as the existing `rihal-distillator` skill, scoped to Memory Bank files.

## Workflow

1. **Discover sources.** Walk `.rihal/memory/` and group files by target distillate:
   - **project distillate:** `project/*.md`, `people/*.md`, `milestones/current.md`, `incidents/known-issues.md`
   - **stack distillate:** `project/stack.md` only
2. **Hash sources.** Compute a digest of source file mtimes. If digest matches the existing distillate's `source-digest:` frontmatter, skip regeneration unless `--force` was passed.
3. **Compress.** For each target, read all source files, extract every fact/decision/constraint/relationship, and produce a dense markdown document. No summary mode — preserve everything.
4. **Verify losslessness.** For each fact in the source files, confirm it appears (verbatim or in directly-equivalent form) in the distillate. Report any drops as a warning.
5. **Write output** with frontmatter:
   ```yaml
   ---
   generated: true
   do-not-edit: true
   regenerate-with: /rcode:memory-distill
   source-digest: <hash>
   generated-at: <ISO datetime>
   source-files: [list of files included]
   token-estimate: <approximate>
   ---
   ```
6. **Print summary.** Show source file count, output token estimate, time taken.

## Output Format

```
✓ Memory Bank distillates regenerated

  distillates/project.distillate.md
    sources:  9 files
    tokens:   ~4,800
    digest:   a1b2c3d4

  distillates/stack.distillate.md
    sources:  1 file
    tokens:   ~600
    digest:   e5f6a7b8

Skip notice: source files unchanged since last run — no rewrite was needed.
```

## Examples

**Happy path**
User: `/rcode:memory-distill`
Skill: reads sources, regenerates both distillates, prints summary. ~10 seconds for a typical project.

**No-op skip**
User runs distill twice in a row without changing source files. Second run reports "source files unchanged" and exits without rewriting.

**Force refresh**
User: `/rcode:memory-distill --force`
Skill: regenerates regardless of digest match. Useful when distillate format itself changes.

**Negative — used on non-memory docs**
User wants to compress `docs/REFERENCE.md`. Wrong skill — direct them to `rihal-distillator` (which handles arbitrary documents).

## Memory Bank Hooks

- **Reads:** every file under `.rihal/memory/{project,people,milestones,incidents}/`
- **Writes:** `.rihal/memory/distillates/project.distillate.md`, `.rihal/memory/distillates/stack.distillate.md`
- **Idempotent:** safe to re-run; skips work when sources are unchanged
