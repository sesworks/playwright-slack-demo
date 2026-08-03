// Import Playwright Reporter interfaces and result types
import { Reporter, FullResult, TestCase, TestResult } from '@playwright/test';

// Structure for storing flaky test tracking details
interface FlakyTestInfo {
  title: string;
  retriesTaken: number;
}

class SlackReporter implements Reporter {
  // Lists for collecting failed and flaky tests
  private failedTests: { title: string; error?: string }[] = [];
  private flakyTests: FlakyTestInfo[] = [];

  // Metrics counters
  private passedFirstTryCount = 0;
  private failedCount = 0;

  // Lifecycle Method: Listens to every test and retry attempt
  onTestEnd(test: TestCase, result: TestResult) {
    const isFinalAttempt = result.retry === test.retries;

    if (result.status === 'passed') {
      if (result.retry === 0) {
        // Passed cleanly on the first try
        this.passedFirstTryCount++;
      } else {
        // Passed after 1 or 2 retries -> FLAKY DETECTED!
        this.flakyTests.push({
          title: test.title,
          retriesTaken: result.retry,
        });
      }
    } else if ((result.status === 'failed' || result.status === 'timedOut') && isFinalAttempt) {
      // Failed every retry attempt -> Real Failure
      this.failedCount++;

      const cleanError = result.error?.message
        ? result.error.message.replace(/\u001b\[\d+m/g, '')
        : 'Unknown execution error';

      this.failedTests.push({
        title: test.title,
        error: cleanError.split('\n')[0],
      });
    }
  }

  // Lifecycle Method: Executes after the suite completes
  async onEnd(result: FullResult) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('⚠️ SLACK_WEBHOOK_URL is missing. Skipping Slack notification.');
      return;
    }

    const isSuccess = result.status === 'passed';
    const statusHeader = isSuccess ? 'PASSED ✅' : 'FAILED ❌';

    // Build the high-level summary header
    let messageText = `*Playwright E2E Quality Health Report*\n`;
    messageText += `*Status:* ${statusHeader}\n`;
    messageText += `*Metrics:* ${this.passedFirstTryCount} Solid Passed | ${this.flakyTests.length} Flaky ⚠️ | ${this.failedCount} Failed\n`;
    messageText += `*Duration:* ${(result.duration / 1000).toFixed(2)}s | *Env:* ${process.env.CI ? 'CI/CD Pipeline' : 'Local Run'}`;

    // Section 1: Flaky Tests Warning (if any exist)
    if (this.flakyTests.length > 0) {
      const flakyList = this.flakyTests
        .map((f) => `• *${f.title}* _(Passed on retry #${f.retriesTaken})_`)
        .join('\n');

      messageText += `\n\n⚠️ *Flaky Tests Detected (${this.flakyTests.length}):*\n${flakyList}`;
    }

    // Section 2: Hard Failure Details (if any exist)
    if (this.failedTests.length > 0) {
      const failureList = this.failedTests
        .map((f) => `• *${f.title}*\n  \`${f.error}\``)
        .join('\n');

      messageText += `\n\n❌ *Failed Details (${this.failedTests.length}):*\n${failureList}`;
    }

    const payload = { text: messageText };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('🔔 Quality Health Slack notification sent successfully!');
      } else {
        console.error('❌ Failed to send Slack notification:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error sending to Slack:', error);
    }
  }
}

export default SlackReporter;