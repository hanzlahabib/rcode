---
phase: 30
plan_number: 4
sprint: 30.4
type: execute
wave: 4
depends_on: [30.3]
files_modified:
  - README.md
  - BRAND.md
  - docs/getting-started.md
  - cli/install.js
  - examples/rental-app-walkthrough.md
must_haves:
  truths:
    - "The two-step install model (project files via npx, PATH command via npm -g) is explained in one place up front."
    - "One canonical first-run command is used in README, getting-started.md, and examples/."
    - "README names a competitor and shows a differentiation table plus a one-line maturity note."
    - "examples/ contains a real worked example with checked-in artifacts."
    - "BRAND.md naming reflects the actual /rihal-* command convention."
  artifacts:
    - "examples/rental-app-walkthrough.md plus any checked-in artifact files it references."
  key_links:
    - "The canonical first-run command must be identical across README, docs/getting-started.md, and examples/."
    - "BRAND.md naming table <-> actual command files in rihal/commands/ (all named rihal-*, slash form /rihal-*)."
---

<objective>
Onboarding clarity (#758) + polish bundle (#759). Two install models exist — `npx @hanzlaa/rcode install` for project files and `npm install -g @hanzlaa/rcode` for the `rcode` PATH command — and the second surfaced only as an afterthought (README lines 103-106). `/rihal-init` vs `/rihal-new-project` is ambiguous. Differentiation is implicit (USP.md exists but README never names a competitor). examples/ has only 2 thin files. BRAND.md mandates `/rcode:` naming (line 42) while every shipped command is `/rihal-*`.

Purpose: Make first contact unambiguous and the differentiation explicit.
Output: Clearer README onboarding + differentiation table + maturity note, a fleshed-out example, a reconciled BRAND.md, and an install-time global hint.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

### Task 30.4.1 — auto — Clarify the install model and pick one canonical first-run command
<type>auto</type>
<read_first>
- README.md (after sprints 30-2/30-3 — grep for "npm install -g" and "/rihal-init"; lines ~80-115 in the original)
- /home/hanzla/development/rihal-code/docs/getting-started.md (lines 7-30 — Install + Step 1)
- /home/hanzla/development/rihal-code/examples/starter-walkthrough.md (full — to see which first command it uses)
</read_first>
<files>README.md, docs/getting-started.md</files>
<action>
1. In the README install section, present the two install steps together up front as a clearly-labelled pair:
   - Step 1 — project files: `npx @hanzlaa/rcode install`
   - Step 2 (optional) — `rcode` on your PATH: `npm install -g @hanzlaa/rcode`
   Do not leave the global install as a trailing afterthought blockquote.
2. Pick `/rihal-init` as THE canonical first-run command (getting-started.md already leads with it; README line 111-112 already uses it). Make README and docs/getting-started.md both state `/rihal-init` as the single first command, and explicitly note that `/rihal-new-project` is a sub-path `/rihal-init` routes to for greenfield projects — so users are not left choosing.
3. Verify examples/starter-walkthrough.md opens with `/rihal-init` (or update it to).
</action>
<acceptance_criteria>
- README contains both `npx @hanzlaa/rcode install` and `npm install -g @hanzlaa/rcode` in one install section.
- README and docs/getting-started.md both name `/rihal-init` as the first command.
- examples/starter-walkthrough.md references `/rihal-init` as the entry point.
</acceptance_criteria>
<verify>
<automated>grep -q "npm install -g @hanzlaa/rcode" README.md && grep -q "/rihal-init" README.md && grep -q "/rihal-init" docs/getting-started.md && grep -q "/rihal-init" examples/starter-walkthrough.md && echo "install model + canonical command consistent"</automated>
</verify>
<done>Install model explained once up front; `/rihal-init` is the single canonical first command everywhere.</done>
<evidence>lines: README.md:103-106 (global install as trailing blockquote), README.md:111-112 (`/rihal-init`); docs/getting-started.md:21-30 (Step 1 `/rihal-init`); examples/starter-walkthrough.md exists (1.2K). grep `new-project` getting-started.md vs examples shows the ambiguity issue #758 cites.</evidence>

### Task 30.4.2 — auto — Add a differentiation table and maturity note to README
<type>auto</type>
<read_first>
- /home/hanzla/development/rihal-code/docs/USP.md (lines 14-16, 224-234 — existing comparison tables naming Cursor/Windsurf/CrewAI/AutoGen)
- README.md (after 30-2's diet — the "What makes Rihal different" section)
- /home/hanzla/development/rihal-code/CHANGELOG.md (top — current version for the maturity statement)
</read_first>
<files>README.md</files>
<action>
1. Add a compact differentiation table to the README differentiation section, distilled from docs/USP.md lines 224-234. Name real competitors — at minimum Cursor/Windsurf and CrewAI/AutoGen — across rows like "Per-project memory", "Git-tracked context", "IDE lock-in". Keep it to ~6 rows so it fits the diet budget; link to docs/USP.md for the full version.
2. Add one maturity line near the top of the README, e.g.: `Status: actively developed — published on npm as @hanzlaa/rcode v3.4.x, 134 automated tests.` Pull the version from package.json `version`.
Do not exceed the ~230-line README budget set by sprint 30-2 — if needed, trim prose elsewhere in the differentiation section to make room.
</action>
<acceptance_criteria>
- README contains a markdown table that names "Cursor" and "CrewAI" (or "AutoGen").
- README contains a one-line maturity/status statement.
- `wc -l README.md` still <= 240.
</acceptance_criteria>
<verify>
<automated>grep -qi 'cursor' README.md && grep -qiE 'crewai|autogen' README.md && grep -qiE 'status:|actively developed|published on npm' README.md && L=$(wc -l < README.md) && test "$L" -le 240 && echo "differentiation table + maturity note added ($L lines)"</automated>
</verify>
<done>README has an explicit competitor-naming differentiation table and a maturity statement, still within the line budget.</done>
<evidence>lines: docs/USP.md:14-16 + 224-234 (existing comparison tables naming Cursor, Windsurf, CrewAI, AutoGen); README.md:245-321 ("What makes Rihal different" — currently no table, no competitor named). package.json:3 supplies the version.</evidence>

### Task 30.4.3 — auto — Flesh out examples/ with a real worked example
<type>auto</type>
<read_first>
- /home/hanzla/development/rihal-code/examples/starter-walkthrough.md (full — 1.2K, current thin example)
- /home/hanzla/development/rihal-code/examples/council-decision.md (full — 2.0K)
- docs/getting-started.md (lines 88-110 — the chain/council/execute examples to model the flow on)
</read_first>
<files>examples/rental-app-walkthrough.md</files>
<action>
Create `examples/rental-app-walkthrough.md` — a real, end-to-end worked example that takes a concrete project (a rental-listing app) through the Golden Path: `/rihal-init` -> `/rihal-council` decision -> `/rihal-plan` -> `/rihal-execute` -> `/rihal-status`. For each step show the exact command typed and a realistic excerpt of the artifact it produces (a council-session snippet, a PLAN.md task block, a SUMMARY.md excerpt). Include the checked-in artifact excerpts inline as fenced code blocks so the example is self-contained — no external files needed. Keep it grounded in commands that actually exist (verified: `rihal/commands/init.md`, `council.md`, `plan.md`, `execute.md`, `status.md` all exist).
</action>
<acceptance_criteria>
- `examples/rental-app-walkthrough.md` exists and is non-trivial (> 60 lines).
- It references `/rihal-init`, `/rihal-council`, `/rihal-plan`, `/rihal-execute`, and `/rihal-status`.
</acceptance_criteria>
<verify>
<automated>test -f examples/rental-app-walkthrough.md && L=$(wc -l < examples/rental-app-walkthrough.md) && test "$L" -ge 60 && for c in init council plan execute status; do grep -q "/rihal-$c" examples/rental-app-walkthrough.md || { echo "missing /rihal-$c"; exit 1; }; done && echo "worked example complete ($L lines)"</automated>
</verify>
<done>examples/ has a substantial end-to-end worked example with inline artifact excerpts.</done>
<evidence>creates: examples/rental-app-walkthrough.md — examples/ today holds only council-decision.md (2.0K) and starter-walkthrough.md (1.2K), both thin per issue #759. Commands referenced verified present: `ls rihal/commands/` shows init.md, council.md, plan.md, execute.md, status.md.</evidence>

### Task 30.4.4 — auto — Reconcile BRAND.md naming with the actual /rihal-* convention
<type>auto</type>
<read_first>
- /home/hanzla/development/rihal-code/BRAND.md (lines 39-48 — Naming conventions table)
- A sample of `rihal/commands/` filenames (e.g. `init.md`, `council.md`, `plan.md`) — all install as `/rihal-*` slash commands
</read_first>
<files>BRAND.md</files>
<action>
In BRAND.md's Naming conventions table (lines 39-48):
- The "Slash command" row says pattern `/rcode:<name>` with examples `/rcode:plan`, `/rcode:majlis`. Change it to the actual convention: pattern `/rihal-<name>`, examples `/rihal-plan`, `/rihal-council`.
- The "Skill name" row says `rcode-<verb>-<noun>` with examples `rcode-prove-it`, `rcode-harden-auth` — verify against actual skill folder names under `rihal/skills/` and correct the pattern/examples to match what ships.
Only fix naming-convention drift — do not rewrite BRAND.md's voice/glossary sections.
</action>
<acceptance_criteria>
- BRAND.md no longer contains `/rcode:` as the slash-command pattern.
- BRAND.md slash-command examples use `/rihal-` prefix.
</acceptance_criteria>
<verify>
<automated>! grep -q '/rcode:' BRAND.md && grep -q '/rihal-' BRAND.md && echo "BRAND.md naming reconciled"</automated>
</verify>
<done>BRAND.md naming table reflects the shipped `/rihal-*` command convention.</done>
<evidence>lines: BRAND.md:42 (`/rcode:<name>` pattern, examples `/rcode:plan`, `/rcode:majlis`), BRAND.md:41 (`rcode-<verb>-<noun>` skill pattern). Actual commands in rihal/commands/ are init.md, council.md, plan.md... which install as `/rihal-*` — confirmed by README.md:99 ("every `rihal-*` command appears").</evidence>

### Task 30.4.5 — auto — Print the global-install hint after `npx ... install`
<type>auto</type>
<read_first>
- /home/hanzla/development/rihal-code/cli/install.js (full — find where the installer prints its final success/next-steps output)
- /home/hanzla/development/rihal-code/cli/postinstall.js (full — the postinstall Golden Path printer, in case the hint belongs here instead)
</read_first>
<files>cli/install.js</files>
<action>
After `npx @hanzlaa/rcode install` finishes, have it print a one-line hint about the optional global install, e.g.: `Tip: for the 'rcode' command on your PATH, run: npm install -g @hanzlaa/rcode`. Add it to the existing final-output block of `cli/install.js` (near where it already prints next steps / restart-your-IDE). If the success output is actually emitted from `cli/postinstall.js`, add the line there instead — read both files and place it where the existing "next steps" text lives. Match the existing print style (same logger/color helper already used in that file). Do not add a dependency.
</action>
<acceptance_criteria>
- The install CLI source contains the string `npm install -g @hanzlaa/rcode` in its post-install output block.
- `node -c cli/install.js` passes (no syntax error).
</acceptance_criteria>
<verify>
<automated>node -c cli/install.js && (grep -q 'npm install -g @hanzlaa/rcode' cli/install.js || grep -q 'npm install -g @hanzlaa/rcode' cli/postinstall.js) && echo "global-install hint wired into installer output"</automated>
</verify>
<done>The installer prints a global-install hint as part of its completion output; the file still parses.</done>
<evidence>creates: hint string in cli/install.js (or cli/postinstall.js) — README.md:103-106 documents the two-install-model gap that #758 wants surfaced at install time; package.json:18 registers `postinstall: node cli/postinstall.js`. investigation needed: exact print-block location confirmed by reading cli/install.js + cli/postinstall.js in <read_first>.</evidence>

</tasks>

<verification>
- README + docs/getting-started.md + examples/ all use `/rihal-init` as the first command.
- README has a competitor-naming differentiation table and a maturity line; still <= 240 lines.
- examples/rental-app-walkthrough.md exists and is a real end-to-end walkthrough.
- BRAND.md uses `/rihal-*`, not `/rcode:`.
- The installer prints the global-install hint; `cli/install.js` parses.
</verification>

<success_criteria>
- Install model unambiguous; one canonical first command everywhere.
- Differentiation explicit (named competitors) + maturity note in README.
- examples/ has a substantial worked example.
- BRAND.md naming matches reality; installer surfaces the PATH-install hint.
</success_criteria>

<output>
Create `.planning/phases/30-marketability-license-readme-diet-visual-proof-metadata-consistency-onboarding-polish/30-4-SUMMARY.md`
</output>
