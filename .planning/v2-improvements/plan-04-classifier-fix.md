---
plan: "04"
title: Fix question classifier — multilingual support + panel routing accuracy
priority: high
depends_on: []
estimated_effort: small
---

## Objective

`rihal-tools.cjs classify-question` returned `"codebase"` for a clearly market/greenfield question written in Roman Urdu. Fix the classifier to handle multilingual input (Roman Urdu + Urdu unicode) and fix the panel routing bug where greenfield questions don't auto-include Mariam.

## Context

- Classifier is in `rihal/v2/bin/rihal-tools.cjs` — the `classifyQuestion()` function
- Panel scorer is in `rihal/v2/bin/lib/council-panel.cjs`
- The bug: Roman Urdu words like "bnanai" (build), "site", "dubai", "market", "karo" don't match any English keyword → classifier falls back to `"codebase"`
- Panel routing rule in `council.md`: `market` or `discovery` → Mariam leads, Hussain-PM follows. This never triggers because classifier misses the question type.
- Test inputs to validate against: the Roman Urdu question from today's session

## Roman Urdu → intent mapping needed

| Roman Urdu word/phrase | English intent | question_type signal |
|---|---|---|
| site bnanai / website banana | build a site | greenfield |
| dubai / UAE / uae | geographic market | market |
| affiliate | affiliate | market/greenfield |
| research kar / pata karo | research | discovery |
| market / markeet | market | market |
| app bnanai / app banana | build an app | greenfield |
| shuru karna / start karna | start | greenfield |
| karobar / business | business | market |
| kya karna chahiye | what should I do | strategic |
| worth hai / worth nahi | worth it? | strategic |
| kya sochte ho | what do you think | strategic |

## Urdu unicode additions (common variants)

| Urdu | Romanized | Signal |
|---|---|---|
| سائٹ بنانا | site banana | greenfield |
| دبئی | dubai | market |
| مارکیٹ | market | market |
| ریسرچ | research | discovery |
| کاروبار | business | market |

## Tasks

### Task 1 — Read and understand current classifier implementation
type: auto
**Steps:**
1. Read `rihal/v2/bin/rihal-tools.cjs` — find `classifyQuestion()` function fully
2. Read `rihal/v2/bin/lib/council-panel.cjs` — find the scoring tables and routing logic
3. Document (in comments to yourself, not in the file yet):
   - How signals are currently matched (regex? includes? split?)
   - Where the fallback to `"codebase"` happens
   - How `question_type` maps to panel selection in `select-panel`
   - What the `STRATEGIC_PADDING_ORDER` is and when it kicks in
**Done when:** you understand the full classify → score → panel pipeline
**Commit:** none (read-only)

### Task 2 — Add Roman Urdu keyword signals to classifier
type: auto
**Steps:**
1. In `rihal-tools.cjs`, find the signals/keywords arrays for each question_type
2. Add Roman Urdu signals following the mapping table above. Pattern to follow:
   - `greenfield` signals: add `bnanai`, `banana`, `site`, `app banana`, `shuru`, `start karna`, `naya project`
   - `market` signals: add `dubai`, `uae`, `gulf`, `affiliate`, `market`, `karobar`, `business karna`
   - `discovery` signals: add `research kar`, `pata karo`, `batao`, `kaisa`
   - `strategic` signals: add `kya karna`, `worth hai`, `sahi hai`, `kya sochte`
3. Add signals as lowercase — normalize input with `.toLowerCase()` before matching (verify this already happens or add it)
4. Ensure signal matching is substring-based (e.g., `"bnanai"` matches `"site bnanai hai"`)
**Done when:** `classifyQuestion("yar aik affiliate site bnanai hai dubai ma")` returns `"greenfield"` or `"market"`
**Commit:** `fix(cli): add Roman Urdu keyword signals to question classifier`

### Task 3 — Add Urdu unicode signals
type: auto
**Steps:**
1. In the same signals arrays, add the Urdu unicode entries from the mapping table
2. Ensure `.toLowerCase()` doesn't corrupt Urdu unicode (it's safe — test it: `"دبئی".toLowerCase() === "دبئی"`)
3. Add 5-6 unicode entries minimum (site, market, dubai, business, research, build)
**Done when:** `classifyQuestion("دبئی میں سائٹ بنانا")` returns `"market"` or `"greenfield"`
**Commit:** `fix(cli): add Urdu unicode signals to question classifier`

### Task 4 — Fix greenfield → Mariam panel routing
type: auto
**Steps:**
1. In `council-panel.cjs`, find where `question_type` maps to panel composition
2. Verify the routing rule is implemented:
   - `market` → Mariam leads, Hussain-PM follows, Sadiq closes
   - `discovery` → same as market
   - `greenfield` → Mariam (market research), Hussain-PM (scope), Waleed (feasibility)
3. If routing rule is missing or incomplete: add it. The routing table should be a simple switch/if-else on `question_type` that sets the panel order before the keyword scorer runs.
4. Verify the existing rule: "market/discovery questions always include Mariam even if score is 0"
5. If Mariam is not in `installed_agents` list for a given project, the panel should fall back to Sadiq + Hussain-PM + Waleed (do not error)
**Done when:** `select-panel "affiliate site dubai" --question_type market` returns a panel including `mariam`
**Commit:** `fix(cli): enforce Mariam inclusion on market/discovery/greenfield question types`

### Task 5 — Add unit tests for classifier and panel scorer
type: auto
**Steps:**
1. Check if `rihal-tools.cjs` or `council-panel.cjs` have any existing tests (look in `test/` directory)
2. Create `test/classifier.test.mjs` (Node built-in test runner, no Jest — follows existing test patterns):
   ```js
   import { test } from 'node:test';
   import assert from 'node:assert';
   // require the classifier function (may need to extract it or use subprocess)
   
   test('English greenfield question', () => { ... });
   test('Roman Urdu greenfield question', () => { ... });
   test('Roman Urdu market question (Dubai)', () => { ... });
   test('Urdu unicode market question', () => { ... });
   test('English strategic question (should-I)', () => { ... });
   test('Ambiguous question falls back to codebase', () => { ... });
   ```
3. Create `test/panel-scorer.test.mjs`:
   ```js
   test('market question includes Mariam', () => { ... });
   test('greenfield question includes Mariam + Hussain-PM', () => { ... });
   test('codebase question includes Waleed', () => { ... });
   test('--agents override bypasses scoring', () => { ... });
   ```
4. Run: `node --test` — all tests must pass
**Done when:** `node --test` exits 0 with all classifier and panel-scorer tests passing
**Commit:** `test(cli): add classifier and panel scorer unit tests`

## Success criteria
- [ ] `classifyQuestion("yar aik affiliate site bnanai hai dubai ma kar skn")` → `"market"` or `"greenfield"` (not `"codebase"`)
- [ ] `classifyQuestion("دبئی میں سائٹ بنانا")` → `"market"` or `"greenfield"`
- [ ] `select-panel` with a market/greenfield question returns a panel containing `mariam` (when installed)
- [ ] All existing English keyword classifications still work (regression check)
- [ ] `node --test` passes all new test cases
- [ ] The real council session from today (Roman Urdu question) would now get Mariam on the panel
