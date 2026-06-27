---
name: rcode-lazy
description: "Lazy senior dev lens — force the simplest solution that actually works before any code is written (YAGNI, stdlib first, one line before fifty)"
argument-hint: "[challenge or code to simplify] [--intensity=lite|full|ultra]"
allowed-tools:
  - Read
  - AskUserQuestion
  - Skill
---

Invoke the `rcode-lazy` skill (via the Skill tool) and apply it to: $ARGUMENTS

`rcode-lazy` is the always-on "lazy senior dev" lens — it forces the simplest
solution that actually works (YAGNI, stdlib before custom code, native platform
features before dependencies, one line before fifty) before any code is written.
Pass `--intensity=lite|full|ultra` through if the user provided it; default is `full`.
