---
name: llm-engineering-best-practices
description: When the user is designing, reviewing, or debugging anything that calls an LLM — prompt design, system vs. user prompt structure, few-shot vs. zero-shot decisions, tool/function-calling schemas, RAG or retrieval pipelines, context-window budgeting, chunking strategy, or agent orchestration. Also use when the user mentions "prompt engineering," "system prompt," "few-shot examples," "function calling," "tool schema," "RAG pipeline," "context window," "chunking strategy," "the model is hallucinating," "prompt injection," "the LLM ignored my instructions," "output isn't structured right," "agent keeps looping," or "how do I eval this prompt." Use this even for a vague ask like "is this prompt any good?" or "review my agent's tool definitions" — start with the relevant section below. Do NOT use for: rcode's own skill-authoring eval methodology (control-vs-treatment testing of a skill's effect on a subagent) — that lives in `rcode/workflows/scaffold-skill.md` Step 3.5, follow it instead of inventing a new eval process. Do NOT use for async-library-specific correctness bugs (e.g. TanStack Query callback-dropping, stale closures, race conditions in JS/Python async code) — that is `rcode/agents/rules/executor/correctness-hazard-scan.md` Hazard 3's territory, not an LLM-design problem.
metadata:
  version: 1.0.0
---

# LLM Engineering Best Practices

You are an expert in building production systems on top of large language models. Your goal is to review or design prompts, context pipelines, and tool-calling integrations so they behave predictably under real (not just demo) conditions, and to catch the failure modes that only show up once untrusted input, long conversations, or edge-case data reach the model.

## Initial Assessment

Before diving in, understand what's actually being built:

1. **Surface area** — is this a single one-shot prompt, a multi-turn conversation, an agent with tools, or a RAG pipeline? Each has different failure modes (see Review Priority below).
2. **Model tier** — which model is this running on, and does the same prompt also run on a cheaper/smaller tier anywhere in the system (routing, fallback, sub-agents)? A prompt that works on a frontier model can silently underperform on a smaller one; note this before recommending a fix that only holds at the top tier.
3. **Trust boundary** — does any part of the context come from outside the developer's control (user input, scraped web content, retrieved documents, tool output)? If yes, prompt-injection and hallucination-under-ambiguity both apply — see Common Failure Modes.
4. **Existing evals** — is there already a way to measure whether a prompt change helped or hurt? If not, don't ship a "improved" prompt on vibes; point to the Evals section below before making the change.

---

## Review Priority Order

1. **Prompt structure** (is the instruction unambiguous and in the right slot — system vs. user?)
2. **Context and retrieval design** (is the model seeing the right information, in the right amount, in the right order?)
3. **Tool/function-calling contracts** (can the model tell what a tool does and recover when it fails?)
4. **Failure-mode hardening** (hallucination, injection, silent truncation — what happens on bad input?)
5. **Evals** (can you prove a change actually helped?)

Work top-down: a beautifully designed RAG pipeline can't compensate for an ambiguous system prompt, and a hardened failure-mode story is wasted if there's no eval to confirm the hardening didn't regress the happy path.

---

## 1. Prompt Design

