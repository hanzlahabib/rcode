# Verifier — Reachability + Live UI Smoke Check (Steps 6b, 10b)

Levels 1-4 (exists, substantive, wired, data-flows) verify an artifact works in
isolation. None of them verify that a real user, starting from the app's actual
entry point, can ever land on it. That gap is how a phase gets marked "passed"
while the delivered page has no nav link, no sidebar entry, and no way in
except typing its exact URL — code-complete, unusable.

**When to run:** Steps 6b/10b apply to any phase whose must-haves include a
user-facing route, page, or screen. **Step 6c below applies to EVERY phase,
including API-only, CLI-only, and backend/schema-only ones** — the same failure
has a backend shape, and it is the more dangerous one because no missing nav
link makes it visible.

## Step 6b — Reachability (static)

For each user-facing route delivered by this phase:

1. Find the app's navigation surface — the layout/shell component(s) that
   render on every page (e.g. `layout.tsx`, `Nav.tsx`, `Sidebar.tsx`,
   `AppShell.tsx` — whatever this project actually uses).
2. Grep it for a link to the route:
   ```bash
   grep -rn "$ROUTE_PATH" src/app/layout.tsx src/components/Nav* src/components/*Sidebar* 2>/dev/null
   ```
3. If found → Reachable ✓. If not found → Reachable ✗, classify as
   **ORPHANED-FROM-UI**: the code works but no real user can find it without
   the URL bar.

**If the project has no shell/nav component at all yet** — that is itself a
gap, not a reason to skip this check. A phase that ships pages with nowhere to
click from IS the gap. Report it as: "No app shell/navigation exists — every
delivered page is orphaned from UI by definition."

## Step 6c — Production reachability (every phase, no exceptions)

The UI version of this check asks "can a user reach this page". The backend
version asks the same question about code: **is the delivered module reachable
from a production entrypoint, or only from tests?**

For each non-UI artifact this phase delivered (a service, repository, engine,
job, or the function that is the phase's actual deliverable):

1. List every importer of the module:
   ```bash
   grep -rn "from ['\"].*<module-basename>" src/ tests/ app/ lib/ 2>/dev/null
   ```
2. Classify each importer as production or test (`tests/`, `*.test.*`,
   `*.spec.*`, `__tests__/` are tests).
3. **If every importer is a test file → BLOCKING FAIL, classify as
   ORPHANED-FROM-PRODUCTION.** The phase's own tests pass because they import
   the implementation directly; the application calls something else, or
   nothing.

Then verify the opposite direction, which is how the dangerous version hides:

4. Find what production actually calls for this phase's behaviour (the action,
   route handler, or command the user triggers) and read it. Does it call the
   delivered module, or does it re-implement the behaviour inline?
5. **Two implementations of the same behaviour side by side — one tested and
   unreachable, one shipped and untested — is a BLOCKING FAIL**, even when the
   suite is fully green. Name both paths in VERIFICATION.md.

**Why this is blocking:** confirmed live on a real project — a phase whose whole
purpose was "closing a cycle produces an immutable snapshot" shipped with the
production close-action setting a status field and returning, while the
snapshot-producing service had exactly one importer in the repo: its own test.
Green suite, verified phase, feature that never ran. The audit-attribution seam
failed the same way, in the same commit range, for the same reason.

**This check subsumes "the tests pass".** A passing test that imports the
implementation directly proves the implementation works. It proves nothing about
whether anything calls it.

## Step 10b — Live smoke check (dynamic)

Static reachability (6b) can be fooled by a nav link that renders but is
broken, hidden, or dead. Confirm it live:

1. Start the dev server if one isn't already running (check first —
   `curl -s -o /dev/null -w '%{http_code}' $BASE_URL` — don't start a
   duplicate). Note the port and PID so it can be left running or killed
   depending on project convention.
2. Fetch the app's real entry point — the URL a user actually opens first
   (usually `/`, or the post-login landing page), not the new route directly:
   ```bash
   curl -s $BASE_URL/ | grep -o "$ROUTE_PATH" | head -1
   ```
   A hit means the entry point's rendered HTML contains a link to the route.
   No hit means either the link isn't there, it's client-rendered (acceptable
   — note it and move to a browser check if available), or the entry point
   itself is broken.
3. If a browser automation tool is available in this session, prefer it over
   curl: open the entry point, look for the nav element, click through to the
   route, confirm the expected content renders. This catches what curl can't
   (JS-rendered nav, auth redirects, broken client routing).
4. If neither curl nor a browser tool can settle it, route to human
   verification (Step 8) — but say explicitly what's unconfirmed ("nav link
   renders in JS, could not click through without a browser tool") rather than
   silently passing it.

## Constraints

- Time-box this to the phase's own routes — don't crawl the whole app.
- If starting the dev server fails (missing DB, missing env vars, port
  conflict) — that is itself a finding. Report it, don't silently skip
  reachability and mark the phase passed.
- Kill any dev server this check started, unless the project's own workflow
  expects it to stay up (check for an existing `pnpm dev` process first).
- This step existing does not replace a human actually looking at the app.
  It catches the mechanical case (no link exists at all). Visual/UX quality
  still routes to human verification per Step 8.
