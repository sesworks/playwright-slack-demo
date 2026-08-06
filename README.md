# 🎭 Playwright Automation Framework + AI Slack ChatOps

[![Playwright Tests](https://github.com/sesworks/playwright-slack-demo/actions/workflows/playwright.yml/badge.svg)](https://github.com/sesworks/playwright-slack-demo/actions/workflows/playwright.yml)
![Playwright](https://img.shields.io/badge/Playwright-v1.40+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blueviolet)

An enterprise-grade, full-stack test automation framework built with **Playwright**, **TypeScript**, and **Page Object Model (POM)** pattern. Features automated **API contract testing**, **UI E2E testing**, **visual regression testing with AI diff analysis**, and custom **Slack ChatOps notifications**.

---

## 🏗️ Architecture & Features

* 🧪 **Full-Stack Coverage**:
  * **API Layer**: Fast REST endpoint validation and JSON schema assertions (`Zod` / contract testing).
  * **E2E UI Layer**: Modular Page Object Model architecture (`BasePage`, `HomePage`, `DocsPage`).
* 🎨 **Visual Regression & AI Analysis**:
  * Snapshot testing for UI pixel shifts across viewports.
  * Custom **Google Gemini Vision API integration** (`scripts/ai-diff-analyzer.ts`) to auto-summarize visual discrepancies directly in failure alerts.
* 🤖 **Smart Slack ChatOps Reporter**:
  * Custom Playwright reporter (`slack-reporter.ts`) dispatching rich Block Kit cards to Slack.
  * Real-time metrics breakdown (API vs E2E test counts, flakiness detection, self-healing retries).
* ⚙️ **CI/CD Pipeline**:
  * **GitHub Actions** orchestration on `push`, `pull_request`, and dynamic `repository_dispatch` webhooks.

---

## 📁 Repository Structure

```text
playwright-slack-demo/
├── .github/workflows/     # GitHub Actions CI/CD workflows
├── scripts/               # AI Visual Diff Analyzer (Gemini Vision API)
├── tests/
│   ├── api/               # API Integration tests, helpers & JSON schemas
│   │   ├── helpers/
│   │   └── schemas/
│   └── e2e/               # E2E Web tests, POM objects & visual snapshots
│       └── pages/
├── playwright.config.ts   # Core Playwright configuration
├── slack-reporter.ts      # Custom Slack Block Kit ChatOps reporter
├── server.js              # Slack Socket Mode Bot Server (ChatOps)
└── trigger-tests.js       # Repository Dispatch trigger script

🚀 Getting Started
Prerequisites
Node.js: v18.x or higher

npm: v9.x or higher

1. Installation
Clone the repository and install dependencies:
git clone [https://github.com/sesworks/playwright-slack-demo.git](https://github.com/sesworks/playwright-slack-demo.git)
cd playwright-slack-demo
npm ci
npx playwright install --with-deps

2. Environment Configuration
Create a .env file in the root directory:
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C0123456789
GEMINI_API_KEY=your-gemini-vision-api-key
NODE_ENV=staging

🧪 Running Tests Locally
Command                                 ,Description
npx playwright test                     ,Run all API & E2E tests in headless mode
npx playwright test --project=api       ,Execute API Integration tests only
npx playwright test --project=e2e       ,Execute E2E Web UI tests only
npx playwright test --ui                ,Open Playwright Interactive UI Mode
npx playwright test --update-snapshots  ,Auto-generate / update visual snapshot baselines
npx playwright show-report              ,Open offline HTML execution report

📊 CI/CD & Slack Reporting Example
When a pipeline completes in GitHub Actions, SlackReporter automatically dispatches structured summary cards:
✅ Full-Stack Test Suite Execution Passed

📊 Execution Summary:
Passed: 14 | Failed: 0 | Flaky: 0 | Total: 14

Project Breakdown:
• API: 3 passed
• E2E: 11 passed

Project(s): API, E2E | Status: PASSED 🟢
Environment: staging | Execution Time: 11.06s

⚡ Quality Gate: All API contracts verified & UI workflows completed with 0 visual regressions.
