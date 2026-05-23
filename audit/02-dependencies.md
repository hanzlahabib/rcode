# Dependency Audit — rcode v4.0.0

Audit date: 2026-05-23

## Summary

| Check | Result |
|---|---|
| pnpm audit | 0 critical, 0 high, 0 moderate, 0 low |
| Lock file | pnpm-lock.yaml present, in sync |
| Outdated — major behind | 3 (@clack/prompts, diff, zod) |
| Outdated — minor/patch behind | 3 (esbuild, semver, ws) |
| Unused deps | 0 (all confirmed used) |
| Loose version pins (^) | 9 of 9 direct deps |
| Direct deps | 9 (1 prod + 7 dev + 1 optional) |
| Transitive deps | 62 total (pnpm audit metadata) |
| Engines declared | ✅ node >=18.0.0 |
| License conflicts | None — all MIT / BSD-3 / ISC |

---

## Findings (by severity)

### [LOW] Three packages are major versions behind

| Package | Installed | Latest | Risk |
|---|---|---|---|
| `@clack/prompts` | 0.9.1 | 1.4.0 | API changes likely across 0.x→1.x |
| `diff` | 8.0.4 | 9.0.0 | Used by bundled CLI; major bump may change patch format |
| `zod` | 3.25.76 | 4.4.3 | Zod 4 has breaking schema API changes |

### [LOW] All 9 deps use `^` range pins — no exact pins

Every entry in `package.json` uses `^` (caret). This is normal for a library published to npm, but it means `pnpm install` in a fresh environment can silently pull a newer minor that changes runtime behaviour. The `pnpm-lock.yaml` freezes exact versions for the project itself, but **consumers who install `@hanzlaa/rcode` as a dependency get whatever semver allows**.

### [INFO] Lock file format mismatch

The project ships with `pnpm-lock.yaml` only. Running `npm audit` fails (`ENOLOCK`) because npm expects `package-lock.json`. CI or contributors using npm directly will hit this. The pnpm audit is clean (0 vulnerabilities, 62 total deps).

### [INFO] `@lydell/node-pty` is a beta pin

`optionalDependencies["@lydell/node-pty"]` is pinned to `1.2.0-beta.12` — an exact beta version with no `^`. The beta label means no stability guarantee; if this package is abandoned or API-breaks at stable release, the pin will need a manual update.

### [INFO] Bundle bloat: zod is the heaviest devDep at 4.7 MB

The top 10 by disk size:

| Package | Size |
|---|---|
| zod | 4.7 MB |
| diff | 736 KB |
| semver | 300 KB |
| fast-glob | 296 KB |
| ws | 200 KB |
| esbuild | 172 KB |
| nanospinner | 40 KB |
| picocolors | 32 KB |
| @lydell | 8 KB |
| @clack | 4 KB |

All devDeps except `ws` are bundled into `dist/rcode.js` via esbuild at build time — they do not ship in the final installed `node_modules` for consumers. The 4.7 MB zod figure only affects the repo development environment.

---

## Recommendations (ranked by impact)

1. **Plan a zod v4 migration.** Zod 3→4 is the highest-impact upgrade. Zod is bundled into the CLI; a major-version drift will widen over time. File a ticket and review the [zod v4 migration guide](https://zod.dev/v4) before the gap grows.

2. **Upgrade `diff` to v9 and `@clack/prompts` to v1.x.** Both crossed a major boundary. `diff` affects how patch diffs are rendered in the CLI; `@clack/prompts` affects the interactive install UX. Bump in a dev branch, run `node --test`, and check `dist/rcode.js` output manually.

3. **Add `npm audit` compatibility for contributors.** Either add a `package-lock.json` via `npm i --package-lock-only` (and `.gitignore` it to avoid dual-lock drift), or document in `CONTRIBUTING.md` that `pnpm audit` is the correct command and npm users will get `ENOLOCK`.

4. **Promote `@lydell/node-pty` off the beta pin.** Watch for a stable `1.2.0` release; beta pins are invisible in `npm outdated` and can silently become abandoned.

5. **Consider pinning `ws` exactly in `dependencies`.** `ws` is the only runtime production dependency. A `^` on a prod dep means a patch-breaking `ws` update could affect all installed consumers. Exact pin (`"ws": "8.21.0"`) eliminates that surface with negligible cost.
