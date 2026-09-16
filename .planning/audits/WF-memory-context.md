# Workflow Audit — Lens: memory-context

Auditor role: one of 20 parallel auditors, lens = memory/context system.
Scope: diagnose only. No source edits.

---

## Verdict

**Leaky.** The injection pipeline is mechanically sound — session-start hook fires, `memory-select.cjs` scores and ranks files, top 1500 tokens land as `additionalContext`. But the pipeline only helps if the Memory Bank is populated, and no major lifecycle workflow (new project, council session, milestone close, plan, execute) ever prompts the user to put anything in it. The bank is a well-built tank with no inlet pipes.

Brain pull compounds the problem: `rcode/brain/sources.yaml` has three external sources, all PLACEHOLDER URLs, so the "institutional knowledge" feature delivers nothing at install time.

---

## The user's actual experience

A user installs rcode on a new project and runs `/rcode-new-project`. They get a roadmap and phases. Nothing mentions memory. They run `/rcode-plan`, `/rcode-execute`, make architectural decisions in a `/rcode-council` session, close a milestone with `/rcode-complete-milestone`. At no point does any workflow say "log this to memory." Six months later they start a new session; the ambient injection block is empty or stale because nobody told them to run `/rcode-memory-init` or `/rcode-memory-update`.

The workflows that generate the most valuable context — council (decisions), execute (implementation facts), complete-milestone (what we shipped, what broke) — have zero memory references. Confirmed via grep:

- `rcode/workflows/complete-milestone.md` — 0 memory references
- `rcode/workflows/new-project.md` — 0 memory references
- `rcode/workflows/council.md` — 0 memory references
- `rcode/workflows/plan.md` — 1 incidental reference; no prompt to read or update
- `rcode/workflows/execute.md` — 1 incidental reference; no prompt to update

The user who actually uses the Memory Bank is the user who stumbled across the four dedicated memory commands. Everyone else gets nothing.

---

## Leaks

### 🔴 L1 — Brain pull is entirely inert

**File:** `rcode/brain/sources.yaml`  
All three external source entries carry `<PLACEHOLDER: github.com/rcode-om/???>` URLs. `brain.cjs` skips PLACEHOLDER entries (`rcode/bin/lib/brain.cjs` — `cmdBrain('pull', ...)`). The only source that works is `repo: self` (best-practices). Running `node .rcode/bin/rcode-tools.cjs brain status` returns no output — no fetched sources. The "institutional knowledge from upstream rcode repos" feature described in `rcode/brain/README.md` is inert until issue #162 (M5) lands. Users reading the README are misled.

### 🔴 L2 — Lifecycle workflows don't close the memory loop

**Files:** `rcode/workflows/council.md`, `rcode/workflows/complete-milestone.md`, `rcode/workflows/new-project.md`  
None of these workflows contain a call or suggestion to `/rcode-memory-update`. Council sessions produce decisions. Milestone close captures what shipped and what broke. New project setup is the natural moment for `/rcode-memory-init`. All three are silent. Decisions made in council evaporate unless the user already knows about `rcode-memory-update` and acts manually.

### 🔴 L3 — Recency scoring breaks on git checkout and fresh clones

**File:** `rcode/bin/lib/memory-select.cjs`  
`scoreFile()` computes recency via `fs.statSync(filePath).mtimeMs`. Git checkout and `git worktree add` both stamp fresh mtimes on every file — identical timestamps, making all files equally "recent." The recency dimension of the relevance score is meaningless after any checkout or clone. In a worktree (exactly the context this audit is running in), every memory file has the same mtime = checkout time. Files that haven't been touched in months score identically to files updated this morning.

### 🟡 L4 — Distill skill description describes mtime hashing, code does content hashing

**File:** `rcode/skills/core/rcode-memory-distill/SKILL.md` (no line numbers available in skills; see step 2 of the Overview section)  
The skill says "Hash sources. Compute a digest of source file mtimes." The actual implementation in `rcode/bin/lib/memory-digest.cjs` (`computeDigest()`) hashes file **content** (sha1 of sorted "path:contenthash" pairs), not mtimes. This was explicitly fixed to be stable across `git clone`/`checkout`/`worktree add`. The skill description is stale and misleading — it implies the skip logic is mtime-based (fragile) when it's actually content-based (correct).

### 🟡 L5 — Drift detection misses milestones/current.md

