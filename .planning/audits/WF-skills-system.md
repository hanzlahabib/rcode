# Workflow Audit — `skills-system`

**Lens:** skills-system — the rcode skills subsystem as a user-facing workflow  
**Date:** 2026-09-16  
**Branch:** wf-skills-system  
**Auditor:** parallel-workflow-strengthening-auditor (lens 1 of 20)

---

## Verdict

**LEAKING. 3 high-severity holes eat user intent before the workflow even starts.**

The skills surface area is larger than advertised (99 files vs the claimed 91), installation silently drops an entire bucket (`dev-practices/`), one critical debugging skill is hidden from the model by a wrong flag, two trigger strings contain raw newlines that can never match, and 38 action skills carry permanently conflicting metadata. A user who types "debug this" gets Claude's built-in heuristics instead of rcode's scientific-method debugger. A user who installs rcode never gets the three dev-practices skills at all. These are silent misfires — the user gets *something*, just not what rcode promised.

---

## The user's actual experience

1. **User installs rcode** via `npx @hanzlaa/rcode install`. The CLI walks `agents/`, `actions/`, `core/`, `seo/` — and stops. The `dev-practices/` bucket (`nextjs-best-practices`, `react-best-practices`, `llm-engineering-best-practices`) is never installed. The user writes a Next.js app and types `/rcode-nextjs-best-practices`. Nothing happens. The skill doesn't exist in their IDE.

2. **User opens the Claude Code sidebar** hoping to browse rcode commands. They see one entry: `do`. The other 116 commands require knowing to type `/rcode-` from memory. No progressive discovery exists.

3. **User hits a bug and types "debug this".** The `rcode-debug` skill has 21 carefully-written trigger phrases, a scientific-method workflow, and a checkpoint protocol. The user gets none of it — the skill has `user-invocable: false` (`rcode/skills/actions/4-implementation/rcode-debug/SKILL.md:31`), so it was installed to `.rcode/skills/` (hidden from the model). Claude falls back to its own intuitions.

4. **User tries "run dev-story on story-005.md".** The trigger in `rcode-dev-story/SKILL.md:15-16` is:
   ```yaml
   - "run
     dev-story on"
   ```
   The embedded newline means this string will never match. Same for "run retrospective" in `rcode-retrospective`. The user's exact phrase is silently ignored.

5. **User invokes Hanzla agent and says "debug this"** expecting the persona. Hanzla's trigger list (`rcode/skills/agents/hanzla-engineer/SKILL.md:29`) includes "debug this" — but `rcode-debug` also claims that phrase. The agent wins (it is user-invocable; the action is hidden), so the user gets persona roleplay. If a future fix flips `rcode-debug` to user-invocable, a trigger collision surfaces with no defined resolution order.

6. **User reads `SKILLS_INDEX.md:3`**: "All 91 skills in rcode". Actual count: 99. The 8-skill gap erodes trust in the index as a reference.

7. **User or tooling reads `rcode-herdr-orchestration/SKILL.md`** and sees `not-for:` in frontmatter. They reasonably assume it is a supported schema key. It is parsed by nothing — it exists alongside real fields purely by convention. Any YAML processor expecting only known keys would either silently ignore it or fail.

---

## Leaks

### 🔴 L1 — `rcode-debug` hidden from model (`user-invocable: false`)

**File:** `rcode/skills/actions/4-implementation/rcode-debug/SKILL.md:31`  
**Impact:** The scientific-method debugger — 21 triggers, checkpoint protocol, structured hypothesis workflow — is routed to `.rcode/skills/` (internal, hidden). "Debug this", "root cause this", "rcode debug" trigger Claude's built-in behavior instead.  
**Fix:** Flip `user-invocable: false` → `user-invocable: true`. Remove `internal: true` to eliminate the flag conflict.

---

### 🔴 L2 — Broken YAML multi-line triggers in `rcode-dev-story` and `rcode-retrospective`

**Files:**  
- `rcode/skills/actions/4-implementation/rcode-dev-story/SKILL.md:15-16`  
- `rcode/skills/actions/4-implementation/rcode-retrospective/SKILL.md:11-12`  

**Root cause:** YAML block scalar inside a flow sequence — a literal `\n` is embedded in the trigger string. No user input will ever contain a newline. These triggers are dead on arrival.  
**Fix:** Collapse to single-line strings: `"run dev-story on"` and `"run retrospective"`.

---

### 🔴 L3 — `dev-practices/` bucket not walked by installer

**File:** `cli/lib/install-skills.cjs:162`  
**Detail:** `installSkills` iterates over `['agents', 'actions', 'core', 'seo']`. The `dev-practices/` folder containing three skills (`nextjs-best-practices`, `react-best-practices`, `llm-engineering-best-practices`) is absent from the walk list.  
**Impact:** All three skills are never installed for any user of `npx @hanzlaa/rcode install`. They exist in the repo but are effectively invisible at runtime.  
**Fix:** Add `'dev-practices'` to the bucket list in `installSkills`.

---

### 🟡 L4 — 38 action skills carry `internal: true` + `user-invocable: true` simultaneously

**Pattern:** `grep -rl "internal: true" rcode/skills/actions/` returns 38 files; all also declare `user-invocable: true`.  
**Impact:** The installer resolves this correctly today (`user-invocable` wins). But any naive YAML reader, documentation generator, or future installer change that respects `internal: true` as authoritative would silently mis-route 38 skills. The source metadata is permanently self-contradicting.  
**Fix:** Strip `internal: true` from every action skill that also declares `user-invocable: true`. These are user-facing; `internal` was historical scaffolding.

