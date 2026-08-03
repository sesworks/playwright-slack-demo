// Import Playwright Reporter interfaces and result types
import { Reporter, FullResult, TestCase, TestResult } from '@playwright/test';

// Custom Playwright Reporter to format and send test results to Slack via Webhook
class SlackReporter implements Reporter {
  // Store details of failed tests (title and initial error message line)
  private failedTests: { title: string; error?: string }[] = [];
  
  // Track total counts for test execution metrics
  private passedCount = 0;
  private failedCount = 0;

  // Lifecycle Method: Triggered automatically by Playwright when EACH individual test finishes execution
  onTestEnd(test: TestCase, result: TestResult) {
    // Check if this is the final attempt (e.g., attempt 2 of 2 retries) to avoid duplicate counts on retries
    const isFinalAttempt = result.retry === test.retries;

    // Increment passed counter if test execution succeeded
    if (result.status === 'passed') {
      this.passedCount++;
    } 
    // Handle test failure or timeout only on its final retry attempt
    else if ((result.status === 'failed' || result.status === 'timedOut') && isFinalAttempt) {
      this.failedCount++;

      // Strip ANSI terminal color code characters from raw Playwright error output
      const cleanError = result.error?.message
        ? result.error.message.replace(/\u001b\[\d+m/g, '')
        : 'Unknown execution error';

      // Save failed test title and the first line of the error message for the report summary
      this.failedTests.push({
        title: test.title,
        error: cleanError.split('\n')[0], // Extract only the primary failure line
      });
    }
  }

  // Lifecycle Method: Triggered automatically by Playwright after ALL tests in the suite have completed
  async onEnd(result: FullResult) {
    // Read the Webhook URL set in local environment variables (.env) or GitHub Secrets
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    // Guard Clause: If no Webhook URL is set, log a warning and exit gracefully without throwing an error
    if (!webhookUrl) {
      console.log('⚠️ SLACK_WEBHOOK_URL is missing. Skipping Slack notification.');
      return;
    }

    // Determine overall suite status (passed vs failed)
    const isSuccess = result.status === 'passed';
    const statusHeader = isSuccess ? 'PASSED ✅' : 'FAILED ❌';

    // Format the high-level summary card using Slack Markdown syntax
    let messageText = `*Playwright E2E Test Run*\n*Status:* ${statusHeader}\n*Summary:* ${this.passedCount} Passed | ${this.failedCount} Failed\n*Duration:* ${(result.duration / 1000).toFixed(2)}s\n*Environment:* ${process.env.CI ? 'CI/CD Pipeline' : 'Local Run'}`;

    // If there are failed tests, format and append the failure list section
    if (this.failedTests.length > 0) {
      const failureList = this.failedTests
        .map((f) => `• *${f.title}*\n  \`${f.error}\``)
        .join('\n');
      
      messageText += `\n\n*Failed Details:*\n${failureList}`;
    }

    // HTTP POST payload formatted for Slack Incoming Webhooks
    const payload = { text: messageText };

    try {
      // Send the formatted message to the Slack Webhook URL via native fetch
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Confirm successful message delivery in terminal console
      if (response.ok) {
        console.log('🔔 Slack notification sent successfully!');
      } else {
        console.error('❌ Failed to send Slack notification:', response.statusText);
      }
    } catch (error) {
      // Catch and log network failures when calling Slack API
      console.error('❌ Error sending to Slack:', error);
    }
  }
}

// Export the class as default so Playwright runner can load it from playwright.config.ts
export default SlackReporter;