---
id: 23-2
phase: 23-agent-slim-remaining-24-via-reference-clusters
sprint: 23.2
type: execute
wave: 2
depends_on: [23-1]
files_modified:
  - rcode/agents/rcode-haitham.md
  - rcode/agents/rcode-omar.md
  - rcode/agents/rcode-yousef.md
  - rcode/agents/rcode-nyquist-auditor.md
  - rcode/agents/rcode-docs-auditor.md
  - rcode/agents/rcode-ui-auditor.md
  - rcode/agents/rcode-security-auditor.md
  - rcode/agents/rcode-security-adversary.md
  - rcode/agents/rcode-edge-case-hunter.md
autonomous: true
requirements: [GH-713]

must_haves:
  truths:
    - All 9 agents slim to ≤100 lines after removing shared content and adding @-include
    - Each agent's unique identity, named heuristics, capabilities, examples, and redirects are fully preserved
    - The @-include line points to .rcode/references/ (not rcode/references/)
    - Each agent's YAML frontmatter (name, description, tools, color) is unchanged
  artifacts:
    - rcode/agents/rcode-haitham.md (≤100 lines)
    - rcode/agents/rcode-omar.md (≤100 lines)
    - rcode/agents/rcode-yousef.md (≤100 lines)
    - rcode/agents/rcode-nyquist-auditor.md (≤100 lines)
    - rcode/agents/rcode-docs-auditor.md (≤100 lines)
    - rcode/agents/rcode-ui-auditor.md (≤100 lines)
    - rcode/agents/rcode-security-auditor.md (≤100 lines)
    - rcode/agents/rcode-security-adversary.md (≤100 lines)
    - rcode/agents/rcode-edge-case-hunter.md (≤100 lines)
  key_links:
    - @.rcode/references/persona-engineer-shared.md must exist (created in sprint 23-1)
    - @.rcode/references/auditor-shared-checklists.md must exist (created in sprint 23-1)
    - rcode-ui-auditor.md is NOT listed in the 24-agent target list in CONTEXT.md — read it before touching to confirm it needs slimming
---

<objective>
Slim 9 agents by replacing their shared-content blocks with a single @-include line pointing to the cluster reference file. This sprint runs in Wave 2 after sprint 23-1 creates the reference files.

Cluster A — Engineer personas (3 agents): haitham, omar, yousef. Each gets @.rcode/references/persona-engineer-shared.md added and the extracted shared blocks removed.

Cluster B — Auditor agents (6 agents): nyquist-auditor, docs-auditor, ui-auditor, security-auditor, security-adversary, edge-case-hunter. Each gets @.rcode/references/auditor-shared-checklists.md added and the extracted shared blocks removed.

Purpose: Reduce 9 agent files from their current 120-182L to ≤100L each. Close #713 requirement for this cluster.
Output: 9 modified agent stub files.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md
@rcode/references/agent-shared-rules.md
@rcode/references/persona-engineer-shared.md
@rcode/references/auditor-shared-checklists.md
</context>

<tasks>

### Task 1 — Slim engineer persona agents (Cluster A)
**Type:** auto
**Duration estimate:** 40-50 min

<files>
Files to modify:
  - rcode/agents/rcode-haitham.md (143L currently)
  - rcode/agents/rcode-omar.md (138L currently)
  - rcode/agents/rcode-yousef.md (137L currently)
Reference file to @-include:
  - .rcode/references/persona-engineer-shared.md (created in 23-1)
</files>

<action>
Read each agent file in full before editing. Then read persona-engineer-shared.md to know exactly what moved to the reference. Remove from each agent only the blocks that were extracted into persona-engineer-shared.md:

**Blocks to REMOVE from each engineer agent:**
1. The generic "STRICTLY FORBIDDEN" opener/closer communication constraints block (the specific sentence "STRICTLY FORBIDDEN from starting with 'Great', 'Certainly', 'Okay', 'Sure'" and "Never end with 'Let me know if you have questions'" — these now live in persona-engineer-shared.md)
2. The meta-instruction "Five named heuristics. Cite by name." — the meta-rule lives in the shared file; the SPECIFIC HEURISTIC NAMES AND DESCRIPTIONS stay in the stub
3. The meta-instruction "State the rule by name when refusing." — the meta-rule lives in the shared file; the SPECIFIC refuse-list items stay in the stub
4. The generic engineer workflow invariants that were moved (Read before proposing, Grep before inventing, Cite heuristic by name) — ONLY if they appear verbatim as a separate structural block; inline citations in examples are NOT removed

