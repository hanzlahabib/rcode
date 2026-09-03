---
failed_layers: '' # set at runtime: comma-separated list of layers that failed or returned empty
---

# Step 2: Review

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- Each angle is a SEPARATE agent with a NARROW question. An agent asked to
  "find problems" returns generic ones; an agent asked "what did this change
  remove, and was every removal safe?" returns specific ones. Narrowness is the
  whole mechanism — do not merge angles to save tokens.
- Angles get different context on purpose. Two of them are deliberately blind.

## INSTRUCTIONS

1. If `{review_mode}` = `"no-spec"`, note to the user: "Acceptance Auditor skipped — no spec file provided."

2. Launch parallel subagents without conversation context. If subagents are not available, generate prompt files in `{implementation_artifacts}` — one per reviewer role below — and HALT. Ask the user to run each in a separate session (ideally a different LLM) and paste back the findings. When findings are pasted, resume from this point and proceed to step 3.

   **Angles.** Three gather evidence, five exercise judgment. Run all of them in
   parallel, in one message. They map to agents shipped in `.claude/agents/` —
   `rcode-review-adversarial-general` and `rcode-review-edge-case-hunter` are
   SKILLS, not subagents, and `Task(subagent_type=...)` cannot reach them.

   ### Evidence angles — what is actually in this change

   - **scan** — `rcode-security-adversary`, diff only, NO project access.
     *"Read this diff cold. What is wrong with it on its own terms?"* Blind on
     purpose: an agent that can see the codebase rationalises what it finds.

   - **removed** — `rcode-reviewer`, diff + project read.
     *"What did this change DELETE or stop calling, and was every removal safe?"*
     Deletions are where regressions hide, and no reviewer asked to "review the
     diff" ever looks at them properly — added lines are simply louder.

   - **trace** — `rcode-reviewer`, diff + project read.
     *"Pick the primary path this change touches and trace it end to end. Where
     does the new code get called from, and what calls that?"* This is the angle
     that catches code with no caller — the failure rcode has hit in its own
     projects.

   ### Judgment angles — is this change any good

   - **reuse** — `rcode-reviewer`, diff + project read.
     *"Does this reimplement something the codebase already has?"* Look for
     bespoke helpers duplicating a canonical one, and for logic placed outside
     the layer that owns it.

   - **simplify** — `rcode-reviewer`, diff + project read.
     *"What would this look like with fewer moving pieces?"* Prefer
     simplifications that REMOVE machinery over refactors that spread the same
     complexity around. Flag thin wrappers and identity abstractions that add
     indirection without simplifying anything. If the change missed a dramatic
     simplification, say so plainly — a missed simplification is a finding.

   - **efficiency** — `rcode-yousef`, diff + project read.
     *"What is now O(n²), unbounded, or on the hot path that was not before?"*
     Name the input that has to grow for it to matter. An efficiency finding
     with no growth story is noise.

   - **altitude** — `rcode-waleed`, diff + project read + the phase goal.
     *"Is this solving the problem at the right level?"* A correct fix at the
     wrong altitude is a symptom patch: it works, it ships, and the cause is
     still there. Say which one this is.

   - **concurrency** — `rcode-yousef`, diff + project read.
     *"Walk every write/mutation path this change touches under three
     conditions: (1) multiple service instances running different versions
     simultaneously during a rolling deploy — could an old writer and a new
     writer disagree about shared state and lose data? (2) a config/state
     reload while in-flight work exists — does a worker crash or leave state
     inconsistent when the swap happens mid-request? (3) any queue, dispatch
     loop, or fan-out this change adds or touches — is it bounded, and what
     happens under sustained load if it isn't?"* Name the specific
     interleaving or sequence that breaks, not a general risk.

   - **acceptance** (only when `{review_mode}` = `"full"`) — `rcode-reviewer`,
     diff + `{spec_file}` + context docs.
     *"Which acceptance criterion or spec constraint does this violate?"* Cite
     the AC id and the diff evidence.

   **Every angle returns the same shape** so triage can merge them: one-line
   title, `file:line`, a concrete failure scenario (inputs or state → wrong
   output), and the fix. **A finding with no failure scenario is an opinion** —
   the angle should drop it rather than pad its list.

   **If subagents are unavailable:** write one prompt file per angle into
   `{implementation_artifacts}` and HALT. Ask the user to run each in a separate
   session (ideally a different model) and paste the findings back. Resume here.

3. **Subagent failure handling**: If any subagent fails, times out, or returns empty results, append the layer name to `{failed_layers}` (comma-separated) and proceed with findings from the remaining layers.

4. Collect all findings from the completed layers.


## NEXT

Read fully and follow `./step-03-triage.md`
