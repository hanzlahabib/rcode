# Verifier — Reachability + Live UI Smoke Check (Steps 6b, 10b)

Levels 1-4 (exists, substantive, wired, data-flows) verify an artifact works in
isolation. None of them verify that a real user, starting from the app's actual
entry point, can ever land on it. That gap is how a phase gets marked "passed"
while the delivered page has no nav link, no sidebar entry, and no way in
except typing its exact URL — code-complete, unusable.

**When to run:** Any phase whose must-haves include a user-facing route, page,
or screen (not API-only, not CLI-only, not backend/schema-only phases).

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
