---
phase: 32-dashboard-theming-design-tokens-and-emoji-to-svg-icon-sweep
sprint: 32.3
plan_number: 3
type: execute
wave: 3
depends_on: [32.2]
files_modified:
  - server/lib/html/client/components/App.js
  - server/lib/html/client/components/Topbar.js
  - server/lib/html/client/components/OrchPanel.js
autonomous: true
requirements: [phase-32-goal]
must_haves:
  truths:
    - "Topbar brand logo uses an SVG icon (not 🕌 emoji); theme toggle uses SVG sun/moon icons (not emoji labels)."
    - "OrchPanel close buttons use SVG x icon (not ✕ char); file-ops 'eye' op uses SVG eye icon (not 👁 emoji)."
    - "App.js theme state stores 'light'/'dark' strings, not emoji — themeLabel is removed; Topbar derives its icon from the theme prop."
    - "node server/dashboard.js boots clean; all 12 views render without console errors."
  artifacts:
    - "server/lib/html/client/components/App.js — themeLabel state replaced with SVG icon rendering in Topbar."
    - "server/lib/html/client/components/Topbar.js — brand div uses SVG icon; theme button uses SVG sun/moon."
    - "server/lib/html/client/components/OrchPanel.js — close buttons use SVG x; file-ops eye uses SVG."
  key_links:
    - "App.js:87-101 owns themeLabel state ('🌙' / '◑') passed as prop to Topbar — the emoji live here, not in Topbar."
    - "Topbar.js:30 renders the brand icon div with 🕌 — this is the only emoji in Topbar."
    - "OrchPanel.js:212,236 render ✕ close buttons; line 262 renders 👁 in file-ops opLabel string."
    - "icons-client.js already has: x, eye, minimize, maximize — use these; add moon and sun icons in task 32.3.1."
---

<objective>
Complete the emoji-to-SVG sweep for the three remaining component files:
App.js (theme toggle state), Topbar.js (brand logo, theme button icon), and
OrchPanel.js (close buttons, file-ops eye icon). Also add `moon` and `sun` icons to
the icon set (needed for the theme toggle buttons).

Purpose: After this sprint, zero emoji are used as UI icons anywhere in the client.
The phase 32 acceptance criteria are fully met.

Output: All three component files parse cleanly; grep confirms zero emoji-as-icon
in the entire client/ tree; final in-browser regression sweep passes all views.
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

<task id="32.3.1" type="auto">
<title>Add moon and sun icons; sweep Topbar.js brand logo and theme button</title>
<read_first>
server/lib/html/client/components/Topbar.js (full — 51 lines)
server/lib/html/icons.js (lines 16-39 — current ICONS map)
server/lib/html/client/icons-client.js (lines 17-40 — parallel ICONS map)
</read_first>
<files>
server/lib/html/icons.js
server/lib/html/client/icons-client.js
server/lib/html/client/components/Topbar.js
</files>
<action>
Step 1 — Add icons to both icon files (same pattern as sprint 32.2 task 32.2.1):

Add to BOTH icons.js and icons-client.js:

