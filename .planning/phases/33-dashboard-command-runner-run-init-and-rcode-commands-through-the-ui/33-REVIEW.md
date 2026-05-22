---
status: clean
phase: 33
critical: 0
high: 0
medium: 0
low: 1
generated: 2026-05-16T02:03:44Z
fixed: 2026-05-16
fixed_by: rcode-fixer
open: L3 (pre-existing gap — cleanSessions calls /api/clean-sessions which is unimplemented; deferred to GH issue, no user-visible regression)
---

# Phase 33 Code Review — Dashboard Command Runner

**Reviewer:** rcode-reviewer
**Scope:** Commits 4c6a180..HEAD on branch 31-preact-migration
**Files reviewed:**
- `server/orchestrator.js`
- `server/lib/html/client/orchestrator.js`
- `server/lib/html/client/views/OrchestrationView.js`
- `server/lib/html/css.js`

---

## Security Assessment — Allowlist Gate

### Gate logic (lines 192–201, `server/orchestrator.js`)

The gate is:

```
if (storyId.startsWith('cmd-') && body.cmd && !COMMAND_ALLOWLIST.has(String(body.cmd).trim()))
```

**Positive findings:**

- The `storyId.startsWith('cmd-')` discriminant is correct and provably does not fire on existing dev-run sessions (`phase-*`, `sprint-*`, raw story IDs). The pre-execution check in 33-CHECK.md identified and fixed the original design flaw before it shipped.
- `.trim()` on both the check and the 403 body prevents leading/trailing whitespace bypass.
- `COMMAND_ALLOWLIST.has()` is an exact-string match. Semicolons, extra args, newlines, and case variations are all blocked (`/rcode-init; rm -rf /`, `/RIHAL-INIT`, `/rcode-init --arg` all fail the `.has()` test, confirmed by test).
- `pty.spawn(CLAUDE_BIN, [cmd, '--dangerously-skip-permissions'], ...)` is called with an explicit `args` array — not `sh -c`. Shell metacharacters in `cmd` are inert at the OS level because execvp receives them as a single positional argument to `claude`. No shell injection surface.
- Auth check at line 323 fires before route dispatch and before `handleRun`. The allowlist gate is inside an already-authenticated request.
- Server binds to `127.0.0.1` only (line 347). Network exposure is loopback-only.
- `dashboard.js` is untouched in all phase 33 commits (verified via `git log -- server/dashboard.js`).

---

## Findings

### HIGH

**H1 — `server/orchestrator.js:198` — Allowlist bypass via falsy `body.cmd` on `cmd-` storyId**

The gate condition is `storyId.startsWith('cmd-') && body.cmd && !COMMAND_ALLOWLIST.has(...)`. The second operand (`body.cmd`) is a JavaScript truthiness check, not a presence check. If an attacker (authenticated, on localhost) sends `{ storyId: "cmd-evil", cmd: "" }` or `{ storyId: "cmd-evil", cmd: null }` or omits `cmd` entirely, the condition short-circuits at `body.cmd` — the allowlist is never consulted.

Execution then falls to line 219:
```js
const cmd = String(body.cmd || `/rcode-dev-story ${storyId}`);
```

With `storyId = "cmd-evil"` and `body.cmd = ""`, this resolves to `/rcode-dev-story cmd-evil`, which is a harmless rcode call with a garbage story ID. This is NOT a remote code execution path — the result is an unexpected Claude invocation, not a shell escape. However, the allowlist is supposed to be the authoritative boundary for `cmd-` sessions. A bypassed check, even one with limited damage in the current implementation, is a design flaw: the safety relies on line 219's fallback rather than the stated security boundary.

The threat is real only for a token-holding local attacker who wants to invoke an off-list command via the `cmd-` path. This is low-probability but the bypass is real and the design comment at line 193 says "This prefix check is the authoritative discriminant" — which it currently is NOT when `body.cmd` is falsy.

**Recommended fix:**
```js
// Replace the truthiness check with an explicit presence+type check:
if (storyId.startsWith('cmd-')) {
  const reqCmd = typeof body.cmd === 'string' ? body.cmd.trim() : '';
  if (!reqCmd || !COMMAND_ALLOWLIST.has(reqCmd)) {
    json(res, 403, { error: 'command not in allowlist', cmd: reqCmd });
    return;
  }
}
```

This makes the gate fire whenever `storyId` starts with `cmd-`, regardless of whether `body.cmd` is present, empty, or falsy. A `cmd-` session with no command is rejected (403) rather than silently falling back to `/rcode-dev-story cmd-*`.

---

### MEDIUM

**M1 — `server/lib/html/client/views/OrchestrationView.js:84` — Stale JSDoc after Sprint 33.3 rewrite**

The JSDoc comment for `CommandRunner` (line 82–85) reads:

```
* State is local (useState) — no store changes needed; runCommandFromUI handles
* all session and terminal state via runAndOpenTerm.
```

Sprint 33.3 rewrote `runCommandFromUI` to call `runSession()` directly — it no longer delegates through `runAndOpenTerm`. `runAndOpenTerm` is not imported in `OrchestrationView.js`. The comment now describes code that does not exist. A maintainer reading this comment to understand the session lifecycle will be misled into looking at `runAndOpenTerm` for error handling, when the actual flow is in `runCommandFromUI` → `runSession`.

**Recommended fix:** Update line 84 to: `* all session and terminal state via runCommandFromUI → runSession.`

