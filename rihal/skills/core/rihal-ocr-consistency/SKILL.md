---
name: rihal-ocr-consistency
description: OCR pipeline determinism + ground-truth validation.
triggers:
  - "ocr inconsistency"
  - "ocr pipeline"
  - "text extraction"
  - "pdf ocr"
  - "siglip routing"
  - "triton ocr"
  - "ground truth"
  - "ocr accuracy regression"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

OCR is non-deterministic by default — same input, different output across runs, model versions, and infrastructure. This skill encodes the discipline needed to ship OCR that doesn't silently regress. Default stack: SigLIP2 language router + LightOnOCR / PaddleOCR / Triton; adapt to whatever's in use. The skill assumes Python + Temporal workflows (rcode's verified Rihal stack).

## The 6 consistency checks

### 1. Language routing

- [ ] Router (e.g. SigLIP2) classifies document language **before** OCR.
- [ ] Confidence threshold for routing decisions — below threshold, surface for human review, don't pick a default.
- [ ] Routing decisions logged with the document hash for replay.
- [ ] Arabic/English boundary cases tested explicitly — bilingual documents trip naive routers.

### 2. Model determinism

- [ ] OCR model version pinned in code, not "whatever's loaded in Triton".
- [ ] Triton config pinned (no auto-update). Model swaps surface as deploys, not silent drift.
- [ ] Temperature / sampling parameters set to deterministic values (temperature=0 for greedy decoding).

### 3. Ground truth

- [ ] A ground-truth dataset exists — at least 20 documents per language with verified text.
- [ ] Accuracy is measured on every model upgrade and every infra change (Triton config, GPU change).
- [ ] Regression threshold defined: e.g. ≥95% character accuracy on the ground-truth set; below blocks deploy.

### 4. Routing tests

- [ ] PyMuPDF text-layer routing is correctly bypassing OCR for text-native PDFs.
- [ ] English page misclassification tests (the documented Rihal incident — text-layer English pages routed to Arabic OCR).
- [ ] Mixed-language documents have an explicit handler.

### 5. Pipeline observability

- [ ] Every document passes through with a trace ID.
- [ ] Routing decision, model used, confidence score, and final output all logged.
- [ ] Failures (OCR returns empty, confidence below threshold) trigger Sentry alerts, not silent retries.

### 6. Replay capability

- [ ] Any production document can be re-OCR'd from the archived input, deterministically.
- [ ] Temporal workflows have idempotency — replays don't double-process or skip.
- [ ] Source documents archived with hash → output mapping.

## Workflow

1. **Run the 6 checks.** Cite file/path for each pass / fail.
2. **For accuracy regression:** capture the ground-truth diff. Which documents changed output? Which characters?
3. **Bisect the regression** — was it the model? the Triton config? the routing? Don't ship "we'll figure it out next sprint".
4. **Persist findings** to `.rihal/memory/incidents/known-issues.md` for unresolved drift, or `.rihal/memory/incidents/post-mortems/` for resolved incidents.

## Output Format

```
OCR pipeline audit — <date>

Language routing:
  ✓/✗ findings

Model determinism:
  ✓/✗ findings

Ground truth:
  Accuracy on ground-truth set: <X%>
  Regressions vs last run: <count>

Routing tests:
  ✓/✗ findings

Observability:
  ✓/✗ findings

Replay capability:
  ✓/✗ findings

Critical: <count>
High: <count>
Memory Bank update: → .rihal/memory/incidents/...
```

## Examples

**Happy path — text-layer routing fix** — Audit shows English text-layer PDFs misclassified as Arabic by SigLIP2 (the documented Rihal bug). Fix: route text-layer PDFs to PyMuPDF extraction, bypass OCR entirely. Re-run ground truth: accuracy stable, throughput up.

**Edge case — Triton silent upgrade** — Triton image was bumped from 25.02 to 25.06 in the Helm chart; ground-truth accuracy dropped 4%. Roll back Triton, pin the version, re-run audit. Add a CI check that fails the build on accuracy regression.

**Negative — "OCR is fuzzy by nature, accept the variance"** — Refuse. Variance without measurement is just regression in disguise. Pin the model, pin the infra, measure on ground truth, surface confidence.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (OCR layer detection), `.rihal/memory/incidents/post-mortems/` (prior OCR incidents)
- **Writes:** `.rihal/memory/incidents/known-issues.md` (deferred drift); ground-truth accuracy results into `.rihal/memory/change-records/YYYYMMDD-NNN.md`
