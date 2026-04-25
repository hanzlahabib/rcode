---
phase: 04
sprint: 04.2
type: execute
autonomous: false
wave: 1
depends_on: []
files_modified: [server/dashboard.js]
requirements: [REQ-DASHBOARD-UX]

must_haves:
  truths:
    - "Dashboard renders with Inter font, CSS custom properties, dark Linear/Vercel aesthetic (#0a0a0b base)"
    - "Two-column layout: 240px fixed sidebar + scrollable main content area"
    - "Sidebar nav switches views (Overview, Files, Phases, Agents, Decisions) without page reload"
    - "GET /api/files returns JSON list of .md paths under .rihal/ and .planning/"
    - "GET /api/file?path= returns raw markdown, refusing paths outside project root"
    - "Clicking a .md file in sidebar renders it via marked.js in the main area"
    - "Blocker banner appears as first element in main area when state.blockers.length > 0, dismissible via sessionStorage"
    - "Phase cards show color-coded status chips (green/blue/red/grey)"
    - "Header shows 'Updated Xs ago' counter; manual Refresh button re-fetches /api/state without reload"
    - "30-second auto-poll detects state changes and re-renders Overview section"
    - "Live filter input on Phases, Agents, Decisions views filters cards as user types"
  artifacts:
    - path: "server/dashboard.js"
      provides: "Fully rewritten single-file dashboard with all 7 features"
  key_links:
    - from: "sidebar file tree"
      to: "GET /api/file endpoint"
      via: "fetch() + marked.parse() rendered into #main-content"
    - from: "blocker banner JS"
      to: "sessionStorage key 'blockers-dismissed'"
      via: "dismiss button sets key; banner checks key on render"
    - from: "30s poll"
      to: "/api/state"
      via: "setInterval + JSON compare on state.lastScanned"
---

# Sprint 04.2 — Dashboard visual overhaul: design system, sidebar, file browser, UX polish

**Phase:** 04 — Dashboard Refresh
**Status:** todo
**Velocity target:** 21 points
**Started:** —

## Sprint Goal

Overhaul `server/dashboard.js` into a polished, functional developer dashboard. Introduce a proper CSS design system (Linear/Vercel aesthetic), two-column sidebar layout, in-browser markdown file browser backed by two new read-only endpoints, a dismissible blocker banner, color-coded phase status chips, live "updated Xs ago" header with manual + auto refresh, and a client-side live filter on Phases/Agents/Decisions views.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 04.2.01 | Design system tokens + Inter font + base resets | 2 | todo | All 11 CSS custom properties present in `:root`; Inter loaded from fonts.googleapis.com; `node server/dashboard.js` starts clean |
| 04.2.02 | Two-column layout: sidebar + main content area | 3 | todo | Page renders a 240px fixed left sidebar and a flex-1 main area; nav links (Overview, Files, Phases, Agents, Decisions) switch visible view section via `data-view` JS without page reload |
| 04.2.03 | `/api/files` and `/api/file` endpoints with path traversal protection | 3 | todo | `curl http://localhost:7717/api/files` returns JSON array of .md relative paths; `curl "http://localhost:7717/api/file?path=../../etc/passwd"` returns 403; valid path returns raw markdown text |
| 04.2.04 | Sidebar MD file tree + marked.js in-browser rendering | 3 | todo | Sidebar shows collapsible file tree under `.rihal/` and `.planning/`; clicking any file fetches `/api/file` and renders HTML via `marked.parse()` into `#file-view` div; Files nav link activates that view |
| 04.2.05 | Blocker banner — conditional, top-positioned, session-dismissible | 2 | todo | When `state.blockers` is non-empty, a red `#blocker-banner` div appears as first child of `#main-content`; clicking X sets `sessionStorage.setItem('blockers-dismissed','1')` and hides banner; on reload, banner stays hidden if key is set |
| 04.2.06 | Phase status chips — color-coded by status value | 2 | todo | Each phase card has a `<span class="status-chip">` element; `complete` → `var(--accent-green)`, `active`/`in_progress` → `var(--accent-blue)`, `blocked` → `var(--accent-red)`, all other values → `var(--text-muted)` |
| 04.2.07 | Auto-refresh header: "Updated Xs ago" + manual refresh + 30s poll | 3 | todo | Header shows `<span id="updated-ago">` updated every second; "↺ Refresh" button calls `fetchAndRenderOverview()` which GETs `/api/state` and re-renders stats + phase list in-place; `setInterval` every 30 000ms fetches `/api/state`, compares `state.lastScanned`, re-renders if changed |
| 04.2.08 | Live filter on Phases, Agents, Decisions views | 3 | todo | Each of the three views has `<input class="filter-input" placeholder="Filter…">`; `input` event handler iterates `.filterable-card` children, toggles `display:none` when card's `data-filter-text` attribute does not include the lowercased query |

