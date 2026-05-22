---
status: clean
phase: 31
critical: 0
high: 4
medium: 5
low: 4
generated: 2026-05-16T00:16:03Z
fixed: 2026-05-16
---

<!-- FIXES APPLIED 2026-05-16 by rcode-fixer

H1 XtermPanel.js — moved window.addEventListener('resize') into useEffect
    with return () => removeEventListener cleanup; removed from ensureTerm.
H2 OrchPanel.js — added mount-level useEffect returning closeStream for
    all _streams keys on unmount.
H3 orchestrator.js cleanSessions — added Authorization: Bearer header.
H4 App.js — added if (!r.ok) return; before r.json() at both call sites.

M1 shell.js — pinned marked CDN to @15.0.7 (CDN URL verified 200).
M2/L3 App.js — removed FrozenHost, LegacyViewSync definitions; removed
    stale COEXISTENCE-SEAM NOTE JSDoc; updated module header; dropped
    unused memo import.
M3 DecisionsView.js — replaced local CmdHintItem/showToast with imports
    of CmdHint/showToast from components/shared.js.
M5 shell.js — updated stale HTML comment about "10 un-migrated views".

L1 window._preactRefresh — retained: KanbanView.js:181 still calls it
    after card drag; removal would break card reordering.
L2 RoadmapView.js — implemented E/C keyboard shortcuts via expandSignal
    prop threaded through PhaseNode and SprintNode; keydown useEffect with
    cleanup; updated module JSDoc.
L4 OrchPanel stop-button style attr — deferred (scope: L4 was review note
    only; change would alter DOM structure, separate commit scope).

Boot test: node server/dashboard.js → HTTP 200 on :7717. All modified
files pass node --check.
-->

# Phase 31 — Code Review

**Reviewer:** rcode-reviewer
**Branch:** 31-preact-migration
**Commits reviewed:** d62cc4f..HEAD (14 commits, 4 sprints)
**Scope:** server/lib/html/client/ tree + server/lib/html/shell.js + server/lib/html/client.js + server/dashboard.js

---

## Pattern Check

All 12 views are Preact components. The three legacy string-concat modules are confirmed deleted. No `BRIDGE(31.4)` markers remain in the client tree. No `window.*` orchestrator shims remain. No `innerHTML =` string-concat rendering found. ESM imports route through `preact.js` as the single version-pin surface. `dashboard.js` remains pure Node stdlib and view-only — no POST handlers, no write routes added. File sizes are all under 1000 lines (largest: shared.js at 329 lines). The `/js/` route regex + path.resolve containment check is correctly layered.

---

## HIGH Findings

### H1 — `window.addEventListener('resize', _resize)` in XtermPanel is never removed

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/XtermPanel.js:66`

`ensureTerm()` calls `window.addEventListener('resize', _resize)` at line 66. `ensureTerm()` is called from inside a `useEffect` at line 117, but the `useEffect` has no cleanup return that removes the listener. Because `_term` is module-scoped and checked for existence (`if (_term || ...) return`), `ensureTerm` runs exactly once across the component's lifetime — but if the Preact tree were ever unmounted and remounted (e.g., during hot reload or future layout refactors), a second listener would be registered, and neither would be removed.

The asymmetry is the real issue: `addEventListener` is called inside module-level `ensureTerm`, not inside the `useEffect` body, so the standard `return () => removeEventListener(...)` pattern cannot naturally cancel it. The listener is never torn down for the lifetime of the page — this is a latent leak that becomes real under unmount-remount.

**Recommended fix:** Move `window.addEventListener('resize', _resize)` into the `useEffect` body (not inside `ensureTerm`) so the cleanup return can mirror it:

```js
useEffect(() => {
  if (!open || !containerRef.current) return;
  ensureTerm(containerRef.current);
  if (_term) { _term.clear(); _resize(); }
  if (storyId && storyId !== currentStoryRef.current) {
    currentStoryRef.current = storyId;
    connectWs(storyId);
  }
  window.addEventListener('resize', _resize);
  return () => window.removeEventListener('resize', _resize);
}, [open, storyId]);
```

Then remove the `window.addEventListener` call from inside `ensureTerm`.

---

### H2 — `OrchPanel` SSE streams are never closed on component unmount

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/OrchPanel.js:52-63`

The `useEffect` that calls `connectStream(reqStory)` (line 52) has no cleanup return. Module-level `_streams` map is populated when a session opens, and `closeStream` is called on status terminal (`done`/`stopped`/`error`) and on manual tab-close. However, if the component itself were unmounted — e.g., the user navigates in a future refactor that conditionally mounts OrchPanel, or the panel is conditionally rendered based on a feature flag — all open `EventSource` connections in `_streams` survive indefinitely. The `onerror` handler calls `closeStream` but only on the specific stream that errored, not all streams.

This is not immediately breaking in the current architecture (OrchPanel is always mounted as a fixed overlay in App), but the lack of any cleanup makes the component non-safe to conditionally render in the future.

**Recommended fix:** Add a cleanup return to the mount-level `useEffect`:

