const fs = require('fs');
const path = require('path');

async function uploadResults() {
  const resultsDir = path.join(__dirname, 'allure-results');
  if (!fs.existsSync(resultsDir)) {
    console.error('❌ allure-results directory does not exist!');
    return;
  }

  // 1. Define specs to skip in Allure
  const ignoredSpecs = ['failing-demo', 'flaky-demo'];

  const files = fs.readdirSync(resultsDir);
  const results = [];

  for (const file of files) {
    const filePath = path.join(resultsDir, file);
    if (fs.statSync(filePath).isFile()) {

      // 2. Filter out the specific demo specs if it's an Allure result JSON
      if (file.endsWith('-result.json')) {
        try {
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const json = JSON.parse(rawContent);

          const isIgnored = ignoredSpecs.some(spec => {
            const matchFullName = json.fullName && json.fullName.includes(spec);
            const matchLabels = json.labels && json.labels.some(l => l.value && l.value.includes(spec));
            return matchFullName || matchLabels;
          });

          if (isIgnored) {
            console.log(`🙈 Skipping ${file} (${ignoredSpecs.find(s => filePath.includes(s) || rawContent.includes(s))}) from Allure upload.`);
            continue; // Skip pushing this file to the results array
          }
        } catch (e) {
          // If JSON parsing fails for any reason, continue safely
        }
      }

      const content = fs.readFileSync(filePath, { encoding: 'base64' });
      results.push({
        file_name: file,
        content_base64: content
      });
    }
  }

  console.log(`📦 Packaging ${results.length} files...`);

  // Send raw base64 payload directly to Allure API
  const response = await fetch('http://localhost:5050/allure-docker-service/send-results?project_id=default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results })
  });

  const resJson = await response.json();
  console.log('🚀 Upload status:', resJson.meta_data?.message || resJson);

  // Trigger report generation
  const genResponse = await fetch('http://localhost:5050/allure-docker-service/generate-report?project_id=default');
  const genJson = await genResponse.json();
  console.log('📊 Report generation status:', genJson.meta_data?.message || genJson);
}

uploadResults().catch(console.error);