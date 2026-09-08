# App Router Patterns — Deep Reference

Extended reference for the Next.js App Router. Load this when the SKILL.md
overview isn't specific enough — for example when you need the exact file
convention list, a caching-model comparison across Next.js versions, or the
middleware matcher syntax in full.

## Contents
- File Conventions Reference
- Route Groups and Private Folders
- Parallel and Intercepting Routes
- The Caching Model, Version by Version
- Middleware/Proxy Matcher Syntax
- Server Actions and Mutations
- Common Migration Traps (Pages Router → App Router)
- Anti-Pattern Catalog

## File Conventions Reference

Each file below is special only inside `app/` (or `src/app/`) and only when
named exactly this way at a route segment:

| File | Purpose | Notes |
|---|---|---|
| `layout.tsx` | Shared UI wrapping a segment and its children | Does not re-render on navigation between sibling pages; must accept and render `children` |
| `page.tsx` | Unique UI for a route, makes the segment publicly reachable | A segment with no `page.tsx` is not a navigable route |
| `route.ts` | API endpoint for a segment | Mutually exclusive with `page.tsx` in the same segment — a segment is either a page or an API route, never both |
| `loading.tsx` | Instant loading UI | Auto-wraps `page.tsx` and below in a `<Suspense>` boundary |
| `error.tsx` | Error boundary UI | Must be a Client Component (`'use client'`) — error boundaries rely on React lifecycle methods |
| `not-found.tsx` | 404 UI for a segment | Triggered by calling `notFound()` from `next/navigation` or an unmatched route |
| `template.tsx` | Like `layout.tsx` but re-mounts (fresh state) on navigation | Rare — only reach for this when a layout's state must reset per navigation, e.g. re-triggering an enter animation |
| `default.tsx` | Fallback UI for a parallel route slot | Only relevant when using `@slot` parallel routes |

## Route Groups and Private Folders

- `(groupName)` — a folder wrapped in parentheses organizes routes/layouts
  without adding a URL segment. Use it to apply a different root layout to
  a subset of routes (e.g. `(marketing)` vs `(app)`) without changing any
  URLs.
- `_folderName` — a leading underscore opts a folder out of routing
  entirely, useful for co-locating components, utilities, or tests inside
  `app/` without Next.js treating them as route segments.
- `@slotName` — parallel route slots, rendered simultaneously in a shared
  layout. Each slot is its own independently-streamable subtree with its
  own `loading.tsx`/`error.tsx`.

## Parallel and Intercepting Routes

These are advanced conventions — confirm the actual need before recommending
them, since they add real complexity:

- **Parallel routes** (`@slot`) let a layout render multiple pages at once
  in the same view — e.g. a dashboard with independently-loading `@analytics`
  and `@team` slots. Each slot needs its own `default.tsx` for the case
  where it doesn't match the current URL.
- **Intercepting routes** (`(.)segment`, `(..)segment`, `(...)segment`) let
  a route load a different UI when navigated to from within the app (e.g. a
  photo opening in a modal) versus a full page load (e.g. a direct link or
  refresh, which shows the full page). The dot-count controls how many
  segment levels up the interception reaches.
- Combining both is the standard pattern for a "modal that's also a
  shareable full page" — a photo grid intercepting into `@modal` for
  in-app navigation, falling through to the full `page.tsx` on direct load
  or refresh.

## The Caching Model, Version by Version

Next.js's caching story changed meaningfully across major versions — always
confirm which model a given codebase is actually on before recommending a
fix.

**Next.js 13/14/15 (fetch-option-driven caching):**
- `fetch()` requests are **uncached by default** (this itself changed
  between 13.x minor versions — very old blog posts describing automatic
  caching are describing an earlier default that no longer applies).
- Opt into caching per-request: `fetch(url, { cache: 'force-cache' })` for
  indefinite caching, or `fetch(url, { next: { revalidate: 3600 } })` for
  time-based revalidation.
- Non-`fetch` data access (ORM/DB clients) has no automatic caching —
  wrap with `unstable_cache` from `next/cache` for cross-request caching,
  or React's `cache()` for single-request deduplication only.
- Route segment config (`export const dynamic`, `export const revalidate`,
  `export const fetchCache`) sets defaults for an entire layout/page; these
  compose with the lowest `revalidate` across a route winning.
- Invalidate on demand with `revalidateTag(tag)` or `revalidatePath(path)`,
  called from a Server Action or Route Handler after a mutation.

**Next.js 16+ (Cache Components, opt-in via `cacheComponents` flag):**
- Introduces the `'use cache'` directive, applied to a function or a
  component file, as the primary caching mechanism — this is a different
  mental model from fetch-option-driven caching, not just new syntax.
- `'use cache: private'` exists for cached functions that also read
  request-scoped APIs (`cookies()`, `headers()`).
- When this flag is on, do not recommend `unstable_cache` or per-fetch
  `next.revalidate` options as the primary fix — check whether the
  target function should instead get a `'use cache'` directive.
