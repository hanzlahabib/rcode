# Step 3a: Clone Template (Greenfield Only)

> **Brownfield mode:** If `{brownfield_mode}` is `true`, skip this step entirely
> and proceed to `step-03-brownfield.md` instead.

## Goal
Clone the official rcode template repository fresh from GitHub into `{target_path}`.

## Template Source
```
https://github.com/rcode-om/template
```

This is the single source of truth. Never use a cached local copy.

## Execution

Run the following commands in sequence:

```bash
# 1. Clone the template repo
git clone https://github.com/rcode-om/template "{target_path}"

# 2. Remove template's git history (fresh start for the new project)
rm -rf "{target_path}/.git"

# 3. Initialize a clean git repo
cd "{target_path}" && git init

# 4. Stage everything
git add .

# 5. Initial commit
git commit -m "chore: scaffold from rcode template"
```

## Error Handling

### Clone fails (network / auth)
- Report: "Couldn't reach GitHub. Please check your internet connection or GitHub access, then tell me to try again."
- Do NOT retry automatically.

### git not available
- Report: "Git isn't installed or not in PATH. Please install git and try again."

## Progress Updates
Narrate each step to the user as it runs:
- "Cloning from rcode-om/template..."
- "Stripping template history..."
- "Initializing fresh git repo..."
- "Done! Proceeding to post-setup..."

Then proceed to `step-04-post-setup.md`.
