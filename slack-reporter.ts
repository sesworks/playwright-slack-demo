import { Reporter, FullResult } from '@playwright/test';

class SlackReporter implements Reporter {
  async onEnd(result: FullResult) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('⚠️ SLACK_WEBHOOK_URL is missing. Skipping Slack notification.');
      return;
    }

    const status = result.status === 'passed' ? 'PASSED ✅' : 'FAILED ❌';
    const message = {
      text: `*Playwright E2E Test Run*\n*Status:* ${status}\n*Duration:* ${(result.duration / 1000).toFixed(2)}s\n*Environment:* ${process.env.CI ? 'CI/CD Pipeline' : 'Local Run'}`,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        console.log('🔔 Slack notification sent successfully!');
      } else {
        console.error('❌ Failed to send Slack notification:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error sending to Slack:', error);
    }
  }
}

export default SlackReporter;