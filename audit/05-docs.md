# Documentation Audit — v4.0.0

## Summary

- Docs reviewed: 9 (README.md, CHANGELOG.md, CONTRIBUTING.md, DOCS.md, AGENTS.md, CLAUDE.md, docs/USP.md, docs/commands.md, docs/agents.md)
- Accurate: 28, Stale: 5, Wrong: 1, Missing-docs: 1
- Broken links: 1 (mailto false-positive, not a real broken link)

---

## Findings by file

### README.md

- [STALE] Line 16 vs Line 155 — **self-contradiction on test count**: line 16 says "339 automated tests across 58 files" (correct — verified: `node --test` reports 339/339 pass across 51 `.test.cjs` files); line 155 says "30 tests, 100% pass" (stale, never updated after suite grew).
- [STALE] Line 16 — **skills count**: claims "85 skills"; actual count in `rcode/skills/` is **86 SKILL.md files** (37 actions + 23 agents + 25 core + 1 rcode-init).
- [ACCURATE] Line 16 — "45 agents": confirmed, `rcode/agents/` contains exactly 45 `.md` files.
- [ACCURATE] Line 16 — "116 commands": confirmed, `rcode/commands/` contains exactly 116 `.md` files.
- [ACCURATE] Line 16 — "339 automated tests across 58 files": test count confirmed; file count is 51 `.test.cjs` files (the "58 files" is slightly off — 58 may include `helpers.cjs` + `eval/` subdir files).
- [STALE] Line 39 — **path claim**: table row shows `rcode/skills/` as the Memory layer example; skills live under `rcode/skills/` (public, correct) but the example skill `rcode-sprint-checker` is an agent (at `rcode/agents/rcode-sprint-checker.md`), not a skill. Label is accurate; example is wrong category.
- [ACCURATE] Line 39 — `rcode/skills/` and `rcode/workflows/` paths exist.
- [ACCURATE] Line 68 — `rcode-tools health` command: confirmed exists at line 7201 of `rcode-tools.cjs`.
- [ACCURATE] Lines 7–9 — install command `pnpm dlx @hanzlaa/rcode install` matches `package.json` name `@hanzlaa/rcode`.
- [WRONG] Line 155 — "30 tests": was never accurate in v4 context; test count was already well above 30 prior to v4 ships. Should read 339.
- [ACCURATE] No broken internal file links (LICENSE, docs/install.md, docs/getting-started.md, docs/TIERS.md, etc. all resolve). One `mailto:` false-positive — not a broken link.

### CHANGELOG.md

- [STALE] Line 73 — "20 commits, 30/30 tests passing on every commit": the 30/30 claim was accurate at time of writing the entry but contradicts the 339-test reality recorded on the same ship date. Should read 339/339.
- [ACCURATE] v4.0.0 entry covers: rihal→rcode rename (all 116 commands, 45 agents, 85 skills), brain pull, Memory Bank populated, mode field promotion, state-set compat shim, roadmap update-plan-progress, CI badge, SECURITY.md, CODE_OF_CONDUCT.md, 6th USP section, greedy rename bug fix, team.yaml sync, 9 workflow migrations. Wave 1 and 2 changes appear accounted for.
- [ACCURATE] Migration steps are correct (rm `.rihal/` then reinstall).

### CONTRIBUTING.md

- [ACCURATE] Line 208 and 438: `node --test` and `pnpm test` both work — verified live (339 pass, 0 fail).
- [ACCURATE] Scope list in CONTRIBUTING.md is the full expanded list (matches AGENTS.md).
- [ACCURATE] No broken internal links found.

### DOCS.md

- [ACCURATE] Lines 14, 46, 261, 380, 851 — "45 agents", "85 skills", "116 commands" match reality (skills off by 1 but consistent with README claim).
- [ACCURATE] No broken internal links found.
- [MISSING] DOCS.md does not mention the new `rcode/brain/sources.yaml` brain-pull feature added in v4.0.0 (documented in CHANGELOG and USP, but not in the main DOCS.md feature section).

### AGENTS.md

- [ACCURATE] Scope list is the full canonical list (70+ scopes including v4 additions: `brain`, `v4`, `usp`, `rihal-tools`, `rcode-tools`, `orchpanel`, `status`, etc.).
- [ACCURATE] 5-component skills compliance check instructions are present.
- [ACCURATE] Commit rules, PR rules, naming/branding rules all reflect v4 reality.

### CLAUDE.md (project-level)

- [STALE] Line 27 — **scope list is a stub**: CLAUDE.md lists only 11 scopes (`agents`, `skills`, `workflows`, `templates`, `dashboard`, `docs`, `config`, `github`, `phases`, `references`, `cli`) while AGENTS.md carries the full 70+ scope list. CLAUDE.md is checked into the repo and used by external contributors who may not have AGENTS.md context. The stale stub will cause false "invalid scope" rejections in CI/hooks for contributors using only CLAUDE.md.

### docs/USP.md

- [ACCURATE] "45 named agents" — confirmed.
- [ACCURATE] "8 real-pain skills" — all 8 (`rcode-auth-audit`, `rcode-client-gate`, `rcode-deploy-unify`, `rcode-mvp-graduate`, `rcode-rebrand`, `rcode-ocr-consistency`, `rcode-theme-system`, `rcode-migrate`) confirmed to exist in `rcode/skills/`.
- [ACCURATE] "11 engineering-rigor skills" — all 11 (`rcode-prove-it`, `rcode-harden`, `rcode-perf`, `rcode-debug`, `rcode-trim`, `rcode-incremental`, `rcode-source-truth`, `rcode-browser-verify`, `rcode-ci`, `rcode-git-flow`, `rcode-incident-record`) confirmed to exist.
- [ACCURATE] `rcode/brain/sources.yaml` path exists and the 6th USP section is documented.
- [ACCURATE] Comparison table (45 shipped vs 1 generalist for competitors) is accurate.

### docs/commands.md

- [ACCURATE] 116 command entries exist in `rcode/commands/` matching the documented count.
- [ACCURATE] `node --test` and `pnpm test` instructions match actual runner config.

### docs/agents.md

- [ACCURATE] No stale numeric claims about agent counts found (the "45 points" on line 583 is a scoring rubric, not a count).

---

## Broken Links

| File | Link | Status |
|------|------|--------|
| README.md | `mailto:hanzla.dev@gmail.com` | Valid (mailto, not file link) |

No broken `](./path)` or `](path.md)` file-reference links found in any audited doc.

---

## Recommendations

1. **README.md line 155** — Update "30 tests" → "339 tests, 100% pass on every release." (WRONG, high priority — self-contradicts line 16 in the same file.)
2. **README.md line 16** — Verify "58 files": actual `.test.cjs` count is 51; 58 may include eval/ and helpers. Correct or add a note.
3. **README.md line 16 / DOCS.md** — Skill count "85" is off by 1 (actual: 86). Decide whether to correct or exclude the rcode-init umbrella skill from the count.
4. **CHANGELOG.md line 73** — "30/30 tests" → "339/339 tests" for v4.0.0 entry accuracy.
5. **CLAUDE.md line 27** — Expand scope stub to full list (or point to AGENTS.md) so repo contributors get the correct scope list from the checked-in CLAUDE.md.
6. **DOCS.md** — Add a `brain pull` / `sources.yaml` section to the main feature docs (currently only in CHANGELOG and USP).
