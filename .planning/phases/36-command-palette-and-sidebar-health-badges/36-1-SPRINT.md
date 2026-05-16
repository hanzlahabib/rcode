---
phase: 36-command-palette-and-sidebar-health-badges
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified:
  - server/lib/html/client/orchestrator.js
  - server/lib/html/client/icons-client.js
  - server/lib/html/icons.js
  - server/lib/html/client/components/CommandPalette.js
  - server/lib/html/client/components/App.js
  - server/lib/html/css.js
requirements:
  - DSH-4
must_haves:
  truths:
    - User presses Cmd+K (or Ctrl+K) anywhere in the dashboard and a command palette overlay opens
    - User types in the palette search box and the visible command list narrows to label/cmd substring matches
    - Commands in the palette appear under category group headings
    - Selecting a command (Enter or click) closes the palette and launches it through runCommandFromUI
    - Pressing Escape closes the palette without running anything
  artifacts:
    - server/lib/html/client/components/CommandPalette.js exists and exports CommandPalette
    - ALLOWED_COMMANDS entries each carry a category field
    - icons-client.js and icons.js both contain a 'search' icon entry
  key_links:
    - CommandPalette imports ALLOWED_COMMANDS and runCommandFromUI from orchestrator.js — no second command list
    - App.js renders CommandPalette and owns the keydown listener that toggles it
---

<objective>
Add an Archon-style Cmd+K command palette to the Majlis dashboard: a keyboard-triggered
overlay that searches the allowlisted rihal commands, groups them by category, and runs a
selected command through the existing orchestrator path.
Purpose: DSH-4 — find and run any rihal command without hunting through the UI.
Output: a new CommandPalette Preact component, a category field on ALLOWED_COMMANDS, a
search icon, App-level keyboard wiring, and palette CSS.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<constraints>
- Client is Preact via htm + ESM CDN, no build step. No React.FC. No new dependencies.
- No inline `style` attribute — use className + css.js classes.
- Command execution goes through the EXISTING runCommandFromUI in orchestrator.js. Do not
  add a new exec surface and do not touch server/dashboard.js.
- The palette offers ONLY ALLOWED_COMMANDS — no second hardcoded list.
</constraints>

<tasks>

<task id="36-1.1" type="auto">
<title>Add category field to ALLOWED_COMMANDS and a search icon</title>
<read_first>
- server/lib/html/client/orchestrator.js (ALLOWED_COMMANDS at lines 230-243)
- server/lib/html/client/icons-client.js (ICONS map, lines 17-57)
- server/lib/html/icons.js (CJS counterpart of the ICONS map)
</read_first>
<files>
server/lib/html/client/orchestrator.js
server/lib/html/client/icons-client.js
server/lib/html/icons.js
</files>
<interfaces>
export const ALLOWED_COMMANDS = [ { cmd, label }, ... ];  // 12 entries, orchestrator.js:230-243
export const ICONS = { name: '<svg inner markup>' };       // icons-client.js:17
</interfaces>
<action>
1. In orchestrator.js ALLOWED_COMMANDS (lines 230-243), add a `category` string to every
   one of the 12 entries. Keep `cmd` and `label` unchanged. Use exactly these categories:
   - `'Project'`   for: /rihal-init, /rihal-config
   - `'Status'`    for: /rihal-status, /rihal-progress, /rihal-sprint-status, /rihal-stats
   - `'Planning'`  for: /rihal-show, /rihal-list-plans, /rihal-next
   - `'Inspect'`   for: /rihal-help, /rihal-health, /rihal-diff
   Each object becomes `{ cmd: '...', label: '...', category: '...' }`. Do not reorder.
2. In icons-client.js ICONS map, add a `search` entry (after the `sun` entry):
   `search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',`
3. In server/lib/html/icons.js, add the IDENTICAL `search` entry to its ICONS map so the
   two files stay in sync (the file header in icons-client.js mandates this).
