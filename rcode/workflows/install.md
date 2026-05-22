# Workflow: rcode-install

<purpose>
Install a rcode module into the current project. Modules are capability bundles (agents + workflows + commands + references). This workflow validates the module exists, checks dependencies, runs the installer, and updates the manifest.
</purpose>

## Step 0 — Validate module name

```bash
MODULES=$(node .rcode/bin/rcode-tools.cjs module list)
```

Parse JSON. If the requested module is not in the available list, print:
```
Unknown module: {name}
Available modules: core, execution
```
And stop.

## Step 1 — Check if already installed

```bash
INSTALLED=$(node .rcode/bin/rcode-tools.cjs module installed)
```

If the requested module is already in the installed list:
```
Module '{name}' is already installed.
```
And stop.

## Step 2 — Check dependencies

```bash
CHECK=$(node .rcode/bin/rcode-tools.cjs module check-requires {name})
```

If `ok` is false:
```
Module '{name}' requires '{missing_module}' to be installed first.
Run: /rcode-install {missing_module}
```
And stop.

## Step 3 — Run installer

The installer needs to be called with the `--module` flag. Detect the rcode package location:

```bash
npx @hanzlaa/rcode install --module {name} --force --yes
```

## Step 4 — Print summary

```
✓ Module installed: {name}
   {description from module manifest}

New commands available:
  /rcode-{command} — {description}
```

## Success Criteria

- [ ] Module name is validated against available modules
- [ ] Module is not already installed
- [ ] Dependencies are checked and satisfied
- [ ] Installer runs without errors
- [ ] User sees confirmation with new commands available

## On Error

- **Unknown module:** list available modules.
- **Already installed:** inform user, no-op.
- **Missing dependencies:** list missing modules, tell user to install them first.
- **Installer not found:** tell user to install rcode package.
- **Installation fails:** report the specific error and suggest manual installation steps
