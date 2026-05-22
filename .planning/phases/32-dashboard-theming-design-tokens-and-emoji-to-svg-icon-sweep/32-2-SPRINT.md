---
phase: 32-dashboard-theming-design-tokens-and-emoji-to-svg-icon-sweep
sprint: 32.2
plan_number: 2
type: execute
wave: 2
depends_on: [32.1]
files_modified:
  - server/lib/html/icons.js
  - server/lib/html/client/icons-client.js
  - server/lib/html/client/views/OverviewView.js
  - server/lib/html/client/views/RoadmapView.js
  - server/lib/html/client/views/MilestonesView.js
  - server/lib/html/client/views/PhasesView.js
  - server/lib/html/client/views/SprintsView.js
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/client/components/shared.js
autonomous: true
requirements: [phase-32-goal]
must_haves:
  truths:
    - "Every emoji that was used AS A UI ICON in views and shared components is replaced by an inline SVG from the Icon component."
    - "Typographic characters retained: ✕ ✓ ○ ✗ ▶ ■ ❯ ⎘ ⛶ ⟳ ⊞ ◑ ↺ ↑ ← — these are typographic arrows/symbols integral to text labels, not standalone icons."
    - "icons.js and icons-client.js are in sync — all new icon names appear in both files."
    - "No visual regressions: all 12 views render; section headings show SVG icon + label."
  artifacts:
    - "icons.js — extended with: zap-circle (or reuse zap), building (for council/building), link-2 (for chains), alert-triangle (for handoff warning), brain (for memory bank), clipboard-list (for phase tree), flag (for milestone), pager/monitor (for terminal button), file-text (for view-plan button), hourglass-2 (for waiting), edit-3 (for files changed), eye (already exists), copy (for cmd copy), light-bulb (for commands accordion)."
    - "icons-client.js — same additions, kept in sync."
    - "6 view files and shared.js updated to import Icon and replace emoji."
  key_links:
    - "icons-client.js:13 imports h from preact.js and uses dangerouslySetInnerHTML for SVG paths — new icons must follow this same pattern."
    - "icons.js:51 exports via module.exports — keep CJS export intact for server-side require() in shell.js."
    - "The two ICONS maps (icons.js and icons-client.js) are manually kept in sync — update both in the same task."
---

<objective>
Extend the icon set in icons.js / icons-client.js with the ~10 additional icons
needed for the sweep, then replace every emoji-used-as-icon in the view files and
shared components with the corresponding inline SVG via the existing Icon Preact
component.

Purpose: Phase 32 goal item 2 — zero emoji UI icons. Sprint 32.1 prepared the CSS
alignment rules; this sprint does the actual sweep across the view layer.

Output: All 9 modified files pass `node --check`; no emoji UI icons remain in views/
or shared components (grep-verified); icons.js and icons-client.js are in sync.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task id="32.2.1" type="auto">
<title>Extend icon set — add 10 missing icons to icons.js and icons-client.js</title>
<read_first>server/lib/html/icons.js (full — 51 lines), server/lib/html/client/icons-client.js (full — 68 lines)</read_first>
<files>
server/lib/html/icons.js
server/lib/html/client/icons-client.js
</files>
<action>
The current ICONS map has 22 icons. The emoji sweep needs these additional icons
(all Lucide-style, viewBox 0 0 24 24, stroke=currentColor):

Add ALL of the following to BOTH files (keep the maps identical):

1. `zap-circle` — lightning bolt in a circle (for "Current Sprint" section heading).
   Path: `<circle cx="12" cy="12" r="10"/><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`
   — NOTE: this is a full-circle variant; if visual is too busy use `zap` (already
   exists). Use `zap` already present for sprint icons; add `zap-circle` only if
   a distinct icon is needed.

2. `building` — for Council Sessions section.
   Path: `<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>`

3. `link` — for Chains & Workstreams section.
   Path: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`

4. `alert-triangle` — for Pending Handoff warning.
   Path: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`