</action>
<acceptance_criteria>
- `grep -c "category:" server/lib/html/client/orchestrator.js` returns 12 or more
- `grep -q "category: 'Planning'" server/lib/html/client/orchestrator.js` exits 0
- `grep -q "search:" server/lib/html/client/icons-client.js` exits 0
- `grep -q "search:" server/lib/html/icons.js` exits 0
- `node --input-type=module --check < server/lib/html/client/orchestrator.js` exits 0
</acceptance_criteria>
<verify>
<automated>
grep -q "category: 'Planning'" server/lib/html/client/orchestrator.js && \
test "$(grep -c 'category:' server/lib/html/client/orchestrator.js)" -ge 12 && \
grep -q "search:" server/lib/html/client/icons-client.js && \
grep -q "search:" server/lib/html/icons.js && \
node --input-type=module --check < server/lib/html/client/orchestrator.js
</automated>
</verify>
<done>ALLOWED_COMMANDS carries a category on every entry and a search icon exists in both icon files.</done>
<evidence>
lines: server/lib/html/client/orchestrator.js:230-243 (ALLOWED_COMMANDS — 12 `{cmd,label}` entries, no category today)
lines: server/lib/html/client/icons-client.js:17-57 (ICONS map; grep for 'search' returned 0 hits — icon does not exist)
grep: `grep -n "search\|hash" server/lib/html/icons.js` → 0 matches — confirms search icon absent server-side too
</evidence>
</task>

<task id="36-1.2" type="auto">
<title>Create the CommandPalette Preact component</title>
<read_first>
- server/lib/html/client/orchestrator.js (ALLOWED_COMMANDS + runCommandFromUI, after task 36-1.1)
- server/lib/html/client/views/OrchestrationView.js (CommandRunner — the non-searchable predecessor, lines 86-136)
- server/lib/html/client/components/shared.js (component style conventions)
- server/lib/html/client/preact.js (html, useState, useEffect, useRef, useMemo exports)
- server/lib/html/client/icons-client.js (Icon component usage)
</read_first>
<files>
server/lib/html/client/components/CommandPalette.js
</files>
<interfaces>
import { html, useState, useEffect, useRef, useMemo } from '../preact.js';
import { ALLOWED_COMMANDS, runCommandFromUI } from '../orchestrator.js';
import { Icon } from '../icons-client.js';
// ALLOWED_COMMANDS entry shape after 36-1.1: { cmd, label, category }
// runCommandFromUI(cmd: string): void  — opens terminal panel + POSTs to orchestrator
</interfaces>
<action>
Create CommandPalette.js exporting `export function CommandPalette({ open, onClose })`:
1. Local state: `const [query, setQuery] = useState('')` and
   `const [activeIdx, setActiveIdx] = useState(0)`.
2. `inputRef = useRef(null)`. A useEffect on `[open]`: when `open` becomes true, reset
   query to '' and activeIdx to 0, and focus `inputRef.current`.
3. `const results = useMemo(...)` filtering ALLOWED_COMMANDS where `query` (lowercased,
   trimmed) is a substring of `cmd` or `label` (both lowercased). Empty query → all 12.
4. Group `results` by `category` into an ordered flat list for keyboard nav: build
   `const groups` (array of `{ category, items }`) preserving first-seen category order,
   and `const flat` (results in the same group order) so activeIdx maps to `flat`.
5. Render nothing when `!open` (`if (!open) return null;`).
6. When open, render an overlay: outer `div.cmd-palette-overlay` with `onClick=${onClose}`,
   inner `div.cmd-palette` with `onClick=${e => e.stopPropagation()}`.
7. Inside: a search row `div.cmd-palette-search` with `<${Icon} name="search" size=${16}/>`
   and `<input class="cmd-palette-input" ref=${inputRef} value=${query}
   onInput=${e => { setQuery(e.target.value); setActiveIdx(0); }}
   placeholder="Search commands…"/>`.
8. Results list `div.cmd-palette-list`: for each group render a `div.cmd-palette-group`
   heading (the category) then each item as
   `button.cmd-palette-item` (add ` active` class when its flat index === activeIdx),
   `onClick=${() => choose(item.cmd)}`, showing the label and a `span.cmd-palette-cmd`
   with the raw `cmd`.
