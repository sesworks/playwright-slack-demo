## 🎭 Playwright Automation Framework + AI Slack ChatOps & Allure Docker

[![Playwright Tests](https://github.com/sesworks/playwright-slack-demo/actions/workflows/playwright.yml/badge.svg)](https://github.com/sesworks/playwright-slack-demo/actions/workflows/playwright.yml)
![Playwright](https://img.shields.io/badge/Playwright-v1.40+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Allure Report](https://img.shields.io/badge/Allure-Docker--Service-ff69b4.svg)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blueviolet)

An enterprise-grade, full-stack test automation framework built with **Playwright**, **TypeScript**, and **Page Object Model (POM)** pattern. Features automated **API contract testing**, **UI E2E testing**, **visual regression testing with AI diff analysis**, custom **Slack ChatOps notifications**, and real-time report visualization via **Allure Docker Service**.

---


## 🏗️ Architecture & Features

* 🧪 **Full-Stack Coverage**:
  * **API Layer**: Fast REST endpoint validation and JSON schema assertions (`Zod` / contract testing).
  * **E2E UI Layer**: Modular Page Object Model architecture (`BasePage`, `HomePage`, `DocsPage`).
* 🎨 **Visual Regression & AI Analysis**:
  * Snapshot testing for UI pixel shifts across viewports.
  * Custom **Google Gemini Vision API integration** (`scripts/ai-diff-analyzer.ts`) to auto-summarize visual discrepancies directly in failure alerts.
* 📊 **Allure Docker Dashboards**:
  * Automated JSON result packaging and REST API upload pipeline (`upload-allure.js`).
  * Instant trends, metrics, and execution breakdown hosted locally or in CI/CD.
* 🤖 **Smart Slack ChatOps Reporter & Bot**:
  * Custom Playwright reporter (`slack-reporter.ts`) dispatching rich Block Kit cards to Slack channels.
  * Standalone Bolt Socket Mode server (`server.js`) handling `/test-smoke` slash commands to trigger workflows on demand.
  * Real-time metrics breakdown (API vs E2E test counts, flakiness detection, self-healing retries).
* ⚙️ **CI/CD Pipeline**:
  * **GitHub Actions** orchestration on `push`, `pull_request`, and dynamic `repository_dispatch` webhooks.

---

## 📁 Repository Structure

```text
playwright-slack-demo/
├── .github/workflows/      # GitHub Actions CI/CD workflows
├── scripts/                # AI Visual Diff Analyzer (Gemini Vision API)
├── tests/
│   ├── api/                # API Integration tests, helpers & JSON schemas
│   │   ├── helpers/
│   │   └── schemas/
│   └── e2e/                # E2E Web tests, POM objects & visual snapshots
│       └── pages/
├── playwright.config.ts    # Core Playwright configuration
├── slack-reporter.ts       # Custom Slack Block Kit ChatOps reporter
├── server.js               # Slack Socket Mode Bot Server (ChatOps listener)
├── trigger-tests.js        # Repository Dispatch trigger script
└── upload-allure.js        # Payload packager & Allure Docker REST uploader
```


## 🚀 Getting Started
### Prerequisites
```text
Node.js: v18.x or higher

npm: v9.x or higher

Docker Desktop: Running locally for Allure containerization

1. Installation
git clone [https://github.com/sesworks/playwright-slack-demo.git](https://github.com/sesworks/playwright-slack-demo.git)
cd playwright-slack-demo
npm ci
npx playwright install --with-deps

2. Environment Configuration
Create a .env file in the root directory:
# Slack Socket Mode Credentials
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_APP_TOKEN=xapp-your-slack-app-token
SLACK_CHANNEL_ID=C0123456789

# AI Visual Regression Analysis
GEMINI_API_KEY=your-gemini-vision-api-key

# Execution Settings
NODE_ENV=staging
ALLURE_DOCKER_URL=http://localhost:5050
```

## 🐳 Allure Docker Setup
Start the local Allure Docker container before running reporting scripts:
docker run -d --name allure-service -p 5050:5050 -e CHECK_RESULTS_EVERY_SECONDS=NONE -e KEEP_HISTORY=1 felipenero/allure-docker-service

### 📊 Dashboard URL: http://localhost:5050/allure-docker-service/latest-report
### ⚡ API Endpoint: http://localhost:5050/allure-docker-service



## 🧪 Running Tests Locally
```text

Command                                   Description
npx playwright test                       Run all API & E2E tests in headless mode
npm run test:report                       Execute test suite, trigger Slack alerts, filter demo specs, and upload results to Allure Docker
npm run upload                            Manually package and upload existing allure-results/ to Allure Docker
npx playwright test --project=api         Execute API Integration tests only
npx playwright test --project=e2e         Execute E2E Web UI tests only
npx playwright test --ui,Open             Playwright Interactive UI Mode
npx playwright test --update-snapshots    Auto-generate / update visual snapshot baselines
npx playwright show-report                Open offline Playwright HTML execution report
```


## 🤖 Slack ChatOps Bot Server
### To listen for slash commands directly from your Slack workspace:
node server.js
### Available Commands in Slack
/test-smoke [environment]: Triggers Playwright smoke tests (e.g., /test-smoke staging). Responds instantly in-channel via Socket Mode.



## 📊 CI/CD & Slack Reporting Example
### When a pipeline completes in GitHub Actions, SlackReporter automatically dispatches structured summary cards:
✅ Full-Stack Test Suite Execution Passed

📊 Execution Summary:
Passed: 14 | Failed: 0 | Flaky: 0 | Total: 14

Project Breakdown:
• API: 3 passed
• E2E: 11 passed

Project(s): API, E2E | Status: PASSED 🟢
Environment: staging | Execution Time: 11.06s

⚡ Quality Gate: All API contracts verified & UI workflows completed with 0 visual regressions.
