# Step 3b: Brownfield Initialization

## Goal
Add rcode structure to an existing project without cloning the template.
No existing files are ever modified.

## What Gets Created

Only the following paths are written. If any already exist, skip and report:

```
{target_path}/
└── .rcode/
    └── config.json      ← project config (name, language)
```

## Execution

### 1. Create `.rcode/` directory
```bash
mkdir -p "{target_path}/.rcode"
```

### 2. Write `.rcode/config.json`
Create with sensible defaults derived from the existing project:
```json
{
  "project_name": "{project_name}",
  "communication_language": "English",
  "created_at": "{iso_date}",
  "mode": "brownfield"
}
```
- Detect language preference from existing README or package.json if present.
- Set `{iso_date}` from the current date.

### 3. Detect existing project metadata (offer, don't force)
- If `package.json` exists: read `name` field and offer to use it as `{project_name}` if different.
- If `README.md` exists: acknowledge it and skip creating a new one.

## Progress Updates
Narrate each step:
- "Creating `.rcode/` directory..."
- "Writing `.rcode/config.json`..."
- "Done! Proceeding to post-setup..."

## Error Handling

### `.rcode/` creation fails (permissions)
- Report: "Couldn't create `.rcode/` — check directory permissions."
- Do NOT retry automatically.

## Output
Confirm to the user:
> "rcode structure added to `{target_path}`. No existing files were modified."

Then proceed to `step-04-post-setup.md`.
