---
phase: 30
plan_number: 2
sprint: 30.2
type: execute
status: complete-with-deferred-checkpoint
requirements: [REQ-756]
---

# Sprint 30-2 Summary — README diet + visual proof (#756)

## Objective

Cut `README.md` (535 lines, zero visuals) to ~200 lines following the order
value prop → visual proof → quickstart → differentiation → links; add a hero
demo GIF and a Diwan dashboard screenshot near the top; relocate the
test-suite table, CI pipeline, full command list, and state.json schema into
`DOCS.md` with no information loss.

## Tasks completed

### Task 30.2.1 — auto — Relocate deep-detail sections into DOCS.md ✅
Moved three blocks out of the README into `DOCS.md`:
- **Full command surface (95 commands)** → appended under DOCS.md section 7
  (Slash commands) as a "Full command surface" subsection. Content moved
  verbatim; the wrong "95" count was left as-is (sprint 30-3 owns count fixes).
- **Testing table + CI pipeline** → new `## Testing & CI` section inserted
  before section 15 (Architecture), with a TOC entry added.
- **State tracking / state.json field list** → appended under the existing
  "State file (`.rcode/state.json`)" subsection in section 11 (Configuration).

DOCS.md grew from 969 → 1086 lines.

### Task 30.2.2 — auto — Cut README to ~200 lines + image placeholders ✅
Rewrote `README.md` to **165 lines** (target 150–230) in the required order:
1. **Value prop** — title, RTL tagline, one-line pitch, install command, npm badges.
2. **Visual proof** — `## See it work` section directly under the badges with
   `![rcode demo](docs/assets/hero-demo.gif)` and
   `![Diwan dashboard](docs/assets/diwan-dashboard.png)`.
3. **Quickstart** — install, `/rcode-init`, the full loop, Golden Path link.
4. **Differentiation** — trimmed "What makes rcode different" (persistent
   memory, intent guards, markdown-first, three modes, Karpathy, verification).
5. **Links** — a "Learn more" table pointing to DOCS.md, getting-started,
   TIERS, MEMORY_BANK, BRAND, MIGRATIONS, CHANGELOG.

Deleted from README (relocated in 30.2.1 or linked to DOCS.md): full command
list, Testing table, CI pipeline, state.json schema, the 90-second tour
duplication, Modules table, Hooks section, Configuration YAML dump, the
verbose filesystem layout, and the long per-feature sub-explanations. No
agent/command/skill counts were changed (30-3 owns those). All seven links in
the "Learn more" table were verified to resolve to existing files.

Created `docs/assets/hero-demo.gif` and `docs/assets/diwan-dashboard.png` as
**zero-byte placeholder files**. Binary content was NOT fabricated.

### Task 30.2.3 — checkpoint:human-action — Capture real demo GIF + screenshot ⏸ DEFERRED
**This checkpoint cannot be completed by an automated executor.** The two
placeholder files committed in 30.2.2 are zero-byte. Their `<verify>` command
(`test -s`) currently reports `PENDING: human asset capture not yet done`.

**Human action required:**
1. Record a hero demo GIF of the `install → /rcode-council → /rcode-plan →
   /rcode-execute` loop and save it to `docs/assets/hero-demo.gif`.
2. Take a screenshot of the Diwan dashboard (`node server/dashboard.js`,
   http://localhost:7717) and save it to `docs/assets/diwan-dashboard.png`.
   The existing repo-root `image.png` (59.1K) may be reused if it already
   shows the dashboard — copy it to `docs/assets/diwan-dashboard.png`.

The README markdown is valid now and renders the placeholder paths; once the
real binaries replace the zero-byte files, the README displays correctly with
no further code changes.

## Verification results

| Check | Result |
|-------|--------|
| Task 30.2.1 `<automated>` | PASS — `compliance.test.cjs`, `no-new-deps`, `state.json` all present in DOCS.md |
| Task 30.2.2 `<automated>` | PASS — README 165 lines (≤230), both image refs present, both files exist, `compliance.test.cjs` no longer in README |
| Task 30.2.3 `<automated>` | PENDING — placeholders are zero-byte; real capture is a human task |
| `wc -l README.md` | 165 (target 150–230) |
| `wc -l DOCS.md` | 1086 (up from 969 — relocated content landed) |
| Linked docs exist | All 7 "Learn more" links + `docs/install.md` verified present |

## Test results

`node --test` (full suite): **341 tests, 339 pass, 2 fail.**

Both failures are the **known pre-existing baseline** in `test/compliance.test.cjs`:
- broken `@`-references
- `command-workflow @-includes` (`scaffold-milestone.md` does not @-include a workflow)

`compliance.test.cjs` checks command/workflow files only — files not touched by
this sprint. **No NEW failures introduced.**

## Commits (branch `audit-gap-closure`, not pushed)

| SHA | Message |
|-----|---------|
| (commit 1) | `docs(docs): relocate command list, testing/CI, and state.json schema into DOCS.md` |
| (commit 2) | `docs(docs): cut README to ~165 lines with visual proof above the fold` |

Run `git log --oneline -2` on `audit-gap-closure` for the resolved SHAs.

## Deviations / blockers

- **Task 30.2.3 deferred** — an automated executor cannot capture real binary
  GIF/PNG assets. Per sprint instructions, placeholders were created and the
  capture flagged as a human task rather than fabricating fake binaries.
- The 30.2.2 `<files>` field listed scope `docs` for the commit, which is in
  the allowed scopes — used `docs(docs):` conventional commits.
- No information was lost: every section cut from the README either has a
  DOCS.md home (30.2.1) or a link in the README's "Learn more" table.
- Wrong "95 commands" heading count was preserved deliberately — sprint 30-3
  owns count corrections.

## Outstanding for sprint 30-3 / human

1. Capture and commit the real `docs/assets/hero-demo.gif` and
   `docs/assets/diwan-dashboard.png` (checkpoint 30.2.3).
2. Correct the "95 commands" / agent / skill counts across README and DOCS.md.
