# rcode/brain — The rcode Context Layer

This directory is populated on install (and on every `/rcode-update`) by `rcode-tools brain pull`. Its job is simple: pull rcode's institutional knowledge — PR/commit/issue standards, architecture decisions, internal guides — into every rcode user's project so their AI assistant already knows how rcode builds.

## Structure

```
rcode/brain/
├── sources.yaml           # upstream repo configuration (see below)
├── rcode-github/          # PR/commit/issue standards from the rcode GitHub org
├── rcode-docs/            # architecture, guides, playbooks from the rcode docs repo
└── best-practices/        # in-repo best practices, pulled from rcode/skills/_shared/
```

## Sources

Content is pulled from three kinds of source:

1. **External rcode repos** — GitHub org + docs repo. URLs are placeholders until M5 / issue #162 lands with the real addresses. Once filled, `brain pull` uses `git` sparse-checkout to fetch only the paths listed in `sources.yaml`.
2. **Self** — the special `repo: self` entry points back at this repo, so in-tree best-practices land under `rcode/brain/best-practices/` on every install.
3. **Cached** — fetched content is cached locally with a short TTL (configurable per source, default 6h). `brain pull` respects the cache; pass `--fresh` to force a re-clone.

## Update policy

- Local edits to any file under `rcode/brain/` are **overwritten** on every `/rcode-update`. rcode treats the upstream sources as the single source of truth. If the rcode standard needs to change, the change happens upstream — then every rcode user benefits.
- Per-invocation: `node .rcode/bin/rcode-tools.cjs brain pull`.
- Per project: runs automatically as part of `npx rcode install`.

## Privacy

If any source is private, `brain pull` uses the user's `gh auth` token (set `defaults.private: true` in `sources.yaml`). If `gh auth status` fails, the pull skips that source with a clear message instead of hanging.

## Status — v2.0

- `sources.yaml` is scaffolded with placeholder URLs.
- `brain pull` subcommand is wired in `rcode/bin/rcode-tools.cjs`.
- Real URLs arrive with issue #162 (M5).
- Live MCP replacement lands in v3.0 (issue #163 / design doc at `docs/adr/mcp-design.md`).
