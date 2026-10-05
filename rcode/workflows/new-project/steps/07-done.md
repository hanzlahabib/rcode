# new-project - step 07: Done banner, next-up routing, output, success criteria

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 9. Done

Present completion summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[Project Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.planning/PROJECT.md`      |
| Config         | `.rcode/config.yaml`        |
| Research       | `.planning/research/`       |
| Requirements   | `.planning/REQUIREMENTS.md` |
| Roadmap        | `.planning/ROADMAP.md`      |
| Project guide  | `$INSTRUCTION_FILE`         |

**[N] phases** | **[X] requirements** | Ready to build ✓
```

> **Verify before planning:**
> (a) `.planning/ROADMAP.md` contains real `## Phase N` headings — open it and add them if the file is still a stub.
> (b) Run `npx rcode state sync --from-disk` to populate `.rcode/state.json` with the phases array so downstream commands (`/rcode-plan`, `/rcode-execute-sprint`, etc.) can read the phase list.

**Next step — paste this to start planning:**
> /rcode-plan 1 — [Phase 1 Name from ROADMAP.md]

**If auto mode:**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → DISCUSS PHASE 1        ║
╚══════════════════════════════════════════╝
```

Exit skill and invoke `/rcode-discuss-phase 1 --auto`.

**If interactive mode:**

Check if Phase 1 has UI indicators in ROADMAP.md:

```bash
PHASE1_SECTION=$(sed -n '/^## Phase 1/,/^## Phase /p' .planning/ROADMAP.md)
PHASE1_HAS_UI=$(echo "$PHASE1_SECTION" | grep -qiE "UI|interface|frontend|component|layout|page|screen|view|form|dashboard|widget" && echo "true" || echo "false")
```

**If Phase 1 has UI:**

```
───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase 1: [Phase Name]** — [Goal from ROADMAP.md]

/clear then:

/rcode-discuss-phase 1 — gather context and clarify approach

---

**Also available:**
- /rcode-ui-phase 1 — generate UI design contract (recommended for frontend phases)
- /rcode-plan 1 — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

**If Phase 1 has no UI:**

```
───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase 1: [Phase Name]** — [Goal from ROADMAP.md]

/clear then:

/rcode-discuss-phase 1 — gather context and clarify approach

---

**Also available:**
- /rcode-plan 1 — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

</process>

<output>

- `.planning/PROJECT.md`
- `.rcode/config.yaml` (updated in place)
- `.planning/research/` (if research selected)
  - `STACK.md`
  - `FEATURES.md`
  - `ARCHITECTURE.md`
  - `PITFALLS.md`
  - `SUMMARY.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `$INSTRUCTION_FILE` (`AGENTS.md` for Codex, `CLAUDE.md` for all other runtimes)

</output>

<success_criteria>

- [ ] .planning/ directory created
- [ ] Git repo initialized
- [ ] Brownfield detection completed
- [ ] Deep questioning completed (threads followed, not rushed)
- [ ] PROJECT.md captures full context → **committed (or noted as gitignored)**
- [ ] config.json has workflow mode, granularity, parallelization → **committed**
- [ ] Research completed (if selected) — 4 parallel agents spawned → **committed**
- [ ] Requirements gathered (from research or conversation)
- [ ] User scoped each category (v1/v2/out of scope)
- [ ] REQUIREMENTS.md created with REQ-IDs → **committed**
- [ ] rcode-roadmapper spawned with context
- [ ] Roadmap files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] ROADMAP.md created with phases, requirement mappings, success criteria
- [ ] STATE.md initialized
- [ ] REQUIREMENTS.md traceability updated
- [ ] `$INSTRUCTION_FILE` generated (if missing) with rcode workflow guidance
- [ ] User knows next step is `/rcode-discuss-phase 1`
- [ ] No `git push` issued by the workflow (per AGENTS.md)

**Atomic commits:** Each phase commits its artifacts immediately. If context is lost, artifacts persist. When `.planning/` is gitignored, files are written but commit is skipped gracefully.

</success_criteria>

## Next Up

- `/rcode-discuss-phase` — discuss the first phase before planning begins
- `/rcode-plan` — plan the first phase of the new project

Next: end of workflow.
