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

<!-- Add entries here -->

### Workflow files exceed 500-line target

- **Symptom:** `wc -l .rcode/workflows/*.md` shows several files >500 lines (`autonomous.md` 1059, `complete-milestone.md` 836, `council.md` 567, `code-review.md` 597, `code-review-fix.md` 529)
- **Surface:** `rcode/workflows/*.md`
- **Workaround:** files run correctly; only line-count budget is breached. Documented as deliberate skip in Phase 5.
- **Real fix planned for:** out of scope until a workflow runtime test scaffold exists
- **First seen:** 2026-04-26
- **Tracking:** TASKS.md "Phase 5 — Workflow file splits ⏭ skipped"

### Some persona SKILL.md files >120 lines

- **Symptom:** `mariam-marketing` (166), `zahra-branding` (155), `yousef-backend` (151), `sadiq-analyst` (150), and others sit above the 120-line soft target
- **Surface:** `rcode/skills/agents/*/SKILL.md`
- **Workaround:** they're persona files with identity prose + capability tables, not workflow logic. Hard cap is 200 lines (skills-compliance test); they all pass.
- **Real fix planned for:** Phase 13 final consolidation may slim these if pattern emerges; not blocking.
- **First seen:** 2026-04-26
- **Tracking:** noted during Phase 4 Group 4 slim work

### `.rcode/agents/` and `.rcode/context/` are untracked install artefacts

- **Symptom:** `git status` always shows these as untracked in this repo
- **Surface:** `.rcode/agents/`, `.rcode/context/`
- **Workaround:** ignore in status; they're regenerated on every `npx @hanzlaa/rcode install` and not part of the source.
- **Real fix planned for:** add to `.gitignore` if drift becomes annoying
- **First seen:** 2026-04-26
- **Tracking:** noted during Phase 0 push baseline
