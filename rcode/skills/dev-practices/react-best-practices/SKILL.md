---
name: rcode-react-best-practices
description: When the user is writing, reviewing, or refactoring React components and needs guidance on component architecture, folder structure, hooks discipline, state management boundaries, prop drilling, composition patterns, or accessibility. Also use when the user mentions "React best practices," "component architecture," "where should this state live," "custom hook," "prop drilling," "this component is too big," "feature folder structure," "container vs presentational," "accessible component," "React anti-pattern," or asks "is this good React code." Use this even if the user just pastes a component and asks "how's this look" or "can you review this." For Next.js-specific routing, data-fetching, Server/Client Component boundaries, or middleware, see nextjs-best-practices instead. For the two specific correctness bug classes — React state-updater purity and useEffect dependency arrays against TanStack Query structural sharing — the authoritative source is rcode/agents/rules/executor/correctness-hazard-scan.md; this skill mentions both briefly but does not duplicate that depth.
metadata:
  version: 1.0.0
---

# React Best Practices

You are an expert React engineer. Your goal is to steer component architecture, hooks usage, and state management toward patterns that stay maintainable as a codebase and a team grow — not to enforce a single "correct" style for its own sake.

## Initial Assessment

Before reviewing or writing React code, understand:

1. **Scope**
   - Is this a new component, a refactor of an existing one, or a full review pass?
   - Single component, or the folder/feature structure around it?

2. **Stack context**
   - Plain React, or a framework (Next.js, Remix)? If Next.js-specific concerns come up (App Router, Server Components, data fetching, middleware), hand those off to `nextjs-best-practices` — this skill covers framework-agnostic React only.
   - TypeScript or JavaScript? TS changes how much of this applies (typed props, discriminated-union reducer actions).
   - Existing state management library in place (Redux, Zustand, Jotai, TanStack Query) — don't recommend introducing one that isn't already there without being asked.

3. **What "done" looks like**
   - A review with findings, or a rewrite of the code itself?
   - If reviewing, are you producing a list of issues, or fixing them inline?

---

## Workflow

### 1. Component architecture and folder structure

Judge structure by **how easy it is to find and change one thing without touching unrelated things** — not by whether it matches any specific folder taxonomy.

- **One clear owner per piece of UI.** A component that renders a list, fetches the list's data, AND manages a modal for editing list items is three responsibilities wearing one file. Split along "what changes together" — the modal's open/close state doesn't need to live next to the fetch logic.
- **Feature-oriented over type-oriented, once a codebase has more than a handful of screens.** Grouping by `components/`, `hooks/`, `utils/` at the top level works for a small app; grouping by feature (`features/checkout/`, `features/inventory/`) scales better because a change to one feature stays inside one folder instead of touching three top-level buckets. When you flag this, offer it as scaling advice for growing codebases — don't insist a 5-component app reorganize into features.
- **One-directional imports.** Shared/common code (generic UI primitives, shared hooks, shared types) should be importable from anywhere. Feature-specific code should not be imported by a sibling feature — if `features/checkout` needs something from `features/inventory`, that's a signal the shared piece belongs in a common layer, not that the import is fine as-is.
- **Colocate what changes together.** A component's styles, tests, and tightly-coupled sub-components belong next to it, not sorted into parallel `styles/`, `tests/` trees that force a three-file hunt for every change.
- **Composition over configuration.** A component that takes seven boolean props to toggle internal behavior (`showHeader`, `compact`, `noPadding`, `variant`, `size`...) is usually better expressed as composition — pass children/slots, or split into two components — than as a growing prop-flags list. Watch for the boolean-prop-count creeping upward over time; that's the tell.
- **File size is a symptom, not the disease.** A 400-line component isn't wrong because of the line count — it's wrong if those 400 lines mix concerns that don't need to be read together. Extract when you can name the extracted piece something specific ("OrderSummaryCard"), not when you're just trying to hit a number.

### 2. Hooks discipline

Cover this beyond the two hazards already owned elsewhere (see "What this skill does not cover" below).

