# council.md — dispatch/implementation-boundary audit

Branch: `audit-council` · Date: 2026-08-06
Scope: `rcode/workflows/council.md` (622 lines) + `rcode/commands/council.md` + its `<required_reading>` dependency `.rcode/references/council-protocol.md` + the CLI it drives (`.rcode/bin/rcode-tools.cjs`, `.rcode/bin/lib/council-panel.cjs`).

Question asked: does council.md repeat the false-dispatch pattern found in `/rcode-execute` (#1003), the fake-subagent-tools pattern found in the named-persona skills (#1004), or the dead-command pattern found in `/rcode-dev-story` (#1005)? Every claim below is grep/read-verified against the actual code, not inferred from the doc text.

## Verdict

**council.md itself is CLEAN on the three specific patterns it was checked against.** It does not claim Task-tool dispatch results in real code writes, does not hand off to implementation incorrectly, and does not reference a dead command. Its Task-tool dispatch to `rcode-{id}` subagents is real and correctly wired — a genuine contrast with the `/rcode-execute` bug.

Verification did surface **two real data-contract bugs** in the CLI path council.md depends on (documented fields that never populate for the `council` workflow), and **two staleness/contradiction issues** in `council-protocol.md`, the required-reading file council.md `@`-includes. These are reported below since they were found while verifying the same code path, even though they aren't the exact "false Task dispatch → fake code write" pattern from #1003–#1005.

---

## 1. No false claim of code writes via spawned agents — CLEAN

| Claim | Evidence | Status |
|---|---|---|
| council.md:4 — "parallel Task-tool spawning (not sequential roleplay)" | `rcode/commands/council.md:5-11` lists `Task` in `allowed-tools`; council.md:317-325 instructs multiple real `Task tool call` invocations in one response block | VALID — this is genuine Task-tool dispatch, not inline roleplay |
| Panelists never write code | `rcode/agents/rcode-sadiq.md:12` `tools: Read, Grep, Glob, WebFetch, WebSearch, Bash`; `rcode/agents/rcode-waleed.md:14` `tools: Read, Grep, Glob, Bash, WebFetch, WebSearch`; `rcode/agents/rcode-fatima.md:14` `tools: Read, Grep, Glob, Bash` | VALID — none of the three default panelists have `Write`/`Edit`. Advisory-only is enforced at the tool-grant level, not just in prose. |
| Session artifact (Step 6, council.md:517-579) is written by the orchestrator, not delegated to a panelist | `rcode/commands/council.md:6-11` grants the top-level command `Read, Grep, Glob, Bash, Task, AskUserQuestion` — no `Write`/`Edit` either, but the workflow's `Write` calls (session artifact, Step 6) run in the main session context that already has file-write tools by default, not inside a spawned `rcode-{id}` subagent | VALID — no persona is ever asked to write a file |

This is the opposite of the #1004 finding: those persona *skills* imply Task-tool subagent dispatch while being inline roleplay with a real subagent twin that lacks Write/Edit. Here, council.md's dispatch is real, and the "lacks Write/Edit" fact is *correct and intentional* for an advisory council, not a bug.

## 2. No incorrect implementation handoff — CLEAN

- `## Next Up` (council.md:619-622) points to `/rcode-plan` — "plan implementation based on the council's recommendation" — and `/rcode-decisions`. Council never claims to implement anything itself; it defers to a separate planning step, which is the correct advisory→implementation boundary.
- `/rcode-plan` is a real command: `rcode/commands/plan.md` exists (confirmed via directory listing).
- Step 0.6 (council.md:79-91) redirects single-agent questions to `/rcode-discuss` — verified real: `rcode/commands/discuss.md` and `rcode/workflows/discuss.md` both exist.

## 3. No dead-command references — CLEAN

- `/rcode-council` (`rcode/commands/council.md`) `@`-includes `.rcode/workflows/council.md` (installed path) — this is a live, existing workflow, unlike `/rcode-dev-story`'s pointer to a dead `/rcode` command (#1005).
- `rcode-tools.cjs init council` (council.md:149) — the `council` branch exists at `.rcode/bin/rcode-tools.cjs:387-402`, confirmed live.
- `rcode-tools.cjs state record-council` (council.md:588-591) — confirmed live at `.rcode/bin/rcode-tools.cjs:2076-2087`, accepts `--slug`/`--panel`/`--artifact` exactly as council.md invokes it.
- `.rcode/references/auto-init-guard.md`, `.rcode/references/council-protocol.md`, `.rcode/references/commit-conventions.md`, `.rcode/references/response-style.md` (council.md:31-32, 481, 581) — all four files exist on disk.
- `rcode-tools.cjs classify-question` / `select-panel` (referenced in `rcode/commands/council.md:24`, not council.md itself) — both exist as live top-level subcommands (`rcode-tools.cjs:6694`, `6703`).

## 4. Dispatch mechanics verified correct (not just "not obviously false")

- `installed_agents` in the `init council` JSON comes from `listInstalledAgents()` (`.rcode/bin/rcode-tools.cjs:286-301`), which reads `.rcode/_config/agent-manifest.csv` (exists) and returns **bare ids** (`sadiq`, `waleed`, `fatima`, ...).
- council.md:106 builds `Task(subagent_type="rcode-{id}")` — prefixing the bare id with `rcode-`. This matches real files: `rcode/agents/rcode-sadiq.md`, `rcode/agents/rcode-waleed.md`, `rcode/agents/rcode-fatima.md` (and 42 others) all exist under exactly that naming convention.
- This is the mechanism that was broken for `/rcode-execute` (named personas never actually got dispatched, only generic `rcode-executor` did). For council, the id→file→`Task(subagent_type=...)` chain is intact end-to-end.

---

## Secondary findings (real bugs, found verifying the same code path — not the audited pattern, but load-bearing)

### A. `response_language` field is documented but never populated for `council` — BROKEN

- council.md:166 documents `response_language` as a field on the `init council` JSON output ("output language from config (null = English)").
- council.md:170 makes it load-bearing: *"If `response_language` is set: include `Respond in {response_language}.` in every subagent prompt..."*
- Actual code: `cmdInit()` builds the `council` output object at `.rcode/bin/rcode-tools.cjs:422-445` — no `response_language` key is set there. The only place `out.response_language` is assigned is `.rcode/bin/rcode-tools.cjs:564`, nested inside `if ((workflowName === 'phase-op' || workflowName === 'sprint-plan') && question) { ... if (!Number.isNaN(phaseNum) && phaseNum > 0) { ... out.response_language = ... } }` — i.e. only for `phase-op`/`sprint-plan`, never for `council`.
- Effect: for every `/rcode-council` invocation, `response_language` is `undefined` in the parsed JSON. The language pass-through instruction in council.md:170 can never fire from real data — it's a documented contract the code doesn't implement for this workflow.

### B. "Domain" banner field has no data source in the default (non-`--explain`) path — BROKEN

- council.md's `<output_format>` (unconditional, printed on every session) requires: `Domain: {domain from scores — fe / be / ml / deploy / strategic / market / general}` (council.md:15).
- `explainSelection()` in `.rcode/bin/lib/council-panel.cjs:560-575` does compute a `domain` field.
- But `cmdInit()` only calls `explainSelection()` — and only reads its `.scores` (discarding `.domain` entirely) — when `flags.explain` is true (`.rcode/bin/rcode-tools.cjs:398-401`). Without `--explain` (the common case), `scores = {}` and `domain` is never computed or returned at all.
- Effect: the mandatory opening banner has no real "domain" value to source in the default path, forcing the orchestrator to either guess or silently omit — the documented data source doesn't exist for most invocations.

### C. Required-reading `council-protocol.md` has stale facts council.md relies on being current — STALE

council.md:32 `@`-includes `.rcode/references/council-protocol.md` as required reading before Step 1. That file contains two claims that are now wrong:

- Line 35: *"rcode's council uses a pure-function keyword scorer (`cli/lib/council-panel.cjs`)"* — no `cli/` directory exists anywhere in the repo. The real file is `.rcode/bin/lib/council-panel.cjs` (installed) / `rcode/bin/lib/council-panel.cjs` (source).
- Line 50: *"v2 prototype note: only Sadiq, Waleed, and Fatima are installed as first-class subagents. The scorer may select agent ids that don't yet have subagent files — the orchestrator must filter to installed agents..."* — `rcode/agents/*.md` currently has **45 files**, not 3. council.md itself correctly avoids hardcoding this (lines 97-100: *"do not hardcode agent names here, use the live list from INIT_JSON"*), so the workflow's own logic isn't broken by this — but the required-reading file it points the orchestrator to is stale enough to describe a "v2 prototype" state that no longer matches the installed agent roster by ~42 agents.

### D. Required-reading `council-protocol.md` directly contradicts council.md's own default output mode — CONTRADICTION

- `council-protocol.md:54`: *"Subagent responses are presented **verbatim and in panel order**. The orchestrator never summarizes, paraphrases, or condenses agent output."*
- council.md's own Step 5 "Default mode (compact summary)" (council.md:409-451): *"Scannable in 20 seconds. **No verbatim transcripts.** Full text goes to the artifact file."* ... *"Each one-liner ≤ 25 words. **Paraphrase, don't quote.**"*
- These are the same document family (council-protocol.md is `@`-included as required reading immediately before council.md's own process steps run), and they say the opposite thing about the default presentation mode. council.md's Step 5 is what actually executes, so behavior is not ambiguous — but an orchestrator reading the required-reading file first forms an incorrect expectation that gets silently overridden three steps later.

---

## Files verified (grep/read, not theorized)

- `rcode/workflows/council.md` (full read, 622 lines)
- `rcode/commands/council.md` (full read)
- `.rcode/references/council-protocol.md` (full read)
- `.rcode/bin/rcode-tools.cjs` (`cmdInit`, `listInstalledAgents`, `readAgentManifest`, `readConfig`, `record-council`, `select-panel`/`classify-question` dispatch)
- `.rcode/bin/lib/council-panel.cjs` (`explainSelection`, `detectDomain`, `selectPanel`)
- `rcode/agents/rcode-sadiq.md`, `rcode/agents/rcode-waleed.md`, `rcode/agents/rcode-fatima.md`, `rcode/agents/rcode-hanzla.md` (frontmatter `tools:` lines)
- `.rcode/_config/agent-manifest.csv` (existence)
- `rcode/commands/discuss.md`, `rcode/workflows/discuss.md`, `rcode/commands/plan.md` (existence, for handoff targets)
- `.rcode/references/{auto-init-guard,commit-conventions,response-style}.md` (existence)
