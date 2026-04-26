# Decision Log — `rihal-code`

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

### 2026-04-26 — Plain English over jargon in flag names

**Decision:** Use `--attack` rather than `--adversarial` and `--edge-cases` rather than `--edge-case-hunter` for code-review modes.
**Rationale:** Audience includes solo SaaS builders globally including non-native English speakers. Jargon creates a comprehension wall.
**Alternatives considered:** Keep `--adversarial` (rejected: unclear meaning to many users).
**Who decided:** User during Phase 4 reviews fold.
**Reversibility:** Easy via flag aliases if needed.

### 2026-04-26 — Decouple skill folder names from slash command names (Path B)

**Decision:** Skill folder names stay `rihal-*` for installer compatibility; user-facing slash commands use `/rcode:*` for new branded skills.
**Rationale:** `cli/install.js:741-743` hardcodes the `rihal-` prefix; renaming all skill folders would require touching the off-limits installer. Brand vocabulary lives in the user-facing surface, not the file system.
**Alternatives considered:** A) update installer to support both prefixes (rejected: bigger surgical edit, off-limits file). B) Path B keeps installer untouched.
**Who decided:** During Phase 3 → Phase 4 transition after pre-flight discovered installer constraint.
**Reversibility:** Easy if installer is later extended.

### 2026-04-26 — Drop `rihal-architect` and `rihal-tech-writer` agents

**Decision:** Fold `rihal-architect` into `rihal-waleed` (CTO + Chief Architect) and `rihal-tech-writer` into `rihal-noor` (Technical Writer & Presentation Lead).
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

**Decision:** Make persistent project memory (`.rihal/memory/`) the primary differentiator vs bmad/GSD/agent-skills.
**Rationale:** AI agents losing context is a universal pain. Existing tools rely on `CLAUDE.md` files that go stale. Structured + visible + versioned + dashboard-rendered context is uniquely useful and hard to copy because it requires Memory Bank schema design + dashboard work + skill plumbing.
**Alternatives considered:** Just slim/rename existing skills (rejected: doesn't add new value), build a chat memory layer (rejected: invisible to humans, can't be reviewed in PRs).
**Who decided:** During positioning conversation that became `BRAND.md` and `MEMORY_BANK.md`.
**Reversibility:** Easy — the Memory Bank is additive; remove `.rihal/memory/` and the dashboard `/memory` route degrades gracefully.

### 2026-04-26 — Memory Bank initialised

**Decision:** Adopt rcode Memory Bank for persistent project context. Dogfood on rcode itself.
**Rationale:** AI agents lose context between sessions; new teammates need a single place to learn the project's history without archaeology through Slack and PRs.
**Alternatives considered:** CLAUDE.md only (rejected: no structure, goes stale), wiki (rejected: not in-repo, not version-controlled with code), README sections (rejected: doesn't scale).
**Who decided:** Project lead.
**Reversibility:** Easy. Just delete `.rihal/memory/` to remove.
