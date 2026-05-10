---
phase: 24-resolve-agent-vs-skill-persona-duplication
sprint: 24.1
type: execute
wave: 1
depends_on: []
files_modified:
  - rihal/agents/rihal-hanzla.md
  - rihal/agents/rihal-waleed.md
  - rihal/agents/rihal-sadiq.md
  - rihal/agents/rihal-fatima.md
  - rihal/agents/rihal-ahmed.md
  - rihal/agents/rihal-hussain-pm.md
  - rihal/agents/rihal-layla.md
  - rihal/agents/rihal-mariam.md
  - rihal/agents/rihal-nasser.md
  - rihal/agents/rihal-noor.md
autonomous: true
requirements: [M1]

must_haves:
  truths:
    - All 10 persona agent files are ≤40 lines after the edit
    - Each file still @-includes its matching SKILL.md
    - No persona content (Identity/Communication/Principles/Capabilities/Constraints sections) remains in any of the 10 agent stubs
    - rihal-khalid.md is untouched
    - All SKILL.md files are untouched
  artifacts:
    - rihal/agents/rihal-hanzla.md (slimmed)
    - rihal/agents/rihal-waleed.md (slimmed)
    - rihal/agents/rihal-sadiq.md (slimmed)
    - rihal/agents/rihal-fatima.md (slimmed)
    - rihal/agents/rihal-ahmed.md (slimmed)
    - rihal/agents/rihal-hussain-pm.md (slimmed)
    - rihal/agents/rihal-layla.md (slimmed)
    - rihal/agents/rihal-mariam.md (slimmed)
    - rihal/agents/rihal-nasser.md (slimmed)
    - rihal/agents/rihal-noor.md (slimmed)
  key_links:
    - Each agent stub @-includes SKILL.md — removing stub persona content still delivers full persona via SKILL.md load
    - cli/install.js copies rihal/agents/*.md to ~/.claude/agents/*.md — slim stubs with valid frontmatter + @-includes satisfy this
---

<objective>
Strip duplicate persona content from 10 persona agent stubs whose SKILL.md is already @-included.

Purpose: Each agent file currently carries condensed Identity/Communication/Principles/Capabilities/Constraints sections that are already present — in full, authoritative form — in the @-included SKILL.md. This doubles the context load on every agent spawn and creates a drift risk when SKILL.md is updated. After this sprint, every affected agent is a thin stub: frontmatter + @-includes only (≤40 lines).

Output: 10 slimmed agent files. No new files created. SKILL.md files not touched.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
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
- rihal/agents/rihal-hanzla.md (78L — last @-include at line 18; persona content lines 20-79)
- rihal/agents/rihal-waleed.md (76L — last @-include at line 20; persona content lines 22-77)
- rihal/agents/rihal-sadiq.md (73L — last @-include at line 18; persona content lines 20-73)
- rihal/agents/rihal-fatima.md (81L — last @-include at line 19; persona content lines 21-82)
- rihal/agents/rihal-hussain-pm.md (84L — last @-include at line 19; persona content lines 21-85)
- rihal/agents/rihal-mariam.md (72L — last @-include at line 18; persona content lines 20-72)
</files>

<action>
For each of the 6 files listed, truncate the file to keep ONLY the frontmatter block (lines 1 through the closing `---`) and the @-include block (lines immediately after frontmatter through and including the last `@.rihal/skills/agents/*/SKILL.md` line).

Remove everything from the blank line after the last @-include to end-of-file. That is every heading, paragraph, and section that starts at or after the `# Name —` heading line.

The target shape for each file is exactly:

```
---
name: rihal-<name>
description: |
  <keep verbatim — description drives council dispatch>
tools: <keep>
color: <keep if present>
---

@.rihal/references/agent-shared-rules.md
@.rihal/references/codebase-grounding.md
@.rihal/references/karpathy-guidelines.md   ← include ONLY if currently present
@.rihal/skills/agents/<name>/SKILL.md
```

Exact cuts per file (use Edit tool, not Write, to preserve frontmatter):
- rihal-hanzla.md: keep lines 1-18, delete lines 19-78 (blank line + everything below)
- rihal-waleed.md: keep lines 1-20, delete lines 21-76
- rihal-sadiq.md: keep lines 1-18, delete lines 19-73 (sadiq has no karpathy-guidelines line — do NOT add it)
- rihal-fatima.md: keep lines 1-19, delete lines 20-81
- rihal-hussain-pm.md: keep lines 1-19, delete lines 20-84
- rihal-mariam.md: keep lines 1-18, delete lines 19-72 (mariam has no karpathy-guidelines line — do NOT add it)

Do NOT add a trailing newline block of persona content. Do NOT modify SKILL.md files. Do NOT touch rihal-khalid.md.
</action>

