# execute.md — auto_copy_learnings (global learnings store)

Extracted from `execute.md`'s `auto_copy_learnings` step. Only loaded when `features.global_learnings` is enabled (disabled by default) — see the conditional include at that point in `execute.md`.

**Auto-copy phase learnings to global store (when enabled).**

This step runs AFTER phase completion and SUMMARY.md is written. It copies any LEARNINGS.md
entries from the completed phase to the global learnings store at `.rcode/knowledge/`.

1. Check if LEARNINGS.md exists in the phase directory (use the `phase_dir` value from init context)
2. If found, copy to global store:
```bash
node ".rcode/bin/rcode-tools.cjs" learnings copy 2>/dev/null || echo "⚠ Learnings copy failed — continuing"
```
Copy failure must NOT block phase completion.
