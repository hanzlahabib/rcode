# First-Five-Minutes Honesty Audit

Branch: `audit-first-five-min` · Date: 2026-08-08 · Lens: brand-new user, README top-to-bottom, first command only.

Method: read README.md verbatim as a newcomer, then verified every claim against the actual shipped code — including a **real `pnpm dlx @hanzlaa/rcode install`** into an empty scratch directory (no prior `.rcode`/`.claude` state), tracing exactly what `/rcode-init` would see on that project, and running `node --test` on the current release commit (`c398c04`, tagged v4.8.0, HEAD of `main`).

---

## README claims table (Quickstart + surrounding sections)

| # | Claim | Location | Verified |
|---|---|---|---|
| 1 | `pnpm dlx @hanzlaa/rcode install` installs cleanly | README.md:173 | **TRUE** |
| 2 | Restart Claude Code, then run `/rcode-init` | README.md:176 | Command exists, runs — but see Finding 1 |
| 3 | `/rcode-init` detects fresh/existing/returning and routes accordingly | README.md:182 | **FALSE as documented** — see Finding 1 |
| 4 | "For a greenfield project it auto-routes to `/rcode-new-project`" | README.md:182, also docs/getting-started.md:32 | **FALSE** — unreachable on the documented install→init path — see Finding 1 |
| 5 | 45 agents · 117 commands · 129 workflows · 1 runtime dependency | README.md:9, 26 | 45 ✓ / 117 ✓ / **130** workflows (off by one) / 1 ✓ |
| 6 | `@hanzlaa/rcode` v4.7.0 on npm | README.md:26 | **STALE** — npm + package.json both say v4.8.0 |
| 7 | "v4.3.2 is the current release" | README.md:230 | **FALSE / self-contradicts claim #6 in the same file** — actual v4.8.0 |
| 8 | "495 automated tests across 62 files" | README.md:157 | **STALE** — actual 598 tests / 74 files |
| 9 | "497 automated tests across 61 files, 100% pass on every release" | README.md:232 | **STALE + FALSE** — actual 598/74, and the *current tagged release* does not pass 100% (2 failing, see Finding 3) |
| 10 | Session start reads `.rcode/memory/` at "~5K tokens, fully oriented" | README.md:105 | **UNVERIFIABLE** without a live agent session — no local instrumentation measures this; not falsified, just unmeasured |
| 11 | Core-op latency ~60ms, 0 LLM tokens | README.md:161 | **TRUE** — reproduced locally (42–62ms range across 4 ops via `benchmarks/facts.cjs`) |
| 12 | "1 runtime dependency" (`ws`) | README.md:9, 26, 159 | **TRUE** |
| 13 | Full loop: `/rcode-council` → `/rcode-plan` → `/rcode-execute` → `/rcode-status` all exist and do what's described | README.md:186-202 | Commands all exist; `/rcode-execute` has an internal dead agent reference — see Finding 2 (not a doc lie, but undercuts "runs the plan... with pass/fail gates" if the review gate silently no-ops) |
| 14 | Every command named in README.md / docs/install.md / docs/getting-started.md resolves to a real command file | throughout | **TRUE** — see verification below, no dev-story.md-class dead command names found in the first-five-minutes path |

---

## Finding 1 (headline) — `/rcode-init`'s "greenfield → `/rcode-new-project`" promise is unreachable on the documented path

**Claim (README.md:182, docs/getting-started.md:27-32):** `/rcode-init` detects project state and "for a greenfield project ... auto-routes to `/rcode-new-project`", asking ~3 setup questions along the way.