## Capacity

- **Velocity target:** 21 points
- **Total committed:** 21 points
- **Buffer:** 0 points (0%)

## Dependencies

| Story | Depends on | Status |
|-------|-----------|--------|
| 04.2.02 | 04.2.01 (design tokens must exist before layout uses them) | — |
| 04.2.04 | 04.2.03 (file browser needs the two endpoints) | — |
| 04.2.04 | 04.2.02 (sidebar must exist to host the file tree) | — |
| 04.2.05 | 04.2.02 (main content area must exist) | — |
| 04.2.06 | 04.2.02 (phase cards must be in the Phases view) | — |
| 04.2.07 | 04.2.02 (header element must exist) | — |
| 04.2.08 | 04.2.02 (views must exist to add filter inputs to) | — |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| marked.js CDN unavailable in offline/corp env | File contents render as raw text | Wrap `marked.parse()` in try/catch; fall back to `<pre>` rendering if `marked` is undefined |
| Path traversal in `/api/file` | Security hole | `path.resolve()` the joined path; `startsWith(PROJECT_ROOT)` check before `fs.readFileSync`; return 403 if check fails — this is MANDATORY, not optional |
| `server/dashboard.js` grows past 1000 lines | Violates CLAUDE.md file size rule | Existing file is **652 lines**. Stories replace existing code (old `:root` replaced, old layout replaced, old header replaced, old 5-line timeout replaced) — net additions ~250 lines, target total ~900 lines. Story 04.2.01 must delete the existing inline `<style>` block before writing new tokens. |
| Inter font CDN adds latency on first load | Slow paint | Acceptable trade-off; font is display-only and loads async |

---

## Story Detail

### Story 04.2.01 — Design system tokens + Inter font + base resets

**Points:** 2
**Type:** auto

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (lines 174–416, current `<style>` block)
</read_first>

<action>
**FIRST:** Read the current `server/dashboard.js` and identify the existing inline `<style>` block. Delete the entire existing `<style>` block content before inserting the new design system CSS. This is mandatory to prevent duplicate rules and keep the file under 1000 lines. The new `<style>` block replaces the old one entirely.

Inside the `<style>` block in `renderHtml()`, replace the existing `:root` block with the following CSS custom properties:

```css
:root {
  /* Colors */
  --bg:              #0a0a0b;
  --bg-card:         #111113;
  --bg-hover:        #1a1a1e;
  --border:          #1e1e24;
  --text-primary:    #f0f0f2;
  --text-secondary:  #a0a0aa;
  --text-muted:      #606068;
  --accent-blue:     #3b82f6;
  --accent-green:    #10b981;
  --accent-amber:    #f59e0b;
  --accent-red:      #ef4444;

  /* Typography */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-lg:   18px;
  --text-xl:   24px;

  /* Spacing (4px base grid) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;

  /* Radius */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg: 12px;

  /* Shadow */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border);
}
```

Update `body { background: ... }` to use `var(--bg)` and `color: var(--text-primary)`.

Add to `<head>` (before the `<style>` tag):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Update `font-family` in `body` rule to: `'Inter', -apple-system, 'Segoe UI', sans-serif`.

