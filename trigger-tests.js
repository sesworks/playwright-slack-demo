// ============================================================================
// GITHUB ACTIONS CHATOPS WORKFLOW TRIGGER SCRIPT
// ============================================================================
// This script acts as an automated bridge between local CLI / Slack Socket Mode 
// server and the GitHub Actions REST API.
//
// It issues an authenticated HTTP POST request to GitHub's `repository_dispatch`
// endpoint to trigger the Playwright E2E & API test pipeline on demand.
// ============================================================================

// ----------------------------------------------------------------------------
// CONFIGURATION & ENVIRONMENT VARIABLES
// ----------------------------------------------------------------------------

require('dotenv').config();

/**
 * Target GitHub account / organization owner name.
 */
const OWNER = 'sesworks';

/**
 * Target GitHub repository name containing the Playwright workflow.
 */
const REPO = 'playwright-slack-demo';

/**
 * Personal Access Token (PAT) with repository write permissions.
 * Read directly from system environment or local `.env` configuration.
 */
const GITHUB_TOKEN = process.env.GITHUB_PAT;

// ----------------------------------------------------------------------------
// DISPATCH UTILITY FUNCTION
// ----------------------------------------------------------------------------

/**
 * Dispatches a custom `repository_dispatch` webhook event to GitHub API.
 *
 * @param {string} environment - Target deployment environment ('staging', 'production', etc.)
 * @returns {Promise<void>}
 */
async function triggerSmokeTests(environment = 'staging') {
  // Guard Clause: Verify GitHub PAT authentication token exists before attempting network request
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_PAT environment variable is missing.');
    return;
  }

  /**
   * REST API Endpoint for triggering GitHub Actions repository dispatch events:
   * https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
   */
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`;

  try {
    // Dispatch authenticated POST request using native Fetch API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        // Bearer authentication payload passing Personal Access Token
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        
        // Recommended GitHub API headers specifying JSON media type schema version
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // MUST match the event_type specified in .github/workflows/playwright.yml under repository_dispatch.types
        event_type: 'run-smoke-tests',
        
        // Custom key-value dictionary injected into github.event.client_payload in GitHub Actions runner
        client_payload: { environment },
      }),
    });

    /**
     * GitHub API standard response handling:
     * - HTTP 204 (No Content): Dispatch event accepted and workflow queued successfully.
     * - Any other HTTP status: Authentication, permission, or payload error occurred.
     */
    if (response.status === 204) {
      console.log(`🚀 Successfully triggered Playwright smoke suite on [${environment}]!`);
    } else {
      console.error(`❌ Failed to trigger GitHub Action: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    // Capture network layer failures, DNS issues, or connection timeouts
    console.error(`❌ Network error while connecting to GitHub API:`, error.message);
  }
}

// ----------------------------------------------------------------------------
// SCRIPT ENTRY POINT (CLI EXECUTION)
// ----------------------------------------------------------------------------

/**
 * Parse optional environment parameter from CLI arguments (e.g., `node trigger-tests.js production`).
 * Defaults to 'staging' if omitted.
 */
const targetEnv = process.argv[2] || 'staging';

// Execute trigger workflow
triggerSmokeTests(targetEnv);