`moon`: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`
`sun`:  `<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/>`
`mosque` (brand logo): `<path d="M12 2c-1.1 0-2 .9-2 2v1a4 4 0 0 0-4 4v1H4a1 1 0 0 0 0 2h1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7h1a1 1 0 0 0 0-2h-2V9a4 4 0 0 0-4-4V4c0-1.1-.9-2-2-2zm0 2.5a.5.5 0 0 1 .5.5v.5h-1V5a.5.5 0 0 1 .5-.5z"/>`

NOTE on mosque: a hand-drawn path for a simplified mosque silhouette is complex to
get right without tooling. ALTERNATIVE: use the existing `home` icon with a pointed
arch treatment, or use a simple building icon. Given the constraint of no build step
and no external dependencies, use the `building` icon already added in sprint 32.2.
So: do NOT add `mosque` as a new icon — instead, in Topbar.js use `building` for the
brand logo. This avoids a poorly-rendered SVG for a complex glyph.

Step 2 — Update Topbar.js:

Line 15: after `import { html } from '../preact.js';` add:
`import { Icon } from '../icons-client.js';`

Line 30: the brand div:
`<div class="icon">🕌</div>`
→ `<div class="icon"><${Icon} name="building" size=${16} cls="brand-icon"/></div>`

Line 12 (jsdoc comment): update the themeLabel comment — it now receives 'dark' or
'light' string, not emoji. The comment says `themeLabel {string} — label for the
theme button (◑ / 🌙 / ☀️)`. Update to:
`themeLabel {string} — 'light' or 'dark' — controls which icon the theme button shows`

Line 41 (theme button): `${themeLabel || '◑'}` 
→ Replace with icon-based rendering:
`<${Icon} name=${themeLabel === 'light' ? 'moon' : 'sun'} size=${14}/>`
This means: when the current theme IS light (and clicking will toggle TO dark), show
the moon icon (indicating "switch to dark"). When the theme IS dark (clicking toggles
to light), show the sun icon. This matches common UX conventions.
</action>
<acceptance_criteria>
- `grep -n "🕌\|🌙\|☀️\|◑" server/lib/html/client/components/Topbar.js` returns 0 hits.
- `grep -n "import.*Icon" server/lib/html/client/components/Topbar.js` shows Icon imported.
- `node -e "const {ICONS}=require('./server/lib/html/icons.js'); ['moon','sun'].forEach(n=>{ if(!ICONS[n]) throw new Error('missing: '+n); }); console.log('OK');"` prints OK.
- `node --check server/lib/html/client/components/Topbar.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/icons.js && node --check server/lib/html/client/icons-client.js && node --check server/lib/html/client/components/Topbar.js && node -e "const {ICONS}=require('./server/lib/html/icons.js');['moon','sun'].forEach(n=>{if(!ICONS[n])throw new Error('missing:'+n);}); console.log('icons OK total='+Object.keys(ICONS).length);" && echo PASS
</automated>
</verify>
<done>moon/sun icons added to both icon files; Topbar brand logo and theme button use SVG icons; no emoji remain in Topbar.js.</done>
<evidence>
lines: server/lib/html/client/components/Topbar.js:30 (🕌 brand icon div)
lines: server/lib/html/client/components/Topbar.js:41 (themeLabel emoji rendering)
grep: `grep -c "moon\|sun" server/lib/html/icons.js` → 0 before this task (confirmed by reading icons.js)
</evidence>
</task>

<task id="32.3.2" type="auto">
<title>Update App.js — replace emoji themeLabel state with 'light'/'dark' string</title>
<read_first>server/lib/html/client/components/App.js (lines 86-102 — theme state and toggleTheme)</read_first>
<files>server/lib/html/client/components/App.js</files>
<action>
App.js stores the theme toggle label as an emoji string ('🌙' or '◑') in useState,
then passes it as `themeLabel` to Topbar. Since Topbar now renders an SVG icon
based on 'light'/'dark', change the state to store the theme name instead:

Line 87-93 — change:
```js
const [themeLabel, setThemeLabel] = useState(() => {
  const saved = localStorage.getItem('majlis-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    return '🌙';
  }
  return '◑';
});
```
→
```js
const [theme, setTheme] = useState(() => {
  const saved = localStorage.getItem('majlis-theme') || 'dark';
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  return saved;
});
```

Line 96-102 — change:
```js
const toggleTheme = useCallback(() => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : next);
  localStorage.setItem('majlis-theme', next);
  setThemeLabel(next === 'light' ? '🌙' : '☀️');
}, []);
```
→
```js
const toggleTheme = useCallback(() => {
  const next = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : next);
  localStorage.setItem('majlis-theme', next);
  setTheme(next);
}, [theme]);
```

Line 195-201 (Topbar props): change `themeLabel=${themeLabel}` → `themeLabel=${theme}`

