---
name: rihal-source-truth
description: Cite official documentation before writing or recommending any framework, library, or API code. Use when working with Next.js, React, Strapi, Postgres, or any third-party tool. Forces the agent to fetch the upstream doc page (or local docs in `node_modules`) and quote the version-specific API rather than relying on training-data memory. Catches "the API changed in v15" foot-guns.
triggers:
  - "cite the docs"
  - "official source"
  - "verify the api"
  - "what does the doc say"
  - "rtfm"
  - "version specific"
  - "from the source"
  - "source-driven"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Training data goes stale. APIs change between major versions. This skill forces a doc-fetch step before any code that uses a third-party API, so the recommendation is grounded in the version actually installed in this project, not in what was true two years ago.

## Workflow

1. **Detect the version** of the relevant library from `package.json`, `pyproject.toml`, `Cargo.toml`, or a similar manifest.
2. **Fetch the doc page** for the API in question — preference order:
   1. Local `node_modules/<lib>/README.md` and `.d.ts` typings (most authoritative for what's installed)
   2. Upstream docs site for the matching version (e.g. `https://nextjs.org/docs/16/...`)
   3. The library's GitHub release notes for the major version
3. **Quote the version-specific shape** in the output. Include the source URL or file path.
4. **Compare to project usage.** If the project is using a deprecated pattern, flag it but don't auto-rewrite — call it out and let the user decide.
5. **Write code** referencing only what the doc shows. No "I think this method is called X" without confirmation.
6. **Note the doc source in the commit message** when the implementation depends on a specific API version (e.g. `feat(api): use Next.js 16 unstable_after — see https://...`).

## Hard-listed sources for the rcode-default stack

| Layer | Authoritative source |
|---|---|
| Next.js | `https://nextjs.org/docs/<version>/` |
| React | `https://react.dev/reference/react` |
| Strapi | `https://docs.strapi.io/` (and local `node_modules/@strapi/`) |
| Postgres | `https://www.postgresql.org/docs/<version>/` |
| Three.js | `https://threejs.org/docs/` |
| Sentry | `https://docs.sentry.io/platforms/javascript/` |
| Temporal | `https://docs.temporal.io/` |
| Helm / K8s | `https://helm.sh/docs/` and `https://kubernetes.io/docs/` |

For other libraries: fetch the readme from `node_modules/<lib>/`. If the doc returns a 404 for the version you need, say so plainly — don't fabricate.

## Output Format

```
Library: <name> @ <version>  (from package.json)
Source consulted: <URL or file path>
Relevant API shape (verbatim):
  <copy-pasted from doc>

Project usage check:
  ✓ in line with v<X> docs
  ⚠ uses deprecated <Y>; replace with <Z>

Recommendation:
  <code grounded in the source>
```

Do NOT include: API names you did not see in the doc; "this is probably how it works"; recommendations for a version different from what's installed.

## Examples

**Happy path** — "Add a Next.js Server Action for the contact form" → check `package.json` (`next: 16.1.6`) → fetch `https://nextjs.org/docs/16/app/building-your-application/data-fetching/server-actions-and-mutations` → quote the `'use server'` directive shape → write the action.

**Edge case — deprecated pattern** — Project is on React 19 but the codebase still uses `React.FC<>`. Flag it ("React.FC is discouraged in this project per CLAUDE.md") and recommend the function-component form, but don't auto-rewrite without permission.

**Negative — guessing** — "I think Strapi's content-type API uses `lifecycles.beforeCreate`". STOP. Fetch the actual Strapi 5 docs first. Don't ship code based on a half-remembered API.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/stack.md` (versions table) and `package.json`
- **Writes:** when a non-obvious version-specific API is used, append the source link to `.rihal/memory/project/decisions.md`
