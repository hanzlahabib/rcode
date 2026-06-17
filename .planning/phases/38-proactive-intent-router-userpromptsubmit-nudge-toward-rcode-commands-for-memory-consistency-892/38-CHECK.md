---
phase: 38
verdict: pass
checker: rcode-sprint-checker
checked: 2026-06-18
plans_checked: [38.1, 38.2, 38.3]
---

# Sprint Check — Phase 38

**Verdict:** PASS (`issues: []`)

All three sprints are grounded in the actual code, honor the phase goal and the
fail-open safety contract, and the wave/dependency/file-ownership structure is
correct. Five focus areas verified against real files:

1. **Fail-open / exit-0 contract holds.** The plan correctly avoids the existing
   async `readInputJson()` (rejects on bad JSON → would surface via `main().catch()`)
   and instead mirrors `cli/rcode-slash-router.cjs` sync `fs.readFileSync(0)` +
   silent-return. `promptRouter()` exits synchronously before any await.
2. **do.md line range accurate.** Table header at line 285; "fall back to the
   classifier" at line 322. The 38.3 drift-guard slice lands on real anchors, and
   every INTENT_TABLE command exists verbatim in the table.
3. **Install wiring is opt-in only.** Claude install path writes no settings.json
   hooks; the `UserPromptSubmit` group reaches `.claude/settings.json` only via
   `/rcode-enable-hooks`. `prompt_nudge` not written at install → dormant by default.
4. **Verify commands use the real runner** (`node --test test/*.test.cjs`).
5. **Wave/dependency/file-ownership correct.** 38.1+38.3 share `rcode-hooks.cjs`
   but 38.3 `depends_on: [38.1]`; explicit `sequential: true` + `sequential_after: 38-1`
   added after the wave-overlap helper flagged the missing flag (now 0 conflicts).

## Executor notes (non-blocking)

- 38.1.1: order more-specific keyword sets before broad ones (first-match-wins) so
  `map-codebase` keywords don't shadow `audit`/`review`.
- 38.3.2: strip the `--karpathy` flag from `/rcode-review --karpathy` to a base
  command before comparing against do.md.

```yaml
issues: []
```
