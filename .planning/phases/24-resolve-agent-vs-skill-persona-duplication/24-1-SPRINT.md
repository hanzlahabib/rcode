---
phase: 24-resolve-agent-vs-skill-persona-duplication
sprint: 24.1
type: execute
wave: 1
depends_on: []
files_modified:
  - rcode/agents/rcode-hanzla.md
  - rcode/agents/rcode-waleed.md
  - rcode/agents/rcode-sadiq.md
  - rcode/agents/rcode-fatima.md
  - rcode/agents/rcode-ahmed.md
  - rcode/agents/rcode-hussain-pm.md
  - rcode/agents/rcode-layla.md
  - rcode/agents/rcode-mariam.md
  - rcode/agents/rcode-nasser.md
  - rcode/agents/rcode-noor.md
autonomous: true
requirements: [M1]

must_haves:
  truths:
    - All 10 persona agent files are ≤40 lines after the edit
    - Each file still @-includes its matching SKILL.md
    - No persona content (Identity/Communication/Principles/Capabilities/Constraints sections) remains in any of the 10 agent stubs
    - rcode-khalid.md is untouched
    - All SKILL.md files are untouched
  artifacts:
    - rcode/agents/rcode-hanzla.md (slimmed)
    - rcode/agents/rcode-waleed.md (slimmed)
    - rcode/agents/rcode-sadiq.md (slimmed)
    - rcode/agents/rcode-fatima.md (slimmed)
    - rcode/agents/rcode-ahmed.md (slimmed)
    - rcode/agents/rcode-hussain-pm.md (slimmed)
    - rcode/agents/rcode-layla.md (slimmed)
    - rcode/agents/rcode-mariam.md (slimmed)
    - rcode/agents/rcode-nasser.md (slimmed)
    - rcode/agents/rcode-noor.md (slimmed)
  key_links:
    - Each agent stub @-includes SKILL.md — removing stub persona content still delivers full persona via SKILL.md load
    - cli/install.js copies rcode/agents/*.md to ~/.claude/agents/*.md — slim stubs with valid frontmatter + @-includes satisfy this
---

<objective>
Strip duplicate persona content from 10 persona agent stubs whose SKILL.md is already @-included.

Purpose: Each agent file currently carries condensed Identity/Communication/Principles/Capabilities/Constraints sections that are already present — in full, authoritative form — in the @-included SKILL.md. This doubles the context load on every agent spawn and creates a drift risk when SKILL.md is updated. After this sprint, every affected agent is a thin stub: frontmatter + @-includes only (≤40 lines).

Output: 10 slimmed agent files. No new files created. SKILL.md files not touched.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/phases/24-resolve-agent-vs-skill-persona-duplication/CONTEXT.md
@.planning/ROADMAP.md
</context>

<tasks>

### Story 24.1.01 — Slim the five persona agents that use agent-shared-rules.md

**Wave:** 1
**Type:** auto
**Estimate:** 30 min

<files>
- rcode/agents/rcode-hanzla.md (78L — last @-include at line 18; persona content lines 20-79)
- rcode/agents/rcode-waleed.md (76L — last @-include at line 20; persona content lines 22-77)
- rcode/agents/rcode-sadiq.md (73L — last @-include at line 18; persona content lines 20-73)
- rcode/agents/rcode-fatima.md (81L — last @-include at line 19; persona content lines 21-82)
- rcode/agents/rcode-hussain-pm.md (84L — last @-include at line 19; persona content lines 21-85)
- rcode/agents/rcode-mariam.md (72L — last @-include at line 18; persona content lines 20-72)
</files>

<action>
For each of the 6 files listed, truncate the file to keep ONLY the frontmatter block (lines 1 through the closing `---`) and the @-include block (lines immediately after frontmatter through and including the last `@.rcode/skills/agents/*/SKILL.md` line).

Remove everything from the blank line after the last @-include to end-of-file. That is every heading, paragraph, and section that starts at or after the `# Name —` heading line.

The target shape for each file is exactly:

```
---
name: rcode-<name>
description: |
  <keep verbatim — description drives council dispatch>
tools: <keep>
color: <keep if present>
---

@.rcode/references/agent-shared-rules.md
@.rcode/references/codebase-grounding.md
@.rcode/references/karpathy-guidelines.md   ← include ONLY if currently present
@.rcode/skills/agents/<name>/SKILL.md
```

Exact cuts per file (use Edit tool, not Write, to preserve frontmatter):
- rcode-hanzla.md: keep lines 1-18, delete lines 19-78 (blank line + everything below)
- rcode-waleed.md: keep lines 1-20, delete lines 21-76
- rcode-sadiq.md: keep lines 1-18, delete lines 19-73 (sadiq has no karpathy-guidelines line — do NOT add it)
- rcode-fatima.md: keep lines 1-19, delete lines 20-81
- rcode-hussain-pm.md: keep lines 1-19, delete lines 20-84
- rcode-mariam.md: keep lines 1-18, delete lines 19-72 (mariam has no karpathy-guidelines line — do NOT add it)

