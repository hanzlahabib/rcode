/**
 * rihal-method postinstall hook — runs automatically after `npm install`
 */

// Only print the welcome if not running in CI/test environments
if (process.env.CI || process.env.NODE_ENV === 'test') {
  process.exit(0);
}

console.log(`
🕌 Rihal Method installed.

Get started:
  npx @hanzlahabib/rihal-method init        # scaffold .rihal/ in your project
  npx @hanzlahabib/rihal-method dashboard   # start the view-only Diwan dashboard
  npx @hanzlahabib/rihal-method team        # list the team roster
  npx @hanzlahabib/rihal-method doctor      # run compliance check

Documentation: https://github.com/hanzlahabib/rihal-method
`);