<evidence>
lines: rihal/agents/rihal-hanzla.md:20-78 — `# Hanzla (حنظلة) — Senior Full-Stack Engineer` heading + 7 sections (Identity, Communication Style, Principles, Capabilities, Persistent Context, Redirects, Constraints)
lines: rihal/agents/rihal-waleed.md:22-76 — `# Waleed (وليد) — Chief Technology Officer` heading + 7 sections
lines: rihal/agents/rihal-sadiq.md:20-73 — `# Sadiq (صادق) — Director of Strategy` heading + 7 sections
lines: rihal/agents/rihal-fatima.md:21-81 — `# Fatima (فاطمة) — QA Lead` heading + 7 sections
lines: rihal/agents/rihal-hussain-pm.md:21-84 — `# Hussain (حسين) — Product Manager` heading + 8 sections
lines: rihal/agents/rihal-mariam.md:20-72 — `# Mariam (مريم) — Marketing & Growth Lead` heading + 7 sections
grep: `rg "^@.rihal/references/agent-shared-rules" rihal/agents/` confirms these 6 files (and noor/layla/nasser/ahmed use response-style instead)
</evidence>

<verify>
<automated>
wc -l /home/hanzla/development/rihal-code/rihal/agents/rihal-hanzla.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-waleed.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-sadiq.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-fatima.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-hussain-pm.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-mariam.md \
  | awk '$1 > 40 {print "FAIL: " $2 " has " $1 " lines"; fail=1} END {if (!fail) print "OK: all ≤40 lines"}'
</automated>
</verify>

<done>
- wc -l output shows all 6 files ≤40 lines
- `grep -c "^@.rihal/skills/agents" rihal/agents/rihal-{hanzla,waleed,sadiq,fatima,hussain-pm,mariam}.md` returns 1 for each file
- No `# ` heading lines remain in any of the 6 files below the last @-include line (`grep -A999 "^@.rihal/skills" rihal/agents/rihal-hanzla.md | grep "^#"` returns empty)
</done>

---

### Story 24.1.02 — Slim the four persona agents that use response-style.md

**Wave:** 1
**Type:** auto
**Estimate:** 20 min

<files>
- rihal/agents/rihal-ahmed.md (67L — last @-include at line 10; persona content lines 12-67)
- rihal/agents/rihal-layla.md (58L — last @-include at line 10; persona content lines 12-58)
- rihal/agents/rihal-nasser.md (58L — last @-include at line 10; persona content lines 12-58)
- rihal/agents/rihal-noor.md (62L — last @-include at line 11; persona content lines 13-62)
</files>

<action>
For each of the 4 files listed, truncate the file to keep ONLY the frontmatter and @-include block. Remove everything from the blank line after the last @-include to end-of-file.

Note that these four files use `@.rihal/references/response-style.md` (not `agent-shared-rules.md`). Preserve this exactly as-is.

Target shape for each:

```
---
name: rihal-<name>
description: <keep verbatim>
tools: <keep>
color: <keep>
---

@.rihal/references/response-style.md
@.rihal/references/codebase-grounding.md
@.rihal/references/karpathy-guidelines.md   ← include ONLY if currently present (noor has it; ahmed and layla and nasser do NOT)
@.rihal/skills/agents/<name>/SKILL.md
```

Exact cuts per file:
- rihal-ahmed.md: keep lines 1-10, delete lines 11-67
- rihal-layla.md: keep lines 1-10, delete lines 11-58
- rihal-nasser.md: keep lines 1-10, delete lines 11-58
- rihal-noor.md: keep lines 1-11, delete lines 12-62 (noor has karpathy-guidelines at line 10, SKILL.md at line 11)

Do NOT add karpathy-guidelines to ahmed/layla/nasser — they do not currently have it.
Do NOT touch rihal-khalid.md or any SKILL.md file.
</action>

<evidence>
lines: rihal/agents/rihal-ahmed.md:12-67 — `# Ahmed Al Hassani — Technology & Development Director` heading + Authority Map, How you think, Response format, When you are spawned, Constraints sections
lines: rihal/agents/rihal-layla.md:12-58 — `# Layla — UX Designer` heading + Who you are, How you think, Response format, When you are spawned, Constraints sections
lines: rihal/agents/rihal-nasser.md:12-58 — `# Nasser — Software Engineering Manager` heading + same section pattern
lines: rihal/agents/rihal-noor.md:13-62 — `# Noor — Technical Writer & Presentation Lead` heading + same section pattern
grep: `rg "^@.rihal/references/response-style" rihal/agents/` confirms exactly these 4 files use response-style (vs agent-shared-rules used by the other 6)
grep: `rg "karpathy-guidelines" rihal/agents/rihal-noor.md` → 1 hit (line 10); `rg "karpathy-guidelines" rihal/agents/rihal-ahmed.md rihal/agents/rihal-layla.md rihal/agents/rihal-nasser.md` → 0 hits
</evidence>

