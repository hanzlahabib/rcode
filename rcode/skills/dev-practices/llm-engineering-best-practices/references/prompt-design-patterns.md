# Prompt Design Patterns

Deeper reference for prompt-level techniques beyond the SKILL.md summary — self-consistency, prompt chaining, ReAct-style tool interleaving, and multi-turn drift. Informed by patterns documented in Anthropic's claude-cookbooks and the DAIR.AI Prompt Engineering Guide; content here is original write-up, not reproduced from either source.

## Contents
- Self-Consistency
- Prompt Chaining
- ReAct-Style Tool Interleaving
- Multi-Turn Drift
- Prompt Caching and the Stable Prefix
- Cost/Quality Tradeoffs Across Model Tiers
- A Prompt Review Checklist

## Self-Consistency

Self-consistency runs the same prompt multiple times (with some sampling variance) and takes a majority vote or reconciles the answers, rather than trusting a single completion. It's worth reaching for when:

- The task has a single correct answer that's expensive to get wrong (a numeric extraction feeding a downstream calculation, a classification that gates an irreversible action).
- Single-shot outputs have shown measurable variance across repeated runs on the same input — if outputs are already stable, self-consistency adds cost for no gain.

It is not a substitute for fixing an ambiguous prompt. If three runs disagree because the instruction genuinely admits multiple readings, majority-voting picks one arbitrarily instead of picking correctly — tighten the prompt first, then apply self-consistency for genuine model-level variance on a well-specified task.

## Prompt Chaining

Prompt chaining breaks one large, multi-part task into a sequence of smaller prompts, where each step's output becomes the next step's input, instead of asking one prompt to do everything in one pass.

**When it helps:**
- The task has a natural pipeline shape (extract → validate → summarize) and each stage benefits from a narrower, more specific instruction than a single combined prompt could hold.
- You want to insert a validation or human-review checkpoint between stages.
- Different stages genuinely benefit from different models — a cheap/fast model for extraction, a stronger model for the reasoning-heavy stage.

**Costs to weigh:**
- Each link adds latency (a full round trip) and cost (repeated system-prompt tokens unless cached).
- Errors compound — a mistake in stage 1 propagates silently into stage 2 unless each stage validates its own input, not just trusts the prior stage's output shape.

**Rule of thumb:** chain when stages have genuinely different concerns or need a checkpoint; don't chain purely to make a single prompt "feel" simpler — that's often better solved by clarifying the single prompt.

## ReAct-Style Tool Interleaving

Rather than asking a model to produce a full plan up front and then execute it blindly, ReAct-style prompting interleaves reasoning and action: the model reasons about what it needs, takes one tool action, observes the real result, and re-reasons before the next action.

This matters because a plan made before seeing any tool output is a plan made on assumptions. Concretely:

- Don't ask an agent to "list all the steps you'll take" and then execute the list mechanically — early steps' actual results (a search returning zero hits, a lookup returning an unexpected value) should be able to change what happens next.
- Give the model a way to observe intermediate state (tool results back in context) before its next decision, rather than batching all tool calls speculatively.
- For agents with a bounded number of turns, make sure the harness surfaces "how many turns are left" or an equivalent signal if the task can legitimately take a variable number of steps — otherwise the model has no way to pace its own plan.

## Multi-Turn Drift

Long-running conversations or agent sessions accumulate context, and instructions given early can lose weight relative to more recent turns — a system prompt rule stated once at the start of a 40-turn conversation is not guaranteed to still govern turn 40's behavior with the same strength.

Symptoms of drift:
- A constraint that held for the first several turns of a session quietly stops being honored later, with no single turn that "broke" it.
- The model's output style or format gradually shifts to match whatever a recent turn happened to produce, rather than the original spec.

Mitigations:
- For rules that must hold for the entire session (a hard output format, a safety constraint), restate them at points where they matter rather than relying on the initial system prompt alone to carry indefinitely — especially right before the turn that produces the constrained output.
- Periodically re-inject a condensed reminder of the active constraints into long-running agent loops, sized to not compete meaningfully with the current task's context budget.
- Treat "the agent used to do X correctly and now doesn't, without a code change" as an early sign of drift, not a one-off model glitch — check conversation length and what's actually in the context at the point it fails.

## Prompt Caching and the Stable Prefix

Providers that support prompt caching key on a stable prefix — the same tokens, in the same order, up to the cache boundary. This is a direct consequence of the system/user boundary in the main SKILL.md: keep the system prompt (and any large static context like tool definitions or a reference document) as a byte-for-byte stable prefix, and put anything that changes per-request (the specific user message, per-call variables) after it.

Practical implications:
- Don't interpolate a timestamp, a request id, or any other per-call value into the system prompt "for logging" — it invalidates the cache on every single call.
- If a large static document (a knowledge base excerpt, a long tool spec) is reused across many calls, put it as early as possible in the stable prefix, not appended after the variable part.
- Cache invalidation is a cost/latency concern, not a correctness one — but a prompt that's structurally unstable for caching is usually also a prompt that's mixing instructions and data in the same place, which is the correctness concern from the main file's System vs. User Prompt Boundary section.

## Cost/Quality Tradeoffs Across Model Tiers

Not every call in a pipeline needs the strongest available model. A common, well-supported pattern (documented across Anthropic's own cookbook material) is using a smaller/cheaper model for a narrow sub-task — classification, extraction, a sub-agent handling one bounded piece of work — and reserving the larger model for the step that actually needs its reasoning depth.

When splitting work across tiers:
- Verify the narrow sub-task is actually narrow enough for the smaller model — a smaller model asked to do open-ended reasoning "to save cost" will produce lower-quality output that costs more downstream in correction cycles than the tokens it saved.
- Any prompt written for a larger model should be spot-checked on the smallest tier it will actually run under before being trusted — instruction-following degrades unevenly across tiers, and a prompt that's slightly underspecified may only reveal that on a smaller model. This mirrors the cross-tier check in `rcode/workflows/scaffold-skill.md` Step 3.5.

## A Prompt Review Checklist

Use this as a fast pass before a deeper Section-by-Section review from the main SKILL.md:

1. Is every instruction in the system prompt stable across calls, with per-request data only in the user turn?
2. Is the desired output format stated explicitly, not implied?
3. If few-shot examples exist, do they still match what the prose says — or has one drifted from the other?
4. Is there an explicit instruction for the "I don't know" / "not found" case, wherever the task has one?
5. Is any untrusted content clearly delimited and labeled as data, not instructions?
6. Is there a truncation or budget point in the pipeline that isn't surfaced anywhere?
7. Can you point to a control/treatment comparison for the most recent change to this prompt?