Do NOT add a trailing newline block of persona content. Do NOT modify SKILL.md files. Do NOT touch rcode-khalid.md.
</action>

<evidence>
lines: rcode/agents/rcode-hanzla.md:20-78 — `# Hanzla (حنظلة) — Senior Full-Stack Engineer` heading + 7 sections (Identity, Communication Style, Principles, Capabilities, Persistent Context, Redirects, Constraints)
lines: rcode/agents/rcode-waleed.md:22-76 — `# Waleed (وليد) — Chief Technology Officer` heading + 7 sections
lines: rcode/agents/rcode-sadiq.md:20-73 — `# Sadiq (صادق) — Director of Strategy` heading + 7 sections
lines: rcode/agents/rcode-fatima.md:21-81 — `# Fatima (فاطمة) — QA Lead` heading + 7 sections
lines: rcode/agents/rcode-hussain-pm.md:21-84 — `# Hussain (حسين) — Product Manager` heading + 8 sections
lines: rcode/agents/rcode-mariam.md:20-72 — `# Mariam (مريم) — Marketing & Growth Lead` heading + 7 sections
grep: `rg "^@.rcode/references/agent-shared-rules" rcode/agents/` confirms these 6 files (and noor/layla/nasser/ahmed use response-style instead)
</evidence>

<verify>
<automated>
wc -l /home/hanzla/development/rcode/rcode/agents/rcode-hanzla.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-waleed.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-sadiq.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-fatima.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-hussain-pm.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-mariam.md \
  | awk '$1 > 40 {print "FAIL: " $2 " has " $1 " lines"; fail=1} END {if (!fail) print "OK: all ≤40 lines"}'
</automated>
</verify>

<done>
- wc -l output shows all 6 files ≤40 lines
- `grep -c "^@.rcode/skills/agents" rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,hussain-pm,mariam}.md` returns 1 for each file
- No `# ` heading lines remain in any of the 6 files below the last @-include line (`grep -A999 "^@.rcode/skills" rcode/agents/rcode-hanzla.md | grep "^#"` returns empty)
</done>

---

### Story 24.1.02 — Slim the four persona agents that use response-style.md

**Wave:** 1
**Type:** auto
**Estimate:** 20 min

<files>
- rcode/agents/rcode-ahmed.md (67L — last @-include at line 10; persona content lines 12-67)
- rcode/agents/rcode-layla.md (58L — last @-include at line 10; persona content lines 12-58)
- rcode/agents/rcode-nasser.md (58L — last @-include at line 10; persona content lines 12-58)
- rcode/agents/rcode-noor.md (62L — last @-include at line 11; persona content lines 13-62)
</files>

<action>
For each of the 4 files listed, truncate the file to keep ONLY the frontmatter and @-include block. Remove everything from the blank line after the last @-include to end-of-file.

Note that these four files use `@.rcode/references/response-style.md` (not `agent-shared-rules.md`). Preserve this exactly as-is.

Target shape for each:

```
---
name: rcode-<name>
description: <keep verbatim>
tools: <keep>
color: <keep>
---

@.rcode/references/response-style.md
@.rcode/references/codebase-grounding.md
@.rcode/references/karpathy-guidelines.md   ← include ONLY if currently present (noor has it; ahmed and layla and nasser do NOT)
@.rcode/skills/agents/<name>/SKILL.md
```

Exact cuts per file:
- rcode-ahmed.md: keep lines 1-10, delete lines 11-67
- rcode-layla.md: keep lines 1-10, delete lines 11-58
- rcode-nasser.md: keep lines 1-10, delete lines 11-58
- rcode-noor.md: keep lines 1-11, delete lines 12-62 (noor has karpathy-guidelines at line 10, SKILL.md at line 11)

Do NOT add karpathy-guidelines to ahmed/layla/nasser — they do not currently have it.
Do NOT touch rcode-khalid.md or any SKILL.md file.
</action>

<evidence>
lines: rcode/agents/rcode-ahmed.md:12-67 — `# Ahmed Al Hassani — Technology & Development Director` heading + Authority Map, How you think, Response format, When you are spawned, Constraints sections
lines: rcode/agents/rcode-layla.md:12-58 — `# Layla — UX Designer` heading + Who you are, How you think, Response format, When you are spawned, Constraints sections
lines: rcode/agents/rcode-nasser.md:12-58 — `# Nasser — Software Engineering Manager` heading + same section pattern
lines: rcode/agents/rcode-noor.md:13-62 — `# Noor — Technical Writer & Presentation Lead` heading + same section pattern
grep: `rg "^@.rcode/references/response-style" rcode/agents/` confirms exactly these 4 files use response-style (vs agent-shared-rules used by the other 6)
grep: `rg "karpathy-guidelines" rcode/agents/rcode-noor.md` → 1 hit (line 10); `rg "karpathy-guidelines" rcode/agents/rcode-ahmed.md rcode/agents/rcode-layla.md rcode/agents/rcode-nasser.md` → 0 hits
</evidence>