5. `brain` — for Memory Bank section.
   Path: `<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.28-4.56A3 3 0 0 1 5 12c0-.56.15-1.1.42-1.57a2.5 2.5 0 0 1-.42-4.93V5.5A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.28-4.56A3 3 0 0 0 19 12c0-.56-.15-1.1-.42-1.57a2.5 2.5 0 0 0 .42-4.93V5.5A2.5 2.5 0 0 0 14.5 2z"/>`

6. `clipboard-list` — for Phase tree icon (replaces 📋).
   Path: `<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>`

7. `flag` — for Milestone tree icon (replaces 🎯).
   Path: `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>`

8. `monitor` — for "📟 Terminal" button labels (replaces pager emoji).
   Path: `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`

9. `file-text` — for "📄 View plan file" button (replaces file-page emoji).
   Path: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`

10. `copy` — for clipboard copy icon in cmd-hint-item (replaces 📋).
    Path: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`

11. `lightbulb` — for Commands accordion summary (replaces 💡).
    Path: `<line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>`

12. `edit-3` — for files-changed count in OrchestrationView (replaces 📝).
    Path: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`

UPDATE PATTERN for both files:
- In icons.js: add each new name: 'path...' pair to the ICONS object literal
  (before the closing `}`). Keep the `module.exports = { ICONS, icon };` line.
- In icons-client.js: add the exact same pairs to the `export const ICONS = {...}`
  block. Keep the `export function Icon(...)` unchanged.
- Add a comment `// Added in sprint 32.2 — emoji-to-SVG sweep` above the new entries.

