---
name: nextjs-best-practices
description: When the user is writing, reviewing, or debugging Next.js App Router code. Also use when the user mentions "Next.js," "App Router," "server components," "client components," "'use client'," "route handlers," "Next.js middleware," "Next.js caching," "revalidatePath," "revalidateTag," "Suspense boundary," "loading.js," "hydration error," "Next.js is slow," "bundle size Next.js," "waterfall requests," or pastes a `page.tsx` / `layout.tsx` / `route.ts` file and asks for a review or a fix. Use this even if the user just says something vague like "review my Next.js code" or "is this the right way to fetch data in Next.js" — start with the App Router conventions and work outward. For React component patterns that aren't Next.js-specific (hooks discipline, state boundaries, prop drilling), see react-best-practices. For LLM/agent/prompt engineering inside a Next.js API route, see llm-engineering-best-practices. Do NOT use for Pages Router-only codebases with no `app/` directory, or for non-Next.js React work (plain Vite/CRA apps) — those belong to react-best-practices.
metadata:
  version: 1.0.0
---

# Next.js Best Practices

You are an expert in Next.js App Router (Next.js 14/15, with awareness of Next.js 16 changes). Your goal is to steer code toward current App Router idioms, catch the pitfalls that quietly wreck performance and bundle size, and give specific, file-and-line feedback rather than generic React advice.

## Initial Assessment

Before reviewing or writing code, establish:

1. **Router type** — Is there an `app/` directory? If the project is still on `pages/` with no `app/` directory, this skill mostly does not apply — say so and point at the Pages Router docs or treat it as legacy code to be migrated, not audited against App Router rules.
2. **Next.js version** — Check `package.json` for the `next` version. Next.js 13/14/15 share the same core App Router model described below. Next.js 16 renamed `middleware.ts` to `proxy.ts` and introduced the `cacheComponents` flag with `'use cache'` directives as an evolving caching model — flag version-specific divergences explicitly rather than assuming one model fits all.
3. **Scope** — One file/PR, or a full-app audit? A single component review should stay focused on that component's boundary decisions; a full audit should walk the priority order below.

---

## Review Framework

### Priority Order

1. **Server/Client boundary correctness** (is data and computation running where it should?)
2. **Data fetching and caching** (are requests parallelized, cached, and revalidated correctly?)
3. **Streaming and loading states** (does the user see something meaningful quickly?)
4. **Route conventions and middleware** (are file conventions and edge logic used correctly?)
5. **Bundle size and performance** (what's shipping to the client that shouldn't be?)

---

## 1. Server vs Client Components

**Default assumption: everything in `app/` is a Server Component until proven otherwise.** A file needs `'use client'` only when it needs one of:
- State or event handlers (`useState`, `onClick`, `onChange`)
- Lifecycle hooks (`useEffect`, `useLayoutEffect`)
- Browser-only APIs (`window`, `localStorage`, `navigator.geolocation`)
- A third-party library that itself needs the above

**Red flags to catch:**
- `'use client'` at the top of a `layout.tsx` or `page.tsx` when only one small piece (a search box, a like button) actually needs interactivity. Once a file has `'use client'`, everything it imports and directly renders joins the client bundle — the fix is to push the directive down to the smallest leaf component, not to leave it at the top and eat the bundle cost.
- Server Components passed as `children`/props into a Client Component being reconstructed instead of composed. Server Components can be interleaved via `children` slots (e.g. a client `<Modal>` wrapping a server-rendered `<Cart>`) — this does NOT pull the server component into the client bundle, so don't "fix" this pattern by converting the child to client too.
- Secrets or server-only logic (API keys, DB clients) living in a module that's also imported by a Client Component. Recommend the `server-only` package to turn this into a build-time error instead of a runtime leak.
- React Context providers written without `'use client'` — context is not supported in Server Components. The fix is a thin client wrapper around the provider, imported into a Server Component layout, not making the whole layout client.
- Providers wrapping more of the tree than necessary (e.g. wrapping `<html>` instead of just `{children}`) — this needlessly widens what Next.js has to treat as dynamic/client-scoped.

### Correct pattern
```tsx
// app/blog/[id]/page.tsx — stays a Server Component
import LikeButton from './like-button'
import { getPost } from '@/lib/data'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  return (
    <article>
      <h1>{post.title}</h1>
      <LikeButton likes={post.likes} />
    </article>
  )
}
```
```tsx
// app/blog/[id]/like-button.tsx — only this leaf is client
'use client'
import { useState } from 'react'

export default function LikeButton({ likes }: { likes: number }) {
  const [count, setCount] = useState(likes)
  return <button onClick={() => setCount((c) => c + 1)}>{count} likes</button>
}
```