Do NOT remove the existing `--rihal-blue`, `--rihal-gold` variables — keep them; new tokens are additive.
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "accent-blue"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Result must be >= 1 (token present in rendered HTML).
Visually: background must be near-black (#0a0a0b), body text in Inter.
</acceptance_criteria>

---

### Story 04.2.02 — Two-column layout: sidebar + main content area

**Points:** 3
**Type:** checkpoint:human-verify

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (full `renderHtml()` and `<style>` block)
</read_first>

<action>
1. Add CSS rules for the two-column shell:

```css
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: 240px;
  min-width: 240px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: var(--space-4) 0;
}
.sidebar-project {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-3);
}
.sidebar-project .project-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: var(--space-1);
}
.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 0;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.nav-link:hover  { background: var(--bg-hover); color: var(--text-primary); }
.nav-link.active { background: var(--bg-hover); color: var(--text-primary); font-weight: 600; }
.content-area {
  flex: 1;
  overflow-y: auto;
  background: var(--bg);
}
.view { display: none; padding: var(--space-8); }
.view.active { display: block; }
```

2. Replace the outer `<body>` structure in `renderHtml()`. The new shell is:

```html
<body>
<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-project">
      <div class="project-label">Project</div>
      ${projectName}
    </div>
    <nav>
      <button class="nav-link active" data-view="overview">Overview</button>
      <button class="nav-link" data-view="files">Files</button>
      <button class="nav-link" data-view="phases">Phases</button>
      <button class="nav-link" data-view="agents">Agents</button>
      <button class="nav-link" data-view="decisions">Decisions</button>
    </nav>
    <div id="sidebar-file-tree" style="margin-top:var(--space-4);padding:0 var(--space-2);"></div>
  </aside>
  <div class="content-area" id="main-content">
    <!-- blocker banner inserted here by JS if needed -->
    <div id="view-overview" class="view active"> ... overview content ... </div>
    <div id="view-files"    class="view"> ... file viewer ... </div>
    <div id="view-phases"   class="view"> ... phases content ... </div>
    <div id="view-agents"   class="view"> ... agents content ... </div>
    <div id="view-decisions" class="view"> ... decisions content ... </div>
  </div>
</div>
```

3. Add inline `<script>` for view switching (append to bottom of page, before closing `</body>`):

```js
(function() {
  const links = document.querySelectorAll('.nav-link[data-view]');
  const views = document.querySelectorAll('.view');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      link.classList.add('active');
      const target = document.getElementById('view-' + link.dataset.view);
      if (target) target.classList.add('active');
    });
  });
})();
```

4. Move the existing `<header>` block INSIDE the `content-area` div, above the view divs. The header is now scoped to the content area, not page-level.

5. The `<main>` element from the old layout is removed. Each section (stats, phases, agents, decisions) becomes the inner content of the corresponding `<div id="view-*">`. The Overview view contains: header + stats + active context. The Phases view contains the phase list. The Agents view contains the agent grid. The Decisions view contains the decisions list.
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "nav-link"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Result must be >= 5 (one per nav item).
Human verify: open http://localhost:7717 — clicking "Phases" in sidebar shows only phase cards; clicking "Agents" shows only agent cards; clicking "Overview" restores the stats section. No full page reload occurs.
</acceptance_criteria>

---

### Story 04.2.03 — `/api/files` and `/api/file` endpoints with mandatory path traversal protection

**Points:** 3
**Type:** auto

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (lines 611–648, the HTTP server handler switch)
</read_first>

<action>
Add two new route handlers inside the `http.createServer` callback, before the catch-all 404. Both handlers are GET-only and read-only.

**Define project root constant at the top of the file (after RIHAL_DIR declaration):**
```js
const PROJECT_ROOT = path.dirname(RIHAL_DIR); // e.g. /home/user/project
```

**`GET /api/files` handler:**
```js
if (url === '/api/files') {
  const results = [];
  const roots = [
    { base: RIHAL_DIR,                          prefix: '.rihal' },
    { base: path.join(PROJECT_ROOT, '.planning'), prefix: '.planning' },
  ];
  function walkMd(dir, prefix, depth) {
    if (depth > 3) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      const rel  = prefix + '/' + e.name;
      if (e.isDirectory()) walkMd(full, rel, depth + 1);
      else if (e.isFile() && e.name.endsWith('.md')) results.push(rel);
    }
  }
  for (const r of roots) walkMd(r.base, r.prefix, 0);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(results));
  return;
}
```

**`GET /api/file?path=<relpath>` handler:**
```js
if (url.startsWith('/api/file')) {
  const params = new URLSearchParams(url.split('?')[1] || '');
  const relPath = params.get('path') || '';
  if (!relPath) {
    res.writeHead(400); res.end('Missing path parameter'); return;
  }
  // MANDATORY path traversal protection
  const resolved = path.resolve(PROJECT_ROOT, relPath.replace(/^\//, ''));
  if (!resolved.startsWith(PROJECT_ROOT + path.sep) && resolved !== PROJECT_ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  // Only serve .md files
  if (!resolved.endsWith('.md')) {
    res.writeHead(403); res.end('Forbidden: only .md files'); return;
  }
  let content;
  try { content = fs.readFileSync(resolved, 'utf8'); }
  catch { res.writeHead(404); res.end('File not found'); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(content);
  return;
}
```

CRITICAL: The `startsWith(PROJECT_ROOT + path.sep)` check MUST NOT be weakened or removed. This is the entire security boundary for this endpoint.
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/api/files | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if isinstance(d, list) else 'FAIL')"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:7717/api/file?path=../../etc/passwd"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:7717/api/file?path=.rihal/state.json"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Line 1 must print "OK". Line 2 (traversal attempt) must print "403". Line 3 (non-.md file) must print "403".
</acceptance_criteria>

