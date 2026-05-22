# Decision Log — `{{PROJECT_NAME}}`

Append-only. Newest at top. Each entry: date, decision, rationale, alternatives considered, who decided. One paragraph per entry. Heavier decisions get their own ADR file referenced from here.

---

## Format

```
### YYYY-MM-DD — Short decision title

**Decision:** What we chose.
**Rationale:** Why this over alternatives.
**Alternatives considered:** A (rejected because...), B (rejected because...).
**Who decided:** Person or council.
**Reversibility:** Easy / hard / one-way door.
**ADR:** [Optional link to a fuller ADR file]
```

---

## Entries

<!-- Append new decisions above this line -->

### {{INIT_DATE}} — Memory Bank initialised

**Decision:** Adopt rcode Memory Bank for persistent project context.
**Rationale:** AI agents lose context between sessions; new teammates need a single place to learn the project's history without archaeology through Slack and PRs.
**Alternatives considered:** CLAUDE.md only (rejected: no structure, goes stale), wiki (rejected: not in-repo, not version-controlled with code), README sections (rejected: doesn't scale).
**Who decided:** Project lead.
**Reversibility:** Easy. Just delete `.rcode/memory/` to remove.
