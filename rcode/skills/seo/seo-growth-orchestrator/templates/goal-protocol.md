# /goal — Goals Protocol template

Start the message in Claude with `/goal` so it runs the worker→evaluator loop, then paste:

```
GOAL: {{one sentence, action verb first, ONE deliverable}}

OUTPUT SPEC:
- File: {{exact filename}}
- Format: {{e.g. CSV / markdown table}}
- Columns/Schema: {{exact columns or structure}}

ACCEPTANCE CRITERIA (each yes/no or a number):
1. {{criterion}}
2. {{criterion}}
3. {{criterion}}

LIMITS / CONSTRAINTS (what NOT to do):
- {{forbidden action / scope wall / cap}}
- {{...}}

STOP AND VERIFY:
Before declaring complete, list each acceptance criterion with the evidence that
satisfies it, then hand the deliverable to the evaluator for an independent audit.

First, ask me clarifying questions one at a time until you are ≥95% confident,
then proceed.
```

Quality gate before running — must pass all three:
- Stranger test: a stranger knows exactly what "done" is.
- Spreadsheet test: every criterion fits a yes/no or number column.
- Runway test: constraints catch the worst misinterpretation within minutes.

One goal per run. If you have several, sequence them.
