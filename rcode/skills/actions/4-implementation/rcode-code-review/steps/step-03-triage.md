---
---

# Step 3: Triage

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- Be precise. When uncertain between categories, prefer the more conservative classification.

## INSTRUCTIONS

1. **Normalize** findings into a common format. Expected input formats:
   - Adversarial (Blind Hunter): markdown list of descriptions
   - Edge Case Hunter: JSON array with `location`, `trigger_condition`, `guard_snippet`, `potential_consequence` fields
   - Acceptance Auditor: markdown list with title, AC/constraint reference, and evidence

   If a layer's output does not match its expected format, attempt best-effort parsing. Note any parsing issues for the user.

   Convert all to a unified list where each finding has:
   - `id` -- sequential integer
   - `source` -- `blind`, `edge`, `auditor`, or merged sources (e.g., `blind+edge`)
   - `title` -- one-line summary
   - `detail` -- full description
   - `location` -- file and line reference (if available)

2. **Deduplicate.** If two or more findings describe the same issue, merge them into one:
   - Use the most specific finding as the base (prefer edge-case JSON with location over adversarial prose).
   - Append any unique detail, reasoning, or location references from the other finding(s) into the surviving `detail` field.
   - Set `source` to the merged sources (e.g., `blind+edge`).

3. **Classify** each finding into exactly one bucket:
   - **decision_needed** -- There is an ambiguous choice that requires human input. The code cannot be correctly patched without knowing the user's intent. Only possible if `{review_mode}` = `"full"`.
   - **patch** -- Code issue that is fixable without human input. The correct fix is unambiguous.
   - **defer** -- Pre-existing issue not caused by the current change. Real but not actionable now.
   - **dismiss** -- Noise, false positive, or handled elsewhere.

   If `{review_mode}` = `"no-spec"` and a finding would otherwise be `decision_needed`, reclassify it as `patch` (if the fix is unambiguous) or `defer` (if not).

4. **Verify every surviving finding adversarially, before it reaches the user.**

   Eight angles running in parallel produce false positives — an angle that
   found nothing is under pressure to return something, and a confident wrong
   finding costs the user more than a missed one, because they go and check it.

   Spawn one verifier per `patch` and `decision_needed` finding, in parallel,
   each with NO knowledge of the other findings and no stake in the original:

   > A reviewer claims: {finding}. Prove it wrong.
   > Read the actual code at {file:line} and the paths that reach it.
   > Does the stated failure scenario actually occur? Walk the inputs.
   > Return CONFIRMED with the evidence, or REFUTED with why it cannot happen.

   - **REFUTED** → reclassify as `dismiss`.
   - **CONFIRMED** → keep, and carry the verifier's evidence into the report.
   - **Uncertain** → keep it, but mark the finding `unverified` in the output so
     the user knows which ones were not proven. Do not silently promote an
     uncertain finding to confirmed.

   Skip verification only for `defer` findings — they are not being acted on.

5. **Drop** all `dismiss` findings. Record the dismiss count AND the refuted
   count separately for the summary. A high refuted count is worth surfacing: it
   means the angles are firing loosely and the review needs tightening, not that
   the code was fine.

6. If `{failed_layers}` is non-empty, report which layers failed before announcing results. If zero findings remain after dropping dismissed AND `{failed_layers}` is non-empty, warn the user that the review may be incomplete rather than announcing a clean review.

7. If zero findings remain after triage (all rejected or none raised): state "✅ Clean review — all layers passed." (Step 3 already warned if any review layers failed via `{failed_layers}`.)


## NEXT

Read fully and follow `./step-04-present.md`
