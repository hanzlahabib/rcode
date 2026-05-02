# Auto-Init Guard

Run this check at the very start of any workflow that needs project state.

## Step: Detect project initialization

```bash
test -f .rihal/config.yaml && echo "rihal-ready" || echo "rihal-not-initialized"
```

**If `rihal-ready`:** continue with the workflow normally.

**If `rihal-not-initialized`:** the user has never set up Rihal for this project. Do NOT fail or continue blindly. Run the project init flow inline before proceeding:

---

### Inline init flow (when config.yaml is missing)

Tell the user:

```
Rihal isn't configured for this project yet. Let me set it up — takes 30 seconds.
```

**1. Bootstrap local tooling** — copy bin and workflows from the global install:

```bash
GLOBAL_RIHAL="$HOME/.rihal"
if [ -d "$GLOBAL_RIHAL/bin" ]; then
  mkdir -p .rihal/bin .rihal/workflows .rihal/references
  cp "$GLOBAL_RIHAL/bin/rihal-tools.cjs" .rihal/bin/ 2>/dev/null || true
  # workflows and references are read from ~/.rihal at runtime via @.rihal/ resolution
fi
```

**2. Ask the 5 config questions** using AskUserQuestion:

| # | Question | Options | Default |
|---|----------|---------|---------|
| 1 | Your name (what Rihal calls you) | free text | `$USER` |
| 2 | Language for agent responses | English / Arabic / Urdu / Roman Urdu | English |
| 3 | Mode (how Rihal handles decision gates) | `guided` / `yolo` | guided |
| 4 | Model profile (cost vs quality) | `quality` / `balanced` / `budget` | balanced |
| 5 | Commit planning artifacts to git? | yes / no | yes |

**3. Write `.rihal/config.yaml` directly** (no rihal-tools needed — plain Bash):

```bash
mkdir -p .rihal
cat > .rihal/config.yaml << 'YAML'
# Rihal project config — edit any time
user_name: "{name}"
project_name: "{basename_of_cwd}"
communication_language: "{lang}"
mode: "{mode}"
model_profile: "{profile}"
commit_planning: {commit_planning_bool}
rihal_source_path: ""
workflow:
  research_by_default: false
  plan_checker: true
  post_execute_gates: true
  ui_safety_gate: true
git:
  branching_strategy: "none"
YAML
```

**4. Seed `.rihal/state.json` and `.planning/` structure**:

```bash
mkdir -p .planning/phases .planning/council-sessions .rihal/context

# state.json
cat > .rihal/state.json << 'JSON'
{"project":"{project_name}","phase":null,"sprint":null,"sessions":[],"initialized":"now"}
JSON

# context stubs
echo "# Active Context\n\n_Run /rihal-init for full setup._" > .rihal/context/active.md
echo "# Project Brief\n\n_Run /rihal-init for full setup._" > .rihal/context/project-brief.md
```

**5. Tell the user:**

```
✓ Rihal configured for this project.

Config saved to .rihal/config.yaml — edit any time.
Run /rihal-init for a full project scan and context setup.

Continuing with your original request...
```

**6. Continue** with the original workflow as if it had been initialized from the start.

---

## Notes

- This guard is **non-blocking** — it asks questions but does not stop the session; once config is written it resumes the original request automatically.
- If `AskUserQuestion` is unavailable (non-interactive mode), use all defaults and skip the questions.
- If the bootstrap `cp` fails (global rihal not found), print a warning and attempt to continue — some workflows work without local rihal-tools if they only need config.
- On **subsequent runs**, the guard exits immediately (config exists) with zero overhead.