DO NOT change any existing icon paths. DO NOT change the Icon function signature.
</action>
<acceptance_criteria>
- `grep -c "building\|alert-triangle\|lightbulb\|copy\|monitor\|file-text\|flag\|clipboard-list\|brain\|edit-3\|link" server/lib/html/icons.js` returns 11 (one match per icon, all present).
- `grep -c "building\|alert-triangle\|lightbulb\|copy\|monitor\|file-text\|flag\|clipboard-list\|brain\|edit-3\|link" server/lib/html/client/icons-client.js` returns same count.
- `node -e "const {ICONS}=require('./server/lib/html/icons.js'); console.log(Object.keys(ICONS).length)"` prints >= 33.  # 22 existing + 11 mandatory new; zap-circle is optional (+1 if added)
- `node --check server/lib/html/icons.js && node --check server/lib/html/client/icons-client.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/icons.js && node --check server/lib/html/client/icons-client.js && node -e "const {ICONS}=require('./server/lib/html/icons.js'); const needed=['building','alert-triangle','lightbulb','copy','monitor','file-text','flag','clipboard-list','brain','edit-3','link']; const missing=needed.filter(n=>!ICONS[n]); if(missing.length){console.error('MISSING:',missing);process.exit(1);} console.log('OK total icons='+Object.keys(ICONS).length);" && echo PASS
</automated>
</verify>
<done>Both icon files parse cleanly; all 11 new icons present in both maps; existing 22 icons untouched.</done>
<evidence>
lines: server/lib/html/icons.js:16-39 (existing ICONS map — 22 icons, new entries append before closing })
lines: server/lib/html/client/icons-client.js:17-40 (parallel ICONS map)
grep: `grep -c "building\|lightbulb\|alert-triangle\|copy\|monitor" server/lib/html/icons.js` → 0 hits before this task (icons do not yet exist — confirmed by reading both files)
</evidence>
</task>

<task id="32.2.2" type="auto">
<title>Sweep shared.js — replace 📋 copy icon and 💡 Commands summary</title>
<read_first>server/lib/html/client/components/shared.js (lines 101-143 — CmdHint and CmdHints)</read_first>
<files>server/lib/html/client/components/shared.js</files>
<action>
Two emoji-as-icon replacements in shared.js:

1. `CmdHint` component (line 124): `<span class="cmd-copy">📋</span>`
   → Replace with: `<${Icon} name="copy" size=${14} cls="cmd-copy"/>`
   Add `import { Icon } from '../icons-client.js';` at the top (after existing
   imports if not already present).

2. `CmdHints` component (line 137): `<summary>💡 Commands</summary>`
   → Replace with: `<summary>${html\`<${Icon} name="lightbulb" size=${14}/>\`} Commands</summary>`
   
   ALSO fix the duplicate `<summary>💡 Commands</summary>` in `DecisionsView.js`
   (line 100): that view has its own inline CmdHints block that bypasses the shared
   component. Change it to use the shared `<${CmdHints}/>` component instead, which
   will get the SVG icon automatically. Read DecisionsView.js first to see the full
   inline block (lines 99-104) — the CMD_HINTS array is already defined, so wiring it
   through `<${CmdHints} hints=${CMD_HINTS}/>` is a two-line change.

NOTE on DecisionsView.js scope: its inline `<details>` block at lines 99-104 is
redundant now that `CmdHints` is a shared component. Replace the whole block with:
`<${CmdHints} hints=${CMD_HINTS}/>` and add import of CmdHints from shared.js
(it already imports CmdHint — just add CmdHints to the destructured import).
</action>
<acceptance_criteria>
- `grep -n "📋\|💡" server/lib/html/client/components/shared.js` returns 0 hits.
- `grep -n "import.*Icon" server/lib/html/client/components/shared.js` shows Icon imported.
- `grep -n "💡" server/lib/html/client/views/DecisionsView.js` returns 0 hits.
- `node --check server/lib/html/client/components/shared.js && node --check server/lib/html/client/views/DecisionsView.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/components/shared.js && node --check server/lib/html/client/views/DecisionsView.js && python3 -c "import subprocess; r = subprocess.run(['grep', '-cP', '\U0001F4CB|\U0001F4A1', 'server/lib/html/client/components/shared.js', 'server/lib/html/client/views/DecisionsView.js'], capture_output=True, text=True); print('emoji remaining:', r.stdout.strip())" && echo PASS
</automated>
</verify>
<done>No 📋 or 💡 in shared.js or DecisionsView.js; both parse cleanly; CmdHints now uses SVG icons.</done>
<evidence>
lines: server/lib/html/client/components/shared.js:124 (📋 in cmd-copy span)
lines: server/lib/html/client/components/shared.js:137 (💡 in summary)
lines: server/lib/html/client/views/DecisionsView.js:100 (inline 💡 Commands summary — duplicate of shared CmdHints)
</evidence>
</task>

<task id="32.2.3" type="auto">
<title>Sweep OverviewView.js — replace 5 section-heading emoji</title>
<read_first>server/lib/html/client/views/OverviewView.js (lines 41-195)</read_first>
<files>server/lib/html/client/views/OverviewView.js</files>
<action>
Five emoji-as-icon in OverviewView.js section headings. Replace each:

1. Line 47: `<h2>⚡ Current Sprint — ${curSprint.id}</h2>`
   → `<h2 class="section-icon"><${Icon} name="zap" size=${16}/> Current Sprint — ${curSprint.id}</h2>`

2. Line 86: `<h2>🏛 Council Sessions</h2>`
   → `<h2 class="section-icon"><${Icon} name="building" size=${16}/> Council Sessions</h2>`

3. Line 110: `<h2>🔗 Chains & Workstreams</h2>`
   → `<h2 class="section-icon"><${Icon} name="link" size=${16}/> Chains &amp; Workstreams</h2>`

4. Line 156: `<h2>⚠ Pending Handoff</h2>`
   → `<h2 class="section-icon"><${Icon} name="alert-triangle" size=${16}/> Pending Handoff</h2>`

5. Line 178: `<h2>🧠 Memory Bank</h2>`
   → `<h2 class="section-icon"><${Icon} name="brain" size=${16}/> Memory Bank</h2>`

Add `import { Icon } from '../icons-client.js';` at the top (after existing imports).

NOTE on `class="section-icon"` on `<h2>`: this makes the h2 a flex row with gap so
the icon and label align. The CSS rule for this was added in sprint 32.1 task 32.1.2.
</action>
<acceptance_criteria>
- `grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}🏛🧠🔗]" server/lib/html/client/views/OverviewView.js` returns 0 hits.
- `grep -n "import.*Icon" server/lib/html/client/views/OverviewView.js` shows Icon imported.
- `node --check server/lib/html/client/views/OverviewView.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/OverviewView.js && grep -cP "\xf0\x9f|\xe2\x9b\x8f|\xe2\x9a\xa1" server/lib/html/client/views/OverviewView.js | xargs -I{} sh -c '[ "{}" = "0" ] && echo OK || echo "FAIL: emoji remain"'
</automated>
</verify>
<done>All 5 section-heading emoji replaced with SVG; file parses cleanly.</done>
<evidence>
lines: server/lib/html/client/views/OverviewView.js:47,86,110,156,178 (confirmed via grep above)
</evidence>
</task>

<task id="32.2.4" type="auto">
<title>Sweep RoadmapView.js — replace 3 tree-icon emoji (📋 ⚡ 🎯)</title>
<read_first>server/lib/html/client/views/RoadmapView.js (lines 46-62 TaskLeaf, lines 83-108 PhaseNode, lines 110-140 SprintNode, lines 188-213 RoadmapView root)</read_first>
<files>server/lib/html/client/views/RoadmapView.js</files>
<action>
Three emoji-as-icon in RoadmapView.js, all inside `<span class="tree-icon">`:

1. Line 87 (PhaseNode): `<span class="tree-icon">📋</span>`
   → `<span class="tree-icon"><${Icon} name="clipboard-list" size=${14}/></span>`

2. Line 124 (SprintNode): `<span class="tree-icon">⚡</span>`
   → `<span class="tree-icon"><${Icon} name="zap" size=${14}/></span>`

3. Line 200 (RoadmapView root — milestone row): `<span class="tree-icon">🎯</span>`
   → `<span class="tree-icon"><${Icon} name="flag" size=${14}/></span>`

KEEP the typographic characters — these are NOT emoji-as-icon:
- Line 35, 85, 122, 199: `${open ? '▼' : '▶'}` (tree chevrons — typographic, keep)
- Line 52: `${done ? '✓' : '○'}` in TaskLeaf (typographic checkmark, keep)

Add `import { Icon } from '../icons-client.js';` after existing imports.

NOTE: the TreeNode component (lines 24-44) uses `icon` prop for its tree-icon span —
that prop is passed as a string emoji by callers in this file. Since PhaseNode and
SprintNode use their own inline tree-icon spans (not TreeNode), the TreeNode
component is NOT used in the emoji sites above — confirm this before editing.
TreeNode is only used if called from outside this file; if it receives an icon prop
that is currently an emoji string, that is a separate clean-up (not in scope for this
sprint — log a TODO comment).
</action>
<acceptance_criteria>
- `grep -n "📋\|⚡\|🎯" server/lib/html/client/views/RoadmapView.js` returns 0 hits.
- `grep -n "▼\|▶\|✓\|○" server/lib/html/client/views/RoadmapView.js` returns hits (typographic chars preserved).
- `node --check server/lib/html/client/views/RoadmapView.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/RoadmapView.js && python3 -c "
data = open('server/lib/html/client/views/RoadmapView.js', encoding='utf-8').read()
icons_gone = '\U0001F4CB' not in data and '⚡' not in data and '\U0001F3AF' not in data
typo_kept  = '▼' in data or '▶' in data
print('OK' if icons_gone and typo_kept else 'FAIL icons_gone=%s typo_kept=%s' % (icons_gone, typo_kept))
" && echo PASS
</automated>
</verify>
<done>Three tree-icon emoji replaced with SVG; typographic chevrons and checkmarks preserved; file parses cleanly.</done>
<evidence>
lines: server/lib/html/client/views/RoadmapView.js:87 (📋 in PhaseNode)
lines: server/lib/html/client/views/RoadmapView.js:124 (⚡ in SprintNode)
lines: server/lib/html/client/views/RoadmapView.js:200 (🎯 in milestone root)
</evidence>
</task>

