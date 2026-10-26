# Contributing to PromptPay Guard

Thank you for your interest in contributing to **PromptPay Guard**, an open-source Zero-Trust payment firewall engineered for autonomous AI agents settling via PayPal Orders API v2.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher (Tested on `v24.15.0`)
- **npm**: `v10.0.0` or higher
- **PayPal Sandbox Account**: [developer.paypal.com](https://developer.paypal.com)
- **Google AI Studio Key**: [aistudio.google.com](https://aistudio.google.com) (Optional: Local fallback kernel included)

### 2. Local Installation
```bash
# Clone the repository
git clone https://github.com/kanangandhi93/promptpay-guard.git
cd promptpay-guard

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start server in development mode (with file watcher)
npm run dev
```

The real-time telemetry dashboard will be accessible at `http://localhost:3000`.

---

## 🧪 Running the Test Suite

PromptPay Guard maintains an exhaustive automated testing suite with **52 passing tests**. Before submitting a pull request, ensure all tests pass:

```bash
# 1. PRD Core Functional Test Cases (TC-POS-01..03, TC-NEG-01..06)
npm run test:all

# 2. Defensive Security & Penetration Audit (18 tests)
npm run test:security

# 3. Fail-Secure Gateway Resilience (5 tests)
npm run test:resilience

# 4. Dynamic Model Switching & Telemetry Metrics (7 tests)
npm run test:models

# 5. Audit Ledger, PayPal Webhook & HITL Triaging Suite (13 tests)
npm run test:audit

# 6. Concurrency & Throughput Stress Testing
npm run test:load
```

---

## 📐 Coding Standards & Guidelines

- **ES Modules:** Use native ECMAScript Modules (`import` / `export`), adhering to `"type": "module"` in `package.json`.
- **Zero-Trust Principle:** All input parameters (`amount`, `agent_id`, `recipient_email`, `context_window`) must pass strict Tier-1 boundary validation before invoking any external API or LLM.
- **Fail-Secure Architecture:** Any unexpected exception, upstream network failure, or malformed AI response must safely drop the transaction (`503/504/403`) and never fail open.
- **No Secrets in Logs:** Never log or serialize `PAYPAL_CLIENT_SECRET` or `GEMINI_API_KEY` into SSE events or audit ledgers.

---

## 🔀 Pull Request Process

1. Fork the repository and create a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, modular code with accompanying unit/integration tests in the `tests/` directory.
3. Commit your changes with clear, descriptive commit messages adhering to [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(hitl): add multi-agent dual authorization threshold"
   ```
4. Verify all tests pass locally (`npm run test:all`, `npm run test:security`, `npm run test:audit`).
5. Push to your fork and submit a Pull Request to `main`.
