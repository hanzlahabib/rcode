# Audit: Does rcode give pulled "brain" content priority over its own built-in rules?

**Date:** 2026-08-10
**Scope:** `.rcode/brain/`, `rcode/brain/`, `rcode/bin/lib/brain.cjs`, all workflows/skills/references that reference brain content, generated `CLAUDE.md`/`AGENTS.md` logic, and GitHub issues #158/#162/#163.

## Verdict

**Never real. The "external content overrides rcode's own built-in rules on conflict" behavior does not exist anywhere in the codebase, was never implemented, and — reading the original issues — was never actually the shipped design either.** What *is* real is a content-fetch pipeline (`brain pull`) that copies markdown files into a project. What never existed is any conflict-resolution or precedence logic that reads that pulled content and treats it as authoritative over rcode's own rules.

Break it down into three claims and their status:

| Claim | Status |
|---|---|
| rcode can pull external institutional content into a project (`.rcode/brain/`) | **Real, implemented, wired into install/update** |
| Pulled content is referenced/read by any workflow during execution | **Partially real** — but only for the `repo: self` source (rcode's own in-repo best-practices), not external orgs |
| Pulled/external content is given priority over rcode's own built-in rules on conflict | **Never implemented. No code path evaluates or resolves such a conflict at all.** |

## What IS real

### 1. The pull mechanism (`rcode/bin/lib/brain.cjs`, 353 lines)
- Subcommand `rcode-tools brain pull|status|list`, wired into `cli/install.js` (runs after scaffolding) and `/rcode-update` (`rcode/workflows/update.md`).
- Uses `git` sparse-checkout for external sources listed in `sources.yaml`, plain recursive copy for `repo: self` sources.
- Has a real security gate added later (`BRAIN_ALLOWED_ORGS`, commit-pinning requirement) — see `rcode/brain/sources.yaml` header comment referencing issue #925.
- This part of the feature works and is currently shipped.

### 2. `sources.yaml` has three declared sources
- `rihal-github-standards` / `rihal-docs` (now `rcode-*` post-rebrand) — **both still have `repo: "<PLACEHOLDER: github.com/rcode-om/???>"`** in both `.rcode/brain/sources.yaml` and the template `rcode/brain/sources.yaml`. These have *never* been filled with a real URL — confirmed by issue #162 (see below).
- `rcode-best-practices` — `repo: self`, pulls from `.rcode/skills/_shared/**/*.md` / `rcode/skills/_shared/**/*.md`. This is the only source that has ever produced live content, and it's **rcode's own repo pulling its own files**, not an external org's rules.

### 3. Two workflows actually `@`-include pulled brain files
```
rcode/workflows/autonomous.md:43-44
rcode/workflows/sprint-planning.md:18-19
```
Both include:
```
@rcode/brain/best-practices/no-autonomous-bypass.md
@rcode/brain/best-practices/state-sync-rule.md
```
These are the `repo: self` best-practice fragments (`no-autonomous-bypass.md`, `state-sync-rule.md`, `research-citation-rule.md`, `no-theoretical-suggestions.md` — 4 files under `.rcode/brain/best-practices/`). They sit in `<required_reading>` alongside `karpathy-guidelines.md` and other `.rcode/references/*.md` files, **as equals, not as an override layer**. Nothing in the surrounding workflow text (or in `no-autonomous-bypass.md` itself) says "if this conflicts with a built-in rule, this wins." It reads exactly like any other required-reading reference — additive, not hierarchical.

**No external-org content is ever `@`-included anywhere.** Grepping `rcode/workflows`, `rcode/skills`, `rcode/references`, `rcode/commands` for `brain` (excluding `brainstorm`) turns up nothing else that reads brain content during execution.

## What is NOT real

### No conflict/precedence logic anywhere
Grepped `rcode/bin/lib/brain.cjs` and the entire `rcode/` + `.rcode/` tree for `priorit|override|authoritative|precede|conflict` in combination with `brain`. The only hit is an unrelated CLI flag description (`RCODE_BRAIN_ALLOW_UNVERIFIED=1 to override` — about bypassing the org-allowlist security gate, not about content precedence).

### No CLAUDE.md/AGENTS.md generator conditionality
Searched `rcode-tools.cjs` and the generator logic for any conditional inclusion of `.rcode/brain/` content in the generated `CLAUDE.md`/`AGENTS.md`. None found. The generator has no awareness of brain content at all.

### `karpathy-guidelines.md` doesn't defer to brain
`rcode/references/karpathy-guidelines.md` has zero references to "brain," an external source, or any override mechanism. It is a self-contained rules file with no acknowledgment that upstream content could supersede it.

### `sprint-planning.md` explicitly asserts the *opposite* of override
```
rcode/workflows/sprint-planning.md:5-7
The in-line steps below ARE the authoritative path for this — this
project's own history confirms it: 54/54 real *-SPRINT.md files under
.planning/phases/ were produced by this in-line flow, none by the
rcode-sprint-planning skill.
```
The workflow that does `@`-include brain content explicitly declares *itself* (the in-line workflow), not the brain content, as authoritative.

## What the original design intent actually was (issues #158, #162, #163)

Read via `gh issue view` on `hanzlahabib/rihal-code`:

- **#158** (M2 — Brain Ingestion, closed, shipped as commit `c157a87`, 2026-04-24): scoped the ingestion pipeline only — `sources.yaml` + `brain pull` + install/update wiring. Explicitly: *"Does NOT need real Rihal URLs to merge — placeholders are acceptable."* No mention of override/precedence semantics anywhere in the scope.
- **#162** (M5 — wire real Rihal org URLs into `sources.yaml`, closed as **"not planned"**): This is the ticket that would have made the external sources real. It was auto-closed by mistake via PR #164, reopened by the author with the comment *"ignore urls for now we will do it at the end of its phase,"* then finally closed permanently post-v4 rebrand with: *"Stale post-v4 rebrand — this issue assumed the Rihal-internal context... these designs need rethinking from scratch. File a fresh issue if the rcode equivalent is still needed."* **The real-URL wiring was never completed and the ticket tracking it was explicitly abandoned.**
- **#163** (v3.0 MCP server, design-doc-only, closed): tracks the *next-generation* replacement for static pull — `docs/adr/0003-mcp-server-for-rcode-brain.md` is a **draft, not-yet-approved design stub** with a list of unresolved open questions (hosting, auth, migration path, latency budget). It explicitly says v2.0's static pull "remains available as an offline fallback." Nowhere — not in the ADR, not in the issue — does it describe pulled content overriding rcode's own rules; the entire document is about *freshness* and *delivery mechanism* (live query vs. static file), not about *precedence in a conflict*.

**Conclusion on intent:** even the original design documents describe brain content as *additional* institutional context delivered into a project — never as a rule that supersedes rcode's own built-in standards. "Priority over rcode's own rules" appears nowhere in the shipped code, the workflows, the ADR, or the three tracking issues. This detail exists only in the project owner's memory of the feature, not in anything that was ever built or written down.

## Bottom line for the project owner

- The **pull/sparse-checkout mechanism** you remember building is real and still works today (`rcode-tools brain pull`).
- The **only content that has ever actually flowed into a workflow's execution** is `rcode`'s own in-repo best-practices (the `repo: self` source), included as ordinary `<required_reading>` alongside other reference files — not as an override layer.
- The **external-org sources** (`rcode-github-standards`, `rcode-docs`) have never had real URLs; issue #162, which was supposed to supply them, was explicitly closed as abandoned/not-planned after the v4 rebrand.
- **A "give external content priority over rcode's own rules on conflict" mechanism was never implemented, and no design document (including the draft MCP ADR) ever specified one.** This should be treated as something that was only ever informally intended, not something to look for a bug in.
