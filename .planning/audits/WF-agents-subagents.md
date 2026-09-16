# Workflow Audit — agents-subagents
**Lens:** Agent/team system — rcode/agents/ (83 files) + rcode/team.yaml  
**Date:** 2026-09-16  
**Branch:** wf-agents-subagents

---

## Verdict

The core dispatch pipeline (classify-plan → named engineer → SPRINT execution) is solid and
deterministic, resolving a real regression that proved the LLM-prose classification never
actually ran. The council scoring engine is well-engineered, pure-function, and auditable. The
fatal weakness is a sprawl problem disguised as richness: 46 agents in team.yaml, 13 with
`authority_level: quality`, most of them reachable only through a single niche workflow
(`/rcode-lens-audit`), while the primary user-facing entry point (`/rcode-do`) carries stale
capability-code tables that would cause every `@waleed ADR` shortcut to silently fail. Rating:
**leaky**.

---

## The user's actual experience

### Path 1 — Council question ("should we use Postgres or Mongo?")

1. User types `/rcode-do should we use Postgres or Mongo?`
2. `do.md` parses `$ARGUMENTS`, AUTO_MODE=false, enters `route` step.
3. "stack" matches waleed keyword → routes to `/rcode-council`.
4. `council.md` calls `node .rcode/bin/rcode-tools.cjs init council "$ARGS"` → returns `panel`.
5. `council-panel.cjs` scores agents: "stack" hits waleed weight-3, architecture weight-2 →
   waleed leads. Database keyword hits yousef. Panel: [waleed, yousef, sadiq].
6. Three Task() calls spawn `rcode-waleed`, `rcode-yousef`, `rcode-sadiq` in parallel.
7. `rcode-waleed` loads `rcode/agents/rcode-waleed.md` → reads
   `@.rcode/references/agent-shared-rules.md`, `karpathy-guidelines.md`, `persona-executor-mode.md`,
   `@rcode/skills/agents/waleed-architect/SKILL.md`.
8. Response appears; orchestrator synthesizes. **User gets a real three-persona response.**

**What works:** scoring is fast and deterministic. Named-agent mention `+20` override means
`@waleed` in the question forces waleed onto the panel regardless of keyword score.

