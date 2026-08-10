# Known Issues — `rcode`

Active bugs and workarounds. Searchable so an agent doesn't waste cycles re-debugging an already-known issue.

> **Add an entry when:** a workaround ships before the real fix, OR a bug is acknowledged but won't be fixed this sprint.
> **Remove an entry when:** the real fix lands and is verified in production.

---

## Format

```
### Issue title

- **Symptom:** what users see
- **Surface:** which area / file / route
- **Workaround:** what we do today
- **Real fix planned for:** milestone / phase / "out of scope"
- **First seen:** YYYY-MM-DD
- **Tracking:** GitHub issue # / Linear ID
```

---

## Issues

### Workflow files exceed 500-line target

- **Symptom:** `wc -l rcode/workflows/*.md` shows several files >500 lines (`autonomous.md`, `complete-milestone.md`, `council.md`, `code-review.md`, `code-review-fix.md`)
- **Surface:** `rcode/workflows/*.md`
- **Workaround:** files run correctly; only line-count budget is breached.
- **Real fix planned for:** out of scope until a workflow runtime test scaffold exists
- **First seen:** 2026-04-26
- **Tracking:** TASKS.md "Phase 5 — Workflow file splits ⏭ skipped"

