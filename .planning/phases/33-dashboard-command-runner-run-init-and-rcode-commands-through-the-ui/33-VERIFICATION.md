---
status: passed
phase: 33
generated: 2026-05-16T07:45:00Z
human_uat_pending: true
---

# Phase 33 Verification — Dashboard Command Runner

**Verifier:** rcode-phase-verifier
**Scope:** server/orchestrator.js, server/lib/html/client/orchestrator.js, server/lib/html/client/views/OrchestrationView.js, server/lib/html/css.js, server/dashboard.js
**Baseline commit:** 4c6a180
**HEAD at verification:** 990bdd9

---

## Goal Statement (restated for backward tracing)

A command-runner in the dashboard UI to launch `init` and other safe rcode commands via the orchestrator service (server/orchestrator.js, :7718), output streaming to the existing WebSocket terminal. A server-side allowlist (COMMAND_ALLOWLIST) is the security boundary. dashboard.js stays pure-stdlib view-only.

---

## Must-Haves (from phase goal + sprint frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | COMMAND_ALLOWLIST (12 commands) exists in server/orchestrator.js as a named const with security-boundary comment | VERIFIED | orchestrator.js:54-73, Set with 12 `/rcode-*` entries |
| 2 | Gate fires for any `cmd-` prefixed storyId, including empty/null body.cmd (H1 fix) | VERIFIED | orchestrator.js:201-207, `typeof body.cmd === 'string' ? body.cmd.trim() : ''` + `!reqCmd` check |
| 3 | Non-`cmd-` storyIds are NOT gated (existing Run buttons unaffected) | VERIFIED | behavioral test D: `phase-1` + `/rcode-execute` → HTTP 409 (running), not 403 |
| 4 | client/orchestrator.js exports `runCommandFromUI` and `ALLOWED_COMMANDS` (12 entries) | VERIFIED | client/orchestrator.js:229-242, 258-279 |
| 5 | Server and client allowlists are identical (same 12 commands) | VERIFIED | sorted diff confirmed zero divergence |
| 6 | OrchestrationView.js has `CommandRunner` component (dropdown + Run button) wired to `runCommandFromUI` | VERIFIED | OrchestrationView.js:86-136, `<${CommandRunner}/>` at line 151 |
| 7 | XtermPanel is reused (not rebuilt) — terminal opened via `setState({ terminal: {...} })` into existing store field | VERIFIED | client/orchestrator.js:264-265, XtermPanel.js reads same `store.terminal` field |
| 8 | dashboard.js is unchanged across phase 33 | VERIFIED | `git log 4c6a180..HEAD -- server/dashboard.js` returns empty; no write endpoints found |
| 9 | No build step, no new dependencies | VERIFIED | no package.json/pnpm-lock.yaml diff; client files use CDN ESM imports only |
| 10 | `node --check` passes on all modified .js files | VERIFIED | all three files: orchestrator.js, client/orchestrator.js, OrchestrationView.js — syntax OK |

---

## Artifact Verification (4-Level)

| Artifact | Exists | Substantive | Wired | Data Flows | Status |
|----------|--------|-------------|-------|------------|--------|
| server/orchestrator.js — COMMAND_ALLOWLIST | Y | Y (12 cmds, documented comment) | Y (gate in handleRun lines 201-207) | Y (HTTP 403 confirmed) | VERIFIED |
| client/orchestrator.js — ALLOWED_COMMANDS + runCommandFromUI | Y | Y (12 entries + full error-handling impl) | Y (imported by OrchestrationView.js) | Y (storyId=cmd-* POST confirmed) | VERIFIED |
| OrchestrationView.js — CommandRunner component | Y | Y (dropdown, run button, busy/running states, useEffect cleanup) | Y (rendered at OrchestrationView root line 151) | Y (runCommandFromUI called on click) | VERIFIED |
| css.js — cmd-runner CSS rules | Y | Y (9 rule blocks: .cmd-runner, .cmd-runner-title, .cmd-runner-row, .cmd-runner-select, .cmd-runner-btn, focus/hover/disabled states) | Y (class names match OrchestrationView.js template) | Y (`renderCss()` confirmed) | VERIFIED |