**Blocks that MUST remain in each stub (do NOT remove):**
- YAML frontmatter (name, description, tools, color) — unchanged
- Existing @-include lines at top (@.rcode/references/response-style.md, etc.)
- The persona identity section (who they are, background, personality)
- Communication Style section (the persona-prefix line like "Response prefix: 🎨 **Haitham:**")
- ALL specific named heuristics with their descriptions (Three-paths check, etc.)
- ALL specific anti-pattern items in the Refuse List
- ALL capabilities table entries (CD, AX, RT, etc.)
- The full Workflow section (the numbered steps specific to the persona)
- Persistent Context section (what files to read on activation)
- ALL examples (happy path, edge case, negative routing)
- ALL redirect entries
- Constraints section (the persona-specific ones; the generic ones in the shared file still need their persona-specific counterparts where they differ by glyph)

**Add @-include line** after the existing @-include lines at the top of each file (after line 11-12 typically), before the first `#` heading:
```
@.rcode/references/persona-engineer-shared.md
```

**Line count target:** Each file should end up between 90-100 lines after the edit. If still over 100, identify additional shared content that was missed and check it against the reference file content before removing further.

**Edit approach:** Use the Edit tool to make targeted removals. Do NOT rewrite the entire file. Identify the exact lines to remove, verify they match content that is NOW in persona-engineer-shared.md, then remove them. Never remove content that has no corresponding entry in the reference file.

Process one agent at a time. After editing each agent:
1. Run `wc -l rcode/agents/rcode-[name].md` and confirm ≤100
2. Verify the @-include line is present
3. Confirm the specific heuristic names still appear (`grep "Three-paths\|Match-existing\|Critical-path" rcode/agents/rcode-[name].md`)
</action>

<verify>
<automated>
wc -l rcode/agents/rcode-haitham.md rcode/agents/rcode-omar.md rcode/agents/rcode-yousef.md && grep -l "@.rcode/references/persona-engineer-shared.md" rcode/agents/rcode-haitham.md rcode/agents/rcode-omar.md rcode/agents/rcode-yousef.md | wc -l
</automated>
</verify>

<done>
- All three files: wc -l ≤ 100
- All three files contain: @.rcode/references/persona-engineer-shared.md
- haitham.md still contains: "Three-paths check", "Hydration-cost test", "Match-existing-component", "Logical-properties-only", "Performance budget"
- omar.md still contains: "Match-existing-pattern", "AC-lockstep", "Test-truth rule", "10-minute blocker rule", "Atomic-commit rule"
- yousef.md still contains: "Critical-path trace", "Top-1 wins", "Boring-store default", "Index-before-rewrite", "Synchronous-in-hot-loop test"
</done>

<evidence>
lines: rcode/agents/rcode-haitham.md:143 — current line count (143L to reduce to ≤100L)
lines: rcode/agents/rcode-omar.md:138 — current line count (138L to reduce to ≤100L)
lines: rcode/agents/rcode-yousef.md:137 — current line count (137L to reduce to ≤100L)
grep: rg "STRICTLY FORBIDDEN from starting" rcode/agents/rcode-haitham.md rcode/agents/rcode-omar.md rcode/agents/rcode-yousef.md → 3 hits — these lines move to shared file, removed from stubs
grep: rg "Five named heuristics. Cite by name." rcode/agents/ → 3 hits — meta-rule moves to shared file
</evidence>

---

### Task 2 — Slim auditor agents (Cluster B)
**Type:** auto
**Duration estimate:** 50-60 min

<files>
Files to modify:
  - rcode/agents/rcode-nyquist-auditor.md (182L currently)
  - rcode/agents/rcode-docs-auditor.md (182L currently)
  - rcode/agents/rcode-ui-auditor.md (124L currently)
  - rcode/agents/rcode-security-auditor.md (122L currently)
  - rcode/agents/rcode-security-adversary.md (127L currently)
  - rcode/agents/rcode-edge-case-hunter.md (121L currently)
Reference file to @-include:
  - .rcode/references/auditor-shared-checklists.md (created in 23-1)
</files>

<action>
Read each agent file in full before editing. Read auditor-shared-checklists.md to know precisely what moved to the reference. Then apply targeted removals to each agent.