<verify>
<automated>
wc -l /home/hanzla/development/rcode/rcode/agents/rcode-ahmed.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-layla.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-nasser.md \
       /home/hanzla/development/rcode/rcode/agents/rcode-noor.md \
  | awk '$1 > 40 {print "FAIL: " $2 " has " $1 " lines"; fail=1} END {if (!fail) print "OK: all ≤40 lines"}'
</automated>
</verify>

<done>
- wc -l output shows all 4 files ≤40 lines
- `grep -c "^@.rcode/skills/agents" rcode/agents/rcode-{ahmed,layla,nasser,noor}.md` returns 1 for each
- No `# ` heading lines remain below the last @-include in any of the 4 files
- rcode-khalid.md line count unchanged: `wc -l rcode/agents/rcode-khalid.md` still shows 99
</done>

---

### Story 24.1.03 — Post-edit verification pass

**Wave:** 2
**Type:** auto
**Estimate:** 15 min

<files>
- rcode/agents/ (read-only verification — no edits)
</files>

<action>
Run all success-criteria checks from CONTEXT.md and confirm they pass. Report results as a table. Fix any file that does not pass (by re-running the appropriate Edit from Story 24.1.01 or 24.1.02).

Checks to run:
1. Line count check — all 10 files ≤40 lines
2. @-include presence — all 10 files still have their `@.rcode/skills/agents/*/SKILL.md` line
3. No persona content below last @-include — no `^# ` heading after last `^@` line in any of the 10 files
4. rcode-khalid.md unchanged — still 99 lines, no modification
5. SKILL.md files untouched — spot-check: `wc -l rcode/skills/agents/hanzla-engineer/SKILL.md` returns 158

If all checks pass, commit with message:
`chore(agents): slim 10 persona stubs — strip duplicate content already in SKILL.md (#714)`

Stage only: `rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md`
Never stage SKILL.md files or rcode-khalid.md.
</action>

<evidence>
creates: This story runs no-edit bash checks; no files created.
grep: `rg "^@.rcode/skills/agents" rcode/agents/` currently returns 10 hits (one per persona agent) — post-edit this count must still be 10
lines: rcode/agents/rcode-khalid.md:1-99 — confirmed 99L by wc -l above; must remain unchanged
</evidence>

<verify>
<automated>
wc -l /home/hanzla/development/rcode/rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md \
  | grep -v total \
  | awk '$1 > 40 {print "FAIL:", $2, "=", $1, "lines"}' \
  | grep -c FAIL \
  | xargs -I{} bash -c '[ {} -eq 0 ] && echo "PASS: all 10 files ≤40 lines" || echo "FAIL: {} files exceed 40 lines"'
</automated>
</verify>

<done>
- All 10 files ≤40 lines (wc -l confirms)
- All 10 files have exactly 1 `@.rcode/skills/agents/` line (grep -c confirms)
- No persona heading (`^# `) exists below the last @-include in any file (grep confirms empty)
- rcode-khalid.md is still 99 lines
- Commit `chore(agents): slim 10 persona stubs — strip duplicate content already in SKILL.md (#714)` created with only the 10 agent files staged
</done>

</tasks>

<verification>
```bash
# 1. Line count — all 10 must be ≤40
wc -l rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md

# 2. @-include still present in all 10
grep -l "@.rcode/skills/agents" rcode/agents/*.md | sort

# 3. No persona content below last @-include
for f in rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md; do
  last_at=$(grep -n "^@" "$f" | tail -1 | cut -d: -f1)
  remainder=$(tail -n +"$last_at" "$f" | grep "^# ")
  [ -n "$remainder" ] && echo "FAIL: $f has persona heading: $remainder" || echo "OK: $f"
done

# 4. rcode-khalid.md untouched
wc -l rcode/agents/rcode-khalid.md   # must be 99

# 5. SKILL.md files untouched (spot check)
wc -l rcode/skills/agents/hanzla-engineer/SKILL.md   # must be 158
wc -l rcode/skills/agents/hussain-pm/SKILL.md         # must be 166
```
</verification>

<success_criteria>
1. `wc -l rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md` — all 10 ≤40 lines
2. `grep -l "@.rcode/skills/agents" rcode/agents/*.md` — returns exactly the 10 persona agent paths
3. No `# ` heading lines exist below the last `@` line in any of the 10 files
4. `wc -l rcode/agents/rcode-khalid.md` returns 99 (unchanged)
5. `wc -l rcode/skills/agents/hanzla-engineer/SKILL.md` returns 158 (unchanged)
6. Commit staged only the 10 agent files — no SKILL.md, no rcode-khalid.md
</success_criteria>

<output>
Create `.planning/phases/24-resolve-agent-vs-skill-persona-duplication/24-1-SUMMARY.md` after sprint completion.
</output>
