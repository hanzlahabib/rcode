#!/usr/bin/env node
/**
 * seo-project-init.cjs — idempotent SEO project memory bootstrap.
 *
 * Copies PROJECT.md + STATE.md from the rcode SEO templates into
 * `.rcode/seo/` in the target project, only when they don't already exist.
 * Never overwrites an existing file — project memory is durable state, not
 * something this script should be able to silently clobber.
 *
 * Other templates (KEYWORDS.md, COMPETITORS.md, etc. — see
 * rcode/templates/seo/) are intentionally NOT copied eagerly. The router
 * skill copies them on-demand the first time a workflow stage needs them
 * (see LIFECYCLE-AND-STAGE-GATES.md) — creating all 15 files up front would
 * be exactly the "empty bureaucracy" the spec warns against.
 *
 * Template resolution order (mirrors the PROJECT_ROOT detection idiom used
 * by rcode-tools.cjs, which derives PROJECT_ROOT from the script's own
 * install location rather than trusting the caller's cwd):
 *   1. RCODE_PROJECT_ROOT env override      → <root>/.rcode/templates/seo
 *   2. this script's own installed location → <project>/.rcode/templates/seo
 *      Installed layout is
 *      <project>/.claude/skills/rcode-seo-os/scripts/seo-project-init.cjs,
 *      so four levels up from scripts/ is <project>. This must be checked
 *      BEFORE the cwd-based candidate below — an agent may invoke this
 *      script by absolute path from a cwd that is not the project root, and
 *      cwd-only resolution would then miss templates that really are
 *      installed, one level away from where __dirname says to look.
 *   3. <cwd>/.rcode/templates/seo           (normal installed project, cwd
 *      happens to already be the project root)
 *   4. <source repo>/rcode/templates/seo    (dev mode / running from source,
 *      e.g. this repo's own test suite before anything is installed) —
 *      source layout is rcode/skills/seo/seo-os/scripts/this-file.cjs, so
 *      four levels up from scripts/ is rcode/.
 *
 * Usage:
 *   node seo-project-init.cjs [targetDir]
 *
 * Prints one JSON blob: { targetDir, templateSource, created: [...], skipped: [...] }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FILES_TO_INIT = ['PROJECT.md', 'STATE.md'];

/**
 * Resolve the directory that holds the seo/*.md templates, trying the
 * installed location first and falling back to the source tree.
 * Throws a clear error if neither exists — this is a hard dependency, not
 * something the script can silently work around.
 */
function resolveTemplateSource() {
  const candidates = [];

  if (process.env.RCODE_PROJECT_ROOT) {
    candidates.push(path.join(path.resolve(process.env.RCODE_PROJECT_ROOT), '.rcode', 'templates', 'seo'));
  }
  // Installed layout: <project>/.claude/skills/rcode-seo-os/scripts/this-file.cjs
  // — four levels up from scripts/ is <project>.
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', '.rcode', 'templates', 'seo'));
  candidates.push(path.join(process.cwd(), '.rcode', 'templates', 'seo'));
  // Source tree fallback: this file lives at
  // rcode/skills/seo/seo-os/scripts/seo-project-init.cjs — four levels up
  // from scripts/ is rcode/, so rcode/templates/seo is a sibling of skills/.
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', 'templates', 'seo'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate SEO templates. Checked:\n${candidates.map((c) => `  - ${c}`).join('\n')}\n` +
      'Expected .rcode/templates/seo/ (installed project) or rcode/templates/seo/ (rcode source tree).'
  );
}

/**
 * Idempotently initialize `.rcode/seo/` under targetDir.
 * Pure-ish: only I/O is reading the template source and writing missing
 * files — never overwrites, never deletes.
 */
function initSeoProject(targetDir, templateSource) {
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Target directory does not exist or is not a directory: ${targetDir}`);
  }

  const seoDir = path.join(targetDir, '.rcode', 'seo');
  fs.mkdirSync(seoDir, { recursive: true });

  const created = [];
  const skipped = [];

  for (const fileName of FILES_TO_INIT) {
    const src = path.join(templateSource, fileName);
    const dest = path.join(seoDir, fileName);

    if (!fs.existsSync(src)) {
      throw new Error(`Template missing: ${src}`);
    }

    if (fs.existsSync(dest)) {
      skipped.push(path.relative(targetDir, dest));
      continue;
    }

    fs.copyFileSync(src, dest);
    created.push(path.relative(targetDir, dest));
  }

  return { seoDir: path.relative(targetDir, seoDir), created, skipped };
}

function main(argv) {
  const targetDir = path.resolve(argv[2] || process.cwd());
  const templateSource = resolveTemplateSource();
  const result = initSeoProject(targetDir, templateSource);

  process.stdout.write(
    JSON.stringify(
      {
        targetDir,
        templateSource,
        seoDir: result.seoDir,
        created: result.created,
        skipped: result.skipped,
      },
      null,
      2
    ) + '\n'
  );
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-project-init: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { resolveTemplateSource, initSeoProject };