---

## 2. Data Fetching and Caching

- **Fetch in the component that needs the data**, not in a parent that drills props down — identical `fetch` calls in the same render tree are automatically memoized, so this doesn't cause duplicate requests.
- **Non-`fetch` data access (ORM/DB clients) needs manual dedup** via React's `cache()`. If a query function is called from multiple components in one request without `cache()`, that's an N+1-shaped bug waiting to happen — flag it.
- **Watch for accidental sequential waterfalls.** Two independent `await` calls back-to-back in the same async component block each other for no reason:
  ```tsx
  // Waterfall — getAlbums waits for getArtist even though it doesn't need it
  const artist = await getArtist(username)
  const albums = await getAlbums(username)
  ```
  Fix by starting both before awaiting either:
  ```tsx
  const artistData = getArtist(username)
  const albumsData = getAlbums(username)
  const [artist, albums] = await Promise.all([artistData, albumsData])
  ```
  Only flag this when the two calls are genuinely independent — a call that needs the first result's output (e.g. an ID) as input is correctly sequential, not a bug.
- **Caching is opt-in for `fetch`, not opt-out.** As of Next.js 14/15, `fetch` requests are uncached by default and block rendering until they resolve. Reviewers coming from Next.js 12/13 muscle memory may assume caching is automatic — correct this. Cache with `{ next: { revalidate: N } }` for time-based revalidation, or `{ cache: 'force-cache' }` for indefinite caching until manually invalidated.
- **Tag cached data for on-demand invalidation** (`{ next: { tags: ['post'] } }`) and invalidate it from the Server Action or Route Handler that mutates it, with `revalidateTag('post')` or `revalidatePath('/blog')`. A mutation with no corresponding revalidate call is a bug: the UI will silently serve stale data after a write.
- **On Next.js 16 with `cacheComponents` enabled**, the model shifts to explicit `'use cache'` directives on functions/components rather than fetch-option-driven caching. Don't mix mental models — check which caching model a given codebase is actually on (`next.config.js` → `cacheComponents` flag) before recommending fetch-option changes that a `'use cache'`-based codebase has already superseded.

---

## 3. Streaming and Loading States

- **`loading.js` streams an entire route segment** via an automatic `<Suspense>` boundary around `page.js` and everything below it — reach for it when the whole page's data is slow and there's nothing meaningful to show before it resolves.
- **`<Suspense>` directly in the page streams just the slow part**, letting static/fast content (headers, nav, above-the-fold copy) render immediately while a skeleton fills in for the slow section. Prefer this over `loading.js` when part of the page is already fast — an app-wide `loading.js` that blanks the whole screen for one slow widget is a common regression to flag.
- **A layout that reads `cookies()`, `headers()`, or an uncached fetch does not fall back to the route's `loading.js`** — it blocks navigation until it finishes rendering. If a layout needs runtime data, wrap that specific access in its own `<Suspense>` boundary, or move the fetch into `page.js` where `loading.js` actually covers it.
- **Sequential-but-necessary fetches inside a page should still show something fast.** Wrap the dependent (slower) piece in `<Suspense>` so the independent, already-resolved data renders immediately instead of gating the whole page on the slowest fetch.

---

## 4. Middleware / Proxy and Route Conventions

- **File convention check**: `layout.tsx` (shared UI + state across a segment, does not re-render on navigation between children), `page.tsx` (unique UI for a route, required to make a segment publicly reachable), `route.ts` (API endpoint — mutually exclusive with `page.tsx` in the same segment), `loading.tsx`, `error.tsx` (must be a Client Component), `not-found.tsx`. Route groups `(name)` organize files without affecting the URL; parallel/intercepting route conventions (`@slot`, `(.)segment`) are advanced and easy to misuse — confirm the author actually needs them before endorsing them.
- **Middleware naming**: on Next.js up to 15, the convention is `middleware.ts` at the project root (or inside `src/`). Next.js 16 renamed this file convention to `proxy.ts` (the `middleware` name is deprecated, not removed) — check the actual Next.js version before insisting on one name over the other, and don't "fix" a 15.x project's `middleware.ts` to `proxy.ts` unless the project has actually upgraded.
- **Always scope with a `matcher`.** Without one, middleware/proxy runs on every request including `_next/static`, image optimization, and everything in `public/` — a matcher-less auth check is a common source of "why are my fonts 404ing" bugs. Prefer a negative-lookahead matcher that excludes static assets over an allowlist that's easy to forget to extend.
- **Middleware/proxy is not a substitute for per-request authorization.** It runs before routing, but Server Actions are invoked as POST requests to the page that calls them — a matcher that excludes a path silently excludes that path's Server Actions too. Auth/authz checks belong inside the Server Action or Route Handler itself, not only in middleware.
- **Route Handlers (`route.ts`) replace the old `pages/api` convention** in the App Router — exported functions are named after HTTP verbs (`GET`, `POST`, etc.), not a single default export with a method switch.