- **Dependency arrays must be honest about every value the effect/callback/memo closes over.** The ESLint `react-hooks/exhaustive-deps` rule exists because a hand-curated dependency list silently goes stale the next time someone edits the function body — they add a variable to the closure and forget the array. Don't manually trim a dependency array to "stop it from re-running so often"; that's treating the symptom (unwanted re-run) while leaving the cause (a value that should trigger a re-run being ignored) in place. If a value genuinely shouldn't trigger a re-run, that's what `useRef` or restructuring the effect is for — not omitting it from the array.
- **Prefer deriving state during render over syncing it in an effect.** `useEffect(() => setFilteredList(list.filter(...)), [list, filter])` is a common shape that doesn't need an effect at all — compute `filteredList` directly in the render body (or wrap in `useMemo` if the computation is expensive). An effect that exists only to keep one piece of state in sync with another is a reactive-data-flow smell; React's own render cycle already does that synchronization when you compute during render.
- **`useEffect` is for synchronizing with something outside React** (subscriptions, DOM APIs, network requests tied to a lifecycle, logging) — not a general-purpose "run this after that changes" hook. If you're reaching for an effect and there's no external system involved, ask whether the value can be computed during render or handled in an event handler instead.
- **Custom hooks should have a narrow, nameable contract.** A hook named `useUser` that also handles routing side effects and analytics tracking is doing three jobs under one name — a caller can't tell what it does without reading the implementation. Extract shared *stateful logic*, not "code I want out of this component."
- **`useCallback`/`useMemo` are for two specific reasons: preserving reference equality for a downstream dependency (a memoized child, another hook's dependency array) or avoiding a genuinely expensive recomputation.** Wrapping every function and value in a component "for performance" without a downstream consumer that needs the stable reference adds overhead and noise without benefit. Look for the actual consumer before recommending the wrap; if there isn't one, recommend removing it, not adding more.

### 3. State management boundaries

Place state at the lowest level that satisfies every component that needs it — no lower, no higher.

- **Local state (`useState` in the component)** — the default. If only one component and its direct children need a value, it does not belong in context, a global store, or a parent three levels up "just in case."
- **Lifted state (moved to the nearest common ancestor)** — when two sibling components need to share or coordinate on a value. Lift only as far as the nearest ancestor that actually needs it, not to the app root by reflex.
- **Global/shared state (context, a store library)** — when state is genuinely cross-cutting (auth session, theme, a shopping cart touched from a header badge and a checkout page in unrelated component trees). Before recommending global state, check whether the "global" need is actually just prop drilling that composition would fix (see below) — global state has a real cost (harder to trace who reads/writes it, re-render fan-out) that local or lifted state doesn't.
- **Server/cache state (TanStack Query, SWR, RTK Query) is not the same category as client UI state.** Data fetched from a server — and its loading/error/staleness — belongs in a server-state library if the codebase has one, not duplicated into `useState` + a manual `useEffect` fetch. Mixing the two categories (treating fetched data like local state you own) is what produces stale-cache bugs and duplicate fetch logic.

### 4. Prop drilling and composition

- **Two or three levels of prop passthrough is normal, not a problem.** Don't reach for context to solve drilling that composition or a small refactor would fix in place.
- **When drilling gets deep (4+ levels, or the same prop threading through components that don't otherwise use it), reach for composition before context.** Passing a component as `children` or as a named slot prop often eliminates the drilling entirely, because the intermediate components stop needing to know about the prop at all — they just render what they're handed.
- **Context is for values many unrelated components read, not a shortcut around a drilling problem in one component tree.** A context introduced to solve drilling in exactly one call path adds an implicit dependency (any component in the tree can now silently depend on that context) in exchange for avoiding a few explicit prop declarations — often a bad trade. Recommend it when the value is genuinely cross-cutting (see state management boundaries above), not as the default fix for drilling.

### 5. Accessibility basics

Treat these as a baseline check on any component review, not an optional add-on:

- **Interactive elements use semantic HTML** (`<button>`, `<a>`, native form elements) before reaching for a `<div onClick>`. A div with a click handler has no keyboard focus, no Enter/Space activation, and no screen-reader semantics unless all three are added back by hand.
- **Every form input has an associated label** (`<label htmlFor>` or `aria-label`/`aria-labelledby`) — a placeholder is not a label.
- **Custom interactive components (built from divs/spans) need `role`, `tabIndex`, and keyboard event handlers** to match the semantics of the native element they're replacing. If a native element does the job, prefer it over rebuilding its behavior.
- **Images need meaningful `alt` text** (or `alt=""` when purely decorative) — not the filename, not omitted.
- **Focus management matters for anything that opens/closes** (modals, drawers, menus): focus should move into the opened content and return to the trigger on close, and Escape should close it.

### 6. Common anti-patterns to flag

- **Mutating props or state directly** (`props.items.push(x)`, `state.user.name = x`) instead of producing a new reference — breaks React's change detection regardless of whether it happens inside or outside a state updater.
- **Index-as-key on a reorderable or filterable list** — causes stale state/wrong-item bugs when items are inserted, removed, or reordered because React matches elements by key across renders, not by position. Use a stable, unique id from the data.
- **Inline object/array/function literals passed as props to a memoized child** (`<Child config={{a: 1}} />`) defeat `React.memo` because a new reference is created every render — the memoization never has anything to compare against for that prop.
- **Fetching data directly in a component with no cache/dedupe layer when the codebase already has one available** — duplicates network calls and reintroduces loading/error state handling that the existing data layer already solves.
- **Context used as a substitute for a proper state/store library** — a growing set of unrelated values crammed into one context causes every consumer to re-render on any change, even to a field they don't read. Split contexts by what changes together, or move to a store library once this shows up.

## What this skill does not cover

Two specific correctness bug classes have deeper, authoritative treatment elsewhere — this skill mentions them but does not re-derive them:

- **React state-updater purity** (side effects inside `setState`/reducer updater functions, which can run more than once under Strict Mode/concurrent rendering) — see `rcode/agents/rules/executor/correctness-hazard-scan.md`, Hazard 2.
- **`useEffect` dependency arrays keyed on TanStack Query data fields, broken by structural sharing** — see the same file, Hazard 4.

If a review surfaces either of these, point to that file rather than re-explaining the mechanism in full.

For deeper reference material on component architecture and folder structure than fits in this workflow, see [`references/component-architecture.md`](references/component-architecture.md).

---

## Output Format

**When reviewing existing code:**

```
## React Review: <component/feature name>

### Findings
1. **[Category]** <Issue> — <why it matters> — <fix>
   (Category: Architecture | Hooks | State | Composition | Accessibility | Anti-pattern)

### Priority
- Must fix: <list>
- Should fix: <list>
- Consider: <list>
```

**When writing new code:** apply the guidance directly in the component, and call out in a short note any deliberate trade-off made (e.g., "kept fetch state local since only this component reads it — no server-state library in this repo yet").

**When the question is a boundary/placement decision** ("where should this state live," "should this be a hook"): answer directly with the recommendation and the one-sentence reason, referencing the specific criterion from this file (lowest-level-that-satisfies-every-consumer, narrow-nameable-contract, etc.) rather than a generic "it depends."

---

## Examples

### Example 1 — Happy path: component review

**User:** "Can you review this component? It fetches a list of orders, lets you filter them, and shows a modal when you click one."

**Expected behavior:** Recognize this as three responsibilities in one file (fetch, filter, modal) and recommend splitting along those lines. Check whether the filtered list is derived via a `useEffect` + `setState` pair (flag it — should be computed during render or `useMemo`, not synced via effect). Check the list's `key` prop for stability if the filter can reorder or remove items. Check accessibility of the modal (focus trap, Escape to close) and of the clickable list rows (real `<button>`/`<a>` vs `<div onClick>`). Produce output in the Findings/Priority format above.

### Example 2 — Edge case: ambiguous state placement

**User:** "Should this dropdown's open/closed state live in Redux or just useState?"

**Expected behavior:** Ask what reads/writes it — if only the dropdown component and its immediate children, default to local `useState`; do not recommend Redux by default just because Redux is present in the codebase. Only recommend lifting or globalizing it if another component elsewhere in the tree genuinely needs to read or control that same open/closed value (e.g., a "close all dropdowns" action). State the criterion explicitly ("place state at the lowest level that satisfies every consumer") rather than giving a generic "it depends, here are pros and cons of both" essay.

### Example 3 — Negative/boundary case: Next.js-specific question dressed as a React question

**User:** "This component using `useEffect` to fetch data on mount is causing a waterfall — should I move the fetch into `getServerSideProps` or make it a Server Component?"

**Expected behavior:** Recognize that the actual question is a Next.js data-fetching/rendering-strategy decision (Server Components vs. client fetch, `getServerSideProps` vs. App Router conventions), not a framework-agnostic React hooks question — even though it's phrased around `useEffect`. Do not attempt to answer the Server Component/data-fetching part from this skill; defer that part to `nextjs-best-practices`. It is fine to note the framework-agnostic observation that effect-based fetch-on-mount causes waterfalls and duplicated loading state as a general React anti-pattern, but the routing/rendering-strategy recommendation itself belongs to the Next.js skill.

### Example 4 — Negative/boundary case: correctness bug that's already owned elsewhere

**User:** "My `setItems(prev => { deleteFromServer(prev[0].id); return prev.slice(1); })` seems to delete the wrong item sometimes."

**Expected behavior:** Recognize this as Hazard 2 (side effect inside a state updater) from `correctness-hazard-scan.md`, not a topic to re-derive from scratch here. Give the one-line diagnosis (the updater can run more than once, so `deleteFromServer` can fire more than once for the same click) and the one-line fix (move `deleteFromServer` out of the updater into the event handler, updater returns only the new array), then point to `rcode/agents/rules/executor/correctness-hazard-scan.md` for the full mechanism rather than re-explaining Strict Mode/concurrent rendering in depth here.
