---
name: rihal-distillator
description: Lossless LLM-optimized compression of source documents. Use when the user requests to "distill documents" or "create a distillate". Distillates preserve every fact, decision, constraint, and relationship while stripping prose overhead — designed as drop-in LLM context. Not summarisation (summaries are lossy). For Memory Bank distillates specifically, use rcode-memory-distill.
argument-hint: "<source-paths> [--validate <distillate-path>] [--token-budget <N>] [--consumer <name>]"
triggers:
  - "distillator"
  - "distill documents"
  - "create a distillate"
  - "compress these docs"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Compresses source documents into a dense, lossless distillate optimised for LLM context loading. Output is one (or several semantically split) markdown files containing every fact, decision, named entity, and relationship from the sources — but no prose connectives, decoration, or repetition. A downstream LLM can use the distillate as sole context with no information loss.

## Workflow

1. **Validate inputs.** Required: `source_documents`. Optional: `downstream_consumer` (judges signal vs noise; if omitted, preserve everything), `token_budget` (triggers split when exceeded), `output_path` (default: adjacent to primary source with `-distillate.md` suffix), `--validate` flag (round-trip reconstruction test).
2. **Stage 1 — Analyze.** Run `scripts/analyze_sources.py` on the source paths. Use its routing recommendation (`single` / `fan-out`) and grouping output. Do not read sources yourself.
3. **Stage 2 — Compress.** Spawn `agents/distillate-compressor.md` subagent(s):
   - **Single mode** (≤3 files, ≤15K tokens): one compressor.
   - **Fan-out mode**: one compressor per group, then a merge compressor consuming the intermediate distillates (not originals).
   - **Graceful degradation:** if subagent spawning is unavailable, perform the work directly using the same instructions.
4. **Stage 3 — Verify & output.** Completeness check (every returned heading and named entity appears in the distillate; up to 2 targeted fix passes). Format check (bullets only, no prose, no repetition, `##` themes). Save with frontmatter (`type: rihal-distillate`, `sources`, `created`, `token_estimate`, `parts`). Split distillates when >5K tokens or `token_budget` exceeded — see [`references.md`](references.md) for the split format.
5. **Stage 4 — Round-trip validate (only with `--validate`).** Spawn `agents/round-trip-reconstructor.md` with the distillate path only (no source access). Semantic-diff the reconstruction against the originals. Produce `<name>-validation-report.md` with status, gaps, and hallucinations. Up to 2 fix passes if gaps found. Adds significant token cost — only for high-stakes use.

## Output Format

Structured JSON on every run:

```json
{
  "status": "complete",
  "distillate": "path/to/file-distillate.md",
  "section_distillates": ["path1", "path2"] or null,
  "source_total_tokens": 15000,
  "distillate_total_tokens": 4688,
  "compression_ratio": "3.2:1",
  "source_documents": ["path1", "path2"],
  "completeness_check": "pass" | "pass_with_additions"
}
```

Token counts come from `scripts/analyze_sources.py`. Compression ratio is `source / distillate`.

## Examples

**Happy path** — `distill ./docs/architecture.md ./docs/decisions.md` → single-mode → saves `architecture-distillate.md` → reports `3.2:1`.

**Edge case — large folder** — `distill ./docs/ --validate` → fan-out mode (multiple compressors) → merge pass → round-trip validation produces a validation report.

**Negative — summarisation request** — "summarize this meeting" — distillation is lossless compression, not summarisation. Clarify the difference or route to a writing skill.

## Memory Bank Hooks

- **Reads:** the source documents passed in
- **Writes:** the distillate file (or folder) at the specified or default path
- **Note:** for Memory Bank-specific distillates, use `rcode-memory-distill` instead — it knows the Memory Bank source set.

## Detailed reference

See [`references.md`](references.md) for: the split distillate folder format, the validation report template, frontmatter schema, and `--validate` flag semantics.
