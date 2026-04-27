# Glossary — `rihal-code`

Domain terms specific to this project: internal names, acronyms, business concepts. Prevents "what does X mean again?" thrash. Add a term any time someone asks about it twice.

---

## Format

`**Term**` — definition. _(optional: where it lives in code)_

---

## Terms

<!-- Add alphabetically -->

**ADR** — Architecture Decision Record. Lightweight in `decisions.md`; heavier ones get a dedicated file in `docs/adr/`.

**Brain** (`.rihal/brain/`) — institutional knowledge pulled from upstream Rihal repos on install. See `.rihal/brain/README.md`.

**Brief** — closing one-line summary returned by Dalil; piped into `.planning/codebase/CHANGELOG.md` in refresh mode.

**Council** — synonym for Majlis when invoked through the slash command (`/rihal-council`).

**Dalil** (دليل) — the codebase scout persona. Reads the repo and reports honestly, with a mandatory Scan Scope block.

**Diwan** (ديوان) — the read-only dashboard server (`server/dashboard.js`) at port 7717. Renders state from `.rihal/`, `.planning/`, and `.rihal/memory/`.

**Distillate** — token-optimised, lossless compression of a document or set of documents, designed for fast LLM context loading. See `rihal-distillator` skill.

**Foreman pattern** — the clone-website skill's approach: extract a section, write a spec, dispatch a builder, move to the next section. Inspection and construction run in parallel.

**Majlis** (مجلس) — the consulting council that convenes specialists for a multi-domain question and synthesises a recommendation with explicit dissent.

**Memory Bank** (`.rihal/memory/`) — the structured, checked-in persistent project memory layer. Read first by every agent session.

**Path B** — the decision (2026-04-26) to keep skill folder names `rihal-*` for installer compatibility while letting the user-facing slash brand surface use `/rcode:*` for new branded skills.

**Phase** — a unit of work in `1-analysis / 2-plan / 3-solutioning / 4-implementation` flow. Reflected in `rihal/skills/actions/` folder structure.

**Scan Scope** — the mandatory header block Dalil writes on every produced document, declaring which source roots were searched and which weren't.

**SKILL.md** — the markdown contract for a skill. YAML frontmatter (name, description, triggers) + body. Lives at `rihal/skills/{actions,agents,core}/<name>/SKILL.md`.

**team.yaml** — the registry mapping every agent id to its file_path and skill_path. Read by Diwan and council-panel.cjs. Has 4 sections: `agents:`, `utility_agents:`, `routing:`, `tactical_agents:`.

**workflow** — step-by-step orchestration logic for a slash command. Lives at `rihal/workflows/<name>.md`. Referenced by command files via `@`-include.

