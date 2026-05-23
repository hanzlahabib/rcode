<purpose>
Sub-step of discuss-phase.md — discuss_areas step. Walks through each selected grey area with the user, collects decisions, and records them for CONTEXT.md.
</purpose>

<step name="discuss_areas">
Discuss each selected area with the user. Flow depends on advisor mode.

**If ADVISOR_MODE is true:**

Table-first discussion flow — present research-backed comparison tables, then capture user picks.

**For each selected area:**

1. **Present the synthesized comparison table + rationale paragraph** (from advisor_research step)

2. **Use AskUserQuestion:**
   - header: "{area_name}"
   - question: "Which approach for {area_name}?"
   - options: Extract from the table's Option column (AskUserQuestion adds "Other" automatically)

3. **Record the user's selection:**
   - If user picks from table options → record as locked decision for that area
   - If user picks "Other" → receive their input, reflect it back for confirmation, record

   **Thinking partner (conditional):**
   If `features.thinking_partner` is enabled in config, check the user's answer for tradeoff signals
   (see `references/thinking-partner.md` for signal list). If tradeoff detected:

   ```
   I notice competing priorities here — {option_A} optimizes for {goal_A} while {option_B} optimizes for {goal_B}.

   Want me to think through the tradeoffs before we lock this in?
   [Yes, analyze] / [No, decision made]
   ```

   If yes: provide 3-5 bullet analysis (what each optimizes/sacrifices, alignment with PROJECT.md goals, recommendation). Then return to normal flow.
   If no or thinking_partner disabled: continue to next area.

4. **After recording pick, Claude decides whether follow-up questions are needed:**
   - If the pick has ambiguity that would affect downstream planning → ask 1-2 targeted follow-up questions using AskUserQuestion
   - If the pick is clear and self-contained → move to next area
   - Do NOT ask the standard 4 questions — the table already provided the context

5. **After all areas processed:**
   - header: "Done"
   - question: "That covers [list areas]. Ready to create context?"
   - options: "Create context" / "Revisit an area"

**Scope creep handling (advisor mode):**
If user mentions something outside the phase domain:
```
"[Feature] sounds like a new capability — that belongs in its own phase.
I'll note it as a deferred idea.

Back to [current area]: [return to current question]"
```

Track deferred ideas internally.

---

**If ADVISOR_MODE is false:**

For each selected area, conduct a focused discussion loop.

**Research-before-questions mode:** Check if `workflow.research_before_questions` is enabled in config (from init context or `.planning/config.json`). When enabled, before presenting questions for each area:
1. Do a brief web search for best practices related to the area topic
2. Summarize the top findings in 2-3 bullet points
3. Present the research alongside the question so the user can make a more informed decision

Example with research enabled:
```
Let's talk about [Authentication Strategy].

📊 Best practices research:
• OAuth 2.0 + PKCE is the current standard for SPAs (replaces implicit flow)
• Session tokens with httpOnly cookies preferred over localStorage for XSS protection
• Consider passkey/WebAuthn support — adoption is accelerating in 2025-2026

With that context: How should users authenticate?
```

When disabled (default), skip the research and present questions directly as before.

**Text mode support:** Parse optional `--text` from `$ARGUMENTS`.
- Accept `--text` flag OR read `workflow.text_mode` from config (from init context)
- When active, replace ALL `AskUserQuestion` calls with plain-text numbered lists
- User types a number to select, or types free text for "Other"
- This is required for Claude Code remote sessions (`/rc` mode) where TUI menus
  don't work through the Claude App

**Batch mode support:** Parse optional `--batch` from `$ARGUMENTS`.
- Accept `--batch`, `--batch=N`, or `--batch N`

**Analyze mode support:** Parse optional `--analyze` from `$ARGUMENTS`.
When `--analyze` is active, before presenting each question (or question group in batch mode), provide a brief **trade-off analysis** for the decision:
- 2-3 options with pros/cons based on codebase context and common patterns
- A recommended approach with reasoning
- Known pitfalls or constraints from prior phases