<task id="32.2.5" type="auto">
<title>Sweep MilestonesView, PhasesView, SprintsView — entity-title and button emoji</title>
<read_first>
server/lib/html/client/views/MilestonesView.js (lines 78-134)
server/lib/html/client/views/PhasesView.js (lines 53-117)
server/lib/html/client/views/SprintsView.js (lines 28-113)
</read_first>
<files>
server/lib/html/client/views/MilestonesView.js
server/lib/html/client/views/PhasesView.js
server/lib/html/client/views/SprintsView.js
</files>
<action>
Replace emoji in these three view files:

-- MilestonesView.js --
Line 89: `<div class="entity-title">🎯 ${ms}</div>`
→ `<div class="entity-title"><${Icon} name="flag" size=${18}/> ${ms}</div>`

Line 122: `<div class="item-title">🎯 ${ms}</div>`
→ `<div class="item-title"><${Icon} name="flag" size=${18}/> ${ms}</div>`

Add `import { Icon } from '../icons-client.js';` after existing imports.

-- PhasesView.js --
Line 79 (PhaseDetail entity-title): `📋 Phase ${p.id} — ${p.name}`
→ `<${Icon} name="clipboard-list" size=${18}/> Phase ${p.id} — ${p.name}`
(The containing div already has class="entity-title" — just replace the emoji
string at the start of that text node.)