---

### Story 04.2.04 — Sidebar MD file tree + marked.js in-browser rendering

**Points:** 3
**Type:** checkpoint:human-verify

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (current `<head>` block and bottom `<script>` section)
</read_first>

<action>
1. Add marked.js CDN script to `<head>` (after the Inter font links):
```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

2. Add CSS for the file tree in the sidebar:
```css
.file-tree { font-size: var(--text-xs); }
.file-tree-group { margin-bottom: var(--space-3); }
.file-tree-group summary {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-size: 10px;
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
  list-style: none;
}
.file-tree-item {
  display: block;
  padding: 3px var(--space-3);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}
.file-tree-item:hover { color: var(--text-primary); background: var(--bg-hover); }
.file-tree-item.selected { color: var(--accent-blue); background: rgba(59,130,246,0.1); }
.md-render {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  max-width: 860px;
  line-height: 1.7;
  color: var(--text-primary);
}
.md-render h1, .md-render h2, .md-render h3 { margin: var(--space-6) 0 var(--space-3); }
.md-render code { background: var(--bg-hover); padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--text-sm); }
.md-render pre  { background: var(--bg-hover); padding: var(--space-4); border-radius: var(--radius-md); overflow-x: auto; }
.md-render a    { color: var(--accent-blue); }
.md-render ul, .md-render ol { margin-left: var(--space-6); margin-bottom: var(--space-3); }
```

3. Inside `#view-files` div in the HTML template, place:
```html
<div id="file-view">
  <div style="color:var(--text-muted);padding:var(--space-8);">Select a file from the sidebar to preview it.</div>
</div>
```

4. Add to the bottom `<script>` block (after view-switching code):

