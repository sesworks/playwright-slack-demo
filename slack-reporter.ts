// ============================================================================
// IMPORTS
// ============================================================================
// Import Playwright core types for building custom test reporters
import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

// Import official Slack Web API Client SDK to send Block Kit messages
import { WebClient } from '@slack/web-api';

// Import custom AI diff analyzer script that sends baseline/actual screenshots to Google Gemini Vision API
import { analyzeVisualDiff } from './scripts/ai-diff-analyzer';

// Node.js file system module to check if local snapshot files exist on disk
import fs from 'fs';

// Node.js path module for cross-platform file path resolution (Windows/Linux/macOS)
import path from 'path';

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Strips ANSI terminal color escape sequences (e.g., [31m, [32m) from Playwright error logs
 * so trace stacks render as clean, readable plain text inside Slack code blocks.
 */
function stripAnsiCodes(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Formats duration from milliseconds into a human-readable seconds format.
 */
function formatDuration(ms: number): string {
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Data structure used to collect failed or flaky test metrics across different projects.
 */
interface TestIssue {
  title: string;       // Name / Title of the spec (e.g., "GET /posts - Should retrieve deals")
  project: string;     // Playwright project name ('api' vs 'e2e')
  error?: string;      // Extracted error stack trace or failure cause
  retryCount: number;  // Number of retries executed before final outcome
}

// ============================================================================
// MAIN REPORTER CLASS
// ============================================================================

/**
 * Custom Playwright Reporter for ChatOps & Automated Failure Triage.
 * 
 * Automatically captures test execution status and dispatches structured Slack Block Kit
 * notifications displaying passed vs failed test breakdowns, flaky test flags, and AI visual diffs.
 */
class SlackReporter implements Reporter {
  private failedTests: TestIssue[] = [];
  private flakyTests: TestIssue[] = [];
  private passedCount = 0;
  private startTime = 0;
  private activeProject = 'E2E'; // Default fallback project name

  /**
   * PLAYWRIGHT HOOK: Triggered once when the test suite starts.
   * Records initial timestamp to calculate total execution duration.
   */
  onBegin() {
    this.startTime = Date.now();
  }

  /**
   * PLAYWRIGHT HOOK: Triggered after each test attempt completes.
   */
  onTestEnd(test: TestCase, result: TestResult) {
    // Record active project name from incoming tests
    if (test.projectName) {
      this.activeProject = test.projectName.toUpperCase();
    }

    // Determine if this attempt is the final attempt Playwright will make
    const isLastAttempt = test.results[test.results.length - 1] === result;

    if (result.status === 'passed') {
      if (test.results.length > 1) {
        // Test failed earlier but passed on retry -> FLAKY ONLY
        const firstFailure = test.results.find(r => r.status === 'failed' || r.status === 'timedOut');
        
        this.flakyTests.push({
          title: test.title,
          // Ensure we fallback to active project or 'E2E'
          project: test.projectName || this.activeProject, 
          error: firstFailure?.error?.message || 'Transient failure resolved on retry.',
          retryCount: test.results.length - 1,
        });

        // CRITICAL FIX: If Attempt #1 added this test to failedTests, remove it!
        this.failedTests = this.failedTests.filter(f => f.title !== test.title);
      } else {
        // Passed on Attempt #1 -> CLEAN PASS
        this.passedCount++;
      }
    } else if ((result.status === 'failed' || result.status === 'timedOut') && isLastAttempt) {
      // ONLY record as a hard failure if the FINAL attempt failed and it NEVER passed
      const hasAnyPass = test.results.some(r => r.status === 'passed');
      
      if (!hasAnyPass) {
        this.failedTests.push({
          title: test.title,
          project: test.projectName || this.activeProject,
          error: result.error?.message || 'No explicit error message provided.',
          retryCount: result.retry,
        });
      }
    }
  }

  /**
   * PLAYWRIGHT HOOK: Triggered after all test projects complete execution.
   */
  async onEnd(result: FullResult) {
    // --------------------------------------------------------------------------
    // STEP 1: AUTHENTICATION & CREDENTIAL CHECK
    // --------------------------------------------------------------------------
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;

    if (!slackToken || !channelId) {
      console.log('⚠️ [SlackReporter] Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID environment variables. Skipping notification dispatch.');
      return;
    }

    const slack = new WebClient(slackToken);
    const duration = formatDuration(Date.now() - this.startTime);
    const failedCount = this.failedTests.length;
    const flakyCount = this.flakyTests.length;
    const totalTests = this.passedCount + failedCount + flakyCount;

    // Helper text for test count breakdown (e.g., "Passed: 3 | Failed: 1 | Flaky: 0 | Total: 4")
    const summaryMarkdown = `*Passed:* \`${this.passedCount}\`  |  *Failed:* \`${failedCount}\`  |  *Flaky:* \`${flakyCount}\`  |  *Total:* \`${totalTests}\``;

    // --------------------------------------------------------------------------
    // CASE 1: ALL TESTS PASSED (Green Success Notification)
    // --------------------------------------------------------------------------
    if (failedCount === 0 && flakyCount === 0) {
      console.log('🎉 [SlackReporter] Suite passed! Dispatching success summary to Slack...');
      try {
        await slack.chat.postMessage({
          channel: channelId,
          text: `✅ All Tests Passed (${this.passedCount}/${totalTests})`, // Fallback mobile push text
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '✅ Test Suite Execution Passed',
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📊 *Execution Summary:*\n${summaryMarkdown}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Project:* \`${this.activeProject}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*Status:* \`PASSED\` 🟢`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Environment:* \`${process.env.NODE_ENV || 'staging'}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*Execution Time:* \`${duration}\``,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '⚡ *Quality Gate:* All endpoints returned expected HTTP responses with 0 regressions.',
                },
              ],
            },
            {
              type: 'divider',
            },
          ],
        });
        console.log('✅ [SlackReporter] Successfully posted PASS notification to Slack!');
      } catch (err: any) {
        console.error('❌ [SlackReporter] Failed to send success alert:', err.message);
      }
      return;
    }

    // --------------------------------------------------------------------------
    // CASE 2: FLAKY TESTS DETECTED (Self-Healed Alerts)
    // --------------------------------------------------------------------------
    if (flakyCount > 0) {
      console.log(`⚠️ [SlackReporter] Detected ${flakyCount} flaky test(s). Dispatching alerts...`);
      for (const flake of this.flakyTests) {
        try {
          await slack.chat.postMessage({
            channel: channelId,
            text: `⚠️ Flaky Test Detected - Passed: ${this.passedCount}, Failed: ${failedCount}, Flaky: ${flakyCount}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '⚠️ Flaky Test Detected (Self-Healed)',
                  emoji: true,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `📊 *Suite Status:*\n${summaryMarkdown}`,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Project:* \`${(flake.project || this.activeProject).toUpperCase()}\``,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Retries Needed:* \`${flake.retryCount}\``,
                  },
                ],
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Flaky Test Spec:*\n_${flake.title}_`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Initial Attempt Error Log:*\n\`\`\`${stripAnsiCodes(flake.error || '').substring(0, 600)}\`\`\``,
                },
              },
              {
                type: 'divider',
              },
            ],
          });
        } catch (err: any) {
          console.error('❌ [SlackReporter] Failed to send flaky alert:', err.message);
        }
      }
    }

    // --------------------------------------------------------------------------
    // CASE 3: HARD FAILURES (API & E2E)
    // --------------------------------------------------------------------------
    if (failedCount > 0) {
      console.log(`🤖 [SlackReporter] Dispatching ${failedCount} hard failure report(s)...`);

      for (const failure of this.failedTests) {
        try {
          const isApiTest = failure.project === 'api' || 
                            failure.title.includes('GET') || 
                            failure.title.includes('POST') || 
                            failure.title.includes('PUT') || 
                            failure.title.includes('DELETE');

          // --------------------------------------------------------------------
          // BRANCH 3A: HANDLE API / INTEGRATION TEST FAILURES
          // --------------------------------------------------------------------
          if (isApiTest) {
            await slack.chat.postMessage({
              channel: channelId,
              text: `🚨 API Failure - Passed: ${this.passedCount}, Failed: ${failedCount}, Total: ${totalTests}`,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '🚨 API Integration Test Failure Detected',
                    emoji: true,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `📊 *Suite Breakdown:*\n${summaryMarkdown}`,
                  },
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Project:* \`${(failure.project || 'API').toUpperCase()}\``,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Environment:* \`${process.env.NODE_ENV || 'staging'}\``,
                    },
                  ],
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Failed Spec / Endpoint:*\n_${failure.title}_`,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Error Log:*\n\`\`\`${stripAnsiCodes(failure.error || '').substring(0, 800)}\`\`\``,
                  },
                },
                {
                  type: 'divider',
                },
              ],
            });
            console.log('✅ [SlackReporter] Successfully delivered API failure alert to Slack!');
          } 
          // --------------------------------------------------------------------
          // BRANCH 3B: HANDLE UI & VISUAL REGRESSION FAILURES (AI TRIASED WITH FALLBACK)
          // --------------------------------------------------------------------
          else {
            const baselinePath = path.join(process.cwd(), 'tests', 'visual.spec.ts-snapshots', 'homepage-baseline-chromium-win32.png');
            const testResultsDir = path.join(process.cwd(), 'test-results');
            let actualPath = '';

            if (fs.existsSync(testResultsDir)) {
              const subdirs = fs.readdirSync(testResultsDir);
              for (const dir of subdirs) {
                const potentialFile = path.join(testResultsDir, dir, 'homepage-baseline-actual.png');
                if (fs.existsSync(potentialFile)) {
                  actualPath = potentialFile;
                  break;
                }
              }
            }

            const hasVisualSnapshots = fs.existsSync(baselinePath) && actualPath !== '' && fs.existsSync(actualPath);

            let messageDetails = '';

            if (hasVisualSnapshots) {
              console.log('📸 [SlackReporter] Visual snapshots found. Running AI Visual Diff Analysis...');
              const aiSummary = await analyzeVisualDiff(baselinePath, actualPath);
              messageDetails = `🤖 *AI Visual Diff Summary:*\n${aiSummary}`;
            } else {
              console.log('⚠️ [SlackReporter] No visual snapshots found for this failure. Formatting standard E2E error card...');
              messageDetails = `*Error Log:*\n\`\`\`${stripAnsiCodes(failure.error || '').substring(0, 800)}\`\`\``;
            }

            await slack.chat.postMessage({
              channel: channelId,
              text: `🚨 E2E Test Failure - Passed: ${this.passedCount}, Failed: ${failedCount}, Total: ${totalTests}`,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: hasVisualSnapshots ? '🎨 Visual Regression Failure Detected' : '🚨 E2E Functional Test Failure',
                    emoji: true,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `📊 *Suite Breakdown:*\n${summaryMarkdown}`,
                  },
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Project:* \`${(failure.project || this.activeProject).toUpperCase()}\``,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Environment:* \`${process.env.NODE_ENV || 'staging'}\``,
                    },
                  ],
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Failed Spec:*\n_${failure.title}_`,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: messageDetails,
                  },
                },
                {
                  type: 'divider',
                },
              ],
            });
            console.log('✅ [SlackReporter] Successfully delivered E2E failure alert to Slack!');
          }
        } catch (error: any) {
          console.error('❌ [SlackReporter] Error processing failure notification:', error.message);
        }
      }
    }
  }
}

export default SlackReporter;