```js
useEffect(() => {
  return () => {
    // Close all SSE streams on unmount
    Object.keys(_streams).forEach(closeStream);
  };
}, []);
```

---

### H3 — `cleanSessions()` is missing the Authorization header

**File:** `/home/hanzla/development/rcode/server/lib/html/client/orchestrator.js:82-90`

`cleanSessions()` POSTs to `/api/clean-sessions` with only `Content-Type` in the headers. Every other write endpoint in `orchestrator.js` — `runSession` (line 44-49), `stopSession` (line 55-60), `fetchSessions` (line 69-72) — correctly includes `'Authorization': 'Bearer ' + tok`. If the orchestrator enforces bearer-token auth on `/api/clean-sessions` (which it should, given it's a destructive operation), `cleanSessions` will 401 silently — the `.catch(() => ({ removed: 0 }))` swallows the failure and the UI shows "Cleaned 0 sessions" with no error indication.

**Recommended fix:**

```js
export function cleanSessions(olderThanDays = 7) {
  const tok = orchToken();
  return fetch(ORCH_HTTP + '/api/clean-sessions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + tok,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ olderThanDays }),
  })
    .then(r => r.json())
    .catch(() => ({ removed: 0 }));
}
```

---

### H4 — `fetchAndRerender` and auto-refresh do not check `r.ok` before calling `r.json()`

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/App.js:177-178,201-203`

`fetchAndRerender` calls `await r.json()` immediately after `fetch('/api/state')` without checking `r.ok`. If the server returns a non-200 (e.g., 500 or 503 on startup), `r.json()` may throw (if the body is not JSON) — which is caught by the outer `catch` and silently ignored — or worse, returns an error JSON object that gets passed to `setState`, overwriting valid store state with partial/null data. The same pattern appears in the 30s poll at line 201-203.

Both call sites lack response validation before parsing.

**Recommended fix:** Add `if (!r.ok) return;` before calling `.json()` in both locations.

---

## MEDIUM Findings

### M1 — `marked` CDN loaded without a version pin

**File:** `/home/hanzla/development/rcode/server/lib/html/shell.js:23`

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js">
```

`xterm` (line 24) and `xterm-addon-fit` (line 25) are both pinned to exact patch versions (`@5.3.0`, `@0.8.0`). `marked` is loaded at `latest` via `npm/marked/marked.min.js` with no version pin at all. This means any semver-major breaking release of `marked` (v15+ already exists) silently updates on the next CDN cache miss, potentially breaking `FilesView.js` markdown rendering or introducing security regressions. The `esm.sh` imports in `preact.js` are pinned to exact versions — this CDN import violates the same standard applied to all other dependencies.

**Recommended fix:** Pin to an explicit version: `https://cdn.jsdelivr.net/npm/marked@13.0.3/marked.min.js` (or whatever the current stable version is at migration time).

---

### M2 — `FrozenHost` and `LegacyViewSync` are dead code, but the module-level JSDoc block is actively misleading

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/App.js:1-25,80-110`

`FrozenHost` (line 90) and `LegacyViewSync` (line 102) are defined but never instantiated in the render tree — confirmed by searching for `<${FrozenHost}` and `<${LegacyViewSync}` (no matches). The module-level JSDoc (lines 11-24) still describes the coexistence-seam architecture as if it is active: "Legacy client-main.js still registers its own hashchange listener", "App uses LegacyViewSync to imperatively toggle the .active class". Both legacy files are deleted and this seam is gone. A future maintainer reading the file header will be confused about the architecture that no longer exists.

Dead code is a 6-month maintainability issue: the definitions of `FrozenHost` and `LegacyViewSync` and their associated JSDoc blocks should be removed, and the module header should be updated to reflect the post-31.4 state.

---

### M3 — `showToast` is duplicated: defined locally in `DecisionsView.js` rather than imported

**File:** `/home/hanzla/development/rcode/server/lib/html/client/views/DecisionsView.js:33-38`

`DecisionsView.js` defines its own `showToast()` (lines 33-38) — a verbatim copy of the version in `shared.js`. Sprint 31.4 promoted `showToast` from a window global to an export of `shared.js` and updated `KanbanView.js`, `FilesView.js`, and `OrchPanel.js` to import it. `DecisionsView.js` was not updated and still carries its own copy. If the toast timeout or element-id changes, this copy drifts silently.

**Recommended fix:** Import and remove:

```js
import { showToast } from '../components/shared.js';
// delete lines 33-38
```

---

### M4 — `document.execCommand('copy')` used as clipboard fallback in two files

**Files:**
- `/home/hanzla/development/rcode/server/lib/html/client/components/shared.js:115`
- `/home/hanzla/development/rcode/server/lib/html/client/views/DecisionsView.js:20`

`document.execCommand('copy')` is deprecated and removed in most modern browser contexts when the document is not focused or when called from an async handler. The `navigator.clipboard.writeText()` API is already the primary call — the `execCommand` path is a fallback for environments where `clipboard` is unavailable (non-HTTPS, focus issues). In a localhost dashboard this fallback is rarely needed but the deprecated API appearing in two places is a low-urgency correctness concern. If the fallback fires, it does so silently (no indication it succeeded or failed differently).

Note: `DecisionsView.js:20` also contains `CmdHintItem` — a local reimplementation of `CmdHint` from `shared.js`, which is another duplication instance. Both `CmdHintItem` and `showToast` in `DecisionsView.js` should be replaced by imports from `shared.js`.

---

### M5 — Stale HTML comment in `shell.js` references "10 un-migrated views" post-deletion

**File:** `/home/hanzla/development/rcode/server/lib/html/shell.js:32-33`

```html
<!-- App renders: sidebar, topbar, migrated views, and frozen placeholder   -->
<!-- hosts for the 10 un-migrated legacy views — all inside this div.       -->
```

This comment was accurate during the coexistence period (sprints 31.1-31.3) but is factually wrong post-31.4. There are no un-migrated views and no frozen placeholder hosts. The App comment at `App.js:247` already acknowledges this ("All 12 views are now Preact — LegacyViewSync no longer needed"). The `shell.js` comment contradicts the code it documents.

---

## LOW Findings

### L1 — `window._preactRefresh` is a surviving window global after the "no window.* globals" cleanup

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/App.js:211-213`

```js
useEffect(() => {
  window._preactRefresh = fetchAndRerender;
}, [fetchAndRerender]);
```

The comment says this is "for any legacy onclick="manualRefresh()" callers". Sprint 31.4 deleted all three legacy modules (`client-main.js`, `client-render.js`, `client-kanban.js`). There are no surviving `manualRefresh()` callers. This global assignment should be audited to verify it is still referenced anywhere in the rendered HTML (search `manualRefresh` in the full codebase). If not, the `useEffect` and global assignment are dead.

---

### L2 — `RoadmapView.js` module JSDoc mentions a deferred `window._roadmapControl` that was never implemented

**File:** `/home/hanzla/development/rcode/server/lib/html/client/views/RoadmapView.js:11-12`

The doc comment says: "Keyboard E/C (expand/collapse-all) handled via global keydown in App; this component exposes expandAll/collapseAll via `window._roadmapControl` so App can reach in. (Proper context/ref wiring deferred to 31.4.)" Sprint 31.4 completed but `window._roadmapControl` was never set (confirmed: zero matches in the file body). The E/C keyboard shortcut is therefore not implemented. The comment now describes a deferred feature with no tracking issue and a falsely-implied completion boundary.

---

### L3 — `App.js` JSDoc (module header) describes the coexistence-seam architecture that no longer exists

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/App.js:11-24`

The entire "COEXISTENCE-SEAM NOTE" block (lines 11-24) describes how legacy `client-main.js` runs alongside Preact, how `FrozenHost` keeps legacy innerHTML intact, and how `LegacyViewSync` imperatively toggles classes. All three legacy files are deleted and none of this is active. The note should be replaced with an accurate post-31.4 description.

---

### L4 — `OrchPanel` footer Stop button uses inline `style` to hide/show instead of a class

**File:** `/home/hanzla/development/rcode/server/lib/html/client/components/OrchPanel.js:271`

```js
style=${hasStream ? '' : 'display:none'}
```

The project-level `CLAUDE.md` states "NEVER use Style Attribute — use regular className and css classes and tailwind declarations instead." While this rule was written for React/Tailwind projects and `display:none` via class is idiomatic in plain CSS dashboards, the pattern is inconsistent with how other show/hide decisions are made in this codebase (which use conditional rendering `? html\`...\` : null`). Using a CSS class (e.g., `class=${hasStream ? '' : 'hidden'}`) or conditional rendering `${hasStream ? html\`...\` : null}` would be consistent.