**What actually happens**, reproduced by running the exact documented sequence (`pnpm dlx @hanzlaa/rcode install --yes` into a brand-new empty directory, then simulating `/rcode-init`'s own Step 1 detection script from `.rcode/workflows/init.md:38-54`):

```
rcode-configured: yes     # install already wrote .rcode/config.yaml
state-present: yes        # install already wrote .rcode/state.json
rihla-present: no
git: no
(no package.json/pyproject.toml/Cargo.toml/go.mod)
(no src/app/lib dirs)
0 commits
```

Per the classification table in `.rcode/workflows/init.md:56-63`, `returning` fires whenever `.rcode/config.yaml` exists — and `install` **always** stamps that file (verified in `cli/install.js:2580-2654`) before `/rcode-init` ever runs, on every install, fresh project or not. So the `fresh` branch (`No code, no git, no rcode`) can never trigger when a user follows the README's own two-step Quickstart. Instead, `/rcode-init` takes the "JOURNEY.md missing — partial prior init" recovery branch (`.rcode/workflows/init.md:86-94`), which:
- **Skips Step 2 entirely** — the interactive questions (name, language, mode, model profile, branching strategy) are never asked, contradicting docs/getting-started.md:27-30's "Answers 3 quick questions" (it's actually 5 questions per `.rcode/workflows/init.md:102-117`, and none of them is "is this a new or existing project?" — that's auto-detected, not asked).
- **Has no defined Step 5 output.** `.rcode/workflows/init.md:300-337` only specifies copy-paste suggestions for `fresh`, `existing-new-rcode`, and `returning + --reset`. There is no case for "returning, no `--reset`, JOURNEY missing" — which is exactly the state every single fresh install produces. The agent has to improvise the most common first-run output because the workflow doesn't define it.

Interestingly, `cli/install.js:2633-2649` already tracks this exact ambiguity with a `_seeded_stub: true` marker in the state.json template, specifically so downstream tooling can tell "install just stubbed this" apart from "a real project already ran init." `.rcode/workflows/init.md`'s Step 1 detection script never reads that marker — it only does `test -f`, so the one piece of data that would let it correctly say "fresh" is sitting right there, unread.

**Impact:** every single user who follows the README's exact two commands never sees the greenfield/`/rcode-new-project` routing the README advertises as the headline first-command behavior, and never gets asked the 5 setup questions the workflow spec defines.

**Also observed, same class:** the CLI installer's own printed "Next" block (what `pnpm dlx @hanzlaa/rcode install` prints on completion) does **not** suggest `/rcode-init` at all:
```
Next:
  cd <project>
  claude              # start Claude Code (reload window if already open)
  /rcode-progress     # where you are, what's next
  /rcode-do           # interactive command picker
  /rcode-council <q>  # multi-agent strategic answer
```
Meanwhile the separate `postinstall` npm hook (fires earlier, during `pnpm add`/`pnpm dlx` dependency resolution, before the `install` subcommand even runs) prints a *third*, different "Golden Path" starting with `"scaffold a new project" → rcode-scaffold-project`. So a brand-new user sees three different "what do I type first" answers within the same install run: the postinstall banner (`rcode-scaffold-project`), the install command's own "Next" section (`/rcode-progress`), and the README (`/rcode-init`). None of the three agree, and none of them is wrong exactly — but a newcomer has no way to know which is authoritative.

**Recommendation:** either make `/rcode-init`'s Step 1 detection consult `_seeded_stub` (or have `install` not pre-write config.yaml/state.json until init actually runs), or stop advertising the greenfield auto-route as something that happens automatically. This is a logic/consistency decision, not a typo — left as a finding, not auto-fixed.

---

## Finding 2 — Dead agent reference in `/rcode-execute` and 3 other workflows (same bug class as #1005)

A real, currently-failing test (`test/agent-team-parity.test.cjs`, "every workflow subagent_type= reference resolves to an agent file") caught this on the current release commit:

```
workflow subagent_type refs with no agent file:
  - rcode-reviewer
```

`subagent_type="rcode-reviewer"` is referenced 7 times across:
- `rcode/workflows/execute.md:615` — this is `/rcode-execute`, one of the 4 "full loop" commands the README promotes right after install
- `rcode/workflows/lens-audit.md:199,449,562,622`
- `rcode/workflows/code-review.md:391`
- `rcode/workflows/code-review-fix.md:298`

There is no `rcode/agents/rcode-reviewer.md` file. The closest match is `rcode/agents/rcode-code-reviewer.md`, whose own frontmatter confusingly declares `name: rcode-reviewer` inside a file named `rcode-code-reviewer.md` — a three-way naming drift (filename vs. frontmatter `name:` vs. workflow references). Claude Code's own agent loader appears to resolve subagents by frontmatter `name:` (the Agent-tool roster available in this very session lists `rcode-reviewer` as a valid type), so this may not be a hard runtime break — but it is exactly the kind of drift that produced the dev-story.md dead-command bug (#1005), it's currently red in CI-equivalent (`node --test`), and it sits inside the README's own "full loop" path. **Not auto-fixed** — ambiguous whether the correct fix is renaming the file, the frontmatter, or the 7 references, and touching `/rcode-execute`'s review gate isn't a safe blind edit.

---

## Finding 3 — "100% pass on every release" is false for the current release

`node --test` on `c398c04` (tagged v4.8.0, current `main` HEAD) after a clean `pnpm install`:

```
Total tests: 598
Passing:     596
Failing:     2
```

The two failures:
1. `test/agent-team-parity.test.cjs` — the `rcode-reviewer` dead reference above (Finding 2).
2. `test/scope-history-parity.test.cjs` — commit scope `eval` used in the last 100 commits but not present in `AGENTS.md`'s "Scopes allowed" list.

Neither is exotic or environment-specific (both reproduce on a clean checkout + `pnpm install`, no worktree-specific flakiness). README.md:232 says "100% pass on every release" right next to the stale 497/61 count — this line was true at some earlier point and has drifted false along with the numbers.

Note: before running `pnpm install`, `node --test` reported 34 failures — those were all `Cannot find module 'picocolors'`/`'@clack/prompts'` errors, an artifact of this git worktree having an empty `node_modules/` (worktrees don't share installed deps). That's a **test-environment** gap, not a product bug — recorded here so the 34-vs-2 discrepancy isn't mistaken for evidence either way.

---

## What I verified TRUE

- `pnpm dlx @hanzlaa/rcode install` runs cleanly on a truly empty directory, no prior state, no crashes, installs 856 files.
- All commands named in README.md, docs/install.md, and docs/getting-started.md resolve to real files in `rcode/commands/` — the specific dev-story.md-class dead-command bug (#1005) does **not** recur in any of the three primary first-five-minutes documents.
- `/rcode-init` itself exists both as a project-local and global command after install (no missing-command failure).
- 45 agents / 117 commands / 1 runtime dependency (`ws`) — all exact.
- Core-op latency claim (~60ms, 0 LLM tokens) reproduces locally within the claimed range.
- `.rcode/config.yaml`, `.rcode/state.json`, `.rcode/context/{active,project-brief}.md`, `.planning/{PROJECT,ROADMAP,STATE}.md` are all created by `install` as advertised structurally (though see Finding 1 for why this pre-seeding is itself the root cause of the init classification bug).

## What I could not verify (unverifiable, not false)

- The "~5K tokens, fully oriented" session-start cost claim (README.md:105) — no local instrumentation captures live-agent token spend; would require an actual Claude Code session with token accounting, out of scope for a file-system-level audit.
- Whether "most P1 bugs get fixed within 48 hours of a dogfeed run" (README.md:126, 233) — this is a historical/process claim not falsifiable from repo state alone.

## What I fixed (small, safe, doc-only — applied via `/rcode-quick`)

See commit for the exact diff. Scope was deliberately limited to self-contained factual corrections (version number, workflow count, test counts) that don't require a product decision:
- README.md:26 — `v4.7.0` → `v4.8.0`; `129 workflows` → `130 workflows`
- README.md:157 — `495` tests / `62` files → `598` / `74`
- README.md:160 — `45 / 117 / 129 / 96` → `45 / 117 / 130 / 96` (same workflow-count off-by-one, second occurrence — fixed for internal consistency with line 26)
- README.md:230 — `v4.3.2` → `v4.8.0`
- README.md:232 — `497 automated tests across 61 files, 100% pass on every release` → corrected count, dropped the unverified/currently-false "100% pass" claim in favor of pointing at the CI badge (already the authoritative live-status source elsewhere in the same README)

**Not fixed** (needs a product/code decision, not a doc edit — left as findings above for follow-up):
- Finding 1 — `/rcode-init` greenfield routing / `_seeded_stub` detection gap
- Finding 1 (secondary) — three disagreeing "first command" recommendations (README vs. postinstall banner vs. install's own "Next" output)
- Finding 2 — `rcode-reviewer` / `rcode-code-reviewer` naming drift across 7 workflow references
- Finding 3's underlying two failing tests (scope-history-parity requires an AGENTS.md edit, which project rules require stopping to confirm before touching)
