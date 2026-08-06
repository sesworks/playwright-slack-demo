// ============================================================================
// IMPORTS
// ============================================================================
import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { WebClient } from '@slack/web-api';
import { analyzeVisualDiff } from './scripts/ai-diff-analyzer';
import fs from 'fs';
import path from 'path';

// ============================================================================
// HELPER UTILITIES
// ============================================================================
function stripAnsiCodes(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function formatDuration(ms: number): string {
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface TestIssue {
  title: string;
  project: string;
  error?: string;
  retryCount: number;
}

// ============================================================================
// MAIN REPORTER CLASS
// ============================================================================
class SlackReporter implements Reporter {
  private failedTests: TestIssue[] = [];
  private flakyTests: TestIssue[] = [];
  private passedCount = 0;
  
  // Per-project counters
  private apiPassedCount = 0;
  private e2ePassedCount = 0;
  
  private startTime = 0;
  private projectsRun = new Set<string>();

  onBegin() {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const isApiFile = test.location.file.includes('tests/api') || test.location.file.includes('tests\\api');
    
    const resolvedProject = test.projectName 
      ? test.projectName.toUpperCase() 
      : (isApiFile ? 'API' : 'E2E');

    this.projectsRun.add(resolvedProject);

    const isLastAttempt = test.results[test.results.length - 1] === result;

    if (result.status === 'passed') {
      if (test.results.length > 1) {
        const firstFailure = test.results.find(r => r.status === 'failed' || r.status === 'timedOut');
        
        this.flakyTests.push({
          title: test.title,
          project: resolvedProject, 
          error: firstFailure?.error?.message || 'Transient failure resolved on retry.',
          retryCount: test.results.length - 1,
        });

        this.failedTests = this.failedTests.filter(f => f.title !== test.title);
      } else {
        // Clean Pass
        this.passedCount++;
        
        // Track per-project passes
        if (resolvedProject === 'API') {
          this.apiPassedCount++;
        } else {
          this.e2ePassedCount++;
        }
      }
    } else if ((result.status === 'failed' || result.status === 'timedOut') && isLastAttempt) {
      const hasAnyPass = test.results.some(r => r.status === 'passed');
      
      if (!hasAnyPass) {
        this.failedTests.push({
          title: test.title,
          project: resolvedProject,
          error: result.error?.message || 'No explicit error message provided.',
          retryCount: result.retry,
        });
      }
    }
  }

  async onEnd(result: FullResult) {
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

    const projectsArray = Array.from(this.projectsRun);
    const formattedProjects = projectsArray.length > 0 ? projectsArray.join(', ') : 'E2E';

    // Build project breakdown string (e.g. "API: 3 passed | E2E: 11 passed")
    const projectBreakdown = `• *API:* \`${this.apiPassedCount}\` passed\n• *E2E:* \`${this.e2ePassedCount}\` passed`;

    const summaryMarkdown = `*Passed:* \`${this.passedCount}\`  |  *Failed:* \`${failedCount}\`  |  *Flaky:* \`${flakyCount}\`  |  *Total:* \`${totalTests}\``;

    // --------------------------------------------------------------------------
    // CASE 1: ALL TESTS PASSED
    // --------------------------------------------------------------------------
    if (failedCount === 0 && flakyCount === 0) {
      console.log('🎉 [SlackReporter] Suite passed! Dispatching success summary to Slack...');
      
      const hasApi = this.projectsRun.has('API');
      const hasE2e = this.projectsRun.has('E2E');

      let passHeaderTitle = '✅ Test Suite Execution Passed';
      let qualityGateText = '⚡ *Quality Gate:* All workflows passed with 0 regressions.';

      if (hasApi && hasE2e) {
        passHeaderTitle = '✅ Full-Stack Test Suite Execution Passed';
        qualityGateText = '⚡ *Quality Gate:* All API contracts verified & UI workflows completed with 0 visual regressions.';
      } else if (hasApi) {
        passHeaderTitle = '✅ API Integration Test Passed';
        qualityGateText = '⚡ *Quality Gate:* All endpoints returned expected HTTP responses with 0 regressions.';
      } else if (hasE2e) {
        passHeaderTitle = '✅ E2E Test Suite Execution Passed';
        qualityGateText = '⚡ *Quality Gate:* All UI workflows completed successfully with 0 visual regressions.';
      }

      try {
        await slack.chat.postMessage({
          channel: channelId,
          text: `✅ All Tests Passed (${this.passedCount}/${totalTests})`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: passHeaderTitle,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📊 *Execution Summary:*\n${summaryMarkdown}\n\n*Project Breakdown:*\n${projectBreakdown}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Project(s):* \`${formattedProjects}\``,
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
                  text: qualityGateText,
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
    // CASE 2: FLAKY TESTS DETECTED
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
                    text: `*Project:* \`${flake.project.toUpperCase()}\``,
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
    // CASE 3: HARD FAILURES
    // --------------------------------------------------------------------------
    if (failedCount > 0) {
      console.log(`🤖 [SlackReporter] Dispatching ${failedCount} hard failure report(s)...`);

      for (const failure of this.failedTests) {
        try {
          const isApiTest = failure.project === 'API' || 
                            failure.title.includes('GET') || 
                            failure.title.includes('POST') || 
                            failure.title.includes('PUT') || 
                            failure.title.includes('DELETE');

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
                      text: `*Project:* \`${failure.project.toUpperCase()}\``,
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
          } else {
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
                      text: `*Project:* \`${failure.project.toUpperCase()}\``,
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