```js
// File tree population
(async function() {
  let files = [];
  try {
    const r = await fetch('/api/files');
    files = await r.json();
  } catch { return; }

  const tree = document.getElementById('sidebar-file-tree');
  if (!tree) return;

  // Group by top-level prefix (.rihal vs .planning)
  const groups = {};
  files.forEach(f => {
    const top = f.split('/')[0];
    if (!groups[top]) groups[top] = [];
    groups[top].push(f);
  });

  tree.innerHTML = '<div class="file-tree">' +
    Object.entries(groups).map(([grp, paths]) => `
      <details class="file-tree-group" open>
        <summary>${grp}</summary>
        ${paths.map(p => `<span class="file-tree-item" data-path="${p}">${p.split('/').pop()}</span>`).join('')}
      </details>
    `).join('') +
  '</div>';

  tree.addEventListener('click', async (e) => {
    const item = e.target.closest('.file-tree-item');
    if (!item) return;
    tree.querySelectorAll('.file-tree-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');

    // Switch to Files view
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const filesNav = document.querySelector('.nav-link[data-view="files"]');
    if (filesNav) filesNav.classList.add('active');
    const filesView = document.getElementById('view-files');
    if (filesView) filesView.classList.add('active');

    const fv = document.getElementById('file-view');
    fv.innerHTML = '<div style="color:var(--text-muted);padding:16px;">Loading…</div>';
    try {
      const resp = await fetch('/api/file?path=' + encodeURIComponent(item.dataset.path));
      if (!resp.ok) { fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Failed to load file.</div>'; return; }
      const md = await resp.text();
      const html = (typeof marked !== 'undefined')
        ? marked.parse(md)
        : '<pre>' + md.replace(/</g,'&lt;') + '</pre>';
      fv.innerHTML = '<div class="md-render">' + html + '</div>';
    } catch {
      fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Network error.</div>';
    }
  });
})();
```
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "sidebar-file-tree"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Result must be >= 1.
Human verify: open http://localhost:7717 — file tree appears in sidebar grouped by `.rihal` and `.planning`. Click any `.md` file — Files view activates, file content renders as formatted HTML (not raw text), headings and code blocks are styled.
</acceptance_criteria>

---

### Story 04.2.05 — Blocker banner: conditional, top-positioned, session-dismissible

**Points:** 2
**Type:** auto

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (the `renderHtml` function, specifically how `state.blockers` is currently used around line 549)
</read_first>

<action>
1. Add CSS for the banner:
```css
#blocker-banner {
  background: rgba(239,68,68,0.12);
  border-bottom: 1px solid rgba(239,68,68,0.4);
  padding: var(--space-3) var(--space-8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  color: var(--accent-red);
  font-size: var(--text-sm);
}
#blocker-banner .banner-title { font-weight: 600; }
#blocker-banner .banner-list  { flex: 1; color: var(--text-secondary); font-size: var(--text-xs); margin-left: var(--space-3); }
#blocker-banner .banner-dismiss {
  background: none; border: 1px solid rgba(239,68,68,0.4); color: var(--accent-red);
  padding: 2px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--text-xs);
}
#blocker-banner .banner-dismiss:hover { background: rgba(239,68,68,0.2); }
```

2. In `renderHtml()`, inside the `content-area` div, insert the banner HTML as the FIRST child (before any view divs). Only render it when `state.blockers.length > 0`:

```js
${state.blockers.length > 0 ? `
<div id="blocker-banner">
  <span class="banner-title">🚧 ${state.blockers.length} Blocker${state.blockers.length > 1 ? 's' : ''}</span>
  <span class="banner-list">${state.blockers.map(b => typeof b === 'string' ? b : (b.title || '')).join(' · ')}</span>
  <button class="banner-dismiss" onclick="sessionStorage.setItem('blockers-dismissed','1');document.getElementById('blocker-banner').style.display='none'">Dismiss</button>
</div>` : ''}
```

3. Add at the END of the bottom `<script>` block (AFTER all other JS):
```js
// Restore blocker banner dismiss state from sessionStorage
(function() {
  if (sessionStorage.getItem('blockers-dismissed') === '1') {
    const b = document.getElementById('blocker-banner');
    if (b) b.style.display = 'none';
  }
})();
```

NOTE: `state.blockers` is currently `[]` in `.rihal/state.json`. The banner renders no HTML when the array is empty. To test, temporarily set `state.blockers = [{ title: 'Test blocker' }]` in the scanState return value, verify banner appears, then revert.
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "blocker-banner"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Result must be >= 1 (the CSS rule and/or element must be present in source; banner div is hidden when blockers array is empty but CSS rule always exists).
Human verify: Manually test by temporarily injecting a blocker in scanState — red bar appears at top; clicking Dismiss hides it; page reload with sessionStorage key set keeps it hidden.
</acceptance_criteria>

---

### Story 04.2.06 — Phase status chips: color-coded by status value

**Points:** 2
**Type:** auto

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (the phase list rendering block inside `renderHtml`, currently around line 523–547)
</read_first>

