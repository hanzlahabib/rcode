# AUDIT — Agent Sprawl (rcode-* persona/tactical roster + rihal-* duplication)

**Date:** 2026-07-29
**Branch:** audit-agent-sprawl
**Auditor:** hostile/skeptical (Claude, diagnose-only — no fixes applied)

## Verdict

**Partially justified, partially bloat — but not for the reasons the brief assumed.** The brief's framing ("45+ named persona agents ... plus a full duplicate rihal-* namespace") does not match the current repo. Two claims needed correcting before the real findings could be evaluated:

1. Only **16** of the 45 agent files are named personas (Sadiq, Waleed, Fatima, Hanzla, etc.). The other **29** are generic tactical/utility agents (executor, planner, sprint-checker, auditors) with no persona identity — `team.yaml` itself draws this line (`agents:` vs `tactical_agents:`).
2. There is **no rihal-* source duplication in this repo.** The rebrand (`4da7c1e`, 2026-05-22) was a hard one-way cutover — `rcode/agents/` contains zero `rihal-*.md` files, and this exact question was already audited once before (`.planning/audits/AUDIT-commands-parity.md`, 2026-05-28) with the verdict "premise invalid, no rihal source namespace exists."

What **is** real, and worse than the brief assumed: the rihal-* duplication that does exist lives as **unremovable stale state on every machine that installed before the rebrand**, and none of the three tools that should clean it up (`install.js` warning, `migrate-namespace.cjs`, `uninstall.js`) actually can. See Finding 3 — this is the strongest finding in the audit, and it's still live on this machine, two months after the maintainer's own audit recommended cleaning it up.

The tool-grant collapse (Finding 1) and missing invocation evidence (Finding 2) are real but softer — they argue for consolidation, not that the roster is decorative.

---

## Finding 1 — Tool grants collapse into ~8 shapes across 45 files

**Claim to test:** do multiple persona agents have near-identical tool grants that could collapse into fewer generic roles?

**Method:** extracted the `tools:` frontmatter line from all 45 files in `rcode/agents/rcode-*.md` and grouped by set (order-independent).

**Result — 45 agents reduce to 8 distinct tool-grant shapes:**

| Tool set | Count | Members |
|---|---|---|
| `Read, Grep, Glob, Bash` | **16** | rcode-ahmed, rcode-fatima, rcode-hanzla, rcode-khalid, rcode-nasser, rcode-omar (personas) + rcode-code-reviewer, rcode-docs-auditor, rcode-integration-checker, rcode-nyquist-auditor, rcode-sprint-checker, rcode-assumptions-analyzer, rcode-cross-platform-auditor, rcode-dep-auditor, rcode-i18n-auditor, rcode-observability-auditor (tactical) |
| `Read, Grep, Glob, Bash, WebFetch, WebSearch` | 6 | rcode-waleed, rcode-mariam, rcode-sadiq, rcode-security-adversary, rcode-security-auditor, rcode-profiler |
| `Read, Grep, Glob, Bash, WebFetch` | 6 | rcode-haitham, rcode-yousef, rcode-ui-auditor, rcode-zayd, rcode-edge-case-hunter, rcode-deviation-analyzer |
| `Read, Grep, Glob, WebFetch` | 4 | rcode-hussain-pm, rcode-layla, rcode-ux-designer, rcode-zahra |
| `Read, Write, Edit, Bash, Grep, Glob` | 2 | rcode-debugger, rcode-executor |
| `Read, Write, Bash, Grep, Glob, WebSearch, WebFetch` | 2 | rcode-phase-researcher, rcode-project-researcher |
| `Read, Grep, Glob, Bash, Edit` | 2 | rcode-code-fixer, rcode-remediation-planner |
| `Read, Write, Bash, Grep, Glob` | 2 | rcode-verifier, rcode-roadmapper |
| (remaining ~5 shapes, 1 member each) | 5 | rcode-codebase-mapper, rcode-noor, rcode-advisor-researcher, rcode-planner, rcode-research-synthesizer |

