# Workflow: rihal:generate-project-context

<purpose>
Scan codebase and generate .rihal/project-context.md with: technology stack summary, key architectural conventions, file structure map, dependency list, and open/undecided architectural questions.
</purpose>

<available_agent_types>
- `rihal-codebase-mapper` — codebase analysis agent
</available_agent_types>

## Step 0 — Initialize

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init generate-project-context "$ARGUMENTS")
```

Parse:
- `flags.depth` — shallow|normal|deep (default: normal)
- `context_path` — `.rihal/project-context.md` (output location)

## Step 1 — Scan Codebase

**Identify tech stack:**
```bash
node .rihal/bin/rihal-tools.cjs classify-tech --entire-project
```

Extract:
- Language(s) (JavaScript, Python, Go, Rust, etc.)
- Framework(s) (React, Next.js, Express, Django, etc.)
- Package manager (npm, pnpm, yarn, pip, cargo, etc.)
- Build tool(s) (Webpack, Vite, Next.js, etc.)
- Testing framework(s) (Jest, Vitest, pytest, etc.)
- Database(s) (PostgreSQL, MongoDB, Redis, etc.)
- Deployment target(s) (Vercel, AWS, Docker, etc.)

**Map file structure:**
```bash
find {project-root} -type f -name "*.json" -o -name "*.md" -o -name "*.yaml" \
  | grep -E "(package\.json|tsconfig|vite\.config|next\.config|docker|terraform)" \
  | head -20
```

Identify key directories:
- `/src` — source code
- `/pages` or `/app` — routes/pages
- `/tests` or `/__tests__` — tests
- `/lib` or `/utils` — utilities
- `/components` — UI components
- `/api` — API endpoints
- `/config` — configuration
- `/docs` — documentation

## Step 2 — Spawn Context Generator

Spawn `rihal-codebase-mapper` subagent:

```
Task tool call:
  subagent_type: "rihal-codebase-mapper"
  description: "Generate project-context.md"
  prompt: |
    Generate a project-context.md file with the following sections:
    
    ## 1. Stack Summary
    - Languages and versions
    - Core frameworks/libraries
    - Build tooling
    - Testing framework
    - Database(s)
    - CI/CD / Deployment
    
    ## 2. Key Architectural Conventions
    - Naming conventions (files, functions, variables)
    - Folder structure conventions
    - Code organization patterns (separation of concerns)
    - Key libraries/packages and why they're used
    - Authentication/authorization approach
    - State management approach (if frontend)
    
    ## 3. File Structure Map
    {depth_appropriate_tree}
    
    ## 4. Dependency Overview
    - Core dependencies (top 10 by usage)
    - Development dependencies
    - Pinned/locked versions and why
    
    ## 5. Open Decisions / Undecided
    - Architectural decisions still being evaluated
    - Known tech debt or refactoring needs
    - Questions for architects
    
    Depth level: {depth}
    
    Write to: {context_path}
```

## Step 3 — Auto-inject into Resume-Work

After generation, check if resume-work.md exists. If yes, auto-inject reference:

In resume-work.md, add at top of Step 1:
```
If .rihal/project-context.md exists, load it:

@.rihal/project-context.md
```

This makes context available to all subsequent workflows without manual loading.

## Step 4 — Output Summary

Print:
```
✅ Project context generated: {context_path}

Includes:
  • Stack Summary ({language}, {framework}, etc.)
  • Architectural Conventions
  • File Structure Map ({depth})
  • Dependency Overview
  • Open Decisions

This context is auto-loaded by /rihal:resume-work and other discovery workflows.
```

## Success Criteria

- project-context.md created with all 5 sections
- Stack accurately identified
- File structure map complete
- Open questions documented
- Auto-injected into resume-work.md if present

## On Error

- If codebase too large: limit to normal depth
- If tech unrecognized: mark as "custom/unknown"
- If package.json missing: scan for alternative manifests (pyproject.toml, go.mod, Cargo.toml, etc.)