Example with `--analyze`:
```
**Trade-off analysis: Authentication strategy**

| Approach | Pros | Cons |
|----------|------|------|
| Session cookies | Simple, httpOnly prevents XSS | Requires CSRF protection, sticky sessions |
| JWT (stateless) | Scalable, no server state | Token size, revocation complexity |
| OAuth 2.0 + PKCE | Industry standard for SPAs | More setup, redirect flow UX |

💡 Recommended: OAuth 2.0 + PKCE — your app has social login in requirements (REQ-04) and this aligns with the existing NextAuth setup in `src/lib/auth.ts`.

How should users authenticate?
```

This gives the user context to make informed decisions without extra prompting. When `--analyze` is absent, present questions directly as before.
- Accept `--batch`, `--batch=N`, or `--batch N`
- Default to 4 questions per batch when no number is provided
- Clamp explicit sizes to 2-5 so a batch stays answerable
- If `--batch` is absent, keep the existing one-question-at-a-time flow

**Philosophy:** stay adaptive, but let the user choose the pacing.
- Default mode: 4 single-question turns, then check whether to continue
- `--batch` mode: 1 grouped turn with 2-5 numbered questions, then check whether to continue

Each answer (or answer set, in batch mode) should reveal the next question or next batch.

**Auto mode (`--auto`):** For each area, Claude selects the recommended option (first option, or the one explicitly marked "recommended") for every question without using AskUserQuestion. Log each auto-selected choice:
```
[auto] [Area] — Q: "[question text]" → Selected: "[chosen option]" (recommended default)
```
After all areas are auto-resolved, skip the "Explore more gray areas" prompt and proceed directly to write_context.

**CRITICAL — Auto-mode pass cap:**
In `--auto` mode, the discuss step MUST complete in a **single pass**. After writing CONTEXT.md once, you are DONE — proceed immediately to write_context and then auto_advance. Do NOT re-read your own CONTEXT.md to find "gaps", "undefined types", or "missing decisions" and run additional passes. This creates a self-feeding loop where each pass generates references that the next pass treats as gaps, consuming unbounded time and resources.

Check the pass cap from config:
```bash
MAX_PASSES=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.max_discuss_passes 2>/dev/null || echo "3")
```

If you have already written and committed CONTEXT.md, the discuss step is complete. Move on.

**Interactive mode (no `--auto`):**

**For each area:**

1. **Announce the area:**
   ```
   Let's talk about [Area].
   ```

2. **Ask questions using the selected pacing:**

   **Default (no `--batch`): Ask 4 questions using AskUserQuestion**
   - header: "[Area]" (max 12 chars — abbreviate if needed)
   - question: Specific decision for this area
   - options: 2-3 concrete choices (AskUserQuestion adds "Other" automatically), with the recommended choice highlighted and brief explanation why
   - **Annotate options with code context** when relevant:
     ```
     "How should posts be displayed?"
     - Cards (reuses existing Card component — consistent with Messages)
     - List (simpler, would be a new pattern)
     - Timeline (needs new Timeline component — none exists yet)
     ```
   - Include "You decide" as an option when reasonable — captures Claude discretion
   - **Context7 for library choices:** When a gray area involves library selection (e.g., "magic links" → query next-auth docs) or API approach decisions, use `mcp__context7__*` tools to fetch current documentation and inform the options. Don't use Context7 for every question — only when library-specific knowledge improves the options.

   **Batch mode (`--batch`): Ask 2-5 numbered questions in one plain-text turn**
   - Group closely related questions for the current area into a single message
   - Keep each question concrete and answerable in one reply
   - When options are helpful, include short inline choices per question rather than a separate AskUserQuestion for every item
   - After the user replies, reflect back the captured decisions, note any unanswered items, and ask only the minimum follow-up needed before moving on
   - Preserve adaptiveness between batches: use the full set of answers to decide the next batch or whether the area is sufficiently clear

3. **After the current set of questions, check:**
   - header: "[Area]" (max 12 chars)
   - question: "More questions about [area], or move to next? (Remaining: [list other unvisited areas])"
   - options: "More questions" / "Next area"

   When building the question text, list the remaining unvisited areas so the user knows what's ahead. For example: "More questions about Layout, or move to next? (Remaining: Loading behavior, Content ordering)"

   If "More questions" → ask another 4 single questions, or another 2-5 question batch when `--batch` is active, then check again
   If "Next area" → proceed to next selected area
   If "Other" (free text) → interpret intent: continuation phrases ("chat more", "keep going", "yes", "more") map to "More questions"; advancement phrases ("done", "move on", "next", "skip") map to "Next area". If ambiguous, ask: "Continue with more questions about [area], or move to the next area?"