35% of the entire roster (16/45 files, spanning both personas and tactical agents) carries the literal identical 4-tool permission set `Read, Grep, Glob, Bash` — i.e. "read the codebase and run shell commands," nothing more. Nothing in the tool grant itself distinguishes rcode-ahmed (Technology Director) from rcode-nasser (Engineering Manager) from rcode-i18n-auditor (utility auditor): all three literally cannot do anything the others can't at the harness-permission level.

**But:** tool grant is not the whole story. Body content diverges meaningfully in most cases. Two agent files in the identical-4-tool-set group are only 10 lines (`rcode-ahmed.md`, `rcode-nasser.md`) and delegate all persona content to a referenced `SKILL.md` (`rcode/skills/agents/ahmed-hassani-director/SKILL.md`, 156 lines; `rcode/skills/agents/nasser-eng-manager/SKILL.md`, 162 lines) — those skill files are substantive, not boilerplate stubs. Other members of the same tool-set group (`rcode-khalid.md`, `rcode-omar.md`, both ~96-99 lines) inline distinct decision frameworks, response formats, and refuse-lists that do not share a common template (different section headers, different content). **Conclusion: the tool-permission axis over-counts sprawl — the actual differentiation lives in the referenced skill/body content, which is genuinely non-identical where inlined.** The valid version of this finding is narrower than the brief's framing: tool grants alone are not a meaningful differentiator and could be flattened to ~8 capability tiers without losing anything, but that doesn't mean the personas themselves are redundant.

---

## Finding 2 — No telemetry; near-zero behavioral test coverage for personas

**Claim to test:** is there any telemetry, doc, or test proving persona agents are actually invoked in real usage vs decorative?

**Method:** searched `server/`, `rcode/`, and `test/` for invocation telemetry, agent-invocation counters, or behavioral tests; inventoried `test/eval/baselines/`.

**Result:**
- No telemetry module anywhere in `server/` or `rcode/` tracks which named agent was actually spawned in a real session (`grep -rln "agent.*invocation\|telemetry" server/ rcode/` → zero hits).
- `test/eval/baselines/` contains exactly **5** eval baseline files, of which **4** cover agents: `rcode-codebase-mapper`, `rcode-phase-researcher`, `rcode-planner`, `rcode-research-synthesizer`. **All four are tactical/generic agents.** Zero of the 16 named personas (Ahmed, Sadiq, Waleed, Fatima, Hanzla, Khalid, etc.) have any eval baseline.
- The test files that do reference agents (`test/agent-team-parity.test.cjs`, `test/agents-registry.test.cjs`, `test/do-workflow-agent-parity.test.cjs`, `test/council-panel-and-roadmap.test.cjs`, `test/council-grounding.test.cjs`) are **structural parity checks only** — they assert that `team.yaml` entries resolve to a file on disk, that workflow markdown contains required banner/grounding strings, etc. (`test/agent-team-parity.test.cjs:1-19` states its own purpose: "Catches: team.yaml entries with no real agent... file_path fields pointing at moved/renamed files... source files orphaned from the registry"). None of them invoke an agent and check its output.

**Conclusion: confirmed as stated.** There is no evidence in this repo of any persona agent's output ever being verified, benchmarked, or telemetered. The only behavioral coverage that exists at all belongs to the 4 tactical pipeline agents, not the personas the brief is questioning.

---

## Finding 3 — rihal-* is not source duplication, it's un-cleanable install debt (worse than the brief assumed)

**Claim to test:** does maintaining rihal-* as a full duplicate of rcode-* double every future bugfix's surface area? Find a concrete recent example.

**Method:** searched `rcode/`, git history, and this machine's actual installed state (`~/.claude/agents/`).

**Result — the premise is wrong for source, but the underlying problem is real and unfixed:**

