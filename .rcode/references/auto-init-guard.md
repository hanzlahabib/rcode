# Auto-Init Guard

Run this check at the very start of any workflow that needs project state.

## Step: Detect project initialization

```bash
test -f .rcode/config.yaml && echo "rcode-ready" || echo "rcode-not-initialized"
```

**If `rcode-ready`:** continue with the workflow normally.

**If `rcode-not-initialized`:** the user has never set up rcode for this project. Do NOT fail or continue blindly. Run the project init flow inline before proceeding:

---

### Inline init flow (when config.yaml is missing)

Tell the user:

```
Rihal isn't configured for this project yet. Let me set it up — takes 30 seconds.
```

**1. Bootstrap local tooling** — copy bin from the global install:

```bash
GLOBAL_RIHAL="$HOME/.rcode"
TOOLS_SRC="$GLOBAL_RCODE/bin/rcode-tools.cjs"

if [ ! -f "$TOOLS_SRC" ]; then
  echo "ERROR: Global rcode tools not found at $TOOLS_SRC"
  echo "Run: npm install -g @hanzlaa/rcode"
  echo "Then retry this command."
  # STOP — do not continue without tools; writing config.yaml alone is not enough
  exit 1
fi

mkdir -p .rcode/bin
cp "$TOOLS_SRC" .rcode/bin/rcode-tools.cjs
if [ $? -ne 0 ]; then
  echo "ERROR: Could not copy rcode-tools.cjs to .rcode/bin/ (permission denied?)"
  exit 1
fi
```

Note: workflows and references are resolved from `~/.rcode/` at runtime — only the bin needs to be local.

**2. Ask the 5 config questions** using AskUserQuestion:

| # | Question | Options | Default |
|---|----------|---------|---------|
| 1 | Your name (what Rihal calls you) | free text | `$USER` |
| 2 | Language for agent responses | English / Arabic / Urdu / Roman Urdu | English |
| 3 | Mode (how Rihal handles decision gates) | `guided` / `yolo` | guided |
| 4 | Model profile (cost vs quality) | `quality` / `balanced` / `budget` | balanced |
| 5 | Commit planning artifacts to git? | yes / no | yes |

**3. Write `.rcode/config.yaml` directly** (no rcode-tools needed — plain Bash):

```bash
mkdir -p .rcode
cat > .rcode/config.yaml << 'YAML'
# rcode project config — edit any time
user_name: "{name}"
project_name: "{basename_of_cwd}"
communication_language: "{lang}"
mode: "{mode}"
model_profile: "{profile}"
commit_planning: {commit_planning_bool}
rcode_source_path: ""
workflow:
  research_by_default: false
  plan_checker: true
  post_execute_gates: true
  ui_safety_gate: true
git:
  branching_strategy: "none"
YAML
```

**4. Seed `.rcode/state.json` and `.planning/` structure**:

```bash
mkdir -p .planning/phases .planning/council-sessions .rcode/context

# state.json
cat > .rcode/state.json << 'JSON'
{"project":"{project_name}","phase":null,"sprint":null,"sessions":[],"initialized":"now"}
JSON

# context stubs
echo "# Active Context\n\n_Run /rcode-init for full setup._" > .rcode/context/active.md
echo "# Project Brief\n\n_Run /rcode-init for full setup._" > .rcode/context/project-brief.md
```

**5. Tell the user:**

```
✓ Rihal configured for this project.

Config saved to .rcode/config.yaml — edit any time.
Run /rcode-init for a full project scan and context setup.

Continuing with your original request...
```

**6. Continue** with the original workflow as if it had been initialized from the start.

---

## Notes

- This guard is **non-blocking** — it asks questions but does not stop the session; once config is written it resumes the original request automatically.
- If `AskUserQuestion` is unavailable (non-interactive mode), use all defaults and skip the questions. Always derive `project_name` from `basename $(pwd)` — never leave it as a placeholder.
- If the bootstrap `cp` fails (global rcode not found), print a warning and attempt to continue — some workflows work without local rcode-tools if they only need config.
- On **subsequent runs**, the guard exits immediately (config exists) with zero overhead.
