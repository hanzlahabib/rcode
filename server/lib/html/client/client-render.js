const S = window.__S__;
const _phases = S.phases || [];

// ---- Helpers ----
// String-template versions used by still-legacy views (renderMemory, renderDecisions,
// renderOrchestration, renderKanban). Migrated views use components/shared.js instead.

function chip(s) {
  const c = (s === 'complete' || s === 'completed' || s === 'done') ? 'complete'
    : (s === 'active' || s === 'in_progress') ? 'active'
    : s === 'blocked' ? 'blocked'
    : s === 'planned' ? 'planned'
    : s === 'todo' ? 'todo' : 'other';
  return '<span class="status-chip ' + c + '">● ' + esc(s) + '</span>';
}
function tag(t) { return '<span class="tag">' + esc(t) + '</span>'; }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function pct(d, t) { return t > 0 ? Math.round(d/t*100) + '%' : '—'; }
function pctNum(d, t) { return t > 0 ? Math.round(d/t*100) : 0; }
function dateStr(s) { return s ? String(s).slice(0,10) : null; }
function humanDate(s) {
  if (!s) return null;
  try { const d = new Date(s); return d.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}); }
  catch { return dateStr(s); }
}
function allSprints() {
  return _phases.flatMap(p => (p.sprints||[]).map(s => Object.assign({}, s, {phaseId:p.id, phaseName:p.name})));
}
function allTasks() {
  return _phases.flatMap(p => (p.sprints||[]).flatMap(s =>
    (s.stories||[]).map(t => Object.assign({}, t, {sprintId:s.id, phaseId:p.id, phaseName:p.name}))
  ));
}
function attr(label, val) {
  return '<div class="attr-item"><span class="attr-label">' + label + '</span><span class="attr-value">' + (val||'—') + '</span></div>';
}
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}
function copyCmd(el) {
  const cmd = el.getAttribute('data-cmd');
  if (!cmd) return;
  navigator.clipboard.writeText(cmd).then(() => showToast('Copied: ' + cmd)).catch(() => {
    const ta = document.createElement('textarea'); ta.value = cmd;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('Copied: ' + cmd);
  });
}
function cmdHint(cmd, desc) {
  return '<div class="cmd-hint-item" data-cmd="' + esc(cmd) + '" onclick="copyCmd(this)">' +
    '<span class="cmd-text">' + esc(cmd) + '</span>' +
    '<span class="cmd-desc">' + esc(desc) + '</span>' +
    '<span class="cmd-copy">📋</span></div>';
}
function cmdAccordion(hints) {
  if (!hints.length) return '';
  return '<details class="cmd-hints"><summary>💡 Commands</summary>' +
    '<div class="cmd-hints-list">' + hints.join('') + '</div></details>';
}