**What breaks:** If the user types `@waleed ADR` as a deterministic shortcut (per `do.md:42`),
`do.md` persona_shortcut reads the waleed agent file at `.claude/agents/rcode-waleed.md` and
looks up capability code `ADR`. But `.claude/agents/` is empty (installed agents live elsewhere;
the repo's `rcode/agents/` is the source). More critically, `waleed-architect/SKILL.md:91-93`
shows waleed's actual capabilities are `CA` (architecture decision record) and `IR` —
**not ADR, RV, TS, FZ, or KS** as claimed in `do.md:42`. The shortcut would fail with
"Persona 'waleed' has no capability 'ADR'" and stop — the user gets nothing.

### Path 2 — Sprint execution ("execute phase 5")

1. User triggers `/rcode-execute 5`.
2. `execute.md` calls `init execute` → reads phase, plans, wave grouping.
3. For each plan, `execute-waves.md` calls
   `node .rcode/bin/rcode-tools.cjs classify-plan 5 <plan-id>`.
4. `classifyPlanFiles()` at `rcode-tools.cjs:2248-2270` checks `files_modified`:
   - Contains `.tsx`/`.jsx`/`.css` or `client`/`ui` → `frontend` → `rcode-haitham`
   - Contains `api`/`server`/`db`/`service` → `backend` → `rcode-yousef`
   - Both → `full-stack` → `rcode-hanzla`
   - Neither → keyword scan on objective → else `rcode-executor` (generic fallback)
5. Task() spawns `rcode-haitham` for the frontend plan. Agent loads
   `rcode/agents/rcode-haitham.md` → references `@rcode/skills/agents/haitham-frontend/SKILL.md`.
6. `persona-executor-mode.md` triggers because `subagent_type=rcode-haitham` AND
   a SPRINT.md path is in the prompt — agent enters execution mode, not advisory mode.
7. **User gets a specialist with RTL/a11y/Next.js expertise executing the plan.**

**What works:** classification is now a deterministic CLI call, fixing the regression where
LLM-prose pseudocode never ran (issue #1021). Model resolution goes through `resolve-model` so
the token budget is respected.

**What breaks:** The glob rules are coarse (`matchesBackendGlob` just tests `.includes('db')`
at `rcode-tools.cjs:2240`). A plan touching `docs/database-schema.md` (docs, not backend code)
gets routed to `rcode-yousef`. A plan touching `src/debounce.ts` gets routed to `rcode-yousef`
because it contains `de**b**`. False-positive routing is silent — the user sees no warning.

### Path 3 — Discuss with one expert ("/rcode-discuss waleed...")

1. `discuss.md` only exposes five agents:
   `rcode-sadiq`, `rcode-waleed`, `rcode-fatima`, `rcode-mariam`, `rcode-hussain-pm`.
   (`discuss.md:73-81`)
2. User cannot reach yousef, haitham, hanzla, layla, zahra, noor, or any of the 32
   specialist/functional agents through `/rcode-discuss` — the `available_agent_types`
   block is hardcoded to 5.
3. The 13 quality-authority auditor agents (dep-auditor, cross-platform, observability, etc.)
   are only reachable through `/rcode-lens-audit` or `/rcode-audit lens`. A user who wants
   a quick dependency health check has no obvious command — they must know
   `/rcode-audit lens 6` (or that lens 6 = deps).

### Path 4 — @persona CODE shortcut ("@hussain CP")

Hussain-PM's actual capabilities (`CP/VP/EP/CE/IR/CC`) match what `do.md` claims for this
persona. **This is the one persona where the shortcut works.** For every other persona in
`do.md:42`, the claimed codes are stale fabrications:

| Persona | do.md claims | Actual codes (SKILL.md) |
|---------|-------------|-------------------------|
| Waleed | ADR/RV/TS/FZ/KS | CA / IR |
| Sadiq | KC/OC/PT/MT/KS | BP/MR/DR/TR/CB/DP |
| Fatima | TS/RG/EC/RR/RP/FT | QA (one code) |
| Hanzla | DS/IS/BF/RF/KA/CR | DS/CR/NX/RX |
| Dalil | SC/MC/RF/TS | SC/MC/RF/TS ✓ |
| Hussain-PM | CP/VP/EP/CE/CS/IR/CC | CP/VP/EP/CE/IR/CC ✓ (CS missing) |

---

## Leaks

1. 🔴 **Stale capability-code table in do.md breaks the deterministic @persona API**  
   Evidence: `do.md:42` lists Waleed as `ADR/RV/TS/FZ/KS`; `waleed-architect/SKILL.md:91`
   defines `CA` and `IR` only. User running `@waleed ADR` gets: "Persona 'waleed' has no
   capability 'ADR'" and stops — the most power-user-friendly entry point in the router
   fails for 4 of the 6 explicitly listed personas.  
   **User cost:** Deterministic API is a lie; power users get silent failure or wrong dispatch.

2. 🔴 **classify-plan glob rules produce silent false-positive routing**  
   Evidence: `rcode-tools.cjs:2236-2244` — `matchesBackendGlob` is `f.includes('db')` with
   no word-boundary or path-segment check. File `src/debounce.ts` contains `db`; classified
   as backend → dispatched to `rcode-yousef` instead of `rcode-hanzla` or `rcode-executor`.
   Similarly `docs/deploy-notes.md` hits both `db` and `service` via substrings.  
   **User cost:** Wrong specialist executes the plan. `rcode-yousef` has backend-perf discipline
   that changes how it approaches code unrelated to APIs or queries. No warning shown.

3. 🔴 **discuss.md exposes only 5 of 46 agents — 41 are unreachable**  
   Evidence: `discuss.md:73-81` `<available_agent_types>` block hardcodes 5 personas.
   Yousef, Haitham, Hanzla, Layla, Khalid, Noor, Zahra, and all 13 quality-auditor agents
   are not accessible via `/rcode-discuss`.  
   **User cost:** "How do I fix this N+1?" — the user can't reach Yousef for a quick chat.
   They must either know `/rcode-council` (overkill) or know the exact agent name and type it
   themselves. Most don't; they get Waleed (architect) for a query-optimization question.

4. 🟡 **13 quality-authority agents are accessible through a single deep path only**  
   Evidence: `authority_level: quality` appears 13 times in `rcode/team.yaml`. These agents
   (dep-auditor, cross-platform, observability, nyquist, i18n, ui-auditor, docs-auditor,
   edge-case-hunter, integration-checker, code-reviewer, code-fixer, sprint-checker, fatima)
   are dispatched only via `lens-audit.md`, `validate-phase.md`, `review.md`, or
   `execute.md`'s optional post-phase step. No routing in `do.md` routes to them by name.  
   **User cost:** "How healthy are my dependencies?" — user types `/rcode-do` and gets
   routed to `/rcode-discuss` or `/rcode-council`. The purpose-built `rcode-dep-auditor`
   agent is invisible unless the user knows to type `/rcode-audit lens 6`.

5. 🟡 **Layla (UX Designer) and rcode-ux-designer are two agents for the same role**  
   Evidence: `rcode/agents/rcode-layla.md:6` "UX Designer — spawned by /rcode-council";
   `rcode/agents/rcode-ux-designer.md:6` "UX & Design Specialist — spawned for UI/UX reviews".
   `ui-phase.md` uses `rcode-ux-designer`; `council.md` scoring uses `layla`. Both are
   `authority_level: design` with identical scope in team.yaml.  
   **User cost:** After `/rcode-ui-phase`, user follows up with `/rcode-discuss` about the
   same UX decision — they get Layla (council persona) not the ux-designer agent that built
   the spec. Continuity breaks; second agent doesn't know what the first built.

6. 🟡 **advisor-researcher spawned as `general-purpose` not `rcode-advisor-researcher`**  
   Evidence: `discuss-phase.md:579` — `subagent_type="general-purpose"`. The agent is
   instructed to `read @$HOME/.claude/agents/rcode-advisor-researcher.md` via prompt, but
   the runtime loads `general-purpose` capabilities, tools list, and defaults — not the
   specialist agent's configuration.  
   **User cost:** The advisor runs with whatever the `general-purpose` agent type provides.
   If the user's Claude Code installation has a different model/toolset on `general-purpose`,
   the research quality is unpredictable and the agent identity is wrong.

7. 🟢 **council-panel.cjs AGENT_IDS hardcodes 14 personas; team.yaml has 46**  
   Evidence: `council-panel.cjs:42-44` lists 14 canonical council agents. The 32 specialist
   agents in team.yaml are never scored for council eligibility.  
   **User cost:** Low — the 14-persona council scope is intentional. But if a user does
   `@rcode-council is our dep health okay?`, Fatima is the only quality agent who can appear;
   the dep-auditor who would give a sharper answer is excluded by design without explanation.

---

## Strengthenings

1. **Fix the @persona CODE table in do.md** (S, `do.md:42`)  
   Replace the stale capability list with the actual codes from each SKILL.md. Waleed is `CA/IR`,
   Sadiq is `BP/MR/DR/TR/CB/DP`, Fatima is `QA`, Hanzla is `DS/CR/NX/RX`. Also remove
   fictional codes (CS for Hussain-PM doesn't exist).  
   **Why it helps the user:** The deterministic @persona API becomes trustworthy. Power users
   and downstream agents in council follow-ups can invoke `@waleed CA` reliably.

2. **Fix classify-plan to use path-segment matching, not substring** (S, `rcode-tools.cjs:2236-2244`)  
   Change `f.includes('db')` to `/\/(db|database)\//i.test(f)` and similarly for other keywords.
   Add a test for `debounce.ts` and `deploy-notes.md` returning `other`, not `backend`.  
   **Why it helps the user:** The right engineer executes each plan; misrouted plans produce
   worse output and confuse deviation tracking.

3. **Expand /rcode-discuss to all 17 named personas** (M, `discuss.md:73-81`)  
   The `<available_agent_types>` block currently hardcodes 5 names. Replace with the 17
   named personas from team.yaml (sadiq, waleed, fatima, mariam, hussain-pm, yousef, haitham,
   hanzla, omar, khalid, layla, zahra, noor, nasser, ahmed, raees + zayd).  
   Add them to `council-panel.cjs`'s auto-route scoring so `init discuss` can resolve "how
   do I fix an N+1?" to yousef rather than waleed.  
   **Why it helps the user:** Quick single-expert chats with the right expert, not just the
   five "strategic" personas.

4. **Merge rcode-ux-designer into rcode-layla** (M, `rcode/agents/`, `ui-phase.md`)  
   `rcode-ux-designer` is used only by `ui-phase.md`. Replace `subagent_type="rcode-ux-designer"`
   with `subagent_type="rcode-layla"` and move `ux-designer-playbook.md` content into Layla's
   SKILL.md. Delete `rcode-ux-designer.md` and remove its team.yaml entry.  
   **Why it helps the user:** One UX persona across council, discuss, and ui-phase; follow-up
   questions land on the same agent that built the spec.

5. **Route quick-audits to specialist agents from /rcode-do** (M, `do.md:route` step)  
   Add routing rules: "audit deps / dependency health" → `/rcode-audit lens 6`;
   "audit security / security check" → `/rcode-audit lens 1`; "check i18n / translation gaps"
   → `/rcode-audit lens i18n`. Currently these fall through to `/rcode-discuss` or `/rcode-council`.  
   **Why it helps the user:** The purpose-built agents (dep-auditor, i18n-auditor,
   observability-auditor) become discoverable without knowing the lens-audit numbering scheme.

6. **Fix advisor-researcher to spawn as `rcode-advisor-researcher`, not `general-purpose`** (S, `discuss-phase.md:579`)  
   Change `subagent_type="general-purpose"` to `subagent_type="rcode-advisor-researcher"`.
   The agent file already exists; the spawn just needs the right type.  
   **Why it helps the user:** The advisor loads its specialist capabilities and toolset. The
   prompt-based identity-injection hack is eliminated.

---

## Kill your darlings

1. **Delete rcode-ux-designer.md** (`rcode/agents/rcode-ux-designer.md`, `rcode/team.yaml`)  
   Duplicate of rcode-layla with a narrower workflow footprint (ui-phase.md only). Two agents
   with identical scope, both called "UX Designer", confuse team.yaml, the council scorer,
   and users. Layla absorbs all use cases; ux-designer-playbook.md content merges into
   Layla's SKILL. Zero user capability lost.

2. **Remove the 8 quality-auditor agents from team.yaml** — don't delete the agents, just
   remove them from the YAML roster (`rcode/team.yaml:authority_level: quality` × 8 specialist
   entries: nyquist, cross-platform, dep-auditor, observability, integration-checker,
   docs-auditor, edge-case-hunter, ui-auditor).  
   These are lens-audit specialists, not council panelists. Their presence in team.yaml implies
   they participate in panel scoring (they don't — council-panel.cjs excludes them because
   they're not in `AGENT_IDS`). The YAML entries create a false appearance of 46 active team
   members. Move them to a separate `lens-agents:` block or a comment section in team.yaml.
   **User benefit:** team.yaml becomes an accurate org chart, not a registry of every
   ever-created agent file.

3. **Delete the `authority_level: operational` agents from team.yaml** (Noor, Khalid, Ahmed)
   if they are never scored by council-panel.cjs.  
   Check: `grep "noor\|khalid\|ahmed" .rcode/bin/lib/council-panel.cjs` — all three appear in
   domain-specific panels (`deploy`, `docs`, `delivery`). Keep them but verify. The council
   docs/delivery panels are valid; what should be removed is the `authority_level` field value
   "operational" which is meaningless to any consumer — all three are technical experts with
   specific domains.

4. **Remove `Khattat / Munaffidh / Bahith / Muhaqqiq` from do.md's persona_shortcut docs**
   (`do.md:42`) — these Arabic-named aliases exist as documentation but there are no
   rcode-khattat.md, rcode-munaffidh.md, rcode-bahith.md, or rcode-muhaqqiq.md agent files
   (only rcode-planner and rcode-executor are mapped). The "similarly" clause is a trap:
   a user reading the docs naturally tries `@khattat` or `@bahith` and gets a hard failure.
   Either create the agent files or remove the mention.
