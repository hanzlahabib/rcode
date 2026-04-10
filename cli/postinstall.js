/**
 * rihal-code postinstall hook — runs automatically after `npm install`
 */

// Only print the welcome if not running in CI/test environments
if (process.env.CI || process.env.NODE_ENV === 'test') {
  process.exit(0);
}

console.log(`
🕌 Rihal Code installed.

Get started:
  npx @hanzlahabib/rihal-code init        # scaffold .rihal/ in your project
  npx @hanzlahabib/rihal-code dashboard   # start the view-only Diwan dashboard
  npx @hanzlahabib/rihal-code team        # list the team roster
  npx @hanzlahabib/rihal-code doctor      # run compliance check

Documentation: https://github.com/hanzlahabib/rihal-code
`);