**File:** `rcode/bin/lib/memory-drift.cjs`  
`checkDrift()` reads only `project/stack.md` and `project/decisions.md`. It does not check `milestones/current.md`. When the current milestone name in `state.json` changes — phase advances, milestone closes — the milestone memory can silently disagree with `state.json`. A user who reads the ambient injection for milestone context gets stale data with no nudge to update.

### 🟢 L6 — Memory init is invisible to new project setup

**File:** `rcode/workflows/new-project.md`  
`/rcode-new-project` creates roadmap, ROADMAP.md, phases, and state.json but never mentions `.rcode/memory/` or `/rcode-memory-init`. A fresh install has an empty memory bank and gets no ambient injection. The only path to initialisation is the user independently discovering `/rcode-memory-init`.

---

## Strengthenings

**S1 — Add a memory hook at the end of `/rcode-council`.**  
After the council summary step, add: "Run `/rcode-memory-update` with each confirmed decision." Decisions are the highest-value memory content and the most likely to be forgotten. One line in `council.md`'s post-conditions section.

**S2 — Add a memory prompt to `/rcode-complete-milestone`.**  
At milestone close, prompt to update `milestones/current.md` (new milestone name, goal) and `incidents/known-issues.md` (anything that broke). One block in the "Post-conditions" or "Next Up" section of `complete-milestone.md`.

**S3 — Add `/rcode-memory-init` to `/rcode-new-project`'s Step 6 (Summary).**  
After printing the project summary, suggest: "Run `/rcode-memory-init` to activate ambient context injection." Low-cost addition; this is the natural moment when the user is setting up the project.

**S4 — Replace mtime recency with content-modification date.**  
In `memory-select.cjs` `scoreFile()`, replace `fs.statSync(filePath).mtimeMs` with the `generated-at` frontmatter date for distillates and a `last-updated` frontmatter field for raw memory files. Alternatively, read the file's last git-commit date via a lightweight `git log -1 --format=%ct -- <file>` call (cached per session). This is resistant to checkout mtime resets and worktree stamps.

**S5 — Sync the distill skill description with the implementation.**  
In `rcode/skills/core/rcode-memory-distill/SKILL.md`, replace the mtime-hashing description with: "Compute a content-based digest (sha1 of each source file's bytes) via `node .rcode/bin/rcode-tools.cjs memory-digest <target>`. The digest is stable across git clone, checkout, and worktree add." One sentence change; eliminates user confusion about skip logic.

**S6 — Add milestones/current.md to drift detection.**  
In `memory-drift.cjs`, extend `checkDrift()` to compare the milestone name in `milestones/current.md` against `state.json`'s `current_milestone` (or equivalent) field. When they diverge, emit a drift nudge identical to the existing stack/decisions nudge. Prevents silently stale milestone context.

**S7 — File real brain source URLs before next release.**  
The PLACEHOLDER entries in `brain/sources.yaml` block the entire brain pull feature. Until issue #162 lands, add a one-line warning to `rcode/brain/README.md` stating that external sources are pending and brain pull only provides `repo: self` content. Prevents users from thinking they received institutional knowledge they did not receive.

---

## Kill your darlings

**The 1500-token ambient injection budget.**  
The default budget (`DEFAULT_BUDGET_TOKENS = 1500` in `memory-select.cjs`) is a reasonable number, but it is calibrated against a Memory Bank that is mostly empty. Once the Memory Bank is populated — distillate alone is ~1850 tokens per the project distillate frontmatter — the distillate alone already overflows the default budget and gets truncated. Consider either raising the default to 3000 tokens for sessions that have a populated distillate, or selecting the distillate and then fitting raw files into the remainder. The current behaviour means the most useful pre-compressed artefact is the first thing to be cut.

**The `--fix` flag in `/rcode-memory-audit`.**  
The audit workflow has a `--fix` mode that patches trivial items atomically (`rcode/workflows/memory-audit.md` step 9). In practice, "trivial" is hard to define safely, and the guardrail ("NEVER patches above trivial severity, even with `--force`") means `--fix` can only touch stale ISO dates, typos, and broken relative paths. That is so narrow that the complexity of the flag — the FIX_MODE bash guard, the atomic-commit-per-fix loop, the skip-list reporting — outweighs its value. Either widen what counts as trivial (making the feature meaningful) or remove `--fix` and keep the audit report-only. A report that identifies an issue and tells the user which command to run is cheaper and safer than a patcher that can only fix the least impactful items.