1. **No source duplication exists.** `find . -iname "rihal-*"` inside this repo returns zero hits. `rcode/agents/` has never had a parallel `rihal/agents/` directory since the hard-cutover rename (`4da7c1e refactor!: rename rihal → rcode across entire codebase — v4.0 prep`, 2026-05-22, tagged `BREAKING CHANGE`, no shim, no alias — matches project memory decision log).
2. **This was already audited once**, `.planning/audits/AUDIT-commands-parity.md` (commit `2168cee`, 2026-05-28), verdict: *"TASK PREMISE INVALID — NO PARALLEL NAMESPACE EXISTS."* That audit traced the `rihal-*` agents a user session sees back to **install-time state on the maintainer's own machine**, not the repo, and recommended: *"The global `~/.claude/` install of pre-v4 `rihal-*` commands on the maintainer's machine is a stale install — `cli/uninstall.js` or a manual purge would clean it up."*
3. **That recommendation was never actioned, and independently verified as still-broken today (2026-07-29), two months later:**
   - `ls ~/.claude/agents/` on this machine right now returns **45 `rihal-*.md` files**, one exact twin per `rcode-*.md` agent. This is not hypothetical — it's why this very session's system reminder listed 91 agent types (45 rcode + 45 rihal + statusline-setup) instead of 46.
   - `diff ~/.claude/agents/rihal-hanzla.md ~/.claude/agents/rcode-hanzla.md` → the only differences are the `name:` field and `.rihal/` → `.rcode/` path prefixes in the `@`-includes. **They are mechanically identical**, not diverged.
4. **None of the three tools in this codebase that could clean this up actually do:**
   - `cli/install.js:2893-2907` — added by `8d85a24 fix(install): warn when rcode-* and rihal-* namespaces coexist` (2026-06-03, 5 days after the audit) — only prints a `WARNING`, never removes anything, and only scans `.rcode/skills/` and `.claude/commands/` — **never `.claude/agents/`**.
   - `cli/lib/namespace-migrate.cjs:34-66` (`findLegacyRihalArtifacts`, backing `rcode migrate-namespace` and `rcode update`) — scans only `claudeDir/skills` and `claudeDir/commands`. **No `agents` directory is ever checked.** This is the actual fix for issue #954 referenced in the file's own header comment, and it structurally cannot remove the exact rihal-* agent files this audit found live on disk.
   - `cli/uninstall.js:261-267` — the fallback the prior audit pointed to — filters `.claude/agents/` entries with `name.startsWith('rcode-')` only (line 266). It will **never** touch a `rihal-*.md` file, on uninstall or otherwise.

**Conclusion: the brief's exact question — "does maintaining rihal-* double every future bugfix's surface area" — has a different but more damning answer than "yes, in source."** Source is clean (hard cutover, verified). The real cost is that **any user (including the maintainer) who installed before 2026-05-22 carries a permanent, silently-duplicated 45-agent roster that no shipped tool can remove**, doubling the Agent-tool picker surface, doubling context-load, and doubling result ambiguity (a caller invoking `rihal-hanzla` today gets a functionally identical but path-broken agent — its `@.rihal/...` includes point at a directory this repo no longer creates). This is not a maintenance-burden risk to watch for; it is an active, reproduced, currently-unresolved defect, and the tooling built specifically to fix it (`migrate-namespace.cjs`, added *after* the audit that flagged this) has a directory-scope gap that guarantees it stays unresolved.

---

## Finding 4 — 3-layer routing: the promised "real" hop is marked unimplemented, and the docs contradict each other

**Claim to test:** does the 3-layer routing (do.md router → majlis-council → individual persona) add hops that a single well-prompted agent could replace?

**Method:** read `rcode/commands/do.md`, `rcode/skills/agents/majlis-council/SKILL.md`, `rcode/skills/agents/majlis-council/references.md`.