<verify>
<automated>
wc -l /home/hanzla/development/rihal-code/rihal/agents/rihal-ahmed.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-layla.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-nasser.md \
       /home/hanzla/development/rihal-code/rihal/agents/rihal-noor.md \
  | awk '$1 > 40 {print "FAIL: " $2 " has " $1 " lines"; fail=1} END {if (!fail) print "OK: all ≤40 lines"}'
</automated>
</verify>

<done>
- wc -l output shows all 4 files ≤40 lines
- `grep -c "^@.rihal/skills/agents" rihal/agents/rihal-{ahmed,layla,nasser,noor}.md` returns 1 for each
- No `# ` heading lines remain below the last @-include in any of the 4 files
- rihal-khalid.md line count unchanged: `wc -l rihal/agents/rihal-khalid.md` still shows 99
</done>

---

### Story 24.1.03 — Post-edit verification pass

**Wave:** 2
**Type:** auto
**Estimate:** 15 min

<files>
- rihal/agents/ (read-only verification — no edits)
</files>

<action>
Run all success-criteria checks from CONTEXT.md and confirm they pass. Report results as a table. Fix any file that does not pass (by re-running the appropriate Edit from Story 24.1.01 or 24.1.02).

Checks to run:
1. Line count check — all 10 files ≤40 lines
2. @-include presence — all 10 files still have their `@.rihal/skills/agents/*/SKILL.md` line
3. No persona content below last @-include — no `^# ` heading after last `^@` line in any of the 10 files
4. rihal-khalid.md unchanged — still 99 lines, no modification
5. SKILL.md files untouched — spot-check: `wc -l rihal/skills/agents/hanzla-engineer/SKILL.md` returns 158

If all checks pass, commit with message:
`chore(agents): slim 10 persona stubs — strip duplicate content already in SKILL.md (#714)`

Stage only: `rihal/agents/rihal-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md`
Never stage SKILL.md files or rihal-khalid.md.
</action>

<evidence>
creates: This story runs no-edit bash checks; no files created.
grep: `rg "^@.rihal/skills/agents" rihal/agents/` currently returns 10 hits (one per persona agent) — post-edit this count must still be 10
lines: rihal/agents/rihal-khalid.md:1-99 — confirmed 99L by wc -l above; must remain unchanged
</evidence>

<verify>
<automated>
wc -l /home/hanzla/development/rihal-code/rihal/agents/rihal-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md \
  | grep -v total \
  | awk '$1 > 40 {print "FAIL:", $2, "=", $1, "lines"}' \
  | grep -c FAIL \
  | xargs -I{} bash -c '[ {} -eq 0 ] && echo "PASS: all 10 files ≤40 lines" || echo "FAIL: {} files exceed 40 lines"'
</automated>
</verify>

<done>
- All 10 files ≤40 lines (wc -l confirms)
- All 10 files have exactly 1 `@.rihal/skills/agents/` line (grep -c confirms)
- No persona heading (`^# `) exists below the last @-include in any file (grep confirms empty)
- rihal-khalid.md is still 99 lines
- Commit `chore(agents): slim 10 persona stubs — strip duplicate content already in SKILL.md (#714)` created with only the 10 agent files staged
</done>

</tasks>

<verification>
```bash
# 1. Line count — all 10 must be ≤40
wc -l rihal/agents/rihal-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md

# 2. @-include still present in all 10
grep -l "@.rihal/skills/agents" rihal/agents/*.md | sort

# 3. No persona content below last @-include
for f in rihal/agents/rihal-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md; do
  last_at=$(grep -n "^@" "$f" | tail -1 | cut -d: -f1)
  remainder=$(tail -n +"$last_at" "$f" | grep "^# ")
  [ -n "$remainder" ] && echo "FAIL: $f has persona heading: $remainder" || echo "OK: $f"
done

# 4. rihal-khalid.md untouched
wc -l rihal/agents/rihal-khalid.md   # must be 99

# 5. SKILL.md files untouched (spot check)
wc -l rihal/skills/agents/hanzla-engineer/SKILL.md   # must be 158
wc -l rihal/skills/agents/hussain-pm/SKILL.md         # must be 166
```
</verification>

<success_criteria>
1. `wc -l rihal/agents/rihal-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md` — all 10 ≤40 lines
2. `grep -l "@.rihal/skills/agents" rihal/agents/*.md` — returns exactly the 10 persona agent paths
3. No `# ` heading lines exist below the last `@` line in any of the 10 files
4. `wc -l rihal/agents/rihal-khalid.md` returns 99 (unchanged)
5. `wc -l rihal/skills/agents/hanzla-engineer/SKILL.md` returns 158 (unchanged)
6. Commit staged only the 10 agent files — no SKILL.md, no rihal-khalid.md
</success_criteria>

<output>
Create `.planning/phases/24-resolve-agent-vs-skill-persona-duplication/24-1-SUMMARY.md` after sprint completion.
</output>