9. Empty state: when `flat.length === 0` render `div.cmd-palette-empty` "No commands match".
10. `function choose(cmd) { runCommandFromUI(cmd); onClose(); }`.
11. Keyboard: an `onKeyDown` on the inner `div.cmd-palette` —
    - `ArrowDown` → `setActiveIdx(i => Math.min(i + 1, flat.length - 1))`, preventDefault
    - `ArrowUp` → `setActiveIdx(i => Math.max(i - 1, 0))`, preventDefault
    - `Enter` → if `flat[activeIdx]` exists, `choose(flat[activeIdx].cmd)`
    - `Escape` → `onClose()`
Use function declarations, no React.FC, no inline `style` attribute.
</action>
<acceptance_criteria>
- `test -f server/lib/html/client/components/CommandPalette.js` exits 0
- `grep -q "export function CommandPalette" server/lib/html/client/components/CommandPalette.js` exits 0
- `grep -q "runCommandFromUI" server/lib/html/client/components/CommandPalette.js` exits 0
- `grep -Eq "ALLOWED_COMMANDS" server/lib/html/client/components/CommandPalette.js` exits 0
- CommandPalette.js contains no `style=` attribute: `grep -q "style=" server/lib/html/client/components/CommandPalette.js` exits 1
- `node --input-type=module --check < server/lib/html/client/components/CommandPalette.js` exits 0
</acceptance_criteria>
<verify>
<automated>
test -f server/lib/html/client/components/CommandPalette.js && \
grep -q "export function CommandPalette" server/lib/html/client/components/CommandPalette.js && \
grep -q "runCommandFromUI" server/lib/html/client/components/CommandPalette.js && \
grep -q "ALLOWED_COMMANDS" server/lib/html/client/components/CommandPalette.js && \
! grep -q "style=" server/lib/html/client/components/CommandPalette.js && \
node --input-type=module --check < server/lib/html/client/components/CommandPalette.js
</automated>
</verify>
<done>A searchable, category-grouped CommandPalette component exists and runs commands via runCommandFromUI.</done>
<evidence>
creates: server/lib/html/client/components/CommandPalette.js — no palette component exists today; OrchestrationView.js:86-136 has only a non-searchable `<select>`-based CommandRunner which is in-view, not a global overlay
lines: server/lib/html/client/views/OrchestrationView.js:86-136 (CommandRunner — the pattern to upgrade: imports ALLOWED_COMMANDS + runCommandFromUI)
lines: server/lib/html/client/orchestrator.js:259-280 (runCommandFromUI — the launch path the palette reuses)
</evidence>
</task>

<task id="36-1.3" type="auto">
<title>Wire CommandPalette into App with a Cmd+K / Ctrl+K toggle</title>
<read_first>
- server/lib/html/client/components/App.js (root component, imports + render tree, lines 15-211)
- server/lib/html/client/components/CommandPalette.js (created in 36-1.2)
</read_first>
<files>
server/lib/html/client/components/App.js
</files>
<interfaces>
import { CommandPalette } from './CommandPalette.js';
// App already uses: useState, useEffect from preact.js (App.js:15)
</interfaces>
<action>
1. Add `import { CommandPalette } from './CommandPalette.js';` alongside the other
   component imports (near App.js:18-21).
2. In the `App()` body add `const [paletteOpen, setPaletteOpen] = useState(false);`.
3. Add a useEffect with `[]` deps that registers a `window` `keydown` listener:
   - When `(e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')`:
     `e.preventDefault(); setPaletteOpen(o => !o);`
   The effect returns a cleanup that removes the listener.
4. In the returned JSX, render `<${CommandPalette} open=${paletteOpen}
   onClose=${() => setPaletteOpen(false)} />` inside `div.app-shell`, as a sibling of
   `<${XtermPanel} />` (App.js:207).
