# discuss-phase - step 04: Analyze phase, present gray areas, advisor research

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="analyze_phase">
Analyze the phase to identify gray areas worth discussing. **Use both `prior_decisions` and `codebase_context` to ground the analysis.**

**Read the phase description from ROADMAP.md and determine:**

1. **Domain boundary** — What capability is this phase delivering? State it clearly.

1b. **Initialize canonical refs accumulator** — Start building the `<canonical_refs>` list for CONTEXT.md. This accumulates throughout the entire discussion, not just this step.

   **Source 1 (now):** Copy `Canonical refs:` from ROADMAP.md for this phase. Expand each to a full relative path.
   **Source 2 (now):** Check REQUIREMENTS.md and PROJECT.md for any specs/ADRs referenced for this phase.
   **Source 3 (scout_codebase):** If existing code references docs (e.g., comments citing ADRs), add those.
   **Source 4 (discuss_areas):** When the user says "read X", "check Y", or references any doc/spec/ADR during discussion — add it immediately. These are often the MOST important refs because they represent docs the user specifically wants followed.

   This list is MANDATORY in CONTEXT.md. Every ref must have a full relative path so downstream agents can read it directly. If no external docs exist, note that explicitly.

2. **Check prior decisions** — Before generating gray areas, check if any were already decided:
   - Scan `<prior_decisions>` for relevant choices (e.g., "Ctrl+C only, no single-key shortcuts")
   - These are **pre-answered** — don't re-ask unless this phase has conflicting needs
   - Note applicable prior decisions for use in presentation

3. **Gray areas by category** — For each relevant category (UI, UX, Behavior, Empty States, Content, Roles/Permissions), identify 1-2 specific ambiguities that would change implementation. **Annotate with code context where relevant** (e.g., "You already have a Card component" or "No existing pattern for this").