**Result:**
- `rcode/commands/do.md:20-22` confirms the router does no work itself: *"Acts as a smart dispatcher — never does the work itself."* It hands off to another `/rcode-*` command (e.g. `/rcode-council`). That's hop 1, uncontested.
- Hop 2/3 (council → individual persona) is where the routing breaks down. `rcode/skills/agents/majlis-council/SKILL.md:44-46` lists the actual dispatch primitives:
  ```
  | CV | Real multi-agent convene via Task tool subagent dispatch (preferred for high-stakes decisions) | rcode-majlis-convene-real [planned — not yet implemented] |
  | CVF | Fast single-Claude convene — structured roleplay of all agents in one response | rcode-majlis-convene-fast [planned — not yet implemented] |
  ```
  All four dispatch-mode skills (`CV`, `CVF`, `QC`, `DM`, plus `CM`) are tagged **"planned — not yet implemented."**
- Workflow step 3 in the same file (`SKILL.md:66`) reads: *"Consult each agent — invoke their skill or frame their perspective from their principles"* — i.e. the actual default behavior is ambiguous even in the spec, and covers both a real Task-tool call and an inline roleplay under the same instruction.
- `references.md:35,37` (the file `SKILL.md` explicitly defers to for "dispatch modes") **contradicts the capability table**: *"Real mode (default). Dispatches actual subagents via the Task tool... Fast mode. Single-Claude structured roleplay... Fallback for harnesses without subagent support."* This describes real-mode subagent dispatch as the working default, while the capability table two files up says the real-mode skill doesn't exist yet.

**Conclusion: confirmed and sharper than the brief's framing.** The concern isn't just "extra hops a single agent could replace" — it's that the routing layer's own documentation cannot agree on whether the third hop (actual isolated-context Task dispatch to a named persona) happens at all. If `references.md` is accurate and real-mode is default, the 3-layer structure delivers genuine parallel, uncontaminated-context specialist reasoning — a real architectural benefit a single agent can't replicate. If `SKILL.md`'s capability table is accurate (dispatch skills "not yet implemented"), council output is actually single-context roleplay dressed in multi-agent ceremony (positions table, dissent section, "Majlis synthesis") — in which case a single well-prompted agent is *exactly* what's running today, just with extra formatting overhead and no isolation benefit. This audit found no way to determine from the repo alone which is currently true — that ambiguity is itself the finding: the routing layer's actual behavior is undocumented with confidence, two files inside the same skill directory disagree, and neither is dated or reconciled against the other.

---

## Summary table

| # | Question asked | Verdict | Strength of evidence |
|---|---|---|---|
| 1 | Personas collapse into fewer generic roles by tool grant? | Partially true (35% of roster shares one 4-tool set) but body content mostly diverges — narrower than framed | Medium |
| 2 | Telemetry/tests proving real invocation? | None exists; only 4/45 agents (all tactical, zero personas) have any eval coverage | Strong |
| 3 | rihal-* doubles bugfix surface area? | Not in source (hard cutover, verified clean); **but** doubles surface area permanently on any pre-rebrand install via a 3-tool cleanup gap that's still live on this machine today | Strong (redirected, not refuted) |
| 4 | 3-layer routing adds unnecessary hops? | The real (Task-dispatch) hop is marked "not yet implemented" in one doc and "default" in another — routing behavior is currently indeterminate from the repo, not merely "extra hops" | Strong (contradiction, not just overhead) |

## What this audit does NOT establish

- Whether real users invoke `/rcode-council` or individual personas at all in practice (no product analytics exist to check — see Finding 2).
- Whether the 16 personas produce meaningfully different *output* when queried on the same question (would require running them, out of scope for a diagnose-only static audit).
- Whether collapsing the 16-tool-set-4 group into fewer files would break any workflow that keys off a specific agent `id` in `team.yaml`'s `routing:` section (`rcode/team.yaml:278-315`) — several routing buckets reference agents from this group by name (e.g. `team:` → `rcode-nasser`), so consolidation is not a pure file-count exercise.

No code was changed as part of this audit.