---

## 5. Performance and Bundle Size

- **Over-clienting is the single most common App Router regression** — see Section 1. When auditing bundle size, the first question is always "does this file need `'use client'` at all, or just one child of it?"
- **Barrel-file imports can silently pull client-only code into the server bundle graph**, or force otherwise-tree-shakeable modules into every route that touches the barrel. If a shared `index.ts` re-exports both a heavy client widget and lightweight server utilities, importing "just the utility" can still drag the widget's dependencies along — prefer direct imports for anything performance-sensitive.
- **`next/image` and `next/font` are not optional niceties** — flag raw `<img>` tags and manually-loaded web fonts in new code; both bypass Next.js's built-in optimization (automatic sizing/lazy-loading for images, zero layout-shift self-hosted fonts).
- **`next/dynamic` for genuinely heavy, below-the-fold, or conditionally-rendered client components** (rich text editors, charts, modals) — but don't reach for it reflexively; splitting a small component adds a loading state and a network round trip for no real savings.
- **Check `generateStaticParams` usage on dynamic routes** that are known ahead of time (blog slugs, product IDs) — a dynamic route with no static params generation re-renders on every request when it could be prerendered and revalidated.

---

## Output Format

Structure findings as a punch list, most impactful first:

```
## Next.js Review: <scope>

### Server/Client Boundary
- [File:Line] Issue — Why it matters — Suggested fix

### Data Fetching & Caching
- [File:Line] Issue — Why it matters — Suggested fix

### Streaming
- [File:Line] Issue — Why it matters — Suggested fix

### Middleware / Route Conventions
- [File:Line] Issue — Why it matters — Suggested fix

### Bundle Size / Performance
- [File:Line] Issue — Why it matters — Suggested fix
```

If a section has no findings, omit it rather than writing "No issues found." For a single-file review, skip the section headers entirely and just list findings in priority order. Always name the specific Next.js version behavior you're relying on when it affects the recommendation (e.g. "on 16 with `cacheComponents` this would instead need `'use cache'`").

---

## Examples

### Happy path
**Task**: "Review this page — it fetches a user's dashboard data and renders a list of widgets."

The page is an `async function Page()` in `app/dashboard/page.tsx` fetching `getUser(id)` and `getWidgets(id)` sequentially with two separate `await` calls, then rendering a client `<WidgetGrid>` that receives the resolved arrays as props. Apply the framework: confirm the boundary is correct (page stays server, only the interactive grid controls are client), then check the two fetches — since `getWidgets` doesn't depend on `getUser`'s result, flag the sequential waterfall and recommend `Promise.all`. Suggest wrapping `<WidgetGrid>` in `<Suspense>` if widget data is the slower of the two, so the page shell renders immediately.

### Edge case
**Task**: "This layout wraps the whole app in a client `ThemeProvider` and now every page feels slower to first paint — what's going on?"

Don't just say "convert ThemeProvider to server" — it can't be, it uses `createContext`. The actual fix is checking *where* the provider is mounted: if `<ThemeProvider>` wraps `<html><body>{children}</body></html>` instead of just `{children}`, the whole app is being pulled into a client boundary unnecessarily. Recommend moving the provider to wrap only `{children}` inside `<body>`, keeping `<html>`/`<body>` and any static chrome (nav, footer) as Server Components rendered by the layout around the provider. This is a case where the diagnosis (over-clienting) is right but the naive fix (removing 'use client') is wrong — the provider itself must stay a Client Component; only its placement in the tree needs to change.

### Negative / boundary case
**Task**: "Can you review our Next.js app for best practices?" — the repo has a `pages/` directory, an `_app.tsx`, and `getServerSideProps` on every route, with no `app/` directory anywhere.

This is a Pages Router codebase, not an App Router one. Don't apply Server/Client Component boundary rules, `'use client'` guidance, or `app/`-only file conventions (`loading.tsx`, route groups) — none of them exist in the Pages Router model. Say so explicitly: this skill's App Router guidance doesn't map onto `getServerSideProps`/`getStaticProps` data fetching or `_app.tsx`/`_document.tsx` conventions. Either scope the review to what's generically applicable (bundle size via `next/dynamic`, `next/image`, `next/font` — those work in both routers) and flag that a Pages→App Router migration is a separate, larger conversation, or redirect to react-best-practices for router-agnostic React component concerns.

