/**
 * API route handlers — all /api/* endpoints.
 */
const fs = require('fs');
const path = require('path');
const { scanState, scanMemoryBank } = require('./scanner');

function handleApiState(req, res, rcodeDir) {
  const state = scanState(rcodeDir);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(state, null, 2));
}

function handleApiFiles(req, res, projectRoot) {
  const PLANNING_DIR = path.join(projectRoot, '.planning');
  const ARTIFACT_DIRS = ['phases', 'brainstorms', 'council-sessions', 'summaries', 'memory'];
  const ROOT_FILES    = ['ROADMAP.md', 'STATE.md', 'PROJECT.md'];

  const groups = [];

  const rootFiles = ROOT_FILES
    .filter(f => { try { fs.accessSync(path.join(PLANNING_DIR, f)); return true; } catch { return false; } })
    .map(f => ({ label: f.replace('.md', ''), path: '.planning/' + f }));
  if (rootFiles.length) groups.push({ group: 'Overview', files: rootFiles });

  for (const dir of ARTIFACT_DIRS) {
    const full = path.join(PLANNING_DIR, dir);

    // For 'phases', create sub-groups per phase directory
    if (dir === 'phases') {
      let phaseDirs;
      try { phaseDirs = fs.readdirSync(full, { withFileTypes: true }); } catch { continue; }
      const subGroups = [];
      for (const pd of phaseDirs) {
        if (!pd.isDirectory() || pd.name.startsWith('.')) continue;
        const phaseDir = path.join(full, pd.name);
        const phaseLabel = pd.name.replace(/^\d+-/, '').replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        const phaseFiles = [];
        function walkPhase(d, prefix, depth) {
          if (depth > 3) return;
          let entries;
          try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
          for (const e of entries) {
            if (e.name.startsWith('.')) continue;
            const rel = prefix + '/' + e.name;
            if (e.isDirectory()) walkPhase(path.join(d, e.name), rel, depth + 1);
            else if (e.isFile() && e.name.endsWith('.md')) {
              const base = e.name.replace('.md', '');
              const sprintMatch = base.match(/^\d{2}-(\d{2})-([A-Z]+)$/);
              const dateMatch   = base.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
              let fileLabel;
              if (sprintMatch) {
                fileLabel = sprintMatch[2].charAt(0) + sprintMatch[2].slice(1).toLowerCase() + ' ' + parseInt(sprintMatch[1], 10);
              } else if (dateMatch) {
                fileLabel = dateMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              } else if (base === base.toUpperCase() && /^[A-Z_-]+$/.test(base)) {
                fileLabel = base.charAt(0) + base.slice(1).toLowerCase();
              } else {
                fileLabel = base.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              }
              phaseFiles.push({ label: fileLabel, path: '.planning/phases/' + pd.name + rel });
            }
          }
        }
        walkPhase(phaseDir, '', 0);
        if (phaseFiles.length) {
          subGroups.push({ subGroup: phaseLabel, files: phaseFiles });
        }
      }
      if (subGroups.length) {
        groups.push({ group: 'Phases', subGroups });
      }
      continue;
    }

    const files = [];
    function walkArtifacts(d, prefix, depth) {
      if (depth > 3) return;
      let entries;
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const rel = prefix + '/' + e.name;
        if (e.isDirectory()) walkArtifacts(path.join(d, e.name), rel, depth + 1);
        else if (e.isFile() && e.name.endsWith('.md')) {
          const parentDir = prefix.split('/').filter(Boolean).pop() || '';
          const parentLabel = parentDir
            ? parentDir.replace(/^\d+-/, '').replace(/-/g, ' ') + ' › '
            : '';
          const base = e.name.replace('.md', '');
          const sprintMatch = base.match(/^\d{2}-(\d{2})-([A-Z]+)$/);
          const phaseMatch  = base.match(/^(\d{2})-([A-Z]+)$/);
          const dateMatch   = base.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
          let fileLabel;
          if (sprintMatch) {
            fileLabel = sprintMatch[2].charAt(0) + sprintMatch[2].slice(1).toLowerCase() + ' ' + parseInt(sprintMatch[1], 10);
          } else if (phaseMatch) {
            fileLabel = phaseMatch[2].charAt(0) + phaseMatch[2].slice(1).toLowerCase() + ' ' + parseInt(phaseMatch[1], 10);
          } else if (dateMatch) {
            fileLabel = dateMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          } else if (base === base.toUpperCase() && /^[A-Z_-]+$/.test(base)) {
            fileLabel = base.charAt(0) + base.slice(1).toLowerCase();
          } else {
            fileLabel = base.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
          files.push({ label: parentLabel + fileLabel, path: '.planning/' + dir + rel });
        }
      }
    }
    walkArtifacts(full, '', 0);
    if (files.length) {
      const groupLabel = dir.charAt(0).toUpperCase() + dir.slice(1).replace(/-/g, ' ');
      groups.push({ group: groupLabel, files });
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(groups));
}

function handleApiFile(req, res, projectRoot) {
  const url = req.url || '';
  const params = new URLSearchParams(url.split('?')[1] || '');
  const relPath = params.get('path') || '';
  if (!relPath) {
    res.writeHead(400); res.end('Missing path parameter'); return;
  }
  // Fix #321: decode URL-encoded characters before resolving
  const decoded = decodeURIComponent(relPath);
  const resolved = path.resolve(projectRoot, decoded.replace(/^\//, ''));
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  // Dereference symlinks so a symlink outside projectRoot cannot bypass the guard
  let realResolved;
  try { realResolved = fs.realpathSync(resolved); }
  catch { res.writeHead(404); res.end('File not found'); return; }
  if (!realResolved.startsWith(projectRoot + path.sep) && realResolved !== projectRoot) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!resolved.endsWith('.md')) {
    res.writeHead(403); res.end('Forbidden: only .md files'); return;
  }
  let content;
  try { content = fs.readFileSync(resolved, 'utf8'); }
  catch { res.writeHead(404); res.end('File not found'); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(content);
}

// Fix #265: hierarchy endpoint
function handleApiHierarchy(req, res, rcodeDir) {
  const state = scanState(rcodeDir);
  let phases = state.raw?.phases || [];

  // When state.json has no registered phases, fall back to disk scan so the
  // hierarchy view is not blank on a fresh install that hasn't run state-sync.
  if (phases.length === 0) {
    const phasesDir = path.join(path.dirname(rcodeDir), '.planning', 'phases');
    try {
      const dirs = fs.readdirSync(phasesDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name));
      phases = dirs.map(d => {
        const m = d.name.match(/^(\d+)-(.+)$/);
        const id = m ? parseInt(m[1], 10) : d.name;
        const slug = m ? m[2] : d.name;
        const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { id, name, status: 'planned', sprints: [] };
      });
    } catch { /* no phases dir — leave phases empty */ }
  }

  const hierarchy = {
    milestone: state.milestone || 'M1',
    phases: phases.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      sprints: (p.sprints || []).map(s => ({
        id: s.id,
        goal: s.goal,
        status: s.status,
        stories: (s.stories || []).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          points: t.points || null,
        })),
      })),
    })),
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(hierarchy, null, 2));
}

function handleApiMemory(req, res, rcodeDir) {
  const memory = scanMemoryBank(rcodeDir);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(memory, null, 2));
}

module.exports = { handleApiState, handleApiFiles, handleApiFile, handleApiHierarchy, handleApiMemory };
