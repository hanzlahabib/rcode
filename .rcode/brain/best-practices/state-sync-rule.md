# State Sync Rule

Referenced by skills that write `ROADMAP.md`, `epics.md`, or sprint artifacts. These artifacts are not authoritative on their own — downstream workflows (`/rihal-status`, `/rihal-progress`, `/rihal-execute`) read `.rihal/state.json`. If you write a planning artifact and skip state sync, the project ends up with two divergent pictures.

## The Rule

Immediately after appending content to any of:

- `.planning/ROADMAP.md` — milestones and phases
- `.planning/epics.md` — epics and stories
- `.rihal/phases/{phase}/sprint-{N}.md` — sprint commitments

Call the state-sync helper:

```bash
node .rihal/bin/rihal-tools.cjs state sync --from-disk
```

or, for a more targeted write, use the JSON-API helpers exposed by `rihal-tools.cjs`:

```bash
node .rihal/bin/rihal-tools.cjs state upsert-milestone <json>
node .rihal/bin/rihal-tools.cjs state upsert-phase <json>
node .rihal/bin/rihal-tools.cjs state upsert-epic <json>
```

If `rihal-tools.cjs` does not yet expose the needed subcommand, fall back to `state sync --from-disk` which re-parses `ROADMAP.md` + `epics.md` and rebuilds the relevant sections of `state.json`.

## Verification After Sync

- `node .rihal/bin/rihal-tools.cjs state read` returns a phase count that matches the phase table in `ROADMAP.md`.
- `/rihal-status` and `/rihal-progress`, run back-to-back, agree on the current milestone name and phase count.

## Why This Matters

Observed failure (rihal-code, social-poster-x install, Apr 2026):

- User ran `/rihal-create-epics-and-stories`.
- `ROADMAP.md` gained 10 phases; `epics.md` gained 62 stories.
- `.rihal/state.json` remained at the initial bootstrap with 1 phase.
- `/rihal-status` showed 1 phase; `/rihal-progress` showed 10.

That divergence is what this rule exists to prevent.