Do not change existing router, theme, or poll logic.
</action>
<acceptance_criteria>
- `grep -q "import { CommandPalette }" server/lib/html/client/components/App.js` exits 0
- `grep -q "paletteOpen" server/lib/html/client/components/App.js` exits 0
- `grep -Eq "metaKey \|\| e.ctrlKey" server/lib/html/client/components/App.js` exits 0
- `grep -q "CommandPalette" server/lib/html/client/components/App.js` returns 2 or more lines
- `node --input-type=module --check < server/lib/html/client/components/App.js` exits 0
- `node server/dashboard.js` starts without throwing (boot smoke test, killed after start)
</acceptance_criteria>
<verify>
<automated>
grep -q "import { CommandPalette }" server/lib/html/client/components/App.js && \
grep -q "paletteOpen" server/lib/html/client/components/App.js && \
grep -Eq "metaKey \|\| e\.ctrlKey" server/lib/html/client/components/App.js && \
test "$(grep -c CommandPalette server/lib/html/client/components/App.js)" -ge 2 && \
node --input-type=module --check < server/lib/html/client/components/App.js && \
(node server/dashboard.js & P=$!; sleep 1; kill $P 2>/dev/null; true)
</automated>
</verify>
<done>Pressing Cmd+K or Ctrl+K toggles the command palette from anywhere in the dashboard.</done>
<evidence>
lines: server/lib/html/client/components/App.js:69-211 (App body — useState/useEffect already in use; render tree has XtermPanel/OrchPanel siblings at 207-208 to mirror)
lines: server/lib/html/client/components/App.js:18-21 (component import block to extend)
grep: `grep -n keydown server/lib/html/client/components/App.js` → 0 hits — no global keyboard listener exists yet
</evidence>
</task>

<task id="36-1.4" type="auto">
<title>Add command palette CSS to css.js</title>
<read_first>
- server/lib/html/css.js (token vars + the cmd-runner block at lines 2209-2264, the file ends with `</style>` then `module.exports`)
- server/lib/html/css.js — full z-index survey, so the overlay value is grounded against EVERY stacking context, not just xterm:
  - css.js:1427 — `#orch-panel` slide-in side panel: `z-index: 50`
  - css.js:1941 — xterm Terminal Panel block (1922-1961): `.term-backdrop` is `z-index: 200`, `.term-panel`/`.term-pill` are `z-index: 201`
  - css.js:1034 — `.toast` notification layer: `z-index: 1000` (`pointer-events: none`) — this is the HIGHEST z-index in css.js and the one the palette overlay must clear
- server/lib/html/client/components/CommandPalette.js (the class names it uses)
</read_first>
<files>
server/lib/html/css.js
</files>
<interfaces>
// css.js renderCss() returns a single template string ending with `</style>`.
// Append new rules immediately before the closing `</style>` (css.js:2265).
</interfaces>
<action>
Append a new CSS block (before the closing `</style>`) defining every class the
CommandPalette component renders. Use existing design tokens only (var(--bg-card),
var(--border), var(--text-primary), var(--text-muted), var(--accent-blue),
var(--radius-md), var(--space-*), var(--text-sm) etc — same tokens the cmd-runner block
at css.js:2210 uses):
- `.cmd-palette-overlay` — fixed inset 0, `z-index: 1100`. This value is grounded against
  the FULL z-index picture in css.js: `#orch-panel` slide-in is `z-index: 50` (css.js:1427),
  the xterm `.term-backdrop`/`.term-panel`/`.term-pill` are `z-index: 200/201`
  (css.js:1922-1961), and the `.toast` notification layer is `z-index: 1000` (css.js:1034).
  1100 places the palette overlay above ALL of them — including the toast layer, which a
  value of 300 would have rendered BELOW. The toast layer is `pointer-events: none` so it
  never blocks clicks, but the palette must still paint over it.
  flex centered, semi-transparent backdrop, padding-top so the palette sits in the upper third.
- `.cmd-palette` — max-width ~560px, width 90%, var(--bg-card), 1px var(--border),
  var(--radius-md), shadow, overflow hidden.