---

## Security Boundary — Behavioral Tests

Tests run against the live orchestrator (127.0.0.1:7718, token from ~/.rcode/orch-token):

| Test | Request | Expected | Actual | Pass |
|------|---------|----------|--------|------|
| (a) cmd-* + empty cmd | `{"storyId":"cmd-x","cmd":""}` | 403 | **HTTP 403** `{"error":"command not in allowlist","cmd":""}` | YES |
| (b) cmd-* + rogue cmd | `{"storyId":"cmd-x","cmd":"/rm-rf"}` | 403 | **HTTP 403** `{"error":"command not in allowlist","cmd":"/rm-rf"}` | YES |
| (c) cmd-* + allowlisted cmd | `{"storyId":"cmd-rcode-status","cmd":"/rcode-status"}` | NOT 403 | **HTTP 200** `{"storyId":"cmd-rcode-status","pid":...,"status":"running"}` | YES |
| (d) non-cmd storyId | `{"storyId":"phase-1","cmd":"/rcode-execute"}` | NOT 403 | **HTTP 409** (already running — no allowlist gate) | YES |

**H1 bypass fix confirmed:** empty `body.cmd` on a `cmd-` storyId now returns 403 (previously fell through via JS truthiness to `/rcode-dev-story cmd-*` fallback). Fix is at orchestrator.js:201-207.

---

## Review Finding Resolution

All required and recommended fixes from 33-REVIEW.md were applied (commits 190a2fa, df33edc):

| Finding | Severity | Applied | Evidence |
|---------|----------|---------|----------|
| H1 — falsy body.cmd bypass | HIGH | YES | orchestrator.js:201-207, `reqCmd` pattern; behavioral test (a) confirms 403 |
| M1 — stale JSDoc `runAndOpenTerm` | MEDIUM | YES | OrchestrationView.js:84: "via runCommandFromUI → runSession" |
| M2 — undefined `--bg-sidebar` fallback | MEDIUM | YES | css.js:2269: `var(--bg-input, var(--bg-elev-2))` |
| L1 — setTimeout not cancelled on unmount | LOW | YES | OrchestrationView.js:99-103: `useEffect` with `clearTimeout` cleanup |
| L2 — activeSessions unused destructure | LOW | YES | OrchestrationView.js:87: `useStore();` with explanatory comment |
| L3 — cleanSessions dead endpoint | LOW | DEFERRED | Pre-existing gap, GH issue filed per 33-REVIEW.md note |

---

## Anti-Pattern Scan

Scan of all phase 33 modified files for TODO, FIXME, placeholder, hardcoded-empty, empty-return:

Result: zero hits. No blockers, no warnings.

---

## Human UAT Pending

The following cannot be verified by static/structural/behavioral analysis:

1. Command picker dropdown renders visibly with 12 entries, first entry `/rcode-init`.
2. Selecting a command and clicking Run opens XtermPanel with live PTY output.
3. Run button shows "Starting..." for ~2s then "Running..." while session is active.
4. Duplicate Run prevention: button remains disabled while session is active.
5. Existing Phase/Sprint Run buttons are visually unaffected.
6. No uncaught JS errors in DevTools console.
7. Stop button on a cmd-* session terminates within 5s.

These are pending human UAT at `http://localhost:7717` (Orchestration tab).

---

## File Size Check

| File | Lines | Limit | Status |
|------|-------|-------|--------|
| server/orchestrator.js | 362 | 1000 | OK |
| server/lib/html/client/orchestrator.js | 279 | 1000 | OK |
| server/lib/html/client/views/OrchestrationView.js | 167 | 1000 | OK |

---

## Overall Verdict

**Status: passed (human UAT pending)**

All structural, wiring, and behavioral security checks pass. The security boundary is correctly implemented and the H1 bypass was fixed before this verification ran. The only remaining items are in-browser visual/interactive checks that require a human at the dashboard. Those are documented above and do not change the automated verdict.
