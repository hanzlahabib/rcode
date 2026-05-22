# Debugger Playbook

Loaded by `rcode-debugger` via `@-include`. Contains the full debugging
philosophy, cognitive bias avoidance, before-hypothesis protocol, investigation
disciplines, restart protocol, and checkpoint format.

The agent stub holds the role definition, constraints, and @-include list.

---

## Philosophy

**User = Reporter, You = Investigator**

User knows: What they expected, what actually happened, error messages, when it started.
User does NOT know: Root cause, which file, what the fix should be.

Investigate the cause yourself. Don't ask about causation.

**Meta-Debugging: Your Own Code**

When debugging code you wrote:
- **Treat your code as foreign** — Read it as if someone else wrote it
- **Question your design decisions** — Your implementations are hypotheses, not facts
- **Admit your mental model might be wrong** — The code's behavior is truth; your model is a guess
- **Prioritize code you touched** — If you modified 100 lines and something breaks, those are prime suspects

---

## Foundation Principles

- **What do you KNOW for certain?** Observable facts, not assumptions
- **What are you ASSUMING?** "This library should work this way" — have you verified?
- **Strip away everything you think you know.** Build understanding from observable facts.

---

## Cognitive Biases to Avoid

| Bias | Trap | Antidote |
|------|------|----------|
| **Confirmation** | Only look for evidence supporting your hypothesis | Actively seek disconfirming evidence. "What proves me wrong?" |
| **Anchoring** | First explanation becomes your anchor | Generate 3+ independent hypotheses before investigating |
| **Availability** | Recent bugs → assume similar cause | Treat each bug as novel until evidence suggests otherwise |
| **Sunk Cost** | Spent 2 hours on path, keep going | Every 30 min: "Is this still the path I'd take?" |

---

## Before Hypothesis Formation

**MANDATORY:** Read `.rcode/references/common-bug-patterns.md` first.

15+ patterns catalogued there with detection signals. Scanning saves hours:
- Async patterns (race conditions, missing await, unhandled rejections)
- State mutation (shared references, closure over loop vars)
- Import/dependency (circular, version mismatches)
- Type coercion (== vs ===, undefined vs null)
- Environment (missing env vars, hardcoded paths)
- Timing (event listeners not removed, memory leaks)

If bug symptoms match a pattern, the fix template is ready. Don't re-invent debugging.

---

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Scientific method for bug investigation | `.rcode/agents-rules/debugger/scientific-method.md` |
| Investigation techniques (binary search, rubber duck, etc.) | `.rcode/agents-rules/debugger/investigation-protocol.md` |
| Debug session state management | `.rcode/agents-rules/debugger/debug-session-state.md` |
| Hypothesis templates for common bug types | `.rcode/agents-rules/debugger/hypothesis-templates.md` |
| Resuming from checkpoint in debug session | `.rcode/agents-rules/debugger/checkpoint-recovery.md` |

Read ONLY when current task needs them. Don't preemptively load.

---

## Investigation Disciplines

**Change one variable:** Make one change, test, observe, document, repeat. Multiple changes = no idea what mattered.

**Complete reading:** Read entire functions, not just "relevant" lines. Read imports, config, tests. Skimming misses details.

**Embrace not knowing:** "I don't know why this fails" = good (now investigate). "It must be X" = dangerous (you stopped thinking).

---

## When to Restart

Consider starting fresh when:
1. **2+ hours, no progress** — You're likely tunnel-visioned
2. **3+ "fixes" that didn't work** — Your mental model is wrong
3. **Can't explain current behavior** — Don't layer changes on confusion
4. **Debugging the debugger** — Something fundamental is wrong
5. **Fix works but you don't know why** — This isn't fixed, it's luck

Restart protocol:
1. Close all files and terminals
2. Write down what you KNOW for certain (facts, not guesses)
3. Write down what you've RULED OUT
4. List NEW hypotheses (different from before)
5. Begin from Evidence Gathering phase

---

## Checkpoint Return Format (Exact)

```markdown
## CHECKPOINT REACHED

**Type:** [ROOT_CAUSE_FOUND | DEBUG_COMPLETE | VERIFICATION_NEEDED]
**Bug:** [Symptom description]
**Status:** [What's been determined]

### Current Investigation

[What you've tested, what you've ruled out]

### Hypothesis Being Tested

[Specific, falsifiable claim]

### Awaiting

[What user needs to do/confirm]
```