Line 95 (Terminal button): `<button class="term-run-btn outline" onClick=${handleTerm}>📟 Terminal</button>`
→ `<button class="term-run-btn outline" onClick=${handleTerm}><${Icon} name="monitor" size=${14}/> Terminal</button>`

Line 96 (View plan button): `<button class="back-btn" onClick=${handleViewPlan}>📄 View plan file →</button>`
→ `<button class="back-btn" onClick=${handleViewPlan}><${Icon} name="file-text" size=${14}/> View plan file →</button>`

Add `import { Icon } from '../icons-client.js';` after existing imports.

-- SprintsView.js --
Line 63 (SprintDetail entity-title): `⚡ Sprint ${s.id}`
→ `<${Icon} name="zap" size=${18}/> Sprint ${s.id}`
(The containing div has class="entity-title" — wrap in a span if needed for flex
alignment, or apply class="section-icon" to entity-title itself.)

Line 84 (Terminal button): `<button class="term-run-btn outline" onClick=${handleTerm}>📟 Terminal</button>`
→ `<button class="term-run-btn outline" onClick=${handleTerm}><${Icon} name="monitor" size=${14}/> Terminal</button>`

KEEP (typographic, NOT icon):
- Line 104: `✓ ${t.acceptance}` — typographic checkmark, keep as-is.