---

**M2 — `server/lib/html/css.js:2269` — `--bg-sidebar` fallback token is undefined in the design system**

The rule `.cmd-runner-select` uses:
```css
background: var(--bg-input, var(--bg-sidebar));
```

`--bg-sidebar` does not exist in the `:root` token block (confirmed via automated check). The 33-3-SUMMARY and 33-CHECK.md note this: "The `--bg-sidebar` fallback is harmless — `--bg-input` IS defined". That is true today. If `--bg-input` is ever removed or renamed, the silent fallback cascades to `--bg-sidebar` which is also undefined, leaving the select background unset (transparent). The double-undefined case will produce a rendering regression that is silent and hard to trace.

**Recommended fix:** Replace with a token that actually exists in the design system:
```css
background: var(--bg-input, var(--bg-elev-2));
```
`--bg-elev-2` (`#161718`) is the correct semantic substitute for an input surface on a card.

---

### LOW

**L1 — `server/lib/html/client/views/OrchestrationView.js:102` — `setTimeout` not cancelled on unmount**

```js
setTimeout(() => setBusy(false), 2000);
```

If `CommandRunner` unmounts within 2 seconds of a Run click (e.g., the user navigates to another view), `setBusy(false)` fires on an unmounted component. In Preact, calling `setState` on an unmounted component is a no-op (no crash), but the timer leaks. In the current codebase this view is never unmounted in practice (it's always visible on the Orchestration tab). It is nevertheless a pattern that the 6-month test catches: the next developer who conditionally mounts this component will get a dangling-timer bug.

**Recommended fix:** Wrap in `useEffect` with a cleanup:
```js
useEffect(() => {
  if (!busy) return;
  const t = setTimeout(() => setBusy(false), 2000);
  return () => clearTimeout(t);
}, [busy]);
// Remove the setTimeout call from handleRun; just call setBusy(true).
```

---

**L2 — `server/lib/html/client/views/OrchestrationView.js:87` — `activeSessions` destructured but unused in `CommandRunner`**

```js
const { activeSessions } = useStore();
```

`activeSessions` is never referenced inside `CommandRunner`. The `useStore()` call is intentional — it forces re-renders when the poll fires — but the destructured value is unused. This is a false signal: a reader assumes the component uses the sessions list directly.

**Recommended fix:** Document the intent:
```js
useStore(); // subscribe to store updates so isSessionRunning() re-evaluates on each poll
```

Or use a named variable that makes the intent explicit:
```js
useStore(); // force re-render on activeSessions poll (isSessionRunning reads getState() internally)
```

---

**L3 — `server/lib/html/client/orchestrator.js:83` — `cleanSessions()` calls a non-existent server endpoint**

`POST /api/clean-sessions` is not implemented in `server/orchestrator.js`. This is a pre-existing gap (present before phase 33, confirmed via `git show b0f5090`). Phase 33 did not introduce it. It is raised here because phase 33 added new imports and exports from the same file and the gap should be tracked.

**Recommended action:** File a GH issue (not a blocker for this phase). The function silently returns `{ removed: 0 }` on the `.catch()` path and is not currently called from any UI, so there is no user-visible regression.

---

## Pattern Check

- Existing Run buttons (`RunBtn`, `runStory`, `SprintCard`, `PhaseCard`) were confirmed unaffected. The `cmd-` prefix gate is the correct discriminant and does not fire on `phase-*`, `sprint-*`, or raw story IDs.
- Auth check fires before route dispatch and before allowlist check. Order is correct.
- `pty.spawn` uses an explicit args array — no shell interpolation.
- `dashboard.js` untouched across all phase 33 commits.
- No new dependencies. No new dashboard.js endpoints. No build step.
- All 12 ALLOWED_COMMANDS generate storyIds that satisfy `STORY_ID_RE` (`/^[A-Za-z0-9._-]+$/`).
- CSS tokens used in `.cmd-runner` block: 13 of 14 are defined in `:root`. The one undefined token (`--bg-sidebar`) is a fallback only and is noted in M2.
- File sizes: `orchestrator.js` 356 lines, `client/orchestrator.js` 279 lines, `OrchestrationView.js` 161 lines — all within limits. `css.js` is exempt.
- Conventional commit format followed across all 8 commits. No AI attribution present.

---

## Required Fixes

| ID | Severity | File | Fix |
|----|----------|------|-----|
| H1 | HIGH | `server/orchestrator.js:198` | Replace truthiness check on `body.cmd` with explicit type+presence guard — see recommended fix above |
| M1 | MEDIUM | `server/lib/html/client/views/OrchestrationView.js:84` | Update stale JSDoc — `runAndOpenTerm` is no longer the delegate |
| M2 | MEDIUM | `server/lib/html/css.js:2269` | Replace `var(--bg-sidebar)` fallback with a defined token (`var(--bg-elev-2)`) |

## Optional Improvements

| ID | Severity | File | Note |
|----|----------|------|------|
| L1 | LOW | `OrchestrationView.js:102` | Wrap `setTimeout` in `useEffect` with cleanup to prevent dangling timer |
| L2 | LOW | `OrchestrationView.js:87` | Replace silent unused destructure with a comment explaining why `useStore()` is called |
| L3 | LOW | `client/orchestrator.js:83` | Track dead `cleanSessions()` → `/api/clean-sessions` endpoint in a GH issue |
