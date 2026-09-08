# rcode Executor: Correctness Hazard Self-Audit

Read this before Step 5 (Summary Creation) whenever the plan touched
**async code, shared/mutable state, or a third-party library's async API**.
This exists because these bug classes reliably survive `npm test` / `tsc`
and only get caught in human PR review — the goal is to catch them first.

Static checks (tests pass, types clean) prove the code is well-formed. They
do not prove it is correct under concurrency, under React's re-render
model, or against a library's actual (not assumed) async contract. This
scan is what closes that gap.

---

## When to run this

Run it if the diff for this plan touched ANY of:
- a database read-modify-write (read a row, compute, write it back)
- React state updates (`setState`, `useState` setters, reducers)
- a call into an async library API (`mutate`, `.then`, callbacks, queues)
- code reachable from more than one entry point/event at once (two API
  routes touching the same record, two UI handlers touching the same state)

If none of these apply, skip — don't burn a pass on a pure sync CRUD change.

## Hazard 1 — Concurrency races (read-modify-write)

**Pattern to grep for:** a `Read` followed later by a `Write`/`Update`
using a value derived from that read, where two callers could interleave.

**Ask explicitly:** "If two requests hit this at the same instant, what
happens?" If the answer requires the reads and writes to stay in program
order, but nothing enforces that (no transaction, no row lock, no atomic
increment/decrement, no optimistic-concurrency version check) — it's a race.

**Fix pattern:** push the read-modify-write into the database as one
atomic operation (`UPDATE ... SET x = x + 1`, `INSERT ... ON CONFLICT`,
a transaction with the correct isolation level) instead of
read-in-app-then-write.

## Hazard 2 — React state updater purity

**Pattern to grep for:** any `setX(prev => ...)` / reducer function body
that calls something other than a pure computation on `prev` — a side
effect (`deleteFileObject`, a network call, a mutation of an object
that also exists elsewhere) invoked *inside* the updater.

**Why it matters:** React may call an updater function more than once per
state change (Strict Mode, concurrent rendering, batched replays). Any
side effect inside it runs that many times too.

**Fix pattern:** the updater computes and returns the next state only.
Side effects happen in the event handler or an effect, outside the
updater, exactly once.

**Recurrence note:** if this fix has already been applied once in this
codebase in a similar handler, grep for the same shape (`set\w+\(\s*\w+\s*=>` followed
by a call other than array/object spread) across the whole diff, not just
the file that was fixed — the same author habit tends to repeat in sibling
handlers.

## Hazard 3 — Async library footguns (assumed vs. actual contract)

**Pattern to grep for:** consecutive/rapid calls into an async library
API each with their own inline callback (`mutate(x, { onSuccess })`
called twice before the first resolves; `.then()` chains fired in a loop).

**Do not assume intuitive behavior** — check the library's actual
contract before shipping. Known real-world case: TanStack Query's
`mutate()` per-call `onSuccess`/`onError` callbacks are dropped for a
mutation if a **newer** call to the same mutation starts before the
earlier one resolves — only the latest call's callbacks run. If code
depends on every call's callback firing, that's already broken.

**Fix pattern:** either use `mutateAsync` + `await` in sequence, or read
the docs for exactly how "concurrent calls to the same mutation" are
handled before relying on per-call callbacks — do not assume the naive
"each call gets its own independent completion" model.

## Hazard 4 — `useEffect` dependency arrays on TanStack Query data (structural sharing)

**Pattern to grep for:** a `useEffect` (or any reference-equality check) whose
dependency array includes a field pulled off a TanStack Query `data` object
(`result.data?.someField`), used to detect "a new response arrived."

**Why it matters:** TanStack Query's default `structuralSharing: true`
deep-compares old vs. new response data on every refetch and REUSES the old
object reference for any unchanged sub-tree — even when the refetch is a
genuinely new, successful network response. Real case from a search-UI
redesign, surfaced in PR review: a value was captured via
`useEffect(() => setAiOverview(page1AiOverview), [page1AiOverview])` where
`page1AiOverview = result.data?.aiOverview`. Clearing a search and
resubmitting the identical query produced a fresh HTTP response, but since
the synthesized summary text was unchanged, structural sharing reused the
OLD `aiOverview` object reference inside the new `data` — the effect's
dependency never changed by `Object.is`, so it never re-fired, and the UI
value stayed stuck at whatever a prior reset had set it to.

**Fix pattern:** key the effect on a field that's guaranteed unique per
request (a request/query id, a timestamp, a monotonic counter from the
server) — NOT on the value you're actually trying to capture, and NOT on
the response object as a whole. Do this by WIDENING the existing dependency
array to include that id, not by adding new `useState`/`useRef` to manually
track "have I already handled this response" — a dependency array already
does that comparison for you; re-implementing it in a ref is unnecessary
complexity that also tends to be wrong in a subtler way (a redundant
`capturedQueryId` ref was tried and reverted in the same PR once the id was
folded into the dependency array).

---

## What to do if a hazard is found

Treat it as **Deviation Rule 1 (auto-fix bugs)** — fix it now, before
SUMMARY.md, same as any other logic error. Do not defer it to PR review;
that is the exact failure mode this file exists to close.

## Self-Check addition

Add to the SUMMARY.md Self-Check block:

```
- [ ] Correctness hazard scan run (concurrency / state-updater purity / async-library contract / query structural-sharing) — N/A or PASSED
```

If a hazard was found and fixed, note it under deviations with the
hazard name (e.g. "Hazard 2: state-updater purity — `deleteFileObject`
moved out of `setItems` updater in `FileList.tsx`").
