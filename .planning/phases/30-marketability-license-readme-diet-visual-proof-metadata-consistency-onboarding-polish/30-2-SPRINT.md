---
phase: 30
plan_number: 2
sprint: 30.2
type: execute
wave: 2
depends_on: [30.1]
files_modified:
  - README.md
  - DOCS.md
  - docs/assets/hero-demo.gif
  - docs/assets/diwan-dashboard.png
autonomous: false
requirements: [REQ-756]
must_haves:
  truths:
    - "README is roughly 200 lines and reads value prop -> visual proof -> quickstart -> differentiation -> links."
    - "The README shows a demo GIF and a dashboard screenshot near the top."
    - "Test-suite table, CI pipeline, full command list, and state.json schema live in DOCS.md, not README."
  artifacts:
    - "docs/assets/hero-demo.gif (captured by a human)"
    - "docs/assets/diwan-dashboard.png (captured by a human)"
  key_links:
    - "README image markdown paths must resolve to real files committed under docs/assets/."
    - "Content relocated out of README must land in DOCS.md — no information loss."
---

<objective>
README diet + visual proof (#756). README.md is 535 lines with zero screenshots/GIFs; the existing `image.png` at the repo root is referenced nowhere. Cut the README to ~200 lines following the order value prop -> visual proof -> quickstart -> differentiation -> links; add a hero demo GIF and a Diwan dashboard screenshot near the top; relocate the test-suite table, CI pipeline, full command list, and state.json schema into DOCS.md.

Purpose: A first-time visitor should grasp the value and see proof within the first screen.
Output: Slimmed README.md, expanded DOCS.md, two image placeholders flagged for human capture.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

### Task 30.2.1 — auto — Relocate deep-detail sections from README into DOCS.md
<type>auto</type>
<read_first>
- /home/hanzla/development/rihal-code/README.md (lines 343-381 full command list; 447-504 Testing + CI; 404-418 State tracking / state.json schema)
- /home/hanzla/development/rihal-code/DOCS.md (lines 1-20 — table of contents, to find insertion points)
</read_first>
<files>DOCS.md</files>
<action>
Move these README blocks into DOCS.md (append under the matching existing DOCS.md section, or add a new section):
- README lines 343-381 — "Full command surface (95 commands)" — move into DOCS.md section 7 (Slash commands). NOTE: the count in this heading is wrong; do not fix it here — sprint 30-3 owns count corrections. Move the content verbatim.
- README lines 447-504 — "Testing" (test-suite table) + "CI pipeline" — move into DOCS.md as a "Testing & CI" section.
- README lines 404-418 — "State tracking" (the `.rihal/state.json` field list) — move into DOCS.md near the existing state/config content.
Copy the content into DOCS.md first and verify it landed before the next task deletes it from README. Do not edit README.md in this task.
</action>
<acceptance_criteria>
- DOCS.md contains the strings "compliance.test.cjs", "no-new-deps", and "state.json" after the move.
- `wc -l DOCS.md` is larger than before (relocated content added).
</acceptance_criteria>
<verify>
<automated>grep -q "compliance.test.cjs" DOCS.md && grep -q "no-new-deps" DOCS.md && grep -q "state.json" DOCS.md && echo "relocated content present in DOCS.md"</automated>
</verify>
<done>Test-suite table, CI pipeline, command list, and state.json schema all present in DOCS.md.</done>
<evidence>lines: README.md:343-381 (command surface), README.md:447-504 (Testing + CI pipeline), README.md:404-418 (State tracking); DOCS.md exists at 38.1K and has a numbered TOC at lines 14-17.</evidence>

### Task 30.2.2 — auto — Cut README to ~200 lines and add image placeholders
<type>auto</type>
<read_first>
- /home/hanzla/development/rihal-code/README.md (full — 535 lines)
- DOCS.md (after Task 30.2.1 — to confirm relocated content is safe to delete from README)
</read_first>
<files>README.md, docs/assets/hero-demo.gif, docs/assets/diwan-dashboard.png</files>
<action>
Rewrite README.md to ~200 lines in this order:
1. **Value prop** — title + the one-line pitch (keep lines 1-9, the install command, npm badges).
2. **Visual proof** — immediately after the badges, add two image references:
   `![Rihal Code demo](docs/assets/hero-demo.gif)` and `![Diwan dashboard](docs/assets/diwan-dashboard.png)`.
   Create the two placeholder files `docs/assets/hero-demo.gif` and `docs/assets/diwan-dashboard.png` as EMPTY zero-byte files (`mkdir -p docs/assets` first). Do NOT fabricate binary image content — real capture is Task 30.2.3 (a checkpoint).
3. **Quickstart** — keep the "Install — one command" + "Then begin the rihla" section, trimmed.
4. **Differentiation** — keep a trimmed "What makes Rihal different" (intent guards, memory bank, markdown-first). Cut the long sub-explanations.
5. **Links** — a short "Learn more" list pointing to DOCS.md, docs/getting-started.md, BRAND.md, CHANGELOG.md.
DELETE from README (already relocated in 30.2.1): full command list, Testing table, CI pipeline, state.json schema. Also cut: the verbose 90-second tour duplication, the Modules table, Hooks section, Configuration YAML dump — link to DOCS.md instead. Do not change any agent/command/skill counts — sprint 30-3 owns those.
Target: `wc -l README.md` between 150 and 230.
</action>
<acceptance_criteria>
- `wc -l README.md` reports 230 or fewer lines.
- README contains both `docs/assets/hero-demo.gif` and `docs/assets/diwan-dashboard.png` image references.
- `docs/assets/hero-demo.gif` and `docs/assets/diwan-dashboard.png` exist as files.
- README no longer contains the relocated "compliance.test.cjs" string (moved to DOCS.md).
</acceptance_criteria>
<verify>
<automated>L=$(wc -l < README.md); test "$L" -le 230 && grep -q "docs/assets/hero-demo.gif" README.md && grep -q "docs/assets/diwan-dashboard.png" README.md && test -f docs/assets/hero-demo.gif && test -f docs/assets/diwan-dashboard.png && ! grep -q "compliance.test.cjs" README.md && echo "README diet OK ($L lines)"</automated>
</verify>
<done>README is <=230 lines, ordered value prop -> visual proof -> quickstart -> differentiation -> links, with two image references resolving to real (placeholder) files.</done>
<evidence>lines: README.md is 535 lines (read in full). creates: docs/assets/hero-demo.gif + docs/assets/diwan-dashboard.png — `image.png` exists at repo root (59.1K) but is referenced nowhere; new files go under docs/assets/ for a clean path. grep `image.png` README.md → 0 hits confirms the orphan.</evidence>

### Task 30.2.3 — checkpoint:human-action — Capture the demo GIF and dashboard screenshot
<type>checkpoint:human-action</type>
<read_first>
- README.md (after Task 30.2.2 — to see where the placeholders are referenced)
</read_first>
<files>docs/assets/hero-demo.gif, docs/assets/diwan-dashboard.png</files>
<action>
PAUSE for the user. The two placeholder files from Task 30.2.2 are zero-byte. Ask the user to:
1. Record a hero demo GIF of the install -> /rihal-council -> /rihal-plan -> /rihal-execute loop and save it to `docs/assets/hero-demo.gif`.
2. Take a screenshot of the Diwan dashboard (`node server/dashboard.js`, http://localhost:7717) and save it to `docs/assets/diwan-dashboard.png`.
The existing repo-root `image.png` may be reused for the dashboard screenshot if it already shows the dashboard — let the user decide and copy it to `docs/assets/diwan-dashboard.png` if so.
Do NOT fabricate or generate the binary images. This task only completes when the user confirms the real assets are in place.
</action>
<acceptance_criteria>
- `docs/assets/hero-demo.gif` is a non-empty file (real GIF).
- `docs/assets/diwan-dashboard.png` is a non-empty file (real PNG).
</acceptance_criteria>
<verify>
<automated>test -s docs/assets/hero-demo.gif && test -s docs/assets/diwan-dashboard.png && echo "real assets present" || echo "PENDING: human asset capture not yet done"</automated>
</verify>
<done>Both image assets are real, non-empty files captured by the user.</done>
<evidence>creates: docs/assets/hero-demo.gif + docs/assets/diwan-dashboard.png as real binaries — placeholders are zero-byte after 30.2.2; `image.png` (repo root, 59.1K) exists and may be reused.</evidence>

</tasks>

<verification>
- `wc -l README.md` <= 230.
- README references both image assets; both files exist.
- DOCS.md contains the relocated test/CI/command/state content.
- No information lost — every deleted README section has a DOCS.md home or a link.
</verification>

<success_criteria>
- README is ~200 lines, visual proof above the fold, deep detail moved to DOCS.md.
- Image placeholders created by the executor; real capture flagged as a checkpoint, not faked.
</success_criteria>

<output>
Create `.planning/phases/30-marketability-license-readme-diet-visual-proof-metadata-consistency-onboarding-polish/30-2-SUMMARY.md`
</output>