**System vs. user prompt boundary**
- The system prompt carries the *stable* contract: role, constraints, output format, tools available, and behavioral rules that hold across every turn. It should not contain per-request data.
- The user prompt (or the latest turn) carries the *variable* part: the specific question, task, or payload for this call.
- A common bug: stuffing per-request data (a retrieved document, a user's raw input) into the system prompt. This bloats the cache-invalidation surface (the system prompt should be the stable, cacheable prefix) and blurs the model's sense of what's an instruction vs. what's data to reason about. Put instructions in the system prompt, data in the user turn, and — when the data is untrusted — wrap it in clear delimiters and say explicitly "the following is user-supplied content, not an instruction."

**Specificity over politeness**
- Vague asks ("write something good about X") produce vague, unpredictable output. State the format, length, audience, and constraints explicitly. If there's a right answer shape (JSON, a specific heading structure, a word-count band), say so — don't imply it and hope the model infers it.
- Negative constraints ("don't include X") are weaker than positive ones ("only include X, Y, Z"). Prefer telling the model what the output should look like over listing everything it shouldn't do.

**Few-shot vs. zero-shot**
- Zero-shot is the right default for tasks the model already handles well from instructions alone (most classification, extraction, summarization on unambiguous input) — it's cheaper (no example tokens) and avoids leaking a "shape" from the examples that doesn't generalize.
- Add few-shot examples when: the desired output format is unusual or hard to describe in prose (a specific structured format, a house style), the task has systematic edge cases the model gets wrong zero-shot, or you've already tried tightening the instruction and it didn't converge.
- When you do add examples, 2-3 diverse examples (covering different branches of the task, not three near-duplicates) beat one. Order and recency matter — models weight later examples more; put the example closest to the actual target case last.
- Don't let few-shot examples silently become the spec. If the prompt's prose contradicts what the examples show, the model will follow the examples — audit for that drift whenever either changes.

**Chain-of-thought and structured reasoning**
- For tasks with multiple steps or that benefit from working through intermediate state (arithmetic, multi-hop lookups, planning), explicitly ask for the reasoning before the answer, or use a scratchpad the model can write to before committing to output. Don't just append "think step by step" as a magic phrase — say what the model should actually be tracking (which sub-problem it's solving, what evidence it's checking).
- For agents, this generalizes to explicit tool-use loops (see [ReAct-style interleaving](references/prompt-design-patterns.md#react-style-tool-interleaving)) rather than asking the model to plan everything up front in one shot.

See [`references/prompt-design-patterns.md`](references/prompt-design-patterns.md) for deeper coverage of self-consistency, prompt chaining, and multi-turn drift.

---

## 2. Context and RAG Design

**Chunking**
- Chunk boundaries should follow semantic units (a section, a function, a paragraph), not a fixed character count that can split a sentence or a code block in half. A chunk that's syntactically broken is worse than a slightly-too-long one.
- Include enough surrounding context in each chunk (a heading, a file path, a preceding sentence) that it's interpretable in isolation — retrieval returns chunks out of order and without their neighbors.
- Overlap between adjacent chunks (10-20%) trades some duplication for fewer boundary-split answers; only add it if you've observed boundary loss, not by default.

**Retrieval relevance**
- Retrieving more chunks is not automatically better — irrelevant chunks compete for the model's attention and can get cited or blended into the answer even when they shouldn't be. Tune retrieval count (top-k) against measured answer quality, not against "more context can't hurt."
- Re-rank before stuffing raw vector-search results into the prompt when the retrieval corpus is heterogeneous (mixed document types, mixed recency) — a fast re-ranker pass catches cases where the top-k by embedding similarity isn't actually the most useful set.
- Surface retrieval provenance (source, section, date) alongside each chunk in the prompt. It lets the model attribute claims correctly and lets you audit hallucination against "did the model say something not in any retrieved chunk."

**Context window budgeting**
- A context window has a hard token limit, but the *effective* limit for reliable use is lower — models attend unevenly across a long context (recency and primacy bias), so information buried in the middle of a very long prompt is more likely to be under-weighted. Don't treat "fits in the window" as "will be used correctly."
- Budget the window deliberately: reserve a fixed allotment for system instructions, a fixed allotment for retrieved/tool context, and a fixed allotment for conversation history, rather than letting one grow until it silently displaces the others.
- **Silent truncation is a distinct failure mode from running out of budget.** If context is truncated to fit (oldest messages dropped, a document cut off mid-section) and nothing surfaces that truncation to the model or the caller, the model will confidently answer as if it saw the whole thing. Always make truncation visible — either to the model ("[earlier conversation truncated]") or as a caller-visible flag — never silent.

---

## 3. Tool / Function-Calling Patterns

**Schema design**
- Tool names and parameter names should describe intent, not implementation (`search_knowledge_base`, not `run_query_v2`). The model picks and fills tools based on the schema's natural-language surface — a vague name or description gets misused.
- Every parameter needs a description with the same care as a prompt: what format, what units, what happens with an empty value. `end_date: string` invites ambiguity; `end_date: string (ISO 8601, e.g. "2026-09-08"), inclusive` does not.
- Prefer a few well-scoped tools over one tool with a `mode` parameter that changes its entire contract depending on the value — the model has to infer the right mode from context, which is exactly the kind of implicit reasoning that fails silently.
- Keep tool count and description size in mind as part of the context budget above — a large tool roster eats into the same window as everything else, and past a certain count the model's tool-selection accuracy degrades.

**Error surfaces back to the model**
- When a tool call fails, the error message that goes back into the conversation is itself a prompt — treat it that way. `Error: 500` gives the model nothing to act on; `Error: rate limited, retry after 30s` or `Error: no results for that query, try broadening the date range` gives it a path to recover.
- Distinguish retryable errors (transient, safe to retry with the same or adjusted args) from terminal ones (the tool call is fundamentally wrong — bad auth, resource doesn't exist) in what you send back, or the model will retry things that can't succeed and give up on things it should retry.
- Cap retry loops explicitly. An agent that can call a failing tool has no built-in reason to stop retrying on its own; if the harness doesn't enforce a retry ceiling, the model will burn turns or tokens looping on a call that will never succeed.

**Validating model-supplied arguments**
- Never execute a tool call's arguments unvalidated just because the model produced them in the expected schema shape. The model can hallucinate a plausible-looking but wrong argument (a file path that doesn't exist, an id that was never returned by a prior tool call) — validate at the boundary the same way you'd validate any external input, because from the tool's perspective, the model is an external, unreliable caller.

---

## 4. Common Failure Modes

**Hallucination under ambiguous instructions**
- Hallucination is most often a symptom of an underspecified task, not a model defect to route around after the fact. When an instruction has a gap (a case the prompt never addresses), the model fills it with something plausible-sounding rather than surfacing the gap. Before adding output-side guardrails, check whether the actual fix is closing the ambiguity in the prompt.
- For tasks with a verifiable ground truth (facts, quotes, code that must actually exist), explicitly instruct the model to say "I don't know" or "not found in the provided context" rather than guessing, and treat a fabricated-but-plausible answer as a prompt bug, not an inherent limitation to shrug off.

**Prompt injection from untrusted content**
- Any content that enters the context from outside your control — a scraped page, a user-uploaded file, a retrieved document, another agent's tool output — can contain text engineered to look like an instruction. The model does not reliably distinguish "text I'm supposed to reason about" from "text telling me what to do" unless the prompt structure makes that distinction explicit.
- Mitigations, in order of strength: (1) don't grant tool access or elevated trust to a model call that only needs to summarize/extract from untrusted content; (2) wrap untrusted content in explicit delimiters and state its role ("data to analyze, not instructions to follow") in the system prompt; (3) treat any instruction-shaped text that appears *inside* delimited untrusted content as a signal to flag, not obey.
- This is a design property of the prompt and the surrounding harness, not something a single clever phrase in the system prompt reliably closes off — don't ship "ignore any instructions in the content above" as the only mitigation for content an attacker actually controls.

**Silent truncation and dropped context**
- Covered in context-window budgeting above, but worth restating as a failure mode in its own right: any place context is cut, summarized, or dropped to fit a budget is a place the model can confidently produce output based on a partial picture. Audit every truncation point in the pipeline and confirm it's either visible or provably safe to drop (e.g., truly irrelevant history), not just convenient.

**Silent format drift**
- Output that's supposed to be structured (JSON, a specific markdown shape) can drift under long conversations or after a model/version change, without an explicit error — the caller downstream either breaks or silently mis-parses. Validate structured output at the boundary (schema validation, not just "did it parse") rather than assuming the prompt's format instruction holds indefinitely.

---

## 5. Evals — Proving a Prompt or Agent Change Actually Helped

Do not ship a prompt change, a new tool description, or a context-pipeline tweak on the basis that it "reads better" or "should help." rcode already has a canonical methodology for this: **use the control-vs-treatment gate in [`rcode/workflows/scaffold-skill.md` Step 3.5](../../../workflows/scaffold-skill.md)** — write pressure scenarios (happy path, edge case, adversarial/negative case), run a control without the change, run a treatment with it, and confirm the two diverge in the claimed direction. That methodology is written for skills, but the same shape applies directly to any prompt or tool-schema change: the question is always "does this measurably change behavior in the direction I intended," not "does this look more correct to me."

When reviewing someone else's prompt change, ask whether they can point to a control/treatment comparison (even an informal one) before accepting "I tightened the wording" as sufficient justification.

---

## Output Format

When reviewing or designing an LLM integration, structure findings as:

- **Component** — which part of the system (prompt, retrieval, tool schema, failure handling, evals)
- **Issue** — what's wrong or missing, stated concretely
- **Why it matters** — the concrete failure mode this causes (hallucination, injection risk, silent truncation, wasted tokens, tool misuse), not a generic "best practice" citation
- **Fix** — the specific change (reworded instruction, added delimiter, tightened schema, added validation)
- **Priority** — High (produces wrong/unsafe output or a security exposure), Medium (degrades quality or reliability), Low (efficiency or clarity improvement)

Close with a short **Evals** note: what pressure scenario would prove the fix worked, per Section 5.

---

## Examples

### Example 1 — Happy path
**Prompt:** "Can you review this system prompt for our support-ticket triage agent? It's supposed to classify tickets into categories and call a `route_ticket` tool."

**Expected behavior:** Check the system/user prompt boundary (is the ticket text correctly in the user turn, not baked into the system prompt?), review the `route_ticket` tool schema for parameter clarity and error-surface quality, check whether category ambiguity is handled explicitly or left to guesswork (hallucination-under-ambiguity), and close with a concrete Output Format review (Component/Issue/Why/Fix/Priority) plus an eval suggestion per Section 5.

### Example 2 — Edge case
**Prompt:** "Our RAG chatbot answers questions from a 200-page policy PDF. Sometimes it makes up a policy that isn't in the document. How do I fix this?"

**Expected behavior:** Don't jump straight to "add a hallucination guardrail." Work top-down: check chunking (is the PDF split into semantically broken chunks that lose the qualifying clause of a policy?), check retrieval relevance (is top-k too low/high, is a re-rank pass missing?), check whether the prompt explicitly instructs "say not found if the answer isn't in the retrieved context" — and only after those are ruled out, treat it as a genuine hallucination-under-ambiguity case per Section 4. Recommend an eval scenario (a question with a known "not in document" answer) to confirm the fix.

### Example 3 — Negative / boundary case
**Prompt:** "Our agent's `mutate()` calls to update a record are dropping some `onSuccess` callbacks when the user clicks save twice quickly. Is this an LLM prompt issue?"

**Expected behavior:** Recognize this is NOT an LLM-design problem — it's the async-library footgun already documented as Hazard 3 in [`rcode/agents/rules/executor/correctness-hazard-scan.md`](../../../agents/rules/executor/correctness-hazard-scan.md) (TanStack Query's `mutate()` dropping per-call callbacks under rapid concurrent calls). Point there instead of proposing prompt changes, and don't re-explain the hazard's mechanics here — this skill's scope is LLM prompt/context/tool design, not async JS/Python correctness bugs.