3b. **Entry-point consideration (standing — re-check here, don't trust the upstream grep alone)** — `conditional_reading`'s `HAS_PRODUCT_SIGNALS` grep runs once over the ROADMAP heading and is keyword-fragile (misses "panel", "modal", "view", "settings screen", etc.), so don't let it silently gate this. At this point in the analysis, consider: **did step 3 surface any UI/UX-category gray area, or does the phase add/change anything a user would navigate to?** If so, think through how the feature is reached — new nav entry, existing menu, route-only, deep link, permission-gated. Use judgment: if the answer is genuinely obvious from context (e.g. the project's existing convention is "every new page gets a sidebar entry," or the roadmap's IA section already settled this), just note the default taken and move on — don't interrupt with a question for something already decided. Only surface it as a gray area in `present_gray_areas` when it's a real ambiguity that would change implementation. This exists to catch built-but-unreachable UI before research/planning, not to force a question on every phase regardless of whether one's needed.

3c. **Auth-strategy consideration (standing — re-check here, keyword generation alone is not enough)** — Gray-area generation in step 3 can surface "Session handling" or "Error responses" for an auth-flavored phase while never considering which production auth strategy is being built against. At this point, consider: **did step 3 surface any auth/login/session-category gray area, or does the phase goal contain auth/login/session/SSO/account signals?** If so, think through what the production authentication strategy is and whether a temporary/dev-only bypass needs its own tracked follow-up. Use judgment: if a prior phase or CONTEXT.md already settled the auth strategy, or the codebase already has a clear, singular auth pattern in place, don't re-ask — just confirm it still applies and move on. Only surface it as a gray area when the strategy is genuinely undecided. This exists to catch a dev-only bypass shipping as if it were the real strategy, not to force a question every time auth is touched.

3d. **Roles/permissions consideration (standing — for any phase or project with >1 user role)** — If the phase or project involves more than one user role, don't assume a single shared UI is safe by default without at least considering it: what does each role see differently, which screens exist for one role but not another, what does the no-permission state look like. See `domain-probes.md`'s Roles & Permissions section for the question bank. Use judgment: if the project already has an established role-visibility pattern (documented in CONTEXT.md, an IA doc, or consistently applied in the existing codebase) and this phase clearly follows it, note that and move on rather than re-litigating it. Only surface it as a gray area in `present_gray_areas` when it's a genuine open question for this phase. This is about not silently defaulting to "same UI for everyone" without ever having considered the alternative — not about forcing a question on every multi-role phase.

4. **Skip assessment** — If no meaningful gray areas exist (pure infrastructure, clear-cut implementation, or all already decided in prior phases), the phase may not need discussion.

**Advisor Mode Detection:**

Check if advisor mode should activate:

1. Check for USER-PROFILE.md:
   ```bash
   PROFILE_PATH=".rcode/USER-PROFILE.md"
   ```
   ADVISOR_MODE = file exists at PROFILE_PATH → true, otherwise → false

2. If ADVISOR_MODE is true, resolve vendor_philosophy calibration tier:
   - Priority 1: Read config.json > preferences.vendor_philosophy (project-level override)
   - Priority 2: Read USER-PROFILE.md Vendor Choices/Philosophy rating (global)
   - Priority 3: Default to "standard" if neither has a value or value is UNSCORED

   Map to calibration tier:
   - conservative OR thorough-evaluator → full_maturity
   - opinionated → minimal_decisive
   - pragmatic-fast OR any other value OR empty → standard

3. Resolve model for advisor agents:
   ```bash
   ADVISOR_MODEL=$(node ".rcode/bin/rcode-tools.cjs" resolve-model rcode-advisor-researcher --raw)
   ```

If ADVISOR_MODE is false, skip all advisor-specific steps — workflow proceeds with existing conversational flow unchanged.

**Output your analysis internally, then present to user.**

Example analysis for "Post Feed" phase (with code and prior context):
```
Domain: Displaying posts from followed users
Existing: Card component (src/components/ui/Card.tsx), useInfiniteQuery hook, Tailwind CSS
Prior decisions: "Minimal UI preferred" (Phase 2), "No pagination — always infinite scroll" (Phase 4)
Gray areas:
- UI: Layout style (cards vs timeline vs grid) — Card component exists with shadow/rounded variants
- UI: Information density (full posts vs previews) — no existing density patterns
- Behavior: Loading pattern — ALREADY DECIDED: infinite scroll (Phase 4)
- Empty State: What shows when no posts exist — EmptyState component exists in ui/
- Content: What metadata displays (time, author, reactions count)
- Entry point: How users reach the feed — new sidebar link, existing nav tab, or route only?
```
</step>

<step name="present_gray_areas">
Present the domain boundary, prior decisions, and gray areas to user.

**First, state the boundary and any prior decisions that apply:**
```
Phase [X]: [Name]
Domain: [What this phase delivers — from your analysis]

We'll clarify HOW to implement this.
(New capabilities belong in other phases.)

[If prior decisions apply:]
**Carrying forward from earlier phases:**
- [Decision from Phase N that applies here]
- [Decision from Phase M that applies here]
```

**If `--auto`:** Auto-select ALL gray areas. Log: `[auto] Selected all gray areas: [list area names].` Skip the AskUserQuestion below and continue directly to discuss_areas with all areas selected.

**Otherwise, use AskUserQuestion (multiSelect: true):**
- header: "Discuss"
- question: "Which areas do you want to discuss for [phase name]?"
- options: Generate 3-4 phase-specific gray areas, each with:
  - "[Specific area]" (label) — concrete, not generic
  - [1-2 questions this covers + code context annotation] (description)
  - **Highlight the recommended choice with brief explanation why**

**Prior decision annotations:** When a gray area was already decided in a prior phase, annotate it:
```
☐ Exit shortcuts — How should users quit?
  (You decided "Ctrl+C only, no single-key shortcuts" in Phase 5 — revisit or keep?)
```

**Code context annotations:** When the scout found relevant existing code, annotate the gray area description:
```
☐ Layout style — Cards vs list vs timeline?
  (You already have a Card component with shadow/rounded variants. Reusing it keeps the app consistent.)
```

**Combining both:** When both prior decisions and code context apply:
```
☐ Loading behavior — Infinite scroll or pagination?
  (You chose infinite scroll in Phase 4. useInfiniteQuery hook already set up.)
```

**Do NOT include a "skip" or "you decide" option.** User ran this command to discuss — give them real choices.

**Examples by domain (with code context):**

For "Post Feed" (visual feature):
```
☐ Layout style — Cards vs list vs timeline? (Card component exists with variants)
☐ Loading behavior — Infinite scroll or pagination? (useInfiniteQuery hook available)
☐ Content ordering — Chronological, algorithmic, or user choice?
☐ Post metadata — What info per post? Timestamps, reactions, author?
```

For "Database backup CLI" (command-line tool):
```
☐ Output format — JSON, table, or plain text? Verbosity levels?
☐ Flag design — Short flags, long flags, or both? Required vs optional?
☐ Progress reporting — Silent, progress bar, or verbose logging?
☐ Error recovery — Fail fast, retry, or prompt for action?
```

For "Organize photo library" (organization task):
```
☐ Grouping criteria — By date, location, faces, or events?
☐ Duplicate handling — Keep best, keep all, or prompt each time?
☐ Naming convention — Original names, dates, or descriptive?
☐ Folder structure — Flat, nested by year, or by category?
```

Continue to discuss_areas with selected areas (or advisor_research if ADVISOR_MODE is true).
</step>

<step name="advisor_research">
**Advisor Research** (only when ADVISOR_MODE is true)

After user selects gray areas in present_gray_areas, spawn parallel research agents.

1. Display brief status: "Researching {N} areas..."

2. For EACH user-selected gray area, spawn a Task() in parallel:

   Task(
     prompt="First, read @$HOME/.claude/agents/rcode-advisor-researcher.md for your role and instructions.

     <gray_area>{area_name}: {area_description from gray area identification}</gray_area>
     <phase_context>{phase_goal and description from ROADMAP.md}</phase_context>
     <project_context>{project name and brief description from PROJECT.md}</project_context>
     <calibration_tier>{resolved calibration tier: full_maturity | standard | minimal_decisive}</calibration_tier>

     Research this gray area and return a structured comparison table with rationale.
     ${AGENT_SKILLS_ADVISOR}",
     subagent_type="general-purpose",
     model="{ADVISOR_MODEL}",
     description="Research: {area_name}"
   )

   All Task() calls spawn simultaneously — do NOT wait for one before starting the next.

3. After ALL agents return, SYNTHESIZE results before presenting:
   For each agent's return:
   a. Parse the markdown comparison table and rationale paragraph
   b. Verify all 5 columns present (Option | Pros | Cons | Complexity | Recommendation) — fill any missing columns rather than showing broken table
   c. Verify option count matches calibration tier:
      - full_maturity: 3-5 options acceptable
      - standard: 2-4 options acceptable
      - minimal_decisive: 1-2 options acceptable
      If agent returned too many, trim least viable. If too few, accept as-is.
   d. Rewrite rationale paragraph to weave in project context and ongoing discussion context that the agent did not have access to
   e. If agent returned only 1 option, convert from table format to direct recommendation: "Standard approach for {area}: {option}. {rationale}"

4. Store synthesized tables for use in discuss_areas.

**All-fail fallback:** If ALL Task() calls returned errors or empty results (no agent produced a usable table):

Display:
```
⚠  Advisor research failed for all {N} selected areas (subagent errors).
   Falling back to direct discussion without pre-researched comparison tables.
```

Set ADVISOR_MODE=false for discuss_areas — proceed with unstructured discussion flow instead of table-first flow. Do NOT abort the overall discuss-phase workflow.

**If ADVISOR_MODE is false:** Skip this step entirely — proceed directly from present_gray_areas to discuss_areas.
</step>


@.rcode/workflows/discuss-phase-discuss-areas.md

Next: Read `.rcode/workflows/discuss-phase/steps/05-write-context.md` before starting it (skip it if its Read-when condition is false).
