/**
 * rcode dashboard — start the Diwan view-only dashboard
 */

const path = require('path');
const { spawn } = require('child_process');

module.exports = function dashboard(args, { packageRoot }) {
  const serverPath = path.join(packageRoot, 'server/dashboard.js');
  const cwd = process.cwd();
  const rcodeDir = path.join(cwd, '.rcode');

  console.log(`\n🕌 Starting Diwan dashboard...`);
  console.log(`   Scanning: ${rcodeDir}`);

  // Fork the dashboard process with RCODE_DIR pointing at the user's current project
  const proc = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      RCODE_DIR: rcodeDir,
    },
  });

  proc.on('error', (err) => {
    console.error('Failed to start dashboard:', err.message);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nStopping dashboard...');
    proc.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};
