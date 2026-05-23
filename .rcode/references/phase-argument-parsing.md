# Phase Argument Parsing

Workflows accept a phase argument in two forms:

- **Numeric**: `01`, `2`, `02.1` — resolved via
  `node .rcode/bin/rcode-tools.cjs init phase-op "$ARG"` to the matching
  phase directory under `.planning/phases/`.
- **Path**: a direct `.planning/phases/<slug>/PLAN.md` path — used as-is.

If the resolver returns `phase_found: false`, workflows must STOP with a
"phase not found" message rather than fabricating a target.
