# React Component Architecture — Deep Reference

Deeper treatment of folder structure, hooks patterns, and TypeScript typing than fits in the main workflow. Read this when a review needs to go past the summary-level guidance in SKILL.md — e.g., restructuring a growing codebase's folders, or writing typed custom hooks.

Sources consulted for grounding (not copied verbatim): `alan2207/bulletproof-react` (architecture/folder-structure conventions) and `typescript-cheatsheets/react` (TypeScript+React pattern conventions).

---

## Contents
- Folder Structure for Growing Codebases
- The Unidirectional Import Rule
- Feature Folder Anatomy
- Container vs. Presentational Split (When It Still Helps)
- TypeScript Typing Patterns
- Custom Hook Typing
- Reducer and Discriminated Union Actions
- Ref Typing
- When to Reach for `React.memo`

## Folder Structure for Growing Codebases

A small app (a handful of components) is well served by grouping by type:

```
src/
  components/
  hooks/
  utils/
  types/
```

Once an app grows past that — multiple distinct product areas, each with its own data, components, and state — grouping by type stops scaling: a single logical change (e.g., "how checkout displays a discount") starts touching `components/`, `hooks/`, and `utils/` all at once, none of which is scoped to checkout. The fix is to group by feature instead:

```
src/
  app/            # app shell: routes, root providers, router config
  components/     # shared/generic UI primitives used across features
  hooks/          # shared custom hooks
  lib/            # thin wrappers around third-party libraries, preconfigured
  stores/         # global state, if the app has cross-cutting global state
  types/          # shared TypeScript types
  utils/          # shared pure utility functions
  features/
    checkout/
      api/
      components/
      hooks/
      stores/
      types/
      utils/
    inventory/
      api/
      components/
      hooks/
      types/
```

This isn't a mandate to adopt this exact folder taxonomy — it's a shape to reach for once "which folder is this in" stops being obvious. Don't propose reorganizing a 5-component app into this structure; the overhead isn't earned yet.

## The Unidirectional Import Rule

The value of a `features/` split comes entirely from enforcing a single direction of imports:

- **`shared` layers (`components/`, `hooks/`, `lib/`, `types/`, `utils/`) can be imported by anything** — features and the app shell alike.
- **A feature can import from `shared`, but never from another feature.** `features/checkout` reaching into `features/inventory/components/StockBadge` is the specific smell that turns a feature-folder structure into a tangle no better than flat type-based grouping. If checkout genuinely needs something inventory owns, promote the shared piece to `components/` or `types/` at the top level — don't let one feature quietly depend on another's internals.
- **The app shell can import from features and from shared, but features must never import from the app shell.** The app shell composes features together; features stay ignorant of how they're assembled, which is what keeps them independently testable and movable.

Violating this rule is invisible in a small codebase (nothing breaks) and expensive in a large one (every feature becomes coupled to every other feature, and nothing can be deleted or extracted cleanly). Flag cross-feature imports during review even when they technically work.

## Feature Folder Anatomy

Not every feature needs every subfolder — create only what that feature actually uses:

- **`api/`** — the feature's data-fetching calls and any server-state hooks wrapping them (e.g., a TanStack Query hook that fetches this feature's data).
- **`components/`** — components used only within this feature. If a component starts getting reused by a second feature, that's the signal to promote it to the shared `components/` folder, not to import it across features.
- **`hooks/`** — custom hooks scoped to this feature's logic.
- **`stores/`** — state specific to this feature, if it needs something beyond component-local state but not global app state.
- **`types/`**, **`utils/`** — feature-scoped versions of the same idea as the shared folders, for things that genuinely don't apply outside this feature.

## Container vs. Presentational Split (When It Still Helps)

The older container/presentational pattern (one component owns data-fetching and state, a child component only renders props) isn't a required pattern in modern React — hooks let a single component hold both concerns cleanly in most cases. It's still worth reaching for when:

- **The same presentation needs to be driven by more than one data source** (e.g., the same `OrderTable` rendering live data in one screen and mock/preview data in another) — separating "what it looks like" from "where the data comes from" avoids duplicating the rendering logic.
- **The presentational half needs to be tested or viewed in isolation** (a component library, a style guide, visual regression tests) — a component that also fetches its own data can't be rendered standalone without mocking the fetch.

Don't apply the split reflexively to every component that has both a `useState` and some JSX — that's most components, and forcing the split multiplies file count without buying either benefit above.

## TypeScript Typing Patterns

- **Prefer explicit prop types via `type` or `interface`; don't rely on inference for a component's public contract.** Either works; `interface` has the edge for props objects that consumers might want to extend via declaration merging, but consistency within a codebase matters more than which one you pick.
- **`React.FC` is unnecessary in current React/TypeScript versions and has real downsides** (it implicitly adds `children` even when a component doesn't accept them, and complicates generic components). Type props directly on the function signature instead: `function Card(props: CardProps)`.
- **Type `useState` explicitly when the initial value doesn't reveal the full type** — `useState<User | null>(null)` — inference from `null` alone gives `null`, not `User | null`, and every later assignment of a real `User` becomes a type error until this is fixed.
- **Type DOM refs with the specific element**, not a generic ancestor: `useRef<HTMLInputElement>(null)`, not `useRef<HTMLElement>(null)` — the specific type is what exposes element-specific properties/methods without a cast.

## Custom Hook Typing

- **A hook returning a tuple (mirroring `useState`'s `[value, setValue]` shape) needs `as const`** on the returned array literal, or TypeScript widens it to a union array type and destructuring loses the positional types:

```typescript
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle] as const; // without `as const`, both elements
                                    // widen to `boolean | (() => void)`
}
```

- **Prefer returning an object over a tuple once a hook returns more than two values** — positional destructuring past two values is easy to get wrong at the call site, and named fields self-document.

## Reducer and Discriminated Union Actions

For `useReducer`, type actions as a discriminated union keyed on a `type` field, and give the reducer an explicit return type:

```typescript
type Action =
  | { type: "increment"; amount: number }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment":
      return { ...state, count: state.count + action.amount };
    case "reset":
      return initialState;
  }
}
```

This gives exhaustiveness checking (TypeScript flags a missing `case` if a new action variant is added and a switch isn't updated) and makes each action's required payload fields explicit — an untyped `action: any` loses both.

## Ref Typing

- **Mutable value refs** (`useRef` used for a value that isn't a DOM node, e.g., a previous-value cache or a timer id) should pass the concrete type as the initial value so TypeScript infers correctly: `useRef<number | undefined>(undefined)` for a `setTimeout` id, not `useRef()` with no type argument.
- **In React 19+, `ref` can be passed as a normal prop to function components** — the `forwardRef` wrapper is no longer required for the common case of forwarding a ref through to a DOM element. Codebases still on React 18 or earlier need `forwardRef`; check the installed React version before recommending the ref-as-prop pattern.

## When to Reach for `React.memo`

`React.memo` only helps when both of these are true: the component re-renders often with the *same* props, and re-rendering it is expensive enough to matter. Applying it reflexively to every component:

- Adds a shallow-comparison cost on every render that doesn't pay for itself if the component is cheap to render anyway.
- Does nothing if the parent keeps passing new object/array/function literals as props — memoization has nothing stable to compare against, so it re-renders every time regardless (see "inline literals passed to a memoized child" anti-pattern in SKILL.md).

Check for an actual, measured re-render problem (React DevTools Profiler, not a guess) before recommending `memo` — and check that the props passed to it are already stable (memoized themselves, or primitives) before expecting it to do anything.