---

## Dashboard Server Verification

`dashboard.js` confirmed clean: no POST/PUT/DELETE handlers, no write endpoints, no framework dependencies, remains pure Node stdlib. The `/js/` route traversal protection uses defense-in-depth (regex + `path.resolve` containment). The orchestrator token endpoint (`/api/orch-token`) is read-only. No new write endpoints were introduced in this phase.

## Required Fixes

4 items require action before this phase can be marked clean:

1. **H1** — Add `removeEventListener` cleanup for the `resize` listener in `XtermPanel.js:useEffect`.
2. **H2** — Add unmount cleanup in `OrchPanel.js` to close all open SSE streams.
3. **H3** — Add `Authorization: Bearer` header to `cleanSessions()` in `orchestrator.js`.
4. **H4** — Add `r.ok` check before `.json()` in `fetchAndRerender` and the 30s poll in `App.js`.

## Optional Improvements

5 items worth addressing in a follow-on cleanup commit (not blocking):

- **M1** — Pin `marked` CDN to an explicit patch version.
- **M2/L3** — Remove dead `FrozenHost` + `LegacyViewSync` definitions and update `App.js` module header.
- **M3** — Replace `DecisionsView.js:showToast` and `CmdHintItem` with imports from `shared.js`.
- **L1** — Verify `window._preactRefresh` is still needed; remove if no callers remain.
- **L2** — Resolve or file a ticket for the deferred `window._roadmapControl` / E-C keyboard shortcut noted in `RoadmapView.js` JSDoc.