<action>
1. Add CSS:
```css
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: lowercase;
}
.status-chip.complete     { background: rgba(16,185,129,0.15);  color: var(--accent-green); }
.status-chip.active,
.status-chip.in_progress  { background: rgba(59,130,246,0.15);  color: var(--accent-blue);  }
.status-chip.blocked      { background: rgba(239,68,68,0.15);   color: var(--accent-red);   }
.status-chip.planned,
.status-chip.todo,
.status-chip.other        { background: rgba(96,96,104,0.2);    color: var(--text-muted);   }
```

2. In the phase card template inside `renderHtml()`, replace the existing inline `<span style="color:...">● ${p.status}</span>` with:

```js
const chipClass = ['complete'].includes(p.status) ? 'complete'
  : ['active','in_progress'].includes(p.status)   ? 'active'
  : p.status === 'blocked'                         ? 'blocked'
  : 'other';
// then in the template:
`<span class="status-chip ${chipClass}">● ${p.status}</span>`
```

The chip replaces the old inline-styled span entirely. The `isCurrent` amber border-left on the `.item` div is kept.
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "status-chip"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Result must equal the number of phases in state.json (currently 5 phases → result >= 5).
Human verify: Phases view shows colored pill badges — "complete" phases have a green chip, "planned" phases have a grey chip.
</acceptance_criteria>

---

### Story 04.2.07 — Auto-refresh header: "Updated Xs ago" + manual refresh button + 30s poll

**Points:** 3
**Type:** auto

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (current `<header>` block around line 420–433, and the `<script>` block at the bottom near line 601–606)
</read_first>

<action>
1. Replace the existing header HTML (inside `renderHtml()`) with:
```html
<header>
  <div class="brand">
    <div class="icon">🕌</div>
    <div>
      <h1>Majlis — The Council</h1>
      <div class="arabic">مجلس · ${projectName}</div>
    </div>
  </div>
  <div class="header-meta">
    <span class="live" id="live-dot"></span>
    <span id="updated-ago">just now</span>
    &nbsp;·&nbsp;
    <button id="refresh-btn" onclick="manualRefresh()">↺ Refresh</button>
  </div>
</header>
```

2. Add CSS for the refresh button and header meta:
```css
header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: var(--space-4) var(--space-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.header-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
#refresh-btn {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: background 0.15s;
}
#refresh-btn:hover { background: var(--border); }
```

3. Replace the existing `<script>` block (currently just `setTimeout(() => location.reload(), 5000)`) with the following. The full reload is REMOVED and replaced with fetch-based updates:

```js
// --- Refresh logic ---
let _lastScanned = ${JSON.stringify(state.lastScanned)};
let _scanTime = Date.now();

function renderUpdatedAgo() {
  const seconds = Math.floor((Date.now() - _scanTime) / 1000);
  const el = document.getElementById('updated-ago');
  if (!el) return;
  el.textContent = seconds < 5 ? 'just now'
    : seconds < 60 ? seconds + 's ago'
    : Math.floor(seconds / 60) + 'm ago';
}
setInterval(renderUpdatedAgo, 1000);

async function fetchAndRenderOverview() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.textContent = '↺ …';
  try {
    const r = await fetch('/api/state');
    const s = await r.json();
    _lastScanned = s.lastScanned;
    _scanTime = Date.now();
    renderUpdatedAgo();
    // Re-render milestone stat
    const ms = document.getElementById('stat-milestone');
    if (ms && s.raw?.milestone) ms.textContent = s.raw.milestone;
  } catch { /* silent */ }
  if (btn) btn.textContent = '↺ Refresh';
}

// 30s auto-poll
setInterval(async () => {
  try {
    const r = await fetch('/api/state');
    const s = await r.json();
    if (s.lastScanned !== _lastScanned) fetchAndRenderOverview();
  } catch { /* silent */ }
}, 30000);

function manualRefresh() { fetchAndRenderOverview(); }
```

4. In the stats area, add `id="stat-milestone"` to the milestone value span so `fetchAndRenderOverview()` can update it in-place.

