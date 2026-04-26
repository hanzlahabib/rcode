# Distillator — Detailed Reference

Detailed formats and templates for [`SKILL.md`](SKILL.md).

---

## Frontmatter schema

Every distillate file (single or split-index) has:

```yaml
---
type: rihal-distillate
sources:
  - "{relative path to source 1}"
  - "{relative path to source 2}"
downstream_consumer: "{consumer or 'general'}"
created: "{ISO date}"
token_estimate: {approximate token count}
parts: 1   # or N for split distillates
---
```

Source paths are relative to the distillate's location.

---

## Single distillate format

When `total_tokens ≤ 5000` and `token_budget` is not exceeded:

- One file: `{base-name}-distillate.md`
- Frontmatter as above with `parts: 1`
- Body: `##` themes containing self-contained bullets — no prose paragraphs, no decorative formatting, no repetition

---

## Split distillate format

When `total_tokens > 5000` OR `token_budget` requires splitting:

```
{base-name}-distillate/
├── _index.md           # orientation, cross-cutting items, section manifest
├── 01-{topic-slug}.md  # self-contained section
├── 02-{topic-slug}.md
└── 03-{topic-slug}.md
```

`_index.md` contains:
- Frontmatter (sources relative to the folder; `parts: N`)
- 3-5 bullet orientation: what was distilled, from what
- Section manifest: each section's filename + 1-line description
- Cross-cutting items that span multiple sections

Each section file:
- Self-contained — loadable independently
- 1-line context header: `This section covers {topic}. Part N of M.`
- Same bullet-only format

---

## Round-trip validation report template

Saved adjacent to the distillate as `{base-name}-validation-report.md`:

```markdown
---
type: distillate-validation
distillate: "{distillate path}"
sources: ["{source paths}"]
created: "{ISO date}"
---

## Validation Summary
- Status: PASS | PASS_WITH_WARNINGS | FAIL
- Information preserved: {percentage estimate}
- Gaps found: {count}
- Hallucinations detected: {count}

## Gaps (information in originals but missing from reconstruction)
- {gap description} — Source: {which original}, Section: {where}

## Hallucinations (information in reconstruction not traceable to originals)
- {hallucination description} — appears to fill gap in: {section}

## Possible Gap Markers (flagged by reconstructor)
- {marker description}
```

---

## Validation semantics

- **PASS** — every fact, decision, constraint, and relationship survives the round trip.
- **PASS_WITH_WARNINGS** — minor gaps that the reconstructor itself flagged ("possible gap markers").
- **FAIL** — material gaps or hallucinations. Trigger up to 2 targeted fix passes on the distillate.

If gaps remain after fix passes: surface them honestly in the report. Do not pad the distillate with regenerated content — that introduces hallucination.

---

## When to use `--validate`

- Distillates feeding architecture / system-design workflows
- Distillates of regulatory or compliance documents
- Distillates produced for an external consumer (client deliverable)
- Anywhere information loss is unacceptable

Skip `--validate` for routine distillates (Memory Bank refresh, internal context loading) — it adds significant token cost.

---

## Cleanup behaviour

- Intermediate distillates (fan-out mode) live only in memory; they are not saved.
- Reconstruction files (`--validate` mode) are temporary; delete them after the validation report is written.
- The validation report itself persists alongside the distillate.
