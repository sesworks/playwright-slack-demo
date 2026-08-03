const { App } = require('@slack/bolt');
const { exec } = require('child_process');

// Initialize Bolt App with Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // Starts with xoxb-
  appToken: process.env.SLACK_APP_TOKEN, // Starts with xapp-
  socketMode: true,
});

// Listen for the /test-smoke Slash Command
app.command('/test-smoke', async ({ command, ack, respond }) => {
  // Acknowledge the command request immediately within 3 seconds
  await ack();

  const environment = command.text.trim() || 'staging';
  const userName = command.user_name;

  console.log(`📩 Received Slack Command '/test-smoke ${environment}' from @${userName}`);

  // Send immediate feedback in Slack channel
  await respond({
    response_type: 'in_channel',
    text: `🚀 *@${userName}* triggered Playwright E2E Smoke Tests on *[${environment}]*! Executing GitHub Actions pipeline...`,
  });

  // Execute trigger-tests.js
  exec(`node trigger-tests.js ${environment}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error triggering test: ${error.message}`);
      return;
    }
    console.log(stdout);
  });
});

(async () => {
  await app.start();
  console.log('⚡ Playwright Slack Bot is running in Socket Mode!');
})();