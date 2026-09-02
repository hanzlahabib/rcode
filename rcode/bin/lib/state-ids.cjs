'use strict';
/**
 * state-ids.cjs — `state <sub>` ID-management branches, extracted from
 * cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: next-phase-id, next-plan-id, next-task-id, resolve-id,
 * set-ids-in-state, migrate-ids, migrate-plan-names.
 *
 * Deps are injected via the `deps` object (same pattern as lib/phase.cjs).
 */

const fs = require('fs');
const path = require('path');

function dispatch(subArgs, deps) {
  const {
    readState,
    writeState,
    writeStateCompact,
    defaultState,
    migrateState,
    parseFlags,
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'next-phase-id') {
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    let maxNum = 0;
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const match = entry.match(/^(\d+)-/);
        if (match) {
          const num = parseInt(match[1], 10);
          maxNum = Math.max(maxNum, num);
        }
      }
    }
    const nextId = String(maxNum + 1);
    return { ok: true, next_phase_id: nextId };
  }

  // --- next-plan-id <phase-id> ---
  if (sub === 'next-plan-id') {
    const phaseId = subArgs[1];
    if (!phaseId) throw new Error('next-plan-id requires a phase ID argument (NN format)');
    const phaseMatch = phaseId.match(/^(\d+)(?:\.(\d+))?$/);
    if (!phaseMatch) throw new Error(`Invalid phase ID format: ${phaseId}. Expected N or N.M`);

    const phasePart = phaseMatch[1];
    const phasesDir = path.join(PLANNING_DIR, 'phases');

    // Find the phase directory matching NN-* (directories may be zero-padded for sorting)
    let phaseDir = null;
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const match = entry.match(/^(\d+)(?:\.\d+)?-/);
        if (match && parseInt(match[1], 10) === parseInt(phasePart, 10)) {
          phaseDir = path.join(phasesDir, entry);
          break;
        }
      }
    }

    // If no phase dir found, default to 1st plan
    if (!phaseDir) {
      return { ok: true, next_plan_id: `${phasePart}.1` };
    }

    // Scan phase dir for numbered subdirs (MM-*) to find max plan number
    let maxPlanNum = 0;
    const entries = fs.readdirSync(phaseDir);
    for (const entry of entries) {
      const match = entry.match(/^(\d+)-/);
      if (match && fs.statSync(path.join(phaseDir, entry)).isDirectory()) {
        const num = parseInt(match[1], 10);
        maxPlanNum = Math.max(maxPlanNum, num);
      }
    }

    const nextPlanNum = String(maxPlanNum + 1);
    // First plan in empty phase gets .1 not .2
    return { ok: true, next_plan_id: maxPlanNum === 0 ? `${phasePart}.1` : `${phasePart}.${nextPlanNum}` };
  }

  // --- next-task-id <plan-id> ---
  if (sub === 'next-task-id') {
    const planId = subArgs[1];
    if (!planId) throw new Error('next-task-id requires a plan ID argument (NN.MM format)');
    const match = planId.match(/^(\d+)\.(\d+)$/);
    if (!match) throw new Error(`Invalid plan ID format: ${planId}. Expected N.M`);

    const phasePart = match[1];
    const planPart = match[2];

    // Construct plan file path
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    let planFile = null;

    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const phaseMatch = entry.match(/^(\d+)(?:\.\d+)?-/);
        if (phaseMatch && parseInt(phaseMatch[1], 10) === parseInt(phasePart, 10)) {
          const phaseDir = path.join(phasesDir, entry);

          // Check for subdirectory named planPart-*
          const subentries = fs.readdirSync(phaseDir);
          for (const subentry of subentries) {
            const subMatch = subentry.match(/^(\d+)-/);
            if (subMatch && parseInt(subMatch[1], 10) === parseInt(planPart, 10)) {
              const planDir = path.join(phaseDir, subentry);
              const candidate = path.join(planDir, 'SPRINT.md');
              if (fs.existsSync(candidate)) {
                planFile = candidate;
                break;
              }
            }
          }

          // If no subdir found, check phase-level PLAN.md
          if (!planFile && parseInt(planPart, 10) === 1) {
            const candidate = path.join(phaseDir, 'SPRINT.md');
            if (fs.existsSync(candidate)) {
              planFile = candidate;
            }
          }
          break;
        }
      }
    }

    if (!planFile) {
      throw new Error(`Plan ${planId} not found. Ensure phase and plan directories exist.`);
    }

    // Read PLAN.md and count existing tasks
    const planContent = fs.readFileSync(planFile, 'utf8');
    const taskMatches = planContent.match(/^### Task \d+\.\d+\.\d+ —/gm) || [];
    const nextTaskNum = String(taskMatches.length + 1);

    return { ok: true, next_task_id: `${planId}.${nextTaskNum}` };
  }

  // --- resolve-id <id> ---
  if (sub === 'resolve-id') {
    const id = subArgs[1];
    if (!id) throw new Error('resolve-id requires an ID argument (NN, NN.MM, NN.MM.TT, or M{N})');

    // Parse ID pattern
    let idType = null;
    let phaseId = null, planId = null, taskId = null, milestoneId = null;

    if (/^M\d+$/.test(id)) {
      idType = 'milestone';
      milestoneId = id;
    } else if (/^\d+$/.test(id)) {
      idType = 'phase';
      phaseId = id;
    } else if (/^\d+\.\d+$/.test(id)) {
      const parts = id.split('.');
      phaseId = parts[0];

      // Determine if this is a decimal phase or a plan
      // Check if directory ends in .M pattern
      const phasesDir = path.join(PLANNING_DIR, 'phases');
      let isDecimalPhase = false;
      if (fs.existsSync(phasesDir)) {
        const entries = fs.readdirSync(phasesDir);
        for (const entry of entries) {
          if (entry.match(/^\d+\.\d+-/)) {
            isDecimalPhase = true;
            break;
          }
        }
      }

      if (isDecimalPhase) {
        idType = 'decimal-phase';
      } else {
        idType = 'plan';
        planId = id;
      }
    } else if (/^\d+\.\d+\.\d+$/.test(id)) {
      idType = 'task';
      const parts = id.split('.');
      phaseId = parts[0];
      planId = `${parts[0]}.${parts[1]}`;
      taskId = id;
    } else {
      throw new Error(`Invalid ID format: ${id}. Valid formats: NN (phase), NN.MM (plan), NN.MM.TT (task), MN (milestone)`);
    }

    // Build response
    const result = {
      id,
      type: idType,
      phase_id: phaseId,
      plan_id: planId,
      task_id: taskId,
      milestone_id: milestoneId,
      path: null,
      phase_dir: null,
      plan_dir: null,
      status: 'pending',
    };

    // Resolve paths
    if (phaseId) {
      const phasesDir = path.join(PLANNING_DIR, 'phases');
      if (fs.existsSync(phasesDir)) {
        const entries = fs.readdirSync(phasesDir);
        for (const entry of entries) {
          const match = entry.match(/^(\d+)-/);
          if (match && parseInt(match[1], 10) === parseInt(phaseId, 10)) {
            const phaseDir = path.join(phasesDir, entry);
            result.phase_dir = phaseDir;

            // Resolve plan path if plan_id is set
            if (planId) {
              const planNum = planId.split('.')[1];

              // Check for subdirectory
              const subentries = fs.readdirSync(phaseDir);
              for (const subentry of subentries) {
                const subMatch = subentry.match(/^(\d+)-/);
                if (subMatch && parseInt(subMatch[1], 10) === parseInt(planNum, 10)) {
                  const planDir = path.join(phaseDir, subentry);
                  const planPath = path.join(planDir, 'SPRINT.md');
                  if (fs.existsSync(planPath)) {
                    result.plan_dir = planDir;
                    result.path = planPath;
                  }
                  break;
                }
              }

              // If no subdir and planNum is 1, check phase-level PLAN.md
              if (!result.path && parseInt(planNum, 10) === 1) {
                const candidate = path.join(phaseDir, 'SPRINT.md');
                if (fs.existsSync(candidate)) {
                  result.plan_dir = phaseDir;
                  result.path = candidate;
                }
              }
            }
            break;
          }
        }
      }
    }

    // Resolve milestone path if milestone_id is set
    if (milestoneId) {
      const milestonesDir = path.join(PLANNING_DIR, 'milestones');
      if (fs.existsSync(milestonesDir)) {
        const entries = fs.readdirSync(milestonesDir);
        for (const entry of entries) {
          if (entry.match(new RegExp(`^${milestoneId}-`))) {
            result.path = path.join(milestonesDir, entry, 'ROADMAP.md');
            break;
          }
        }
      }
    }

    // Determine status
    let status = 'not_found';
    if (result.phase_dir && fs.existsSync(result.phase_dir)) {
      status = 'found';
      // Check if SUMMARY exists for "complete"
      if (result.plan_dir) {
        const summaryFiles = fs.existsSync(result.plan_dir) ?
          fs.readdirSync(result.plan_dir).filter(f => f.endsWith('-SUMMARY.md')) : [];
        if (summaryFiles.length > 0) status = 'complete';
        else if (fs.existsSync(path.join(result.plan_dir, 'SPRINT.md'))) status = 'planned';
      }
    }
    result.status = status;

    return result;
  }

  // --- set-ids-in-state ---
  if (sub === 'set-ids-in-state') {
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    if (!state.plans) state.plans = [];
    if (!state.milestones) state.milestones = [];

    // Scan phases directory
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const match = entry.match(/^(\d+)(?:\.\d+)?-(.+)$/);
        if (match) {
          const phaseId = String(parseInt(match[1], 10)); // strip leading zeros
          const slug = match[2];
          const phaseDir = path.join(phasesDir, entry);

          // Add phase if not already present (check both id and number per #482-A
          // schema-drift fix — different writers use different field names).
          if (!state.phases.some(p => String(parseInt(p.id, 10)) === phaseId || String(parseInt(p.number, 10)) === phaseId)) {
            state.phases.push({
              id: phaseId,
              number: phaseId,
              slug,
              path: phaseDir,
              created: new Date().toISOString(),
            });
          }

          // Scan for plans within phase
          const subentries = fs.readdirSync(phaseDir);
          for (const subentry of subentries) {
            const subMatch = subentry.match(/^(\d+)-(.+)$/);
            if (subMatch && fs.statSync(path.join(phaseDir, subentry)).isDirectory()) {
              const planNum = String(parseInt(subMatch[1], 10)); // strip leading zeros
              const planId = `${phaseId}.${planNum}`;
              const planSlug = subMatch[2];
              const planDir = path.join(phaseDir, subentry);
              const planPath = path.join(planDir, 'SPRINT.md');

              if (fs.existsSync(planPath)) {
                if (!state.plans.some(p => p.id === planId)) {
                  state.plans.push({
                    id: planId,
                    phase_id: phaseId,
                    slug: planSlug,
                    path: planPath,
                    created: new Date().toISOString(),
                  });
                }
              }
            }
          }

          // Check for phase-level PLAN.md (01 plan)
          const phasePlanPath = path.join(phaseDir, 'SPRINT.md');
          if (fs.existsSync(phasePlanPath)) {
            const planId = `${phaseId}.01`;
            if (!state.plans.some(p => p.id === planId)) {
              state.plans.push({
                id: planId,
                phase_id: phaseId,
                slug: 'default',
                path: phasePlanPath,
                created: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Scan milestones directory
    const milestonesDir = path.join(PLANNING_DIR, 'milestones');
    if (fs.existsSync(milestonesDir)) {
      const entries = fs.readdirSync(milestonesDir);
      for (const entry of entries) {
        const match = entry.match(/^(M\d+)-(.+)$/);
        if (match) {
          const milestoneId = match[1];
          const slug = match[2];
          const milestonePath = path.join(milestonesDir, entry, 'ROADMAP.md');

          if (!state.milestones.some(m => m.id === milestoneId)) {
            state.milestones.push({
              id: milestoneId,
              slug,
              path: milestonePath,
              created: new Date().toISOString(),
            });
          }
        }
      }
    }

    return writeState(state);
  }

  // --- migrate-ids ---
  if (sub === 'migrate-ids') {
    const state = readState() || defaultState();
    let migratedCount = 0;

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir).sort();
      let phaseNum = 1;

      for (const entry of entries) {
        const match = entry.match(/^(\d+)-/);
        if (match) {
          phaseNum = parseInt(match[1], 10);
        }

        const phaseDir = path.join(phasesDir, entry);

        // Check for PLAN.md at phase level
        const phasePlanPath = path.join(phaseDir, 'SPRINT.md');
        if (fs.existsSync(phasePlanPath)) {
          try {
            let content = fs.readFileSync(phasePlanPath, 'utf8');
            const phaseIdStr = String(phaseNum); // no leading zeros

            // Check if it has frontmatter with phase/plan fields
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
            if (frontmatterMatch) {
              const fm = frontmatterMatch[1];
              if (!fm.match(/^id:/m)) {
                // Only add id if missing; preserve existing phase/plan if present
                let newFrontmatter = fm.trimEnd() + `\nid: "${phaseIdStr}.1"`;
                if (!fm.match(/^phase:/m)) newFrontmatter += `\nphase: "${phaseIdStr}"`;
                if (!fm.match(/^plan:/m)) newFrontmatter += `\nplan: "1"`;
                newFrontmatter += '\n';
                content = content.replace(/^---\n([\s\S]*?)\n---\n/, `---\n${newFrontmatter}---\n`);
                const tmp = phasePlanPath + '.tmp';
                fs.writeFileSync(tmp, content, 'utf8');
                fs.renameSync(tmp, phasePlanPath);
                migratedCount++;
              }
            } else {
              // No frontmatter found — prepend minimal frontmatter
              const assignedId = `${phaseIdStr}.1`;
              const minimal = `---\nid: "${assignedId}"\nphase: "${phaseIdStr}"\nplan: "1"\ntype: auto\n---\n`;
              fs.writeFileSync(phasePlanPath, minimal + content);
              migratedCount++;
            }
          } catch (e) {
            // Log but continue on file read/write errors
            if (process.env.DEBUG) console.error(`Warning: Could not migrate ${phasePlanPath}: ${e.message}`);
          }
        }

        // Check for plan subdirs
        const subentries = fs.readdirSync(phaseDir);
        let planNum = 1;
        for (const subentry of subentries) {
          const subMatch = subentry.match(/^(\d+)-/);
          if (subMatch && fs.statSync(path.join(phaseDir, subentry)).isDirectory()) {
            planNum = parseInt(subMatch[1], 10);
            const planDir = path.join(phaseDir, subentry);
            const planPath = path.join(planDir, 'SPRINT.md');

            if (fs.existsSync(planPath)) {
              try {
                let content = fs.readFileSync(planPath, 'utf8');
                const phaseIdStr = String(phaseNum); // no leading zeros
                const planIdStr = String(planNum);   // no leading zeros

                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
                if (frontmatterMatch) {
                  const fm = frontmatterMatch[1];
                  if (!fm.match(/^id:/m)) {
                    // Only add id if missing; preserve existing phase/plan if present
                    let newFrontmatter = fm.trimEnd() + `\nid: "${phaseIdStr}.${planIdStr}"`;
                    if (!fm.match(/^phase:/m)) newFrontmatter += `\nphase: "${phaseIdStr}"`;
                    if (!fm.match(/^plan:/m)) newFrontmatter += `\nplan: "${planIdStr}"`;
                    newFrontmatter += '\n';
                    content = content.replace(/^---\n([\s\S]*?)\n---\n/, `---\n${newFrontmatter}---\n`);
                    const tmp = planPath + '.tmp';
                    fs.writeFileSync(tmp, content, 'utf8');
                    fs.renameSync(tmp, planPath);
                    migratedCount++;
                  }
                } else {
                  // No frontmatter found — prepend minimal frontmatter
                  const assignedId = `${phaseIdStr}.${planIdStr}`;
                  const minimal = `---\nid: "${assignedId}"\nphase: "${phaseIdStr}"\nplan: "${planIdStr}"\ntype: auto\n---\n`;
                  fs.writeFileSync(planPath, minimal + content);
                  migratedCount++;
                }
              } catch (e) {
                // Log but continue on file read/write errors
                if (process.env.DEBUG) console.error(`Warning: Could not migrate ${planPath}: ${e.message}`);
              }
            }
          }
        }
      }
    }

    return { ok: true, migrated: migratedCount, message: `Migrated ${migratedCount} PLAN.md files with IDs` };
  }

  // =====================================================================
  // state migrate-plan-names: normalise plan filenames to no-leading-zeros (#657)
  //
  // Renames <N>-0K-SPRINT.md → <N>-K-SPRINT.md so the K (plan index) honours
  // the project's no-leading-zeros rule. The N (phase prefix) is preserved
  // because phase directories use leading zeros for ls sort order.
  //
  // Reports planned actions and exits without touching disk when --dry-run.
  // Updates state.json plan IDs if the renamed file is referenced there.
  // Does NOT rewrite ROADMAP / SUMMARY backrefs — workflows glob *-SPRINT.md
  // which still matches. Backref cleanup is a follow-up if needed.
  // =====================================================================
  if (sub === 'migrate-plan-names') {
    const flags = parseFlags(1);
    // parseFlags sets valueless flags to '' (empty string). Detect presence
    // by key existence, not truthiness, so --dry-run works as a bare flag.
    const dryRun = ('dry-run' in flags) || subArgs.includes('--dry-run');
    const renames = [];
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (!fs.existsSync(phasesDir)) {
      return { ok: true, renamed: 0, dry_run: dryRun, message: '.planning/phases not found' };
    }
    for (const entry of fs.readdirSync(phasesDir)) {
      const phaseDir = path.join(phasesDir, entry);
      if (!fs.statSync(phaseDir).isDirectory()) continue;
      for (const file of fs.readdirSync(phaseDir)) {
        // Match: <N>-0K-SPRINT.md where K starts with '0' AND has at least one
        // more digit (so single-digit "0" wouldn't match — there is no plan 0).
        const m = file.match(/^(\d+)-0(\d+)-SPRINT\.md$/);
        if (!m) continue;
        const phasePrefix = m[1];
        const planNum = m[2]; // already stripped leading zero
        const oldName = file;
        const newName = `${phasePrefix}-${planNum}-SPRINT.md`;
        const oldPath = path.join(phaseDir, oldName);
        const newPath = path.join(phaseDir, newName);
        if (fs.existsSync(newPath)) {
          renames.push({ phase_dir: entry, from: oldName, to: newName, status: 'skip-target-exists' });
          continue;
        }
        renames.push({ phase_dir: entry, from: oldName, to: newName, status: dryRun ? 'would-rename' : 'renamed' });
        if (!dryRun) fs.renameSync(oldPath, newPath);
      }
    }
    // Update state.json plan IDs (e.g., "20.01" → "20.1") if the entries exist.
    let stateUpdates = 0;
    if (!dryRun) {
      const state = readState();
      if (state && Array.isArray(state.phases)) {
        for (const phase of state.phases) {
          if (!Array.isArray(phase.plans)) continue;
          for (const plan of phase.plans) {
            if (typeof plan.id !== 'string') continue;
            const newId = plan.id.replace(/^(\d+)\.0(\d+)$/, '$1.$2');
            if (newId !== plan.id) {
              plan.id = newId;
              if (plan.plan) plan.plan = String(plan.plan).replace(/^0(\d+)$/, '$1');
              stateUpdates++;
            }
          }
        }
        if (stateUpdates > 0) writeState(state);
      }
    }
    return {
      ok: true,
      dry_run: dryRun,
      renamed: renames.filter(r => r.status === 'renamed').length,
      would_rename: renames.filter(r => r.status === 'would-rename').length,
      skipped: renames.filter(r => r.status === 'skip-target-exists').length,
      state_plan_ids_updated: stateUpdates,
      details: renames,
    };
  }

  return undefined;
}

module.exports = { dispatch };