Note: The old `setTimeout(() => location.reload(), 5000)` is fully removed — the 5-second hard reload is replaced by the 30-second soft poll.
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "updated-ago"
curl -s http://localhost:7717/ | grep -c "manualRefresh"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Both results must be >= 1.
Human verify: "Updated Xs ago" counter increments in the header each second. Clicking "↺ Refresh" briefly shows "↺ …" then restores. No full page reloads occur during 60 seconds of watching the tab.
</acceptance_criteria>

---

### Story 04.2.08 — Live filter on Phases, Agents, and Decisions views

**Points:** 3
**Type:** auto

<read_first>
- /home/hanzla/development/rihal-code/server/dashboard.js (phase list HTML template, agent card HTML template, decision list HTML template — all inside `renderHtml()`)
</read_first>

<action>
1. Add CSS:
```css
.filter-bar {
  margin-bottom: var(--space-6);
}
.filter-input {
  width: 100%;
  max-width: 360px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  outline: none;
  font-family: inherit;
}
.filter-input:focus { border-color: var(--accent-blue); }
.filter-input::placeholder { color: var(--text-muted); }
```

2. At the top of each of the three view divs (`#view-phases`, `#view-agents`, `#view-decisions`), add a filter bar:
```html
<div class="filter-bar">
  <input class="filter-input" type="text" placeholder="Filter…" data-filter-target="phases-list">
</div>
```
Set `data-filter-target` to `"phases-list"`, `"agents-list"`, `"decisions-list"` respectively.

3. Wrap the cards/items in each view inside a container with the corresponding ID:
- Phase items: `<div id="phases-list">` (wrapping the `.phase-list` div)
- Agent cards: `<div id="agents-list">` (wrapping the `.agents` grid div)
- Decision items: `<div id="decisions-list">` (wrapping the `.decision-list` div)

4. Each filterable card element must have a `data-filter-text` attribute containing the lowercased searchable text:
- Phase card: `data-filter-text="${(p.name + ' ' + p.status + ' ' + (p.goal || '')).toLowerCase()}"`
- Agent card: `data-filter-text="${(a.name + ' ' + a.role + ' ' + a.arabic).toLowerCase()}"`
- Decision card: `data-filter-text="${(typeof d === 'string' ? d : (d.title || d.summary || d.decision || '')).toLowerCase()}"`

5. Add to the bottom `<script>` block:
```js
// Live filter
document.querySelectorAll('.filter-input').forEach(input => {
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const target = document.getElementById(input.dataset.filterTarget);
    if (!target) return;
    target.querySelectorAll('[data-filter-text]').forEach(card => {
      const match = !q || card.dataset.filterText.includes(q);
      card.style.display = match ? '' : 'none';
    });
  });
});
```
</action>

<acceptance_criteria>
<automated>
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/ | grep -c "filter-input"
curl -s http://localhost:7717/ | grep -c "data-filter-text"
kill $(lsof -t -i:7717) 2>/dev/null; true
</automated>
Line 1 must be >= 3 (one input per filterable view). Line 2 must be >= the count of (phases + agents + decisions) in state.json — currently 5 + 18 + 3 = 26, so result >= 10 is sufficient given template rendering.
Human verify: Navigate to Phases view, type "complete" in filter — only complete phases remain visible; clear input — all phases reappear. Same behavior on Agents and Decisions views.
</acceptance_criteria>

---

## Execution Order

Stories must be executed in sequence. Each story modifies `server/dashboard.js` in place. Run `node server/dashboard.js` after each story to verify clean startup before proceeding to the next.

```
04.2.01 → 04.2.02 → 04.2.03 → 04.2.04 → 04.2.05 → 04.2.06 → 04.2.07 → 04.2.08
```

After all 8 stories complete, run the full smoke test:

```bash
node /home/hanzla/development/rihal-code/server/dashboard.js &
sleep 1
curl -s http://localhost:7717/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d['status']=='ok' else 'FAIL')"
curl -s http://localhost:7717/api/files | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if isinstance(d,list) else 'FAIL')"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:7717/api/file?path=../../etc/passwd"
curl -s http://localhost:7717/ | grep -c "Inter"
kill $(lsof -t -i:7717) 2>/dev/null; true
```

Expected: `ok` / `OK` / `OK` / `403` / `>= 1`.
