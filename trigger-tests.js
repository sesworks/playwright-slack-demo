// Lightweight script to trigger GitHub Actions Playwright workflow via GitHub API
const OWNER = 'sesworks'; // Your GitHub Username
const REPO = 'playwright-slack-demo'; // Your Repository Name
const GITHUB_TOKEN = process.env.GITHUB_PAT; // Your GitHub PAT

async function triggerSmokeTests(environment = 'staging') {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_PAT environment variable is missing.');
    return;
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'run-smoke-tests', // Matches repository_dispatch in workflow
      client_payload: { environment },
    }),
  });

  if (response.status === 204) {
    console.log(`🚀 Successfully triggered Playwright smoke suite on [${environment}]!`);
  } else {
    console.error(`❌ Failed to trigger GitHub Action: ${response.status} ${response.statusText}`);
  }
}

// Execute trigger
const targetEnv = process.argv[2] || 'staging';
triggerSmokeTests(targetEnv);