Add `import { Icon } from '../icons-client.js';` after existing imports.
</action>
<acceptance_criteria>
- `grep -n "🎯\|📋\|📟\|📄\|⚡" server/lib/html/client/views/MilestonesView.js server/lib/html/client/views/PhasesView.js server/lib/html/client/views/SprintsView.js` returns 0 hits.
- `node --check server/lib/html/client/views/MilestonesView.js && node --check server/lib/html/client/views/PhasesView.js && node --check server/lib/html/client/views/SprintsView.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && for f in server/lib/html/client/views/MilestonesView.js server/lib/html/client/views/PhasesView.js server/lib/html/client/views/SprintsView.js; do node --check "$f" || { echo "SYNTAX FAIL $f"; exit 1; }; done && python3 -c "
import sys
files = ['server/lib/html/client/views/MilestonesView.js','server/lib/html/client/views/PhasesView.js','server/lib/html/client/views/SprintsView.js']
bad = [chr(0x1F3AF), chr(0x1F4CB), chr(0x1F4DF), chr(0x1F4C4), chr(0x26A1)]
for f in files:
    d = open(f, encoding='utf-8').read()
    found = [c for c in bad if c in d]
    if found: sys.exit('FAIL ' + f + ' still has emoji: ' + str(found))
print('OK')
" && echo PASS
</automated>
</verify>
<done>All target emoji replaced in all three view files; typographic checkmarks retained; all files parse cleanly.</done>
<evidence>
lines: server/lib/html/client/views/MilestonesView.js:89,122 (🎯 confirmed via grep above)
lines: server/lib/html/client/views/PhasesView.js:79,95,96 (📋 📟 📄 confirmed via grep above)
lines: server/lib/html/client/views/SprintsView.js:63,84 (⚡ 📟 confirmed via grep above)
</evidence>
</task>

<task id="32.2.6" type="auto">
<title>Sweep OrchestrationView.js — view title, card meta, and terminal button emoji</title>
<read_first>server/lib/html/client/views/OrchestrationView.js (full — 105 lines)</read_first>
<files>server/lib/html/client/views/OrchestrationView.js</files>
<action>
Five emoji-as-icon in OrchestrationView.js:

1. Line 24 (OrchCard badge — waiting text): `const badge = waiting ? '⏳ waiting for input' : s.status;`
   → `const badge = waiting ? 'waiting for input' : s.status;`
   The waiting state is already communicated by the badge text and the `.orch-waiting`
   class on the card. Remove the hourglass emoji from the string — it was decorative
   text, not a standalone icon. (The waiting badge will be displayed in the orch-card-badge
   span which already gets styled differently for waiting state via CSS class.)
   ALTERNATIVE: if the visual distinction is important, render the badge as:
   `html\`<span class="orch-card-badge">${waiting ? html\`<${Icon} name="hourglass" size=${12}/> waiting for input\` : s.status}</span>\``
   Use the hourglass icon (already exists in icons.js). Prefer this approach.

2. Line 47: `${' · '}📝 ${s.filesChanged || 0} file${s.filesChanged === 1 ? '' : 's'}`
   → `${' · '}<${Icon} name="edit-3" size=${12}/> ${s.filesChanged || 0} file${s.filesChanged === 1 ? '' : 's'}`

3. Line 48: `${' · '}👁 ${s.clients || 0}`
   → `${' · '}<${Icon} name="eye" size=${12}/> ${s.clients || 0}`
   (`eye` already exists in icons.js — no new icon needed here.)

4. Line 53 (Terminal button): `📟 Terminal`
   → `<${Icon} name="monitor" size=${14}/> Terminal`

5. Line 86 (view-title): `<div class="view-title">⚡ Orchestration</div>`
   → `<div class="view-title section-icon"><${Icon} name="activity" size=${18}/> Orchestration</div>`
   (`activity` already exists in icons.js — the activity/waveform icon fits the
   orchestration context better than the zap.)

Add `import { Icon } from '../icons-client.js';` after the existing imports.

6. Line 46 (stopwatch elapsed text): `⏱ ${orchElapsed(s.startTime)}`
   The ⏱ (U+23F1 STOPWATCH) at line 46 is a UI label emoji that also needs replacement.
   → `<${Icon} name="clock" size=${12}/> ${orchElapsed(s.startTime)}`
   (`clock` already exists in icons.js — no new icon needed.)