- `.cmd-palette-search` — flex row, gap, padding, bottom border var(--border-subtle).
- `.cmd-palette-input` — flex 1, transparent background, no border, no outline,
  var(--text-primary), font-size var(--text-sm).
- `.cmd-palette-list` — max-height ~50vh, overflow-y auto.
- `.cmd-palette-group` — the category heading: var(--text-2xs), uppercase, letter-spacing,
  var(--text-muted), padding.
- `.cmd-palette-item` — full-width button, flex row space-between, transparent background,
  no border, var(--text-primary), text-align left, cursor pointer, padding.
- `.cmd-palette-item:hover`, `.cmd-palette-item.active` — background var(--bg-hover).
- `.cmd-palette-cmd` — var(--text-2xs), var(--text-muted), monospace.
- `.cmd-palette-empty` — centered, var(--text-muted), padding.
No inline styles, no new tokens.
</action>
<acceptance_criteria>
- `grep -q ".cmd-palette-overlay" server/lib/html/css.js` exits 0
- the `.cmd-palette-overlay` rule sets `z-index: 1100` (above the css.js:1034 toast layer of 1000) — NOT 300
- `grep -q "z-index: 1100" server/lib/html/css.js` exits 0
- `grep -q ".cmd-palette-item.active" server/lib/html/css.js` exits 0
- `grep -q ".cmd-palette-group" server/lib/html/css.js` exits 0
- `node -e "require('./server/lib/html/css.js').renderCss()"` exits 0
- `node server/dashboard.js` boots and serves CSS without error
</acceptance_criteria>
<verify>
<automated>
grep -q ".cmd-palette-overlay" server/lib/html/css.js && \
grep -Pzoq "cmd-palette-overlay[^}]*z-index:\s*1100" server/lib/html/css.js && \
grep -q ".cmd-palette-item.active" server/lib/html/css.js && \
grep -q ".cmd-palette-group" server/lib/html/css.js && \
node -e "require('./server/lib/html/css.js').renderCss()" && \
(node server/dashboard.js & P=$!; sleep 1; kill $P 2>/dev/null; true)
</automated>
</verify>
<done>The command palette renders styled — overlay, search box, grouped list, active highlight — all from design tokens, with the overlay z-index (1100) above every stacking context in css.js including the toast layer.</done>
<evidence>
lines: server/lib/html/css.js:2209-2265 (cmd-runner block + closing `</style>` and `module.exports` — confirms append point and token vocabulary)
lines: server/lib/html/css.js:1034 (`.toast` notification layer — `z-index: 1000`, `pointer-events: none`; the HIGHEST z-index in css.js — the overlay's 1100 clears it)
lines: server/lib/html/css.js:1427 (`#orch-panel` slide-in side panel — `z-index: 50`)
lines: server/lib/html/css.js:1922-1961 (xterm Terminal Panel — `.term-backdrop` z-index:200, `.term-panel`/`.term-pill` z-index:201)
grep: `grep -n "cmd-palette" server/lib/html/css.js` → 0 hits — no palette CSS exists yet
</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` starts clean on :7717 with no thrown error.
- `node --input-type=module --check` passes for orchestrator.js, CommandPalette.js, App.js.
- CommandPalette.js imports ALLOWED_COMMANDS and runCommandFromUI from orchestrator.js —
  `grep` confirms no second command list is defined anywhere.
- icons-client.js and icons.js both contain the `search` icon (sync invariant held).
- No `style=` attribute in CommandPalette.js.
</verification>

<success_criteria>
- DSH-4 met: user opens the palette with Cmd+K / Ctrl+K, types to search, sees commands
  grouped by category, and runs one — it launches through runCommandFromUI → orchestrator.
- Escape closes the palette and runs nothing.
- No new dependency, no build step, no change to server/dashboard.js, no new write endpoint.
</success_criteria>

<output>
Create `.planning/phases/36-command-palette-and-sidebar-health-badges/36-1-SUMMARY.md`
</output>
