/**
 * agents-data.js — the 18-agent roster, moved client-side from shell.js.
 *
 * Previously lived in shell.js:17-36 as a server-rendered array.
 * Now exported as a pure ESM constant so AgentsView can render it.
 */

export const AGENTS = [
  { name: 'Sadiq Damani',         arabic: 'صادق',         role: 'Director of Strategy',              real: true, type: 'leadership' },
  { name: 'Waleed Al Harthi',     arabic: 'وليد',         role: 'CTO',                               real: true, type: 'leadership' },
  { name: 'Ahmed Al Hassani',     arabic: 'أحمد الحسني',  role: 'Technology & Development Director', real: true, type: 'leadership' },
  { name: 'Nasser',               arabic: 'ناصر',         role: 'Engineering Manager',               real: true, type: 'leadership' },
  { name: 'Hussain',              arabic: 'حسين',         role: 'PM + Scrum Master',                                type: 'product' },
  { name: 'Layla',                arabic: 'ليلى',         role: 'Lead UX Designer',                                 type: 'design' },
  { name: 'Zahra',                arabic: 'زهرة',         role: 'Branding & Creative Director',                    type: 'design' },
  { name: 'Omar',                 arabic: 'عمر',          role: 'Full-Stack Engineer',                              type: 'engineering' },
  { name: 'Haitham Al Khamiyasi', arabic: 'هيثم',        role: 'Senior Frontend',                   real: true, type: 'engineering' },
  { name: 'Yousef',               arabic: 'يوسف',         role: 'Senior Backend',                                   type: 'engineering' },
  { name: 'Zayd',                 arabic: 'زيد',          role: 'ML Engineer',                                      type: 'engineering' },
  { name: 'Fatima',               arabic: 'فاطمة',        role: 'QA Lead',                                          type: 'quality' },
  { name: 'Khalid',               arabic: 'خالد',         role: 'DevOps',                                           type: 'engineering' },
  { name: 'Noor',                 arabic: 'نور',          role: 'Scribe',                                           type: 'support' },
  { name: 'Mariam',               arabic: 'مريم',         role: 'Marketing Lead',                                   type: 'product' },
  { name: 'Raees',                arabic: 'رئيس',         role: 'Orchestration Director',                          type: 'system' },
  { name: 'Majlis',               arabic: 'مجلس',         role: 'Consulting Council',                               type: 'system' },
  { name: 'Diwan',                arabic: 'ديوان',        role: 'Dashboard Registry',                               type: 'system' },
];
