# Decision Log — `rcode`

Append-only. Newest at top. Each entry: date, decision, rationale, alternatives considered, who decided. One paragraph per entry. Heavier decisions get their own ADR file referenced from here.

---

## Format

```
### YYYY-MM-DD — Short decision title

**Decision:** What we chose.
**Rationale:** Why this over alternatives.
**Alternatives considered:** A (rejected because...), B (rejected because...).
**Who decided:** Person or council.
**Reversibility:** Easy / hard / one-way door.
**ADR:** [Optional link to a fuller ADR file]
```

---

## Entries

<!-- Append new decisions above this line -->

### 2026-05-20 — Hard-break v4.0.0 rebrand (rihal → rcode)

**Decision:** Ship the `rihal` → `rcode` rename as a single breaking v4.0.0 release with no rename shim, no compatibility aliases. Conventional-commits `!` marker on the release commit (`304eebc`).
**Rationale:** Pre-1.0 user base is small; carrying a shim doubles the maintenance surface. A clean break forces every user to re-install once and removes ambiguity in skill/command discovery.
**Alternatives considered:** Dual-publish under both names (rejected: install-time confusion, two doc sets). Soft rename with deprecation (rejected: drag, never finishes).
**Who decided:** Hanzla, solo.
**Reversibility:** One-way door — v3.x stays on npm but is unsupported.

### 2026-05-20 — File-shipping installer over agent-framework runtime

**Decision:** rcode is shipped as **files** (folders, markdown, slash commands) installed into the user's IDE config dirs. No multi-agent harness, no orchestrator process, no vector DB, no LangChain/AutoGen at runtime.
**Rationale:** The IDE already provides the agent runtime. Anything extra is weight the user has to debug.
**Alternatives considered:** Run a daemon orchestrator (rejected: another process to babysit). Ship as a library + framework (rejected: opinions leak into user code).
**Who decided:** Hanzla; established at project inception, re-confirmed during v4 release prep.
**Reversibility:** One-way door — the whole product identity rests on this.

### 2026-05-20 — Single agent reads the structure, not multi-agent dispatch

**Decision:** Default flow is one agent navigating folders. Multi-agent only via explicit `/rcode-council` / `/rcode-execute` parallel waves.
**Rationale:** Multi-agent demos look good but cost tokens linearly and fail unpredictably. A single agent reading a well-organised filesystem already has parallelism via tool calls.
**Alternatives considered:** Always-on multi-agent dispatch (rejected: cost + flakiness).
**Who decided:** Hanzla.
**Reversibility:** Easy — council/execute paths exist when truly needed.

### 2026-05-20 — Markdown over JSON for configuration & instructions

**Decision:** Skills, workflows, agents, and memory all live as markdown with optional YAML frontmatter. JSON only for machine state (`state.json`, `team.yaml` is YAML).
**Rationale:** Humans read and edit markdown without tooling; LLMs already parse it natively. JSON for configs makes diff review hostile.
**Alternatives considered:** Pure JSON (rejected: unreadable diffs). TOML (rejected: extra dialect for no win).
**Who decided:** Hanzla.
**Reversibility:** Hard — would require rewriting every skill/workflow.

### 2026-05-15 — Hyphen-prefix slash commands (`/rcode-*`) over colon namespace

**Decision:** Public slash commands use `rcode-*` (hyphen) rather than `rcode:*` (colon).
**Rationale:** Cross-IDE compatibility — Cursor and Gemini surfaces don't all parse the colon form consistently. Hyphen is universal.
**Alternatives considered:** Colon namespace (rejected per cross-IDE testing during v3.6.x).
**Who decided:** Hanzla after dogfeed sessions.
**Reversibility:** Hard once published — users have muscle memory.

### 2026-04-26 — Plain English over jargon in flag names

**Decision:** Use `--attack` rather than `--adversarial` and `--edge-cases` rather than `--edge-case-hunter` for code-review modes.
**Rationale:** Audience includes solo SaaS builders globally including non-native English speakers. Jargon creates a comprehension wall.
**Alternatives considered:** Keep `--adversarial` (rejected: unclear meaning to many users).
**Who decided:** User during Phase 4 reviews fold.
**Reversibility:** Easy via flag aliases if needed.

### 2026-04-26 — Decouple skill folder names from slash command names (Path B)

**Decision:** Skill folder names stay `rcode-*` for installer compatibility; user-facing slash commands use `/rcode:*` for new branded skills.
**Rationale:** `cli/install.js:741-743` hardcodes the `rcode-` prefix; renaming all skill folders would require touching the off-limits installer. Brand vocabulary lives in the user-facing surface, not the file system.
**Alternatives considered:** A) update installer to support both prefixes (rejected: bigger surgical edit, off-limits file). B) Path B keeps installer untouched.
**Who decided:** During Phase 3 → Phase 4 transition after pre-flight discovered installer constraint.
**Reversibility:** Easy if installer is later extended.

### 2026-04-26 — Drop `rcode-architect` and `rcode-tech-writer` agents

**Decision:** Fold `rcode-architect` into `rcode-waleed` (CTO + Chief Architect) and `rcode-tech-writer` into `rcode-noor` (Technical Writer & Presentation Lead).
**Rationale:** Pure scope overlap. Verified by reading both agent files in each pair — no unique capability lost. Reduces team.yaml from 47 to 45 agents.
**Alternatives considered:** Keep both for "redundancy" (rejected: confuses dispatch routing).
**Who decided:** During Phase 2 verified-safe-drops and Phase 4 Group 3.
**Reversibility:** Easy — restore from git history if needed.

### 2026-04-26 — Skip Phase 5 (workflow file splits)

**Decision:** Don't trim or split the 5 oversized workflow files (`autonomous.md` 1059 lines, `complete-milestone.md` 836, etc.).
**Rationale:** Workflows are dense executable bash + agent dispatch logic, not redundant prose. Trimming carries runtime risk that requires per-workflow end-to-end testing. Reward (line count compliance) is lower than effort.
**Alternatives considered:** Split each workflow into orchestrator + sub-workflows (rejected: unverified runtime impact).
**Who decided:** During Phase 4 Group 5 deliberation.
**Reversibility:** Easy — can revisit later with proper test scaffolding.

### 2026-04-26 — Build Memory Bank as the rcode product moat

**Decision:** Make persistent project memory (`.rcode/memory/`) the primary differentiator vs other agent-orchestration tools.
**Rationale:** AI agents losing context is a universal pain. Existing tools rely on `CLAUDE.md` files that go stale. Structured + visible + versioned + dashboard-rendered context is uniquely useful and hard to copy because it requires Memory Bank schema design + dashboard work + skill plumbing.
**Alternatives considered:** Just slim/rename existing skills (rejected: doesn't add new value), build a chat memory layer (rejected: invisible to humans, can't be reviewed in PRs).
**Who decided:** During positioning conversation that became `BRAND.md` and `MEMORY_BANK.md`.
**Reversibility:** Easy — the Memory Bank is additive; remove `.rcode/memory/` and the dashboard `/memory` route degrades gracefully.

### 2026-04-26 — Memory Bank initialised

**Decision:** Adopt rcode Memory Bank for persistent project context. Dogfood on rcode itself.
**Rationale:** AI agents lose context between sessions; new teammates need a single place to learn the project's history without archaeology through Slack and PRs.
**Alternatives considered:** CLAUDE.md only (rejected: no structure, goes stale), wiki (rejected: not in-repo, not version-controlled with code), README sections (rejected: doesn't scale).
**Who decided:** Project lead.
**Reversibility:** Easy. Just delete `.rcode/memory/` to remove.
