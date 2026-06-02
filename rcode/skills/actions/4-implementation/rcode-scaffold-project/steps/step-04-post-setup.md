# Step 4: Post-Setup

## Goal
Finalize the scaffolded project and guide the user on next steps.

## Actions

### 1. Rename placeholders (if template has them)
- Check if template has a placeholder project name (e.g., `my-app`, `project-name`, `template` in package.json, README, etc.)
- If found: offer to replace with `{project_name}` automatically.
- Ask: "I found placeholder names in package.json and README.md. Want me to replace them with `{project_name}`?"
- Only replace if user confirms.

### 2. Install dependencies (if applicable)
- Check if `package.json` exists.
- If yes, ask: "Should I run `pnpm install` to install dependencies?"
- Use **pnpm** always (never npm or yarn).
- Run only if user confirms.

### 3. Summary
Print a clean summary based on mode:

**Greenfield:**
```
✅ Project scaffolded successfully!

📁 Location:  {target_path}
📦 Template:  github.com/rcode-om/template (latest)
🔀 Git:       Fresh repo initialized with initial commit

Next steps:
  cd {target_path}
  pnpm install       ← if not done already
  pnpm dev           ← to start development server
```

**Brownfield (`--here` mode):**
```
✅ rcode initialized in existing project!

📁 Location:  {target_path}
🗂  Added:     .rcode/config.json
📝 Note:      No existing files were modified.

Next steps:
  /rcode-init         ← configure rcode for this project
  /rcode-new-project  ← design project requirements & roadmap
```

### 4. Suggest next rcode skills
Offer relevant follow-up actions:
> "What would you like to do next?
> - **Generate project context** → `rcode-generate-project-context`
> - **Create a PRD** → `rcode-create-prd`
> - **Set up architecture** → `rcode-create-architecture`"

## Done
Skill execution complete.
