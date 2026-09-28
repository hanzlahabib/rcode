# Tool Accuracy — Release Gate

Deep-dive for `rcode-seo-os`, spec §21. A calculator/converter/generator is a **product**, not a content page. "The UI looks right" is not evidence it is correct. This module is the mandatory gate before any such tool is declared done (spec §64 definition-of-done: "tool accuracy verified" is a required checkbox, not optional).

**See also:** `../../seo-astro-implementation/references/astro-seo-components.md` for `CalculatorLayout.astro`, which arranges the markup this gate verifies the logic behind — the layout is never a substitute for running these fixtures.

## Spec: what every tool must document before it ships

```text
Formula
Source / derivation
Units
Input constraints
Expected range
Rounding behavior
Edge cases
Known limitations
```

Record this as the tool's spec (spec §72's "Tool specification" concept) — either inline as a code comment block next to the calculation function, or in a per-tool spec file (e.g. TOOL-SPEC.md) if the project already keeps tool docs separately. Whichever the target project already does — do not invent a third location.

## Fixture format

One JSON object per test case, `input`/`expected` pairs, machine-checkable:

```json
{
  "tool": "ev-charger-installation-cost",
  "cases": [
    { "id": "ordinary", "input": { "panelUpgradeNeeded": false, "distanceFromPanelFt": 20, "chargerLevel": 2 }, "expected": { "costLowUsd": 800, "costHighUsd": 1600 } },
    { "id": "boundary-zero-distance", "input": { "panelUpgradeNeeded": false, "distanceFromPanelFt": 0, "chargerLevel": 2 }, "expected": { "costLowUsd": 500, "costHighUsd": 900 } },
    { "id": "panel-upgrade", "input": { "panelUpgradeNeeded": true, "distanceFromPanelFt": 20, "chargerLevel": 2 }, "expected": { "costLowUsd": 2300, "costHighUsd": 4600 } },
    { "id": "invalid-negative-distance", "input": { "panelUpgradeNeeded": false, "distanceFromPanelFt": -5, "chargerLevel": 2 }, "expected": { "error": "distanceFromPanelFt must be >= 0" } }
  ]
}
```

Required case categories (spec §21):

```text
ordinary values
zero where valid
decimals
boundary values
unit conversion
invalid inputs
very large/small numbers where relevant
```

Not every category applies to every tool (a boolean-input tool has no "decimals" case) — record which categories were considered and why any were skipped, rather than silently omitting them.

## Worked example — concrete, end to end

Tool: **EV Charger Installation Cost Estimator** (a real page type from the Henderson EV Charger site, `LOCAL_LEAD_GEN` project type — see `PROJECT-CLASSIFICATION.md`).

**Spec:**
```text
Formula:     costRange = baseInstallCost(chargerLevel)
                        + (distanceFromPanelFt > 15 ? (distanceFromPanelFt - 15) * perFootWireCost : 0)
                        + (panelUpgradeNeeded ? panelUpgradeCost : 0)
Source:      Base costs and per-foot wire cost sourced from local electrician quote ranges
             recorded in .rcode/seo/RESEARCH.md (dated, re-verify if stale per spec §60
             "freshness-sensitive" — pricing data is not durable).
Units:       USD, feet.
Constraints: distanceFromPanelFt >= 0; chargerLevel in {1, 2}.
Expected range: $500–$4,600 (Level 1 no-upgrade minimum to Level 2 with panel upgrade maximum).
Rounding:    round to nearest $50 for display; keep unrounded value for internal comparisons.
Edge cases:  distanceFromPanelFt negative → reject with a validation error, not a negative cost.
             panelUpgradeNeeded=true dominates the estimate — surface it as a separate line
             item in the result, not silently folded into one number (interpretation
             requirement, spec §20 hierarchy step "interpretation").
Limitations: does not account for permit fees, which vary by jurisdiction — state this
             explicitly in the tool's methodology section rather than implying completeness.
```

**Fixture run (what "tests pass" means here):**
1. Feed each case in the fixture JSON above into the pure calculation function (kept framework-independent per `astro-site-factory.md`'s `tools/` separation rule, so this can run under plain `node:test` without booting Astro).
2. Assert `expected.costLowUsd`/`costHighUsd` match within rounding tolerance, or that `expected.error` is thrown for the invalid case.
3. Only after all cases pass: wire the function into `CalculatorLayout.astro`'s `tool`/`result` slots.
4. Manually verify the rendered UI's displayed number matches the fixture's expected output for at least the "ordinary" case — this catches unit/formatting drift between the calc function and the template that the fixture alone cannot (spec §21: "UI result matches calculation engine").

A tool is not "done" until steps 1–4 have actually been executed for that specific tool, not merely described as a plan.

## Anti-patterns this gate exists to prevent

- Shipping a calculator whose formula was eyeballed against one manual example and never fixture-tested.
- Treating a passing build/lint as equivalent to a passing accuracy test — they check different things.
- Silently rounding in the display layer in a way that contradicts the documented rounding behavior (e.g. spec says "nearest $50" but the component does `Math.round(x)`).
- Marking a tool done because it "looks right" in a screenshot, per `run` skill conventions — a screenshot verifies UI rendering, not numeric correctness.
