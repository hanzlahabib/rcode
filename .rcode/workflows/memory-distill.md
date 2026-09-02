# Workflow: rcode-memory-distill

<purpose>
Regenerate Memory Bank distillates with lossless compression — token-optimized snapshots of source files for fast LLM context loading. Idempotent: re-running on already-distilled content produces identical output.
</purpose>

Regenerate Memory Bank distillates with lossless compression. Idempotent.

---

## Inputs

- `--force` (optional) — regenerate even when source files are unchanged
- `--target {project|stack|all}` (optional, default `all`) — limit which distillate to regenerate

## Preconditions

- `.rcode/memory/` exists
- `.rcode/memory/distillates/` exists (created by `rcode-memory-init`)

## Halt conditions

- `.rcode/memory/` missing → instruct to run `/rcode-memory-init` first
- All sources empty (only template placeholders) → warn and exit; no point distilling empty content

---

## Steps

### Step 1 — Resolve source set

For `target = project`:
- `project/stack.md`, `project/decisions.md`, `project/glossary.md`
- `people/stakeholders.md`, `people/team.md`
- `milestones/current.md`
- `incidents/known-issues.md`

For `target = stack`:
- `project/stack.md` only

### Step 2 — Compute digest

Run the deterministic CLI subcommand — do not compute this narratively. It hashes each source file's raw content (not mtime), so the digest is stable across `git clone`/`checkout`/`worktree add`, which all stamp fresh mtimes regardless of whether content changed:

```
node .rcode/bin/rcode-tools.cjs memory-digest <project|stack>
```

Use the returned `digest` field as `source-digest:`. If `--force` not passed and the existing distillate's `source-digest:` matches, skip regeneration for that target.

### Step 3 — Compress per target

For each target's source set:

1. Read all source files
2. Extract: facts, decisions, constraints, relationships, named entities, dates
3. Produce a dense markdown document organised by topic (not by source file)
4. Strip overhead: pleasantries, redundant headings, examples that don't add new facts, template placeholders that weren't filled
5. Preserve: every concrete claim, every decision, every link, every name, every date

Compression target: ~30% of source token count. If output is larger, the source had a lot of substance and that's fine.

### Step 4 — Losslessness check

Walk each source file and confirm every "fact" (sentence containing a name, date, decision, or technical term) appears in the distillate either verbatim or via a directly-equivalent phrase. List any potential drops as warnings; user can `--force` past warnings if confident.

### Step 5 — Write output

For each target distillate, write:

```markdown
---
generated: true
do-not-edit: true
regenerate-with: /rcode-memory-distill
source-digest: <hash>
generated-at: <ISO datetime>
source-files:
  - project/stack.md
  - project/decisions.md
  ...
token-estimate: <approximate>
---

# Project Distillate — <project-name>

<compressed content>
```

### Step 6 — Summary

Print per-target:
- Source file count
- Output token estimate
- Digest
- Skip notice (if no-op)

---

## Post-conditions

- `distillates/project.distillate.md` updated (if target includes project)
- `distillates/stack.distillate.md` updated (if target includes stack)
- Frontmatter `source-digest` matches the current source set
- No source files modified

## Reversibility

Distillates are derived artefacts. Reverting a regeneration: `git checkout .rcode/memory/distillates/`.

## On Completion

/rcode-memory-audit — audit all memory files for staleness
/rcode-next — get suggested next action
/rcode-resume-work — continue with current work context

## Next Up

- `/rcode-memory-audit` — audit for accuracy after regenerating distillates
- `/rcode-do` — continue with fresh memory context loaded