**CRITICAL PRE-STEP for rcode-docs-auditor.md:**
This agent has two special `<mode_feature_drift>` and `<mode_phase_status>` extension blocks (lines 79-182). These are NOT boilerplate — they contain structured JSON schemas and hardcoded severity rules used by the rcode-feature-drift workflow. DO NOT remove them. They are unique extensions that MUST stay in the stub. The docs-auditor will be harder to slim below 100L because of these extensions. If after removing shared blocks it is still above 100L due to these extension blocks alone, document this as an accepted deviation in the SUMMARY.md — the extension blocks are load-bearing and cannot be moved.

**CRITICAL PRE-STEP for rcode-nyquist-auditor.md:**
The execution_flow block (lines 22-95) contains the gap-analysis loop structure. This is entirely unique to nyquist — it does NOT appear in other auditors. Do NOT remove it. It stays in the stub.

**Blocks to REMOVE from each auditor agent (where present):**
1. "You do not write/fix/implement. You identify/audit/flag." role boundary statement — moved to auditor-shared-checklists.md under Audit Role Boundary
2. The boilerplate "No pleasantries or closing offers" and "No emojis beyond [glyph]" constraints — moved to Shared Auditor Constraints (keep only if the glyph line is different; the glyph-specific "no emojis beyond 🎨" line stays since the glyph is unique)
3. The generic "Evidence-based" rule: "every finding cites file:line. No 'this code seems to have issues'" — if stated as a standalone principle rather than embedded in a specific example, remove the standalone statement
4. The "four pressure points" meta-instruction line (the intro "Every [X] audit has four pressure points:") — the section HEADER and INTRO sentence moves to shared; the FOUR SPECIFIC POINTS stay in the stub because they are domain-specific

**Blocks that MUST remain in each stub:**
- YAML frontmatter — unchanged
- Existing @-include lines at top
- The specific domain focus (OWASP, WCAG, gap-analysis, drift detection)
- The four specific pressure points (domain-specific content)
- The response format prefix line (persona glyph)
- Specializations section (domain-specific)
- Principles section with named rules (domain-specific)
- Workflow section (domain-specific)
- Anti-Patterns/Refuse List (domain-specific)
- Examples (unique to each)
- Redirects (unique routing)
- docs-auditor's mode_feature_drift and mode_phase_status blocks — MUST stay

**Add @-include line** after existing @-includes at top of each file:
```
@.rcode/references/auditor-shared-checklists.md
```

Process one agent at a time. After each edit, run wc -l and confirm progress. For docs-auditor: if the extension blocks make it impossible to reach ≤100L, accept the result if it is ≤120L (the extension blocks are load-bearing) and document in SUMMARY.

**Edit approach:** Use the Edit tool for targeted removals. Never rewrite the entire file.
</action>

<verify>
<automated>
wc -l rcode/agents/rcode-nyquist-auditor.md rcode/agents/rcode-docs-auditor.md rcode/agents/rcode-ui-auditor.md rcode/agents/rcode-security-auditor.md rcode/agents/rcode-security-adversary.md rcode/agents/rcode-edge-case-hunter.md
</automated>
</verify>

<done>
- nyquist, ui, security, security-adversary, edge-case-hunter: wc -l ≤ 100
- docs-auditor: wc -l ≤ 120 (acceptable due to load-bearing mode extension blocks — document deviation)
- All 6 files contain: @.rcode/references/auditor-shared-checklists.md
- nyquist still contains: execution_flow block, gap analysis loop, structured_returns block
- docs-auditor still contains: mode_feature_drift and mode_phase_status blocks
</done>

<evidence>
lines: rcode/agents/rcode-nyquist-auditor.md:1-182 — full agent (182L); execution_flow is lines 22-95 (unique, not shared)
lines: rcode/agents/rcode-docs-auditor.md:79-182 — mode_feature_drift and mode_phase_status blocks (unique extensions, load-bearing)
lines: rcode/agents/rcode-docs-auditor.md:23-28 — "four pressure points" header (shared structure, domain content stays)
grep: rg "No pleasantries or closing offers" rcode/agents/rcode-docs-auditor.md rcode/agents/rcode-security-auditor.md rcode/agents/rcode-edge-case-hunter.md rcode/agents/rcode-security-adversary.md rcode/agents/rcode-nyquist-auditor.md → 5 hits (boilerplate that moves to shared file)
</evidence>

---

### Task 3 — Commit Cluster A and B slim results
**Type:** auto
**Duration estimate:** 5 min