These are the ONLY changes needed in App.js. All other logic remains identical.
</action>
<acceptance_criteria>
- `grep -n "🌙\|☀️\|◑\|themeLabel" server/lib/html/client/components/App.js` returns 0 hits.
- `grep -n "setTheme\|theme.*light\|theme.*dark" server/lib/html/client/components/App.js` shows the new state logic.
- `node --check server/lib/html/client/components/App.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/components/App.js && python3 -c "
d = open('server/lib/html/client/components/App.js', encoding='utf-8').read()
emoji_gone = chr(0x1F319) not in d and chr(0x2600) not in d and '◑' not in d
has_settheme = 'setTheme' in d
print('OK' if emoji_gone and has_settheme else 'FAIL emoji_gone=%s has_settheme=%s' % (emoji_gone, has_settheme))
" && echo PASS
</automated>
</verify>
<done>App.js uses 'light'/'dark' string state; no emoji in themeLabel; file parses cleanly; toggleTheme logic correct.</done>
<evidence>
lines: server/lib/html/client/components/App.js:87-101 (themeLabel state with emoji '🌙'/'◑'/'☀️' — confirmed by reading)
</evidence>
</task>

<task id="32.3.3" type="auto">
<title>Sweep OrchPanel.js — close buttons and file-ops eye icon</title>
<read_first>server/lib/html/client/components/OrchPanel.js (lines 205-270)</read_first>
<files>server/lib/html/client/components/OrchPanel.js</files>
<action>
Three emoji/symbol-as-icon replacements in OrchPanel.js:

1. Line 212 — orch-panel-header close button:
   `<button class="orch-panel-close" onClick=${handleClose} title="Close">✕</button>`
   → `<button class="orch-panel-close" onClick=${handleClose} title="Close" aria-label="Close panel"><${Icon} name="x" size=${14}/></button>`
   (`x` already exists in icons.js — no new icon needed.)

2. Line 236 — tab close button:
   `<button class="orch-tab-close" onClick=${e => handleTabClose(e, sid)} title="Close">✕</button>`
   → `<button class="orch-tab-close" onClick=${e => handleTabClose(e, sid)} title="Close" aria-label="Close tab"><${Icon} name="x" size=${12}/></button>`

3. Line 262 — file-ops opLabel for read/view operations:
   `const opLabel = fo.op === 'write' ? '✎' : fo.op === 'bash' ? '$' : '👁';`
   → `const opLabel = fo.op === 'write' ? '✎' : fo.op === 'bash' ? '$' : null;`
   And in the render (line 265):
   `<span class=${'op-icon ' + opClass}>${opLabel}</span>`
   → `<span class=${'op-icon ' + opClass}>${fo.op !== 'write' && fo.op !== 'bash' ? html\`<${Icon} name="eye" size=${12}/>\` : opLabel}</span>`
   (`eye` already exists in icons.js.)

KEEP the following — they are typographic protocol markers in SSE line classification
(lines 135-138), NOT standalone UI icons. They are substrings of agent-emitted text:
   - `'⚙'` `'⚠'` `'✗'` `'✅'` `'▶'` `'◉'` `'■'` in `l.startsWith(...)` checks
   - `'✅ Done'` `'■ Stopped'` in appendLine calls (agent output text, not dashboard UI)

Add `import { Icon } from '../icons-client.js';` after existing imports if not
already present from a previous task (check first).
</action>
<acceptance_criteria>
- `grep -n "👁" server/lib/html/client/components/OrchPanel.js` returns 0 hits.
- `grep -c "✕" server/lib/html/client/components/OrchPanel.js` returns 0 (both close buttons replaced).
- `grep -n "✅\|✗\|⚙\|◉\|■" server/lib/html/client/components/OrchPanel.js` returns hits (SSE classifiers preserved — CORRECT).
- `node --check server/lib/html/client/components/OrchPanel.js && echo OK`
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/components/OrchPanel.js && python3 -c "
d = open('server/lib/html/client/components/OrchPanel.js', encoding='utf-8').read()
eye_gone   = chr(0x1F441) not in d
x_gone     = '✕' not in d
sse_kept   = '✅' in d and '✕' in d or '✅' in d
# Actually ✅ is U+2705, ✕ is U+2715, ✗ is U+2717
eye_gone2  = '\U0001F441' not in d
sse2_kept  = '✅' in d  # ✅ should still be in SSE classifiers
print('eye_gone=%s x_gone=%s sse_kept=%s' % (eye_gone2, '✕' not in d, sse2_kept))
print('OK' if eye_gone2 and sse2_kept else 'FAIL')
" && echo PASS
</automated>
</verify>
<done>Two close buttons use SVG x icon; file-ops eye uses SVG eye icon; SSE line classifiers (✅ ✗ ⚙ etc.) preserved unchanged; file parses cleanly.</done>
<evidence>
lines: server/lib/html/client/components/OrchPanel.js:212 (✕ close button)
lines: server/lib/html/client/components/OrchPanel.js:236 (✕ tab close button)
lines: server/lib/html/client/components/OrchPanel.js:262 (👁 in opLabel string)
lines: server/lib/html/client/components/OrchPanel.js:135-145 (SSE classifiers — typographic, keep)
</evidence>
</task>

<task id="32.3.4" type="auto">
<title>Final grep sweep and commit-ready check across all client files</title>
<read_first>none — this task runs grep checks only</read_first>
<files></files>
<action>
Run a full sweep to confirm zero remaining emoji-as-icon across the entire
server/lib/html/client/ tree. The allowed typographic exceptions are:

ALLOWED (typographic, NOT icons):
  ✕ ✓ ○ ✗ ▶ ▼ ▲ ■ ❯ ⎘ ⛶ ⟳ ⊞ ◑ ↺ ↑ ← → · — ✅ (in SSE classifier strings)
  $  (bash prompt in SSE opLabel — plain ASCII)

For any remaining emoji found:
  - If it is in agent-emitted SSE output strings (OrchPanel.js lines 135-145): ALLOWED, document.
  - If it is in a comment or JSDoc string: ALLOWED, document.
  - If it is rendered as visible UI: BLOCK and fix.

Run these verification commands and document results in the task output:
1. `grep -rn "📋\|💡\|🕌\|🌙\|☀️\|🎯\|📋\|⚡\|🏛\|🧠\|🔗\|📟\|📄\|📝\|⏳" server/lib/html/client/` — must return 0 hits.
2. `grep -rn "👁" server/lib/html/client/` — must return 0 hits.
3. `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo "SYNTAX: $f"; done` — must print no SYNTAX lines.
4. `node -e "require('./server/lib/html/icons.js')" && echo "icons.js OK"` — must print OK.
5. `node -e "const {ICONS}=require('./server/lib/html/icons.js'); console.log('Total icons:', Object.keys(ICONS).length);"` — must be >= 35 (22 original + 11 mandatory from sprint 32.2 + 2 from sprint 32.3; +1 if zap-circle also added).

If any check fails: fix the remaining instance before proceeding to the human verify
task. This task has no files to modify unless a stray emoji is found.
</action>
<acceptance_criteria>
- All 5 commands above complete without failures.
- grep for known emoji-as-icon returns 0 hits across client/.
- All client/*.js files pass node --check.
- icons.js total icon count >= 35.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && grep -rl "$(printf '\xf0\x9f')" server/lib/html/client/ | grep -v ".snap" | while read f; do echo "WARNING: possible emoji in $f"; done; for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo "SYNTAX: $f"; done; node -e "const {ICONS}=require('./server/lib/html/icons.js'); const n=Object.keys(ICONS).length; console.log('icons total='+n); if(n<36)process.exit(1);" && echo SWEEP_PASS
</automated>
</verify>
<done>Zero emoji-as-icon in client/ tree; all JS files parse cleanly; icon count >= 35.</done>
<evidence>
creates: no new files — audit-only task
grep: full tree sweep described above — results documented during execution
</evidence>
</task>

<task id="32.3.5" type="checkpoint:human-verify">
<title>Final regression sweep — phase 32 acceptance gate</title>
<read_first>this sprint's must_haves block; ROADMAP.md phase 32 acceptance criteria</read_first>
<files></files>
<action>
Start the dashboard (`node server/dashboard.js`) and verify at http://localhost:7717.
This is the phase 32 acceptance gate — every item must PASS.

THEME SYSTEM:
1. Dark theme (default): sidebar, topbar, all cards render in dark palette.
2. Click theme toggle — icon changes from sun (current: dark mode) to moon (switched to
   light mode); all surfaces flip to light.
3. Toggle back — returns to dark. Reload page — theme persists (localStorage).
4. In light mode: all SVG icons remain visible (they use currentColor, inherit text color).

ICON SWEEP:
5. Overview: section headings show SVG icons (zap, building, link, alert-triangle, brain).
6. Roadmap: phase rows show clipboard-list; sprint rows show zap; milestone root shows flag.
7. Milestones: entity-title shows flag icon.
8. Phases (detail): entity-title shows clipboard-list; Terminal button shows monitor icon;
   View plan file button shows file-text icon.
9. Sprints (detail): entity-title shows zap; Terminal button shows monitor icon.
10. Orchestration: view-title shows activity icon; card meta shows edit-3 (files) and eye
    (clients); waiting sessions show hourglass; Terminal button shows monitor.
11. Command hints (any view): summary shows lightbulb; copy icon in each row shows copy SVG.
12. OrchPanel (open by running any story card, or manually trigger via the orchestration
    view Terminal button): close button (header + tab) shows SVG x icon, not ✕ char.
13. Topbar: brand logo shows building SVG; theme toggle button shows sun or moon SVG.

NO REGRESSIONS:
14. All 12 views (overview, roadmap, milestones, phases, sprints, tasks, kanban, files,
    agents, decisions, memory, orchestration) navigate and render without console errors.
15. Kanban drag-and-drop still works (drag a card between columns).
16. Filter inputs in Roadmap, Phases, Sprints, Tasks, Decisions all work.
17. OrchPanel SSE classification still works: typographic chars ✅ ✗ ⚙ etc. still appear
    in terminal output lines (they come from the agent, not the dashboard — this is
    unaffected if OrchPanel.js was changed correctly).

Report PASS/FAIL per numbered item. A FAIL on any of items 1-13 is a regression that
must be fixed. A FAIL on 14-17 is a blocker that must be fixed. Phase 32 is DONE only
when all 17 items PASS.
</action>
<done>All 17 checks PASS; phase 32 acceptance criteria met; no console errors in any view or theme.</done>
<evidence>
creates: no files — phase acceptance gate; verifies runtime state of all files modified across sprints 32.1, 32.2, and 32.3
grep: tasks 32.3.1–32.3.4 evidence blocks cite specific line numbers and icon replacements being acceptance-tested here
</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots without thrown errors on :7717.
- `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo BAD $f; done` prints no BAD lines.
- `node -e "const {ICONS}=require('./server/lib/html/icons.js'); console.log(Object.keys(ICONS).length)"` prints >= 35.
- Full emoji grep: `grep -rn "$(printf '\xf0\x9f\x9a\x80')" server/lib/html/client/` returns 0 hits for any multi-byte emoji codepoint used as a UI icon.
</verification>

<success_criteria>
- Phase 32 ROADMAP acceptance criteria all met:
  1. All component styling reads from CSS custom properties — no hardcoded literals in rule bodies.
  2. Zero emoji used as UI icons — every icon is an inline SVG from icons.js.
  3. Light + dark themes both render correctly from the token layer.
  4. No visual regressions; node server/dashboard.js starts clean on :7717.
- icons.js and icons-client.js contain >= 35 icons and are in sync.
- App.js theme state is a clean 'light'/'dark' string — no emoji in component state.
</success_criteria>

<output>
Create `.planning/phases/32-dashboard-theming-design-tokens-and-emoji-to-svg-icon-sweep/32-3-SUMMARY.md`
</output>