</action>
<acceptance_criteria>
- `grep -n "📝\|👁\|📟\|⚡\|⏳" server/lib/html/client/views/OrchestrationView.js` returns 0 hits.
- `python3 -c "import sys; d=open('server/lib/html/client/views/OrchestrationView.js', encoding='utf-8').read(); sys.exit(0 if chr(0x23F1) not in d else 1)"` exits 0 (stopwatch ⏱ replaced).
- `node --check server/lib/html/client/views/OrchestrationView.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/OrchestrationView.js && python3 -c "
import sys
d = open('server/lib/html/client/views/OrchestrationView.js', encoding='utf-8').read()
bad = [chr(0x1F4DD), chr(0x1F441), chr(0x1F4DF), chr(0x26A1), chr(0x23F3), chr(0x23F1)]
found = [c for c in bad if c in d]
print('OK' if not found else 'FAIL emoji remain: ' + str(found))
" && echo PASS
</automated>
</verify>
<done>All 6 emoji-as-icon replaced in OrchestrationView.js (⏳ line 24, ⏱ line 46, 📝 line 47, 👁 line 48, 📟 line 53, ⚡ line 86); file parses cleanly.</done>
<evidence>
lines: server/lib/html/client/views/OrchestrationView.js:24,46,47,48,53,86 (confirmed via grep)
grep: ⏱ at line 46 (U+23F1 STOPWATCH) confirmed by python3 unicode scan — not in original plan, added during check
</evidence>
</task>

<task id="32.2.7" type="checkpoint:human-verify">
<title>In-browser regression sweep — full icon sweep verification</title>
<read_first>this sprint's must_haves block</read_first>
<files></files>
<action>
Start the dashboard (`node server/dashboard.js`) and verify at http://localhost:7717:

1. ZERO console errors on any view. Open DevTools → Console before navigating.
2. Overview view: section headings "Current Sprint", "Council Sessions",
   "Chains & Workstreams", "Pending Handoff", "Memory Bank" each show a small SVG
   icon to the left of the text — NOT an emoji glyph.
3. Roadmap view: phase rows show the clipboard-list SVG icon; sprint rows show the
   zap icon; milestone root shows the flag icon. Tree chevrons (▼ ▶) are still
   typographic — this is CORRECT.
4. Milestones view: entity-title shows the flag icon, not 🎯.
5. Phases view: phase detail header shows clipboard-list icon; Terminal and
   "View plan file" buttons show monitor/file-text SVG icons.
6. Sprints view: sprint detail header shows zap icon; Terminal button shows monitor
   icon.
7. Orchestration view: view title shows activity/waveform icon; card meta shows
   edit-3 icon (files) and eye icon (clients); Terminal button shows monitor icon;
   waiting sessions show hourglass icon.
8. Command hints accordions (any view): summary line shows lightbulb SVG, not 💡.
   Copy icon in each cmd row shows copy SVG, not 📋.
9. LIGHT THEME: toggle to light. All SVG icons remain visible (they use
   stroke="currentColor", so they follow the text color token). No emoji stranded
   in a wrong color.
10. Kanban, Tasks, Memory, Decisions, Files, Agents views: navigate to each and
    confirm no console errors and no broken layout.

Report PASS/FAIL per item. Any FAIL must be fixed before declaring this sprint done.
</action>
<done>All 10 checks PASS; no console errors; all emoji-as-icon replaced with visible SVG icons in both themes.</done>
<evidence>
creates: no files — human checkpoint; verifies browser rendering of all 9 files modified in sprint 32.2
grep: tasks 32.2.2–32.2.6 evidence blocks cite the specific line numbers and emoji replacements being visually confirmed here
</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots without thrown errors on :7717.
- `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo BAD $f; done` prints no BAD lines.
- `python3 -c "import glob; bad=[chr(0x1F300+i) for i in range(3000)]+[chr(0x2600+i) for i in range(0x800)]; files=glob.glob('server/lib/html/client/**/*.js',recursive=True); hits=[(f,c) for f in files for c in bad if c in open(f,encoding='utf-8').read() and c not in '✕✓○✗▶▼▲◑▶■❯⎘⛶⟳⊞↑↺←→']; print('Emoji remaining:',hits[:10] if hits else 'NONE')"` prints NONE or only the intentional typographic chars.
</verification>

<success_criteria>
- All 11 new icons present in both icons.js and icons-client.js; maps are in sync.
- Emoji-as-icon count in views/ and components/: 0 (grep-verified).
- Typographic characters (✕ ✓ ○ ✗ ▶ ■ ❯ ⎘ ⛶ ⟳ ⊞ ◑ ↺ ↑ ←) preserved where they were typographic labels.
- All 12 views render without console errors in both light and dark themes.
</success_criteria>

<output>
Create `.planning/phases/32-dashboard-theming-design-tokens-and-emoji-to-svg-icon-sweep/32-2-SUMMARY.md`
</output>