<files>
Files to commit (9 modified agent stubs):
  - rcode/agents/rcode-haitham.md
  - rcode/agents/rcode-omar.md
  - rcode/agents/rcode-yousef.md
  - rcode/agents/rcode-nyquist-auditor.md
  - rcode/agents/rcode-docs-auditor.md
  - rcode/agents/rcode-ui-auditor.md
  - rcode/agents/rcode-security-auditor.md
  - rcode/agents/rcode-security-adversary.md
  - rcode/agents/rcode-edge-case-hunter.md
</files>

<action>
Stage only the 9 modified agent files:

```bash
git add rcode/agents/rcode-haitham.md
git add rcode/agents/rcode-omar.md
git add rcode/agents/rcode-yousef.md
git add rcode/agents/rcode-nyquist-auditor.md
git add rcode/agents/rcode-docs-auditor.md
git add rcode/agents/rcode-ui-auditor.md
git add rcode/agents/rcode-security-auditor.md
git add rcode/agents/rcode-security-adversary.md
git add rcode/agents/rcode-edge-case-hunter.md
```

Commit message:
```
feat(agents): slim engineer personas + auditor cluster via @-include (#713)
```

Before committing, verify with `git diff --cached --stat` that exactly 9 files appear in the staging area. If any other files appear, unstage them.
</action>

<verify>
<automated>
git log --oneline -1 && git show --stat HEAD | grep "rcode/agents"
</automated>
</verify>

<done>
- Commit exists referencing #713
- `git show --stat HEAD` lists exactly 9 agent files
- No reference files appear in this commit (they were committed in sprint 23-1)
</done>

<evidence>
lines: .planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md:71 — "Commit per cluster wave, not per agent"
</evidence>

</tasks>

<verification>
```bash
# Line count check — all 9 must be ≤100 (docs-auditor may be ≤120 if load-bearing extensions prevent 100)
wc -l rcode/agents/rcode-haitham.md \
       rcode/agents/rcode-omar.md \
       rcode/agents/rcode-yousef.md \
       rcode/agents/rcode-nyquist-auditor.md \
       rcode/agents/rcode-docs-auditor.md \
       rcode/agents/rcode-ui-auditor.md \
       rcode/agents/rcode-security-auditor.md \
       rcode/agents/rcode-security-adversary.md \
       rcode/agents/rcode-edge-case-hunter.md

# @-include present in all 9
grep -l "@.rcode/references/persona-engineer-shared.md" \
  rcode/agents/rcode-haitham.md rcode/agents/rcode-omar.md rcode/agents/rcode-yousef.md | wc -l
# Expected: 3

grep -l "@.rcode/references/auditor-shared-checklists.md" \
  rcode/agents/rcode-nyquist-auditor.md rcode/agents/rcode-docs-auditor.md \
  rcode/agents/rcode-ui-auditor.md rcode/agents/rcode-security-auditor.md \
  rcode/agents/rcode-security-adversary.md rcode/agents/rcode-edge-case-hunter.md | wc -l
# Expected: 6

# Named heuristics preserved in engineer stubs
grep "Three-paths check" rcode/agents/rcode-haitham.md
grep "Match-existing-pattern" rcode/agents/rcode-omar.md
grep "Critical-path trace" rcode/agents/rcode-yousef.md
```
</verification>

<success_criteria>
- [ ] rcode-haitham.md ≤ 100 lines with @.rcode/references/persona-engineer-shared.md and named heuristics intact
- [ ] rcode-omar.md ≤ 100 lines with @.rcode/references/persona-engineer-shared.md and named heuristics intact
- [ ] rcode-yousef.md ≤ 100 lines with @.rcode/references/persona-engineer-shared.md and named heuristics intact
- [ ] rcode-nyquist-auditor.md ≤ 100 lines with @.rcode/references/auditor-shared-checklists.md and execution_flow intact
- [ ] rcode-docs-auditor.md ≤ 120 lines with @.rcode/references/auditor-shared-checklists.md and mode extension blocks intact
- [ ] rcode-ui-auditor.md ≤ 100 lines with @.rcode/references/auditor-shared-checklists.md
- [ ] rcode-security-auditor.md ≤ 100 lines with @.rcode/references/auditor-shared-checklists.md
- [ ] rcode-security-adversary.md ≤ 100 lines with @.rcode/references/auditor-shared-checklists.md
- [ ] rcode-edge-case-hunter.md ≤ 100 lines with @.rcode/references/auditor-shared-checklists.md
- [ ] One commit with all 9 agent files, references #713
</success_criteria>

<output>
Create `.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-2-SUMMARY.md`
</output>
