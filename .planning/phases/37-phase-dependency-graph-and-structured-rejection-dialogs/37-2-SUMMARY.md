---
sprint: 37.2
status: complete
commits:
  - 5eb0e34 feat(dashboard): add POST /api/reject and GET /api/rejections to orchestrator
  - 1d25180 feat(dashboard): add submitRejection/fetchRejections to client orchestrator
  - 828d85d feat(dashboard): add RejectDialog Preact component
  - d8b44b3 feat(dashboard): wire Reject button and rejection display into OrchCard
  - 9e043b2 feat(dashboard): add CSS for reject overlay, dialog, and orch-card-rejection
key-files:
  - server/orchestrator.js
  - server/lib/html/client/orchestrator.js
  - server/lib/html/client/components/RejectDialog.js
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/css.js
---

## Sprint 37.2 — Structured Rejection Dialogs

All five tasks completed. GATE-1 and GATE-2 are satisfied.

### What was built

**server/orchestrator.js** — Two new endpoints behind the existing `authed()` Bearer-token gate:
- `POST /api/reject` validates `storyId`, enforces non-empty reason (server-side GATE-1), caps at 2000 chars, and appends `{ storyId, phase, reason, ts }` to `~/.rcode/rejections.json`.
- `GET /api/rejections` returns the full rejections array from disk.
- `readRejections()` / `appendRejection()` helpers follow the same pattern as the existing `loadHistory()` / `persistRun()`. `dashboard.js` is untouched.

**server/lib/html/client/orchestrator.js** — Two new exported functions:
- `submitRejection(storyId, reason, phase)` — POST to `/api/reject` with Bearer token.
- `fetchRejections()` — GET `/api/rejections`, returns array (empty on error).
- `_poll()` now runs `fetchRejections()` in parallel with the existing fetches and merges a `rejection` field onto matching sessions by `storyId`.

**server/lib/html/client/components/RejectDialog.js** — New Preact component. Props: `{ session, onClose }`. Submit button disabled until `reason.trim()` is non-empty (GATE-1 client side). Escape and backdrop click both invoke `onClose`. Uses `showToast()` for success/error feedback. No `style` attribute, no browser dialogs.

**server/lib/html/client/views/OrchestrationView.js** — `OrchCard` changes:
- `useState(false)` for `showReject` controls the dialog.
- Reject button renders only when `s.waiting === true` (checkpoint sessions only).
- `orch-card-rejection` div renders when `s.rejection` is present (GATE-2 surface).
- `RejectDialog` mounted at the end of the card tree when `showReject` is true.

**server/lib/html/css.js** — New `/* ── Reject dialog ── */` block appended before the closing tag. All classes use design tokens confirmed present in the file: `--bg-elev-2`, `--border`, `--radius-2`, `--radius-3`, `--shadow-lg`, `--bg-input`, `--font-sans`, `--accent-red`, `--text-md`, `--text-xs`, `--text-primary`, `--space-*` set.

### Verification results

- `node --check server/orchestrator.js` — pass
- `node --input-type=module --check` on all three client modules — pass
- `node server/dashboard.js` boots and serves `/` — pass
- `git diff --name-only -- server/dashboard.js` — empty (view-only boundary intact)
- All grep acceptance checks — pass
