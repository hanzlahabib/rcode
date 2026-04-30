---
name: rihal-browser-verify
description: Use Chrome DevTools MCP to verify browser behaviour — DOM state, console errors, network requests,.
triggers:
  - "verify in browser"
  - "check the dom"
  - "browser test"
  - "dev tools mcp"
  - "screenshot diff"
  - "console errors"
  - "network trace"
  - "browser smoke test"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

A passing build doesn't mean a working UI. This skill drives Chrome via the DevTools MCP server to inspect actual runtime: DOM nodes, console output, network requests, computed CSS, performance traces, and screenshots. Especially valuable for Three.js (where `getComputedStyle` lies and frame timing is the only truth), scroll-driven UI, and bisecting "works on dev, breaks on prod".

## Pre-flight

Chrome DevTools MCP must be available. If not, halt with: *"DevTools MCP not configured. Enable it before running this skill — without browser inspection we'd be guessing from HTML."*

## Workflow

1. **Identify the surface to verify.** A specific URL, route, or component path.
2. **Choose verification mode:**
   - **Static** — DOM + computed CSS + screenshot (default; fast)
   - **Dynamic** — record interactions; capture before/after states
   - **Performance** — trace, FPS, paint flame chart (for Three.js, animations, smooth-scroll libs)
   - **Network** — failed requests, slow waterfalls, missing resources
3. **Boot the dev server** (or open the prod URL). Confirm it loads without console errors first.
4. **Run the appropriate DevTools queries.** For DOM: `document.querySelector(...).getBoundingClientRect()` etc. For perf: start trace, exercise the surface, stop trace.
5. **Diff against expectation.** Either a stored baseline screenshot or a verbal description from the user.
6. **Report findings** with concrete evidence — pixel coordinates, console messages verbatim, network failures by URL, frame times in ms.

## Output Format

```
Surface verified: <URL or route>
Mode: <static | dynamic | performance | network>

Findings:
  ✓ <thing that passed>
  ⚠ <warning, with evidence>
  ✗ <failure, with evidence>

Console output (filtered for errors/warnings):
  <verbatim>

Recommendation:
  <next action — fix, defer, or accept>
```

Do NOT include: "looks fine to me" without inspection; subjective "the page seems slow" without a trace; fixes applied without re-verifying.

## Examples

**Happy path — Three.js perf** — "Hero scene drops to 20fps on entry" → record perf trace → identify long task in `setupGeometry()` → recommend deferring `geometry.computeVertexNormals()` to a Web Worker → verify trace post-fix shows steady 60fps.

**Happy path — scroll-driven UI** — "Tabs switch on scroll but layout jumps" → static check shows `position: sticky` conflicts with `transform` on parent → fix; re-verify with screenshot diff.

**Edge case — works on dev, breaks on prod** — Console shows "ChunkLoadError" only on prod. Network trace shows missing `/_next/static/chunks/...js` (404). Recommend: re-deploy or check CDN purge.

**Negative — no DevTools MCP** — Halt. Without DevTools the skill is a guess; the user gets a clear error and a path to enable it.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (frontend layer detection)
- **Writes:** append to `.rihal/memory/incidents/known-issues.md` if a browser-runtime bug is acknowledged but not fixed in this session
