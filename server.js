const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.urlencoded({ extended: true })); // Slack sends slash command data as URL-encoded

// Endpoint for Slack Slash Command /test-smoke
app.post('/slack/command', (req, res) => {
  const { command, text, user_name } = req.body;
  const environment = text.trim() || 'staging';

  console.log(`📩 Received Slack Command '${command} ${environment}' from @${user_name}`);

  // Immediately reply to Slack so the command doesn't time out (3-second limit)
  res.json({
    response_type: 'in_channel', // Visible to everyone in the channel
    text: `🚀 *@${user_name}* triggered Playwright E2E Smoke Tests on *[${environment}]*! The pipeline is executing in GitHub Actions...`,
  });

  // Trigger GitHub Actions via script
  exec(`node trigger-tests.js ${environment}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error triggering test: ${error.message}`);
      return;
    }
    console.log(stdout);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚡ Slack Slash Command listener running on port ${PORT}`);
});