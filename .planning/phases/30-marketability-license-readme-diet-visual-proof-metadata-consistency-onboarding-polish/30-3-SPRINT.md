---
phase: 30
plan_number: 3
sprint: 30.3
type: execute
wave: 3
depends_on: [30.2]
files_modified:
  - README.md
  - DOCS.md
  - package.json
autonomous: true
requirements: [REQ-757]
must_haves:
  truths:
    - "Agent, command, skill, and workflow counts are identical everywhere they appear in README, DOCS.md, and package.json."
    - "Every count matches the actual number of files in the repo."
    - "package.json description and keywords tell the same story as the README."
  artifacts:
    - "A verified count baseline recorded in the SUMMARY."
  key_links:
    - "Counts in README <-> DOCS.md <-> package.json must all derive from the same file-count commands."
---

<objective>
Metadata consistency (#757). README contradicts itself — "45 agents" in the hero (line 5) vs "44 agents" in the body (line 60); "95 commands" (line 5) vs "96 slash commands" (line 61). DOCS.md says "Slash commands (95)" and "Skills (80)" while README says "105 skills". package.json's description ("memory bank for AI-driven SaaS teams") tells a different story than the README hero.

Verified real counts (from file-count audit at planning time):
- Agents: **45** (`ls rcode/agents/*.md | wc -l` = 45)
- Commands: **109** (`find rcode/commands -name '*.md' | wc -l` = 109)
- Skills: **85** (`find rcode/skills -name SKILL.md | wc -l` = 85)
- Workflows: **126** (`find rcode/workflows -name '*.md' | wc -l` = 126)

Purpose: One number per thing, true everywhere.
Output: Consistent README, DOCS.md, package.json with verified counts and aligned positioning.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

### Task 30.3.1 — auto — Re-verify the real counts and record the baseline
<type>auto</type>
<read_first>
- This sprint's objective block (the planning-time counts above)
</read_first>
<files></files>
<action>
Run these four commands and record the output in the SUMMARY as the authoritative count baseline:
- `ls rcode/agents/*.md | wc -l`
- `find rcode/commands -name '*.md' | wc -l`
- `find rcode/skills -name 'SKILL.md' | wc -l`
- `find rcode/workflows -name '*.md' | wc -l`
If any number differs from the planning-time figures (45 / 109 / 85 / 126), use the freshly measured number as authoritative for the rest of this sprint. Do not guess or round.
</action>
<acceptance_criteria>
- Four counts captured from real commands and written into the SUMMARY.
</acceptance_criteria>
<verify>
<automated>echo "agents=$(ls rcode/agents/*.md | wc -l) commands=$(find rcode/commands -name '*.md' | wc -l) skills=$(find rcode/skills -name 'SKILL.md' | wc -l) workflows=$(find rcode/workflows -name '*.md' | wc -l)"</automated>
</verify>
<done>Authoritative counts measured and logged.</done>
<evidence>grep: planning-time audit ran `ls rcode/agents/*.md | wc -l` -> 45, `find rcode/commands -name '*.md' | wc -l` -> 109, `find rcode/skills -name SKILL.md | wc -l` -> 85, `find rcode/workflows -name '*.md' | wc -l` -> 126.</evidence>

### Task 30.3.2 — auto — Fix all counts in README.md
<type>auto</type>
<read_first>
- README.md (after sprint 30-2's diet — lines may have shifted; grep for the numbers rather than trusting line numbers)
- The baseline from Task 30.3.1
</read_first>
<files>README.md</files>
<action>
In README.md, replace every agent/command/skill/workflow count with the verified baseline numbers:
- "45 agents" / "44 agents" -> the verified agent count.
- "95 commands" / "96 slash commands" / "Full command surface (95 commands)" -> the verified command count.
- "105 skills" -> the verified skill count.
- "102 workflows" -> the verified workflow count.
Search with `grep -nE '[0-9]+ (agents?|commands?|skills?|workflows?)' README.md` first to find every occurrence, including the post-install health-check sample output ("agents installed — 45", "105 skills + 95 commands"). Update those too so they match. Do not change test counts (134 tests) — those are out of scope unless wrong; only touch agent/command/skill/workflow counts.
</action>
<acceptance_criteria>
- `grep -E '[0-9]+ agents?' README.md` shows only the verified agent count — no "44".
- `grep -E '[0-9]+ commands?' README.md` shows only the verified command count.
- No "105 skills" and no "102 workflows" strings remain if those numbers are wrong.
</acceptance_criteria>
<verify>
<automated>! grep -qE '\b44 agents?\b' README.md && ! grep -qE '\b9[56] (slash )?commands?\b' README.md && ! grep -q '105 skills' README.md && echo "README counts corrected"</automated>
</verify>
<done>Every agent/command/skill/workflow count in README is the verified number; no contradictory figures remain.</done>
<evidence>lines: README.md:5 ("45 specialist agents, 95 commands"), README.md:60-64 ("44 agents", "96 slash commands", "105 skills", "102 workflows"), README.md:481-482 (health-check sample "agents installed — 45", "105 skills + 95 commands"). grep `[0-9]+ (agents|commands|skills|workflows)` README.md surfaces all of these.</evidence>

### Task 30.3.3 — auto — Fix all counts in DOCS.md
<type>auto</type>
<read_first>
- DOCS.md (lines 14-16 TOC; lines 44-46, 77-79 — count claims)
- The baseline from Task 30.3.1
</read_first>
<files>DOCS.md</files>
<action>
In DOCS.md, replace the stale counts with the verified baseline:
- "Personas (45 agents)" / "45 distinctive engineering personas" / "45 first-class subagents" -> verified agent count.
- "Slash commands (95)" / "95 slash commands" -> verified command count.
- "Skills (80)" / "80 skills" / "80 phrase-activated skills" -> verified skill count.
Grep `grep -nE '[0-9]+|\([0-9]+\)' DOCS.md | grep -iE 'agent|command|skill|persona'` to find every occurrence, including TOC anchor headings. When a TOC heading like "Skills (80)" changes its number, update both the TOC entry AND the section heading it links to so the anchor still resolves.
</action>
<acceptance_criteria>
- DOCS.md contains no "Skills (80)" or "80 skills" if 80 is wrong.
- DOCS.md command and agent counts equal the verified baseline.
</acceptance_criteria>
<verify>
<automated>! grep -q 'Skills (80)' DOCS.md && ! grep -qE '\b80 (phrase-activated )?skills\b' DOCS.md && ! grep -qE '\(95\) ?$' DOCS.md && echo "DOCS.md counts corrected"</automated>
</verify>
<done>DOCS.md counts (agents, commands, skills) all equal the verified baseline; TOC anchors still resolve.</done>
<evidence>lines: DOCS.md:14 ("Personas (45 agents)"), DOCS.md:15 ("Slash commands (95)"), DOCS.md:16 ("Skills (80)"), DOCS.md:44-46 ("45 distinctive engineering personas", "80 skills", "95 slash commands"), DOCS.md:77-79 ("45 first-class subagents", "95 slash commands", "80 phrase-activated skills").</evidence>

### Task 30.3.4 — auto — Align package.json description and keywords
<type>auto</type>
<read_first>
- /home/hanzla/development/rcode/package.json (lines 4, 31-44 — description + keywords)
- README.md (lines 1-9 — the hero pitch, as the canonical positioning)
</read_first>
<files>package.json</files>
<action>
1. Rewrite `package.json` `description` (line 4) so it matches the README hero positioning ("The AI team that never forgets — persistent memory, specialist agents, slash commands for AI IDEs"). Keep it under ~180 chars and keep the "Works in Claude Code, Cursor, Gemini..." clause.
2. Add these keywords to the `keywords` array (lines 31-44) without removing existing ones: `"memory-bank"`, `"cursor"`, `"planning"`, `"subagents"`.
Keep the file valid JSON.
</action>
<acceptance_criteria>
- `package.json` parses as valid JSON.
- `keywords` contains `memory-bank`, `cursor`, `planning`, `subagents`.
- The description no longer leads with "the memory bank for AI-driven SaaS teams" verbatim if the README hero uses different language — it should echo the README story.
</acceptance_criteria>
<verify>
<automated>node -e "const p=require('./package.json'); const k=p.keywords; ['memory-bank','cursor','planning','subagents'].forEach(x=>{if(!k.includes(x)){console.error('missing '+x);process.exit(1)}}); console.log('package.json keywords + description aligned')"</automated>
</verify>
<done>package.json description echoes the README positioning; keywords include the four new entries; file is valid JSON.</done>
<evidence>lines: package.json:4 (description "rcode — the memory bank for AI-driven SaaS teams..."), package.json:31-44 (keywords array — currently has no `memory-bank`, `cursor`, `planning`, or `subagents`); README.md:1-9 supplies the canonical hero positioning.</evidence>

</tasks>

<verification>
- README, DOCS.md, and package.json all report the same agent/command/skill/workflow counts.
- Those counts equal the actual file counts measured in Task 30.3.1.
- package.json is valid JSON and keywords include the four required additions.
</verification>

<success_criteria>
- Zero contradictory counts across README / DOCS.md / package.json.
- All counts traceable to a real `wc -l` / `find` measurement.
- package.json description + keywords match the README story.
</success_criteria>

<output>
Create `.planning/phases/30-marketability-license-readme-diet-visual-proof-metadata-consistency-onboarding-polish/30-3-SUMMARY.md`
</output>