- A codebase can have `cacheComponents` on without every function migrated
  yet — treat this as a genuinely mixed-model codebase, not a bug, unless
  the mixing itself causes an inconsistency (e.g. a cached component
  calling an uncached-by-default fetch that the author assumed was cached).

**Cross-cutting concept: memoization vs caching.** These are two different
layers and conflating them is a common review mistake:
- **Memoization** (`fetch` auto-memoization, React's `cache()`) dedupes
  identical calls *within a single render pass* — it does not persist
  across requests.
- **Caching** (`force-cache`, `next.tags`+`revalidate`, `unstable_cache`,
  `'use cache'`) persists results *across requests* until revalidated.
A function using only `cache()` with no caching layer will still re-run in
full on every new request — that's correct behavior for per-request
dedup, not a caching bug, unless the intent was actually cross-request
caching.

## Middleware/Proxy Matcher Syntax

- Path parameters: `/about/:path` matches `/about/a` but not `/about/a/b`.
- Modifiers: `:path*` (zero or more segments), `:path+` (one or more),
  `:path?` (zero or one).
- Regex in parens: `/about/(.*)`  is equivalent to `/about/:path*`.
- Matchers must be **statically analyzable string literals** — a matcher
  built from a variable or computed at runtime is silently ignored by the
  build-time matcher compiler.
- Negative lookahead is the standard way to exclude static assets and keep
  middleware/proxy from running on every asset request:
  ```ts
  export const config = {
    matcher: [
      '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
  }
  ```
- `has`/`missing` conditions (header/cookie/query presence) let a matcher
  target requests more precisely than path alone — e.g. only running on
  prefetch requests, or only when a session cookie is absent.
- **`_next/data` routes are never excludable**, even by a negative-lookahead
  matcher that appears to cover them — Next.js still invokes middleware/proxy
  for these paths intentionally, so a page protected by middleware can't
  have its data route accidentally left unprotected.

## Server Actions and Mutations

- A Server Action (`'use server'` at the top of a function or module) is
  invoked as a POST request to the route that renders the component calling
  it — it is not a separate, independently-routable endpoint. This matters
  for middleware/proxy matchers: excluding a path excludes that path's
  Server Actions too.
- Never trust a Server Action's caller-side context (e.g. assuming a button
  is only rendered for authorized users) as the authorization check — a
  Server Action is a public network endpoint the moment it exists, callable
  directly regardless of which component rendered the trigger. Re-check
  auth/authz inside the action itself.
- After a mutation, revalidate the data it affects (`revalidateTag`,
  `revalidatePath`, or a client-side router refresh) — a Server Action with
  no corresponding cache invalidation will silently serve stale reads.

## Common Migration Traps (Pages Router → App Router)

- `getServerSideProps`/`getStaticProps`/`getInitialProps` have no App
  Router equivalent function — their job is replaced by `async` Server
  Components fetching data directly.
- `_app.tsx`/`_document.tsx` become `app/layout.tsx` (root layout) — but
  the root layout must render `<html>` and `<body>` itself, which
  `_document.tsx` did implicitly.
- `next/router`'s `useRouter()` (Pages Router) and `next/navigation`'s
  `useRouter()` (App Router) are different modules with different APIs —
  importing from the wrong one is a common copy-paste bug when migrating
  a component, and it fails at the type level, not silently.
- API routes (`pages/api/*.ts`, single default export with a method
  switch) become Route Handlers (`app/api/*/route.ts`, named exports per
  HTTP verb) — a straight file move without restructuring the exports
  will not compile.
- `middleware.ts` behavior is unchanged in meaning across this migration
  (it predates the Pages/App split and applies to both), but its file name
  changes to `proxy.ts` starting in Next.js 16 — a version fact, not a
  Pages/App Router fact.

## Anti-Pattern Catalog

Quick-reference list of patterns that look reasonable but aren't, for fast
scanning during review:

- `'use client'` at the top of a `layout.tsx` "just to be safe" — forces
  the entire subtree into the client bundle.
- Fetching data in a Client Component with `useEffect` + `useState` when
  the component could be a Server Component — ships unnecessary JS and
  adds a client-server round trip that a Server Component render avoids.
- Awaiting two independent data sources sequentially instead of starting
  both and awaiting with `Promise.all`.
- Assuming `fetch` is cached by default on Next.js 14/15 (it isn't) or
  assuming `'use cache'` semantics apply to a codebase that hasn't enabled
  `cacheComponents`.
- A middleware/proxy file with no `matcher`, silently running (and adding
  latency) on every static asset request.
- Mutating data in a Server Action with no `revalidateTag`/`revalidatePath`
  call, leaving the UI showing stale data after a successful write.
- Wrapping a Context Provider around `<html>` instead of `{children}` in
  the root layout, widening the client/dynamic boundary further than the
  provider actually needs.
- Using `next/dynamic` to code-split a component that's small and always
  rendered above the fold — the added loading state and request round
  trip cost more than the bundle savings.
- Raw `<img>` tags and manually linked `<link rel="stylesheet">` fonts in
  new code instead of `next/image` and `next/font`, losing automatic
  optimization for no benefit.
