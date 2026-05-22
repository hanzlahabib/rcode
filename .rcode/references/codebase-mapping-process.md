# Codebase Mapping Process

Loaded by `rihal-codebase-mapper` (Dalil) via `@-include`. Contains the full
four-step mapping process: parsing focus area, discovering source roots,
exploring the codebase with focus-specific bash commands, writing documents
with mandatory Scan Scope section, and returning confirmation.

---

<step name="parse_focus">
Read the focus area from your prompt. It will be one of: `tech`, `arch`, `quality`, `concerns`.

Based on focus, determine which documents you'll write:
- `tech` → STACK.md, INTEGRATIONS.md
- `arch` → ARCHITECTURE.md, STRUCTURE.md
- `quality` → CONVENTIONS.md, TESTING.md
- `concerns` → CONCERNS.md
</step>

<step name="discover_source_roots">
**MANDATORY FIRST STEP — never skip.** Do not assume `src/` exists or that the project is single-language. Discover the real layout before searching anything.

```bash
# 1. Top-level source roots (excluding vendored / build / VCS / cache)
find . -maxdepth 1 -type d \
  -not -name '.' -not -name '.git' -not -name 'node_modules' \
  -not -name '.next' -not -name 'dist' -not -name 'build' \
  -not -name '__pycache__' -not -name '.venv' -not -name 'venv' \
  -not -name '.cache' -not -name 'coverage' \
  | sort

# 2. Language detection from manifests at any depth (up to 3 levels)
find . -maxdepth 3 \
  \( -name 'package.json' -o -name 'pyproject.toml' -o -name 'requirements.txt' \
     -o -name 'Cargo.toml' -o -name 'go.mod' -o -name 'Gemfile' -o -name 'pom.xml' \
     -o -name 'build.gradle' -o -name 'composer.json' \) \
  -not -path '*/node_modules/*' -not -path '*/.venv/*' 2>/dev/null

# 3. Monorepo detection
ls pnpm-workspace.yaml turbo.json nx.json lerna.json rush.json 2>/dev/null
cat package.json 2>/dev/null | grep -E '"workspaces"' -A 5
```

Record the result as `$SOURCE_ROOTS` (list of dirs to search) and `$LANGUAGES` (set of detected languages). These drive every subsequent grep — never grep only `src/` unless `src/` is the only discovered root.

**If a topic phrase was passed in your prompt** (e.g. "Sentry instrumentation", "GraphQL resolvers", "Redis caching"), run a literal sweep across ALL discovered roots BEFORE focus-specific exploration:

```bash
TOPIC="<phrase from prompt>"
for ROOT in $SOURCE_ROOTS; do
  echo "=== $ROOT ==="
  grep -rli "$TOPIC" "$ROOT" \
    --include='*.py' --include='*.ts' --include='*.tsx' --include='*.js' \
    --include='*.jsx' --include='*.go' --include='*.rs' --include='*.rb' \
    2>/dev/null | head -50
done
```

The file list this returns becomes your PRIMARY analysis target. Do not narrow it to one subdirectory based on assumed conventions.
</step>

<step name="explore_codebase">
Explore the codebase thoroughly for your focus area, iterating across ALL `$SOURCE_ROOTS` discovered above. Adapt globs to `$LANGUAGES` — if Python is in the language set, search `*.py`; if TypeScript, `*.ts`/`*.tsx`; etc.

**For tech focus:**
```bash
# Package manifests across ALL roots (already gathered in discover_source_roots)
# Config files (list only - DO NOT read .env contents)
ls -la *.config.* tsconfig.json .nvmrc .python-version 2>/dev/null
ls .env* 2>/dev/null  # Note existence only, never read contents

# SDK/API imports — iterate over every source root
for ROOT in $SOURCE_ROOTS; do
  grep -rE "^(import|from) (.*stripe|.*supabase|.*aws|.*sentry|.*@)" "$ROOT" \
    --include='*.py' --include='*.ts' --include='*.tsx' --include='*.js' 2>/dev/null | head -30
done
```