---

### 🟡 L5 — Trigger collision: Hanzla agent vs `rcode-debug`/`rcode-code-review`

**Files:**  
- `rcode/skills/agents/hanzla-engineer/SKILL.md` — triggers include "debug this", "code review"  
- `rcode/skills/actions/4-implementation/rcode-debug/SKILL.md` — trigger "debug this"  
- `rcode/skills/actions/4-implementation/rcode-code-review/SKILL.md` — triggers "review this code", "code review this"  

**Impact:** Currently masked (debug is hidden, so Hanzla wins). If L1 is fixed, both skills respond to "debug this" with no defined resolution. The agent persona is broader but less capable for systematic debugging; the action skill is purpose-built.  
**Fix:** Remove "debug this" and "code review" from Hanzla's trigger list. Route them explicitly from within the Hanzla persona (via capabilities table) rather than claiming the trigger phrases.

---

### 🟡 L6 — 17 action skills have `<!-- Bridge status: not currently invoked by any workflow -->` comments

**Files:** `rcode/skills/actions/` — 17 files confirmed.  
**Impact:** These skills are accessible via direct trigger but are never reached through the structured workflow chain. Users following the guided path (`/rcode-do` → workflow → steps) will never encounter them. Skills like `rcode-correct-course`, `rcode-sprint-status`, and `rcode-checkpoint-preview` exist in isolation.  
**Fix:** Either wire each into its relevant workflow (e.g. `execute.md` → `rcode-sprint-status`) or document them as "standalone only" and update the bridge-status comment accordingly.

---

### 🟡 L7 — `SKILLS_INDEX.md` claims 91 skills; actual count is 99

**File:** `rcode/skills/SKILLS_INDEX.md:3`  
**Detail:** `find rcode/skills -name "SKILL.md" | wc -l` returns 99. The index is stale by 8.  
**Fix:** Update the count; or — better — generate the count from `find` in a pre-commit hook or CI check so it never drifts again.

---

### 🟢 L8 — `not-for:` pseudo-field in `rcode-herdr-orchestration` frontmatter

**File:** `rcode/skills/actions/4-implementation/rcode-herdr-orchestration/SKILL.md`  
**Impact:** Parsed by nothing; no installer logic reads it. Implies a supported routing mechanism that does not exist. Low severity — a documentation smell, not a workflow break.  
**Fix:** Remove the field; document the "not-for" guidance as a comment in the Overview section instead.

---

## Strengthenings

1. **Add `dev-practices` to `installSkills` bucket list.** One-line fix, 3 skills immediately available to all users. Highest ROI change in this audit.

2. **Flip `rcode-debug` to `user-invocable: true`.** Immediately activates the most user-facing gap. Pair with removing the trigger from Hanzla's list (L5 fix) so only the action skill fires.

3. **Fix the two broken YAML triggers.** Single-line fix per file. No side-effects.

4. **Strip `internal: true` from the 38 user-invocable action skills.** Eliminates the source of confusion for any future tooling pass. Can be done in bulk with a sed one-liner.

5. **Generate SKILLS_INDEX.md skill count from `find`.** Add as a CI check: `find rcode/skills -name "SKILL.md" | wc -l` vs the count in the index. Breaks if they drift.

6. **Wire the 17 bridge-status skills into workflows or mark them explicitly.** `rcode-correct-course` and `rcode-sprint-status` have obvious homes in `execute.md` and `sprint-planning.md`. The others can be catalogued as "standalone"; either way, remove the passive "not currently invoked" comment so it doesn't read as a bug.

7. **Sidebar discovery beyond `do`.** Issue #710 trimmed SIDEBAR_COMMANDS to `['do']` for token budget. Revisit with a category-grouped approach: one sidebar entry per agent category (Agents, Analysis, Planning, Implementation) that opens the right `do` dispatch. Users get progressive discovery without blowing the description budget.

---

## Kill your darlings

**Kill: `internal: true` on all 38 user-invocable action skills.**  
These flags are historical scaffolding from before the `user-invocable` field existed. They add no value today — the installer ignores them when `user-invocable: true` is present — and they actively mislead anyone reading the source. Strip them all. The installer won't change behavior; the source will become honest.

**Kill: the duplicate `## Output Format` section in `rcode-party-mode/SKILL.md`.**  
`rcode/skills/core/rcode-party-mode/SKILL.md` has two `## Output Format` blocks (lines ~41-48 and ~63-79). The first is a short stub; the second is the real one. The first should be deleted. It's noise that makes the skill harder to read and risks a parser picking the wrong one.

**Kill: `not-for:` pseudo-field in `rcode-herdr-orchestration` frontmatter.**  
It is unused, undocumented, and implies a capability that does not exist. Move its intent to prose in the Overview and remove the YAML key.

**Strongly consider killing: the `rcode-party-mode` skill itself.**  
It provides open multi-agent chat but with no structured outcome. `/rcode-council` covers the same surface with voting, quorum, and a decision record. Party mode writes a transcript but nothing actionable. In practice it is `/rcode-council` minus the governance. If the value is "informal brainstorm", it should be documented as a lightweight alias of council, not a separate skill with its own personality dispatch logic. The effort to maintain `team.yaml` sync, transcript writing, and facilitator selection code is disproportionate to what a user gets beyond just opening council in discussion mode.
