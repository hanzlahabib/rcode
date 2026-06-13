/**
 * agents-data.js — the 18-agent roster, moved client-side from shell.js.
 *
 * Previously lived in shell.js:17-36 as a server-rendered array.
 * Now exported as a pure ESM constant so AgentsView can render it.
 *
 * `file` is the agent's definition under rcode/agents/ — fetched lazily by
 * AgentsView when a card is opened. null = no prompt file on disk (system
 * entries like Raees/Majlis/Diwan are skills, not agent definitions).
 */

export const AGENTS = [
  { name: 'Sadiq Damani',         arabic: 'صادق',         role: 'Director of Strategy',              real: true, type: 'leadership',  file: 'rcode-sadiq.md' },
  { name: 'Waleed Al Harthi',     arabic: 'وليد',         role: 'CTO',                               real: true, type: 'leadership',  file: 'rcode-waleed.md' },
  { name: 'Ahmed Al Hassani',     arabic: 'أحمد الحسني',  role: 'Technology & Development Director', real: true, type: 'leadership',  file: 'rcode-ahmed.md' },
  { name: 'Nasser',               arabic: 'ناصر',         role: 'Engineering Manager',               real: true, type: 'leadership',  file: 'rcode-nasser.md' },
  { name: 'Hussain',              arabic: 'حسين',         role: 'PM + Scrum Master',                                type: 'product',     file: 'rcode-hussain-pm.md' },
  { name: 'Layla',                arabic: 'ليلى',         role: 'Lead UX Designer',                                 type: 'design',      file: 'rcode-layla.md' },
  { name: 'Zahra',                arabic: 'زهرة',         role: 'Branding & Creative Director',                    type: 'design',      file: 'rcode-zahra.md' },
  { name: 'Omar',                 arabic: 'عمر',          role: 'Full-Stack Engineer',                              type: 'engineering', file: 'rcode-omar.md' },
  { name: 'Haitham Al Khamiyasi', arabic: 'هيثم',        role: 'Senior Frontend',                   real: true, type: 'engineering', file: 'rcode-haitham.md' },
  { name: 'Yousef',               arabic: 'يوسف',         role: 'Senior Backend',                                   type: 'engineering', file: 'rcode-yousef.md' },
  { name: 'Zayd',                 arabic: 'زيد',          role: 'ML Engineer',                                      type: 'engineering', file: 'rcode-zayd.md' },
  { name: 'Fatima',               arabic: 'فاطمة',        role: 'QA Lead',                                          type: 'quality',     file: 'rcode-fatima.md' },
  { name: 'Khalid',               arabic: 'خالد',         role: 'DevOps',                                           type: 'engineering', file: 'rcode-khalid.md' },
  { name: 'Noor',                 arabic: 'نور',          role: 'Scribe',                                           type: 'support',     file: 'rcode-noor.md' },
  { name: 'Mariam',               arabic: 'مريم',         role: 'Marketing Lead',                                   type: 'product',     file: 'rcode-mariam.md' },
  { name: 'Raees',                arabic: 'رئيس',         role: 'Orchestration Director',                          type: 'system',      file: null },
  { name: 'Majlis',               arabic: 'مجلس',         role: 'Consulting Council',                               type: 'system',      file: null },
  { name: 'Diwan',                arabic: 'ديوان',        role: 'Dashboard Registry',                               type: 'system',      file: null },
];
