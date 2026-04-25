# State as Single Source of Truth

Referenced by every workflow that touches project decisions, blockers,
phases, sprints, or epics. Closes #222 — the STATE.md vs state.json
divergence that confused the interpos audit.

## The rule

`.rihal/state.json` is the **only** authoritative source for project
state. Specifically: decisions, blockers, current_phase, milestone,
phases[], epics[].stories[], sprints[].

`.planning/STATE.md` (the markdown file) is a **rendered view** of
state.json — never edit it by hand, never write to it from a workflow.

## Why

Two writers = two sources of truth = inevitable divergence. The
interpos audit found 7 decisions in STATE.md and 0 in state.json.
`/rihal:status` (which reads state.json) showed an empty project
while STATE.md (which a human had written) showed the real picture.

## How to apply

### When recording a decision

❌ DO NOT write decision prose to STATE.md or anywhere else.

✅ DO use the CLI:

```bash
node .rihal/bin/rihal-tools.cjs state add-decision \
  "Stack locked: NextJS + NestJS + Postgres" \
  --workflow autonomous \
  --reversibility one-way
```

Returns the decision id. The decision now appears in `state.decisions[]`
and is searchable via `/rihal:why <id>`.

### When updating phase / sprint / epic state

❌ DO NOT hand-edit STATE.md.

✅ DO let workflows write planning artifacts (ROADMAP.md, epics.md,
sprint-N.md, SUMMARY.md), then run state sync:

```bash
node .rihal/bin/rihal-tools.cjs state sync --from-disk
```

This re-parses disk and upserts into state.json. STATE.md gets
re-rendered automatically (see below).

### When rendering STATE.md for human consumption

```bash
node .rihal/bin/rihal-tools.cjs state render
```

Generates `.planning/STATE.md` from state.json — a markdown view of
everything in state. Useful for git diffs, PR reviews, and humans
scanning project state without running CLI.

The pre-commit hook (#199) automatically runs `state render` whenever
state.json changes, so STATE.md stays current without manual effort.

## Migration for existing projects

If your project's STATE.md has decisions that aren't in state.json yet:

```bash
# 1. Show the divergence
diff <(node .rihal/bin/rihal-tools.cjs state read | jq '.decisions[].summary') \
     <(grep "^- \\*\\*[0-9]" .planning/STATE.md)

# 2. Manually add the missing ones via CLI
node .rihal/bin/rihal-tools.cjs state add-decision "<text>" --workflow migration

# 3. Render to confirm
node .rihal/bin/rihal-tools.cjs state render
diff .planning/STATE.md /dev/stdin <<< "$(node .rihal/bin/rihal-tools.cjs state read)"
```

## Forbidden patterns

`grep` should return ZERO matches across `rihal/workflows/`:

```bash
grep -E "Write\\(.*STATE\\.md|append.*STATE\\.md|>>.*STATE\\.md" rihal/workflows/*.md
```

If anything matches, that workflow is breaking the rule and must be
converted to use `state add-decision` + `state render`.
