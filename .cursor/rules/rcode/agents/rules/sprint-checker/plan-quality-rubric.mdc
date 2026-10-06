# Plan Quality Rubric — the judgment pass

The twelve dimensions in `dimensions.md` are mechanical: does the file exist,
does the array match, does the command exit non-zero, is the graph acyclic. They
are necessary and they are all binary, and **a plan can pass every one of them
and still be bad**. Nothing in rcode could say so.

This rubric is the judgment pass. It answers a different question: not *is this
plan well-formed*, but *is this plan any good*.

Walk it with judgment, not as a checklist. **Be specific — cite the plan and task
by id, quote the phrase, name what is missing. Abstract criticism is a failure of
nerve**, and it is also useless: "the plan could be clearer" gives the planner
nothing to change.

## How to use it

1. Read the phase's plans in full before writing anything.
2. For each dimension, form a verdict — **strong / adequate / thin / broken** —
   backed by specifics.
3. Write findings only where they add information. A `strong` dimension may need
   none; a `broken` one needs concrete, fixable ones.
4. **Severity ranks impact on the plan's usefulness, not how easy the fix is.** A
   vague phase goal is critical even though it is a one-line fix; an inconsistent
   term might be low even though it appears in twenty places.
5. Calibrate to the stakes recorded at project setup. A hobby project's plan does
   not need launch-grade rigor — but the substance bar still applies to both.

## The dimensions

### 1. Substance over furniture

Is the content earned, or is it there because the template had a slot?

- **Task theater** — tasks that exist to make the plan look thorough. "Review the
  implementation", "ensure quality", "update documentation" with nothing named.
- **Verification theater** — an `<automated>` block whose commands cannot fail, or
  that assert something already true. See Check 8a2/8a3 for the mechanical half;
  this is the judgment half.
- **Evidence theater** — an `<evidence>` block citing a file that does not
  actually support the claim.

Flag what reads like furniture **even when it is well-written furniture**.

### 2. Done-ness clarity

Would an executor reading this plan know what "done" looks like for each task?

- Every `must_haves.truth` should be a verifiable condition. "Works correctly",
  "handles errors gracefully", "reasonable performance" — flag every one.
- `[DERIVED]` truths mean the requirement had no consequences recorded. A plan
  where most truths are derived is a signal the requirements were never finished.

**Be unforgiving here.** This is the dimension execution and verification both
lean on hardest, and it is where a phase quietly passes against the wrong bar.

### 3. Coherence

Does the phase have a thesis, or is it a list of tasks someone wanted?

- Do the tasks serve one capability, or several unrelated ones?
- Does the sequencing follow from the work, or from "what is easy first"?
- Would removing any single task leave the phase goal unmet? If a task can be
  dropped with no effect on the goal, ask what it is doing here.

Red flag: a phase that reads as a backlog with a heading.

### 4. Scope honesty

Are the omissions explicit, or is the reader meant to infer them?

- Is what this phase deliberately does NOT do written down?
- Are assumptions tagged, or silently baked into task descriptions?
- Was anything de-scoped quietly between the roadmap and this plan?

Count open questions and untagged assumptions against the stakes. A high count on
a hobby plan is fine; the same count on a plan about to be executed is a blocker.

### 5. Shape fit

Has the plan been forced into a shape that does not match the work?

- A four-task ceremony for a one-line config change is over-formalized.
- A single task covering an auth rewrite is under-formalized.
- A backend-only phase carrying UI verification steps has the wrong shape.
- A hobby-stakes project running the full launch pipeline will be abandoned —
  that is a real failure, not caution.

Flag both directions. Over-formalization is the one that gets excused, and it is
the one that makes people stop using the process.

## Output

Append to the checker's report:

```markdown
## Plan Quality — {strong|adequate|thin|broken} overall

{2-3 sentences: what holds up, what is at risk. Earned by the verdicts below.}

### Substance over furniture — {verdict}
- **{critical|high|medium|low}** {title} (plan {N}, task {id}) — {what}. *Fix:* {what to change}.

### Done-ness clarity — {verdict}
...
```

A `broken` verdict on **Done-ness clarity** or **Substance** is a blocking issue:
those two decide whether execution and verification are measuring anything real.
The other three are warnings — they make the plan worse, not wrong.