4. **After all initially-selected areas complete:**
   - Summarize what was captured from the discussion so far
   - Increment internal PASS_COUNT (starts at 1 for the initial area set)
   - If PASS_COUNT >= MAX_PASSES: display "Max discussion passes ({MAX_PASSES}) reached — proceeding to write context." and go directly to write_context WITHOUT prompting.
   - Otherwise, AskUserQuestion:
     - header: "Done"
     - question: "We've discussed [list areas]. Which gray areas remain unclear? ({MAX_PASSES - PASS_COUNT} pass(es) remaining)"
     - options: "Explore more gray areas" / "I'm ready for context"
   - If "Explore more gray areas":
     - Identify 2-4 additional gray areas based on what was learned
     - Return to present_gray_areas logic with these new areas
     - Increment PASS_COUNT; if PASS_COUNT >= MAX_PASSES, skip the end-of-set prompt and go directly to write_context after this round
     - Loop: discuss new areas, then prompt again (if passes remain)
   - If "I'm ready for context": Proceed to write_context

**Canonical ref accumulation during discussion:**
When the user references a doc, spec, or ADR during any answer — e.g., "read adr-014", "check the MCP spec", "per browse-spec.md" — immediately:
1. Read the referenced doc (or confirm it exists)
2. Add it to the canonical refs accumulator with full relative path
3. Use what you learned from the doc to inform subsequent questions

These user-referenced docs are often MORE important than ROADMAP.md refs because they represent docs the user specifically wants downstream agents to follow. Never drop them.

**Question design:**
- Options should be concrete, not abstract ("Cards" not "Option A")
- Each answer should inform the next question or next batch
- If user picks "Other" to provide freeform input (e.g., "let me describe it", "something else", or an open-ended reply), ask your follow-up as plain text — NOT another AskUserQuestion. Wait for them to type at the normal prompt, then reflect their input back and confirm before resuming AskUserQuestion or the next numbered batch.

**Scope creep handling:**
If user mentions something outside the phase domain:
```
"[Feature] sounds like a new capability — that belongs in its own phase.
I'll note it as a deferred idea.

Back to [current area]: [return to current question]"
```

Track deferred ideas internally.

**Incremental checkpoint — save after each area completes:**

After each area is resolved (user says "Next area" or area auto-resolves in `--auto` mode), immediately write a checkpoint file with all decisions captured so far. This prevents data loss if the session is interrupted mid-discussion.

**Checkpoint file:** `${phase_dir}/${padded_phase}-DISCUSS-CHECKPOINT.json`

Write after each area:
```json
{
  "phase": "{PHASE_NUMBER}",
  "phase_name": "{phase_name}",
  "timestamp": "{ISO timestamp}",
  "areas_completed": ["Area 1", "Area 2"],
  "areas_remaining": ["Area 3", "Area 4"],
  "decisions": {
    "Area 1": [
      {"question": "...", "answer": "...", "options_presented": ["..."]},
      {"question": "...", "answer": "...", "options_presented": ["..."]}
    ],
    "Area 2": [
      {"question": "...", "answer": "...", "options_presented": ["..."]}
    ]
  },
  "deferred_ideas": ["..."],
  "canonical_refs": ["..."]
}
```

This is a structured checkpoint, not the final CONTEXT.md — the `write_context` step still produces the canonical output. But if the session dies, the next `/rihal-discuss-phase` invocation can detect this checkpoint and offer to resume from it instead of starting from scratch.

**On session resume:** In the `check_existing` step, also check for `*-DISCUSS-CHECKPOINT.json`. If found and no CONTEXT.md exists:
- Display: "Found interrupted discussion checkpoint ({N} areas completed). Resume from checkpoint?"
- Options: "Resume" / "Start fresh"
- On "Resume": Load the checkpoint, skip completed areas, continue from where it left off
- On "Start fresh": Delete the checkpoint, proceed as normal

**After write_context completes successfully:** Delete the checkpoint file — the canonical CONTEXT.md now has all decisions.

**Track discussion log data internally:**
For each question asked, accumulate:
- Area name
- All options presented (label + description)
- Which option the user selected (or their free-text response)
- Any follow-up notes or clarifications the user provided
This data is used to generate DISCUSSION-LOG.md in the `write_context` step.
</step>