**For arch focus:**
```bash
# Directory tree of each source root
for ROOT in $SOURCE_ROOTS; do
  find "$ROOT" -type d \
    -not -path '*/node_modules/*' -not -path '*/.venv/*' -not -path '*/__pycache__/*' \
    | head -40
done

# Entry points across languages
ls src/index.* src/main.* src/app.* src/server.* app/page.* 2>/dev/null
find . -maxdepth 4 -name 'main.py' -o -name '__main__.py' -o -name 'manage.py' \
  -o -name 'app.py' -o -name 'wsgi.py' -o -name 'asgi.py' \
  -not -path '*/.venv/*' -not -path '*/node_modules/*' 2>/dev/null
```

**For quality focus:**
```bash
ls .eslintrc* .prettierrc* eslint.config.* biome.json ruff.toml .flake8 mypy.ini pyrightconfig.json 2>/dev/null

# Tests across all roots and languages
for ROOT in $SOURCE_ROOTS; do
  find "$ROOT" \( -name '*.test.*' -o -name '*.spec.*' -o -name 'test_*.py' -o -name '*_test.py' \) \
    -not -path '*/node_modules/*' -not -path '*/.venv/*' 2>/dev/null | head -20
done
```

**For concerns focus:**
```bash
# TODO/FIXME comments — search every root, every primary language
for ROOT in $SOURCE_ROOTS; do
  grep -rnE "TODO|FIXME|HACK|XXX" "$ROOT" \
    --include='*.py' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    --include='*.go' --include='*.rs' \
    -not -path '*/node_modules/*' 2>/dev/null | head -50
done

# Large files (potential complexity) — language-aware
for ROOT in $SOURCE_ROOTS; do
  find "$ROOT" \( -name '*.py' -o -name '*.ts' -o -name '*.tsx' -o -name '*.go' \) \
    -not -path '*/node_modules/*' -not -path '*/.venv/*' \
    | xargs wc -l 2>/dev/null | sort -rn | head -10
done

# If the orchestrator passed a topic phrase, the file list from discover_source_roots
# is your primary input — analyze each of those files directly.
```

Read key files identified during exploration. Use Glob and Grep liberally — but always iterate across `$SOURCE_ROOTS`, never assume `src/` is the only place code lives.
</step>

<step name="write_documents">
Write document(s) to `.rihal/codebase/` using the templates below.

**Document naming:** UPPERCASE.md (e.g., STACK.md, ARCHITECTURE.md)

**Template filling:**
1. Replace `[YYYY-MM-DD]` with current date
2. Replace `[Placeholder text]` with findings from exploration
3. If something is not found, use "Not detected" or "Not applicable"
4. Always include file paths with backticks

**ALWAYS use the Write tool to create files** — never use `Bash(cat << 'EOF')` or heredoc commands for file creation.

**MANDATORY — Scan Scope section.** Every document you write must open with this block before any other content. The orchestrator will reject documents missing it.

```markdown
## Scan Scope

**Source roots discovered:** `<list from discover_source_roots step 1>`
**Source roots searched:** `<subset actually iterated by greps>`
**Source roots NOT searched:** `<any discovered root not searched>` — Reason: `<vendored / out-of-scope / time / etc.>`
**Languages detected:** `<from manifests, e.g. Python 3.11, TypeScript 5.x>`
**Topic phrase (if any):** `<literal phrase from orchestrator prompt, or "none">`
**Topic-phrase sweep result:** `<file count + 5-10 sample paths from grep -rl, or "n/a">`

**Blind-spot acknowledgment:** If you searched only a subset (e.g. only `src/` while `backend/` and `services/` exist), state it explicitly here. If you found ZERO matches for a topic phrase, run a second sweep with case-insensitive `grep -rli` and a third with the canonical SDK/package name (e.g. `sentry_sdk`, `sentry-sdk`, `@sentry/`) before claiming "not present" — false negatives at this step poison every downstream phase.
```

If the topic-phrase sweep returns matches in a directory you did not analyze in depth, you MUST either (a) extend the analysis to cover it, or (b) explicitly note in the document body which findings might exist there but were not investigated. Never silently exclude a directory that contains topic-phrase hits.
</step>

<step name="return_confirmation">
Return a brief confirmation. DO NOT include document contents.

Format:
```
Codebase mapping complete. Documents written to .planning/codebase/.
```

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Full detailed guide (tool priorities, output formats, templates, pitfalls, examples) | `.rihal/agents-rules/codebase-mapper/detailed-guide.md` |

Read only when the current task needs the detail. Don't preemptively load.
</step>
