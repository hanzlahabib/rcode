# Step 1: Target Directory

## Goal
Determine the target directory and mode (greenfield or brownfield).

## Brownfield Detection (`--here` flag)

Check whether the user invoked with `--here`, said "scaffold here", "add rcode to
this project", "initialize rcode here", or any equivalent phrasing.

If **brownfield mode** is detected:
- Set `{brownfield_mode}` = `true`
- Set `{target_path}` = current working directory (`pwd`)
- Set `{project_name}` = basename of current directory
- Inform the user:
  > "Brownfield mode — I'll add rcode to the current directory `{target_path}` without touching any existing files."
- Skip the name prompt and proceed directly to `step-02-safety.md`.

## Greenfield Mode (default)

- If the user already provided a project name or path, use it.
- If not, ask: **"What should the project be called? I'll create a folder with that name in the current directory."**
- Accept either a bare name (`my-app`) or a full path (`/home/user/projects/my-app`).
- If bare name: resolve to `{cwd}/{name}` where `{cwd}` is the directory the user is currently in.
- Store resolved path as `{target_path}` and project name as `{project_name}`.
- Set `{brownfield_mode}` = `false`.
- **Security:** Reject paths containing `..` traversal sequences before proceeding:
  ```bash
  case "{target_path}" in
    *..* ) echo "Error: path contains traversal sequence — choose a different location"; exit 1 ;;
  esac
  ```

## Output
Confirm back to the user:
> "Got it — I'll scaffold into `{target_path}`. Let me check if that folder is ready..."

Then proceed to `step-02-safety.md`.
