# 🛡️ PromptPay Guard

<div align="center">

**Zero-Trust Low-Latency Security Firewall for Autonomous AI Agent Payments on PayPal Orders API v2**

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B%20%7C%20v24.15-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PayPal Orders API](https://img.shields.io/badge/PayPal-Orders%20API%20v2-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://developer.paypal.com/docs/api/orders/v2/)
[![Google Gemini](https://img.shields.io/badge/Gemini-1.5%20Flash%20%26%20Pro-8E75C2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Test Suite](https://img.shields.io/badge/Tests-60%2F60%20Passing%20(100%25)-10B981?style=for-the-badge&logo=checkmarx&logoColor=white)](#-automated-testing--verification-suites)
[![OpEx Savings](https://img.shields.io/badge/OpEx%20Savings-98.8%25%20vs%20Frontier-06B6D4?style=for-the-badge&logo=googlecloud&logoColor=white)](#-cost-profiling--financial-unit-economics)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)
[![Watch on YouTube](https://img.shields.io/badge/▶%20Watch%20Demo-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/2_1kc6dqQbE)
[![Watch on Loom](https://img.shields.io/badge/▶%20Watch%20Demo-Loom-E25950?style=for-the-badge&logo=loom&logoColor=white)](https://www.loom.com/share/7d3de0a2bc9f4cd8be16d7e94b46700a)

*Built for the **PayPal AI Hackathon 2026** • Autonomous Agent Commerce & FinTech Track*

[📺 Watch on YouTube](https://youtu.be/2_1kc6dqQbE) • [🎥 Watch on Loom](https://www.loom.com/share/7d3de0a2bc9f4cd8be16d7e94b46700a) • [Why Gemini 1.5?](#-why-google-gemini-15) • [Edge Cases Defense](#️-overcoming-architectural-blind-spots--edge-cases) • [Screenshots](#-live-dashboard--defense-screenshots) • [Live Dashboard](#-interactive-telemetry-dashboard--simulator) • [Architecture](#-system-architecture--request-lifecycle) • [3-Zone Risk Engine](#-3-zone-operational-risk-engine--radial-gauge) • [Quickstart](#-quickstart-guide) • [API Reference](#-complete-api-reference)

</div>

---

## 🎬 Video Walkthrough & Interactive Demo

[![Watch Demo on YouTube](https://img.shields.io/badge/▶%20Watch%20Demo%20on%20YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/2_1kc6dqQbE)
[![Watch Demo on Loom](https://img.shields.io/badge/▶%20Watch%20Full%20Demo%20on%20Loom-7d3de0-625df5?style=for-the-badge&logo=loom&logoColor=white)](https://www.loom.com/share/7d3de0a2bc9f4cd8be16d7e94b46700a)

> 📹 **YouTube Walkthrough:** [https://youtu.be/2_1kc6dqQbE](https://youtu.be/2_1kc6dqQbE)  
> 📹 **Loom Interactive Walkthrough:** [https://www.loom.com/share/7d3de0a2bc9f4cd8be16d7e94b46700a](https://www.loom.com/share/7d3de0a2bc9f4cd8be16d7e94b46700a)
> 
> *Demonstrates the Two-Tier Zero-Trust pipeline, 5 live attack vector simulations, SVG radial gauge animations, Human-in-the-Loop triaging overrides, and settlement verification with PayPal Orders API v2.*

---

## 📌 Problem Statement: The Autonomous Agent Dilemma

As autonomous AI agents (AutoGPT, LangChain, CrewAI, Claude Computer Use) transition from informational assistants to **economic actors**, they are granted delegated authority to execute financial settlements. However, standard OAuth access tokens and API keys authenticate the *client software*, not the *legitimacy of the intent*.

This introduces severe financial vulnerabilities:

1. **Adversarial Prompt Injection & Context Smuggling:** Malicious instructions injected into invoice text, web scrapes, or customer prompts can deceive an agent into overriding its budget and routing corporate capital to unauthorized escrow accounts.
2. **Salami Micro-Drain Attacks:** High-frequency autonomous loops executing rapid sub-dollar micro-transactions ($0.99) designed to fly beneath traditional batch auditing thresholds.
3. **Vendor Spoofing & Typo-Squatting Homoglyphs:** Subtle visual homoglyphs (e.g. `billing@amaz0n-billing.net` vs `billing@amazon.com`) deceive vision/scraping agents into settling invoices to fraudulent payees.
4. **Astronomical LLM Inference OpEx:** Running monolithic frontier models (GPT-4 or Claude 3.5 Sonnet at ~$0.00235/tx) to inspect 100% of incoming volumetric traffic imposes unsustainable operational costs on FinTech platforms.

---

## 💡 The Solution: Two-Tier Zero-Trust Payment Firewall

**PromptPay Guard** operates as a high-throughput, low-latency Reverse Proxy positioned directly upstream of the **PayPal Orders API v2**. It enforces deterministic programmatic constraints before invoking cost-efficient micro-LLM semantic verification:

* **⚡ Tier-1 In-Memory Fast Heuristics (<1ms | $0.00 Cost):** Evaluates strict schema types, atomic sliding-window rate limiting (Salami defense), single & cumulative daily budget ceilings, and exact regex vendor whitelists with homoglyph detection. Absorbs **~38% of malicious traffic at zero LLM cost**.
* **🧠 Tier-2 Semantic Intent Engine (~180ms | Gemini 1.5):** Compares the user's declared business intent against the agent's live reasoning scratchpad and context window to detect prompt injections, role reversals, and semantic divergence.
* **🎯 3-Zone Operational Risk Model:** Categorizes transactions into **Low Risk (0–30: Autonomous Clearance)**, **Medium Risk (31–70: HITL Triaging Suspended)**, and **Critical Risk (71–100: Instant Adversarial Drop)**.
* **👤 Human-in-the-Loop (HITL) Triaging State Machine:** Suspends ambiguous payments and allows authorized administrators to approve (`POST /api/v1/pay/override`) or reject transactions before PayPal execution.
* **📜 Immutable Compliance Ledger:** Preserves complete audit trails with 1-click **RFC 4180 CSV** and **JSON** export endpoints.
* **📡 Real-Time PayPal Webhooks:** Asynchronously tracks `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DECLINED`, and `PAYMENT.CAPTURE.DENIED` callbacks with cryptographic transmission header authentication and replay protection.
* **🔁 Enterprise Idempotency Protection:** Caches evaluated responses for 120 seconds via `x-idempotency-key`, short-circuiting replays with `x-cache: HIT` and zero duplicate PayPal orders.
* **🛡️ Context Truncation & Token Exhaustion Defense:** Binds incoming `raw_context` to max 4,000 characters, returning HTTP 413 `BLOCKED_T1` at $0.00 compute before touching LLMs.
* **💾 State Persistence Fallback:** Automatically serializes budget spend and pending HITL queues to `.cache/runtime-state.json` on `SIGINT`/`SIGTERM` and rehydrates on startup.

---

## 🚀 Benefits of this Middleware Architecture

Positioned as an intelligent reverse proxy directly between autonomous agents and the **PayPal Orders API v2**, PromptPay Guard offers distinct advantages:

1. **Deterministic Speed (<0.5ms):** Over 38% of malicious payloads, rate-limit violations, and typo-squatted merchants are dropped in Tier-1 in under 0.5ms before ever hitting an LLM or network gateway.
2. **Massive Cost Optimization (98.8% Savings):** Prevents wasteful token burn by executing semantic AI analysis only on pre-sanitized payloads.
3. **Human-in-the-Loop (HITL) Governance:** Empowers compliance teams with a 3-zone risk model—suspending medium-risk actions (31–70 risk score) for 1-click manual admin approval or instant cancellation.
4. **Regulatory Auditability:** Automatically maintains an immutable, tamper-evident compliance ledger with 1-click exports to standard RFC 4180 CSV and JSON formats.
5. **Fail-Secure Architecture:** If external LLM or network providers experience outages or timeouts, the gateway defaults to blocking execution rather than passing unchecked payments.

---

## 🧠 Why Google Gemini 1.5?

Rather than using generic, expensive frontier models, **PromptPay Guard** was specifically architected around the **Gemini 1.5 model family** (Flash & Pro):

* **Sub-Cent Unit Economics:** Gemini 1.5 Flash costs only **$0.075 / 1M input** and **$0.30 / 1M output tokens**, allowing high-frequency payment gateways to perform deep semantic checks for fractions of a cent. This is the cornerstone of our **98.8% OpEx reduction**.
* **Dynamic Model Tiering:** Routine micro-transactions are evaluated by Gemini 1.5 Flash for sub-200ms latency, while high-value or ambiguous transactions dynamically route to Gemini 1.5 Pro for multi-step reasoning.
* **Native JSON Schema Enforcement:** Gemini’s structured output guarantees deterministic JSON responses (`risk_score`, `threat_type`, `rationale`) without hallucinated markdown formatting, preventing downstream pipeline parsing crashes.
* **Context Scratchpad Ingestion:** Effortlessly digests lengthy agent reasoning scratchpads, invoices, and system prompt contexts in a single pass to spot covert goal deviation.

---

## 🏛️ System Architecture & Request Lifecycle

<p align="center">
  <img src="docs/promptpay-guard-architecture.png" alt="PromptPay Guard Architecture: Two-Tier Zero-Trust Gateway for Autonomous Agent Payments" width="100%" />
</p>

```mermaid
flowchart TD
    classDef agent fill:#1e293b,stroke:#06b6d4,stroke-width:2px,color:#fff;
    classDef t1 fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef t2 fill:#0f172a,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef hitl fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef pp fill:#082f49,stroke:#0284c7,stroke-width:2px,color:#fff;
    classDef drop fill:#4c0519,stroke:#e11d48,stroke-width:2px,color:#fff;
    classDef audit fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;

    Agent["🤖 Autonomous AI Agent<br/>(AutoGPT / LangChain / CrewAI)"]:::agent
    Agent -->|"POST /api/v1/pay"| Ingress["🛡️ PromptPay Guard Ingress<br/>Helmet CSP • 512KB Bound • Express"]

    subgraph Tier1["⚡ Tier-1: Heuristics & Boundary Engine (<1ms | $0.00 Cost)"]
        T1_Schema["1.1 Strict Type & Finite Sanity<br/>(Rejects NaN, Exp 1e5, Sub-cents)"]
        T1_Budget["1.2 Budget Guard<br/>(Single Cap $100 • Daily Cap $500)"]
        T1_Velocity["1.3 Sliding-Window Rate Limiter<br/>(5 tx / 60s Atomic Salami Defense)"]
        T1_Vendor["1.4 Anti-Spoof Vendor Whitelist<br/>(Exact Domain & Homoglyph Checker)"]
    end

    Ingress --> T1_Schema --> T1_Budget --> T1_Velocity --> T1_Vendor

    T1_Vendor -->|"Policy Violation Detected"| DropT1["🛑 HTTP 403 / 429 Drop<br/>Zero Token Burn • $0.00 Marginal Cost"]:::drop

    subgraph Tier2["🧠 Tier-2: Semantic Intent Engine (Gemini 1.5 Flash / Pro)"]
        T2_Prompt["2.1 Calibrated Intent Evaluation<br/>(Declared Intent vs. Agent Context)"]
        T2_Zone["2.2 Threat Score Resolution (0-100)"]
    end

    T1_Vendor -->|"Tier-1 Cleared"| T2_Prompt --> T2_Zone

    subgraph Zones["🎯 3-Zone Operational Decision Engine"]
        Zone_Low["🟢 Zone 1: LOW RISK (0-30)<br/>Autonomous Clearance"]
        Zone_Med["🟡 Zone 2: MEDIUM RISK (31-70)<br/>Suspends Execution for HITL"]:::hitl
        Zone_Crit["🔴 Zone 3: CRITICAL RISK (71-100)<br/>Adversarial Threat Intercepted"]:::drop
    end

    T2_Zone --> Zone_Low
    T2_Zone --> Zone_Med
    T2_Zone --> Zone_Crit

    Zone_Crit -->|"Prompt Injection Detected"| DropT2["🛑 HTTP 403 Forbidden<br/>Zero PayPal API Overhead"]:::drop

    Zone_Med -->|"Awaiting Admin 2FA"| HITL_Store["📦 Suspended Pending Store<br/>(pendingHitlStore Map)"]:::hitl
    HITL_Store -->|"POST /api/v1/pay/override"| HITL_Action{"Admin Action"}:::hitl
    HITL_Action -->|"APPROVE"| PayPal_API
    HITL_Action -->|"REJECT"| DropHITL["🛑 Dropped by Admin"]:::drop

    subgraph Settlement["💳 PayPal Settlement Network"]
        PayPal_API["PayPal Orders API v2<br/>OAuth 2.0 • /v2/checkout/orders"]:::pp
        PayPal_Capture["Capture Order Settlement<br/>/v2/checkout/orders/{id}/capture"]:::pp
        PayPal_Hook["📡 PayPal Webhook Listener<br/>ID: 7F072555EA7227937<br/>COMPLETED • DECLINED • DENIED"]:::pp
    end

    Zone_Low -->|"Direct Permit"| PayPal_API
    PayPal_API --> PayPal_Capture
    PayPal_Capture -->|"Webhook Callback"| PayPal_Hook

    subgraph Compliance["📜 Compliance & Observability Layer"]
        Ledger["Immutable Compliance Ledger Store<br/>RFC 4180 CSV & JSON Export"]:::audit
        Telemetry["SSE Real-Time Telemetry Stream<br/>/api/v1/telemetry/stream"]:::audit
        Metrics["Unit Cost & Financial Telemetry<br/>/api/v1/metrics"]:::audit
    end

    DropT1 --> Ledger
    DropT2 --> Ledger
    PayPal_Capture --> Ledger
    PayPal_Hook --> Ledger
    Ledger --> Telemetry
    Ledger --> Metrics
```

---

## 🎯 3-Zone Operational Risk Engine & Radial Gauge

PromptPay Guard replaces legacy binary pass/fail filters with an enterprise **3-Zone Risk Operational Engine**:

```
[ 0 ----------------- 30 ] [ 31 ----------------- 70 ] [ 71 ---------------- 100 ]
     🟢 LOW RISK                 🟡 MEDIUM RISK                🔴 CRITICAL RISK
  Autonomous Clearance           HITL Triaging Required       Instant Adversarial Drop
  Direct PayPal Capture          Execution Suspended          Zero PayPal API Overhead
```

| Operational Zone | Threat Score | Security Verdict | UI Radial Gauge | PayPal Settlement Behavior |
| :--- | :---: | :--- | :--- | :--- |
| **Zone 1: LOW RISK** | `0 – 30` | **Autonomous Clearance** | 🟢 Emerald (`0-30 LOW`) | **Direct PayPal Capture**: Settle immediately via Orders API v2. |
| **Zone 2: MEDIUM RISK** | `31 – 70` | **HITL Triaging Required** | 🟡 Amber (`31-70 MEDIUM`) | **Execution Suspended**: Stored in pending state. PayPal is **not** called until confirmed via `POST /api/v1/pay/override`. |
| **Zone 3: CRITICAL RISK** | `71 – 100` | **Adversarial Drop** | 🔴 Crimson (`71-100 CRITICAL`) | **Instant HTTP 403**: Drops payload at firewall edge. Zero token burn on PayPal. |

---

## 👤 Human-in-the-Loop (HITL) Triaging Pipeline

When a transaction falls in the **Medium Risk Zone (31–70)** or contains dual-authorization trigger phrases (e.g., `"human-in-the-loop"`, `"pending review"`):

1. **State Suspension:** PromptPay Guard generates a unique `hitl_id`, logs the transaction to the immutable audit ledger, and stores its verified payload in `pendingHitlStore`.
2. **Interactive UI Action Dialog:** The Dashboard displays an amber triaging modal with threat analysis details, user intent context, and dual-action controls:
   - **`[Approve & Execute PayPal Capture]`**: Calls `POST /api/v1/pay/override` with `action: "APPROVE"`. Invokes PayPal Orders API v2, debits budget, updates ledger to `APPROVED`, and emits real-time SSE updates.
   - **`[Reject & Drop]`**: Calls `POST /api/v1/pay/override` with `action: "REJECT"`. Cancels the transaction, updates ledger to `BLOCKED`, and closes the alert.
3. **Idempotence & Anti-Replay:** Once an override action is processed, subsequent attempts with the same `hitl_id` return `404 NOT_FOUND` to prevent replay attacks.

---

## 📡 Real-Time PayPal Webhook Listener

PromptPay Guard incorporates a dedicated webhook endpoint to track downstream settlement callbacks:

* **Webhook ID:** `7F072555EA7227937`
* **Webhook URL:** `https://washing-division-shakiness.ngrok-free.dev/api/v1/paypal-webhook` (also aliased at `/api/v1/webhooks/paypal`)
* **Tracked Lifecycle Events:**
  - `PAYMENT.CAPTURE.COMPLETED`: Marks the transaction in the compliance ledger as `CAPTURED_SETTLED`, updates aggregate volume, and broadcasts real-time feed cards.
  - `PAYMENT.CAPTURE.DECLINED`: Flags settlement as declined by processor, updating ledger and dashboard alerts.
  - `PAYMENT.CAPTURE.DENIED`: Marks settlement as denied with full metadata.
* **Webhook SLA Guarantee:** The handler processes incoming callbacks and returns an immediate HTTP `200 OK` to ensure adherence to PayPal's webhook SLA and prevent retry storms.

---

## 📜 Immutable Compliance Ledger & Audit Export

To satisfy FinTech regulatory and compliance requirements (SOX, SOC 2, PCI-DSS):

* **Tamper-Evident Storage:** [`src/telemetry/auditLedger.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/src/telemetry/auditLedger.js) maintains an append-only in-memory ledger storing:
  - `timestamp` (ISO 8601)
  - `agent_id`
  - `declared_intent`
  - `amount` (USD)
  - `recipient` & whitelist domain
  - `tier1_decision` (`PASS` / `BLOCKED`)
  - `tier2_threat_score` (0–100)
  - `final_status` (`APPROVED`, `BLOCKED`, `PENDING_HITL`, `CAPTURED_SETTLED`)
  - `reason` (threat type or approval justification)
  - `paypal_capture_id` & `paypal_order_id`
  - `inspection_cost_usd` & `model_used`
* **Export APIs:**
  - `GET /api/v1/audit/export?format=csv`: Streams RFC 4180-compliant CSV download (`promptpay-guard-compliance-ledger.csv`).
  - `GET /api/v1/audit/export?format=json`: Streams structured JSON ledger (`promptpay-guard-compliance-ledger.json`).
* **Header Buttons:** One-click `[Download CSV]` and `[Download JSON]` buttons in the dashboard header trigger direct browser downloads without page refresh.

---

## 🛡️ Overcoming Architectural Blind Spots & Edge Cases

High-concurrency autonomous payments introduce subtle operational blind spots. PromptPay Guard explicitly resolves these four enterprise failure modes:

| Identified Blind Spot | Threat Scenario | Implemented Remediation | Verified Test |
| :--- | :--- | :--- | :---: |
| **Duplicate Settlement (Network Retries)** | Autonomous agent retries after an ambiguous network delay, causing accidental double payments on PayPal. | **Idempotency Engine (`x-idempotency-key`):** In-memory 120-second cache replays prior settlements instantly, preventing duplicate PayPal capture invocations. | `TC-EDGE-01` |
| **Denial-of-Wallet (Token Exhaustion)** | Malicious agent feeds a 100k+ character context window, running up excessive token billing or triggering API timeouts. | **Strict Payload Ceiling:** Tier-1 instantaneously enforces a strict 4,000-character bound on `raw_context`, dropping oversized payloads with `HTTP 413` at **$0.00** compute cost. | `TC-EDGE-02` |
| **Webhook Replay & Spoofing** | Adversary sends mock `PAYMENT.CAPTURE.COMPLETED` events to mark unpaid orders as settled. | **Cryptographic Signature Validation:** Rejects requests missing PayPal transmission headers (`HTTP 401`), checks for timestamp skew (>10m), and drops duplicate transmission IDs (`HTTP 409`). | `TC-EDGE-03`<br/>`TC-EDGE-04` |
| **Process Recycle State Loss** | Node.js process crashes or restarts, wiping out in-memory sliding-window budgets and pending HITL queues. | **Graceful Lifecycle Persistence:** Traps `SIGINT`/`SIGTERM` to synchronously persist state to `.cache/runtime-state.json`, auto-rehydrating all stores on startup. | `TC-EDGE-05` |

---

## 💰 Cost Profiling & Financial Unit Economics

PromptPay Guard was engineered to eliminate the unsustainable OpEx of evaluating 100% of raw agent traffic through frontier LLMs:

### Financial Architecture Comparison

| Metric / Scale | Model A: Monolithic Frontier (GPT-4 / Claude 3.5 Sonnet) | Model B: PromptPay Guard Two-Tier Zero-Trust | Absolute Savings ($) | Efficiency Gain (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Tier-1 Heuristic Cost** | N/A ($0.00 filtering) | **$0.00** (~38% of traffic dropped free) | — | — |
| **Tier-2 Semantic Pricing** | $3.00/1M in • $15.00/1M out | **$0.075/1M in • $0.30/1M out** (Gemini Flash) | — | — |
| **Cost Per Transaction (CPT)** | **$0.002350** | **$0.000026** | **+$0.002324 / tx** | **98.89%** |
| **100,000 Transactions / mo** | $235.00 | **$2.62** | **$232.38** | **98.89%** |
| **1,000,000 Transactions / mo** | $2,350.00 | **$26.18** | **$2,323.82** | **98.89%** |
| **10,000,000 Transactions / mo** | $23,500.00 | **$261.83** | **$23,238.17** | **98.89%** |

*Generate executive-ready Markdown cost reports anytime by running `npm run cost:report` (outputs to [`docs/COST_ANALYSIS_REPORT.md`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/docs/COST_ANALYSIS_REPORT.md)).*

---

## 🖥️ Interactive Telemetry Dashboard & Simulator

Access the real-time dark-mode command center at `http://localhost:3000`:

* **Live Telemetry Stream:** Connects via Server-Sent Events (SSE) to display real-time transaction cards, latency breakdowns, and defense badges.
* **Dynamic Model Switcher:** Dropdown supporting on-the-fly toggling between `gemini-1.5-flash` ($0.075 / 1M in) and `gemini-1.5-pro` ($1.25 / 1M in).
* **Interactive Radial Risk Gauge:** Real-time circular meter animating between Green (0–30), Amber (31–70), and Crimson (71–100).
* **5 One-Click Attack Simulation Presets:**
  1. `[Safe Transaction]`: Valid Figma license renewal ($144.00) &rarr; **Passes & Settles to PayPal**.
  2. `[Prompt Injection Attack]`: Instruction override payload &rarr; **Blocked at Tier-2 (403 Forbidden)**.
  3. `[Salami Burst]`: 12 rapid micro-payments ($0.99) &rarr; **Throttled at Tier-1 (429 Rate Limit)**.
  4. `[Typo-squatted Vendor]`: Homoglyph domain spoof (`amaz0n-billing.net`) &rarr; **Blocked at Tier-1 (403 Whitelist)**.
  5. `[HITL Triaging State]`: Lands in Medium Risk zone (Score: 52) &rarr; **Suspends & reveals inline Approve/Reject action dialog**.
* **Manual Custom Payload Tester:** Form allowing arbitrary agent IDs, declared intents, amounts, recipient emails, and scratchpad context windows.
* **Animated Defense Toasters:** Real-time notification banners detailing intercepted threat categories.

### 📸 Live Dashboard & Defense Screenshots

| 🟢 Autonomous Clearance & Settlement | 🟡 Human-in-the-Loop (HITL) Suspension |
| :---: | :---: |
| <img src="docs/screenshots/01-safe-transaction-settled.png" alt="Approved & Settled" width="100%" /><br/>*Legitimate agent payment ($144 Figma) cleared & captured via PayPal API v2* | <img src="docs/screenshots/02-hitl-triaging-suspended.png" alt="HITL Triaging Suspended" width="100%" /><br/>*Medium risk payment (Score 52) suspended for 1-click admin approval* |

| 🔴 Salami Micro-Drain Throttled (Tier-1) | 🧪 Automated Test Verification Suite |
| :---: | :---: |
| <img src="docs/screenshots/03-salami-microdrain-throttled.png" alt="Salami Micro-Drain Throttled" width="100%" /><br/>*12 rapid micro-payments instantly throttled in 0.05ms at $0.00 cost* | <img src="docs/screenshots/04-terminal-test-suite-passing.png" alt="Automated Test Suites Passing" width="100%" /><br/>*100% pass rate across PRD functional tests (9/9) & Enterprise Edge Cases (8/8)* |

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Node.js:** `v20.0.0` or higher (Tested on `v24.15.0`)
- **npm:** `v10.0.0` or higher
- **PayPal Sandbox Developer Account:** [developer.paypal.com](https://developer.paypal.com)
- **Google AI Studio Key:** [aistudio.google.com](https://aistudio.google.com) *(Optional: local high-accuracy heuristic fallback kernel included)*

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/kanangandhi93/promptpay-guard.git
cd promptpay-guard

# Install production dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### 3. Environment Configuration (`.env`)
```env
PORT=3000
HOST=localhost

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# PayPal Sandbox REST Credentials
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=7F072555EA7227937
PAYPAL_WEBHOOK_URL=https://washing-division-shakiness.ngrok-free.dev/api/v1/paypal-webhook

# Tier-1 Heuristics Constraints
TIER1_MAX_VELOCITY_PER_WINDOW=5
TIER1_VELOCITY_WINDOW_SECONDS=60
TIER1_SINGLE_TRANSACTION_LIMIT=100.00
TIER1_DAILY_CUMULATIVE_LIMIT=500.00

# Fallback & Mock Sandbox
ENABLE_MOCK_FALLBACK=true
```

### 4. Running the Application
```bash
# Start server in production mode
npm start

# Start server in development mode (with hot reloading)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore the live dashboard.

---

## 📡 Complete API Reference

### 1. Execute Agent Payment (Core Proxy)
Evaluates incoming transactions through Tier-1 and Tier-2 before delegating to PayPal Orders API v2.

- **URL:** `/api/v1/pay` *(or alias `/api/v1/orders/execute`)*
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "agent_id": "agent_procure_figma_01",
  "user_intent": "Renew annual Figma license for design team at $144.00",
  "recipient_email": "billing@figma.com",
  "amount": 144.00,
  "currency": "USD",
  "max_budget_cap": 500.00,
  "model": "gemini-1.5-flash",
  "context_window": "Quarterly review approved. Verified vendor license renewal for Figma design suite."
}
```

#### Success Response (`200 OK` - Autonomous Clearance):
```json
{
  "success": true,
  "status": "APPROVED",
  "order_id": "ORD-SANDBOX-8CA38961",
  "capture_id": "CAP-SANDBOX-8CA38961",
  "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=8CA38961",
  "amount": 144.00,
  "currency": "USD",
  "recipient_email": "billing@figma.com",
  "vendor_name": "Figma Inc.",
  "security_verification": {
    "decision": "PERMIT_AND_SETTLE",
    "threat_score": 2,
    "risk_zone": "LOW_RISK",
    "risk_label": "Autonomous Clearance",
    "eval_engine": "Gemini 1.5 Flash",
    "inference_cost_usd": 0.0000381,
    "latency_breakdown": {
      "tier1_heuristics_ms": 0.062,
      "tier2_semantic_ms": 178.4,
      "paypal_gateway_ms": 210.2,
      "total_e2e_ms": 388.7
    }
  }
}
```

#### Suspended Response (`200 OK` - Medium Risk HITL Required):
```json
{
  "success": false,
  "status": "PENDING_HITL",
  "decision": "SUSPEND_FOR_HITL",
  "hitl_id": "EVT-516BABB0",
  "threat_score": 52,
  "risk_zone": "MEDIUM_RISK",
  "risk_label": "Requires Human Confirmation (HITL)",
  "reason": "Moderate intent ambiguity or audit keyword detected. Suspended pending administrator override.",
  "amount": 85.00,
  "currency": "USD",
  "recipient_email": "billing@figma.com"
}
```

#### Rejection Response (`403 Forbidden` - Prompt Injection Attack):
```json
{
  "success": false,
  "status": "BLOCKED",
  "decision": "DROP_PAYLOAD",
  "blocked_stage": "TIER2_INJECTION",
  "threat_score": 98,
  "threat_type": "PROMPT_INJECTION",
  "reason": "Direct / Indirect Prompt Injection detected: Adversarial instruction override sequence identified in agent context window.",
  "security_context": {
    "event_id": "EVT-951A8C42",
    "latency_breakdown": {
      "tier1_heuristics_ms": 0.058,
      "tier2_semantic_ms": 1.25,
      "paypal_gateway_ms": 0,
      "total_ms": 1.308
    }
  }
}
```

---

### 2. Human-in-the-Loop Admin Override
Confirms or rejects a suspended Medium Risk transaction.

- **URL:** `/api/v1/pay/override`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

```json
{
  "hitl_id": "EVT-516BABB0",
  "action": "APPROVE", // or "REJECT"
  "admin_user": "admin_security_lead",
  "notes": "Verified vendor quote against purchase requisition"
}
```

---

### 3. PayPal Webhook Listener
Receives settlement callbacks directly from PayPal, verifies event lifecycle status, and emits SSE notifications.

- **URL:** `/api/v1/paypal-webhook` *(or alias `/api/v1/webhooks/paypal`)*
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Webhook ID:** `7F072555EA7227937`
- **Tracked Events:** `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.DENIED`

---

### 4. Exportable Compliance Ledger
- **CSV Export:** `GET /api/v1/audit/export?format=csv` &rarr; Returns RFC 4180-compliant CSV download.
- **JSON Export:** `GET /api/v1/audit/export?format=json` &rarr; Returns structured compliance JSON.

---

### 5. Financial Intelligence & Unit Economics
Returns real-time aggregate unit costs, token usage, Tier-1 zero-cost block rates, and dollars saved vs frontier baseline.

- **URL:** `/api/v1/metrics`
- **Method:** `GET`

```json
{
  "totalRequestsCount": 42,
  "tier1ZeroCostDrops": 16,
  "tier2EvaluationsCount": 26,
  "totalInferenceCostUsd": 0.001092,
  "avg_cost_per_request": 0.000026,
  "cost_saved_vs_frontier": 0.0976,
  "zero_cost_block_rate_pct": 38.1,
  "tokens": {
    "inputTokens": 8320,
    "outputTokens": 2210,
    "totalTokens": 10530
  }
}
```

---

## 🧪 Automated Testing & Verification Suites

PromptPay Guard maintains an exhaustive automated test suite with **60 passing tests** across 7 specialized harnesses:

```bash
# Run all PRD functional test cases (TC-POS-01..03, TC-NEG-01..06)
npm run test:all

# Run Enterprise Edge Cases & Architectural Remediation Suite (8 tests)
npm run test:edge

# Run Defensive Security & Penetration Audit (18 tests)
npm run test:security

# Run Fail-Secure Resilience & Network Timeout Suite (5 tests)
npm run test:resilience

# Run Dynamic Model Switching & Telemetry Metrics Suite (7 tests)
npm run test:models

# Run Audit Ledger, PayPal Webhook & HITL Triaging Suite (13 tests)
npm run test:audit

# Run High-Concurrency Load & Stress Testing Benchmark
npm run test:load
```

### Test Suite Execution Summary

| Test Suite Harness | File Location | Test Count | Key Invariants Verified | Status |
| :--- | :--- | :---: | :--- | :---: |
| **Edge Cases & Remediation Suite** | [`tests/edge-cases-remediation.test.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/tests/edge-cases-remediation.test.js) | **8** | Idempotency key 120s caching (`x-cache: HIT`), raw_context 4000 char bounding (HTTP 413, $0.00 cost), Webhook transmission header auth (401), Webhook duplicate replay rejection (409), State persistence & rehydration | ✅ **8/8 PASS** |
| **Audit, Webhook & HITL Suite** | [`tests/audit-webhook-hitl.test.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/tests/audit-webhook-hitl.test.js) | **13** | RFC 4180 CSV headers, JSON ledger, PayPal Webhook ID 7F072555EA7227937, 3-zone thresholds, HITL Approve/Reject state machine | ✅ **13/13 PASS** |
| **Defensive Security Suite** | [`tests/security.test.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/tests/security.test.js) | **18** | Type confusion (Exp 1e5, NaN), fractional sub-cents, ReDoS regex, homoglyph domains, Helmet CSP headers, 512KB payload limits | ✅ **18/18 PASS** |
| **Resilience & Fail-Secure Suite** | [`tests/resilience-fail-secure.test.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/tests/resilience-fail-secure.test.js) | **5** | LLM Gateway 500/timeout (Fail-Secure drop 503/504), malformed AI output recovery, PayPal 504 rollback idempotency | ✅ **5/5 PASS** |
| **Dynamic Models & Metrics Suite** | [`tests/dynamic-model-metrics.test.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/tests/dynamic-model-metrics.test.js) | **7** | Gemini 1.5 Flash vs Pro provider adapter, exact token usage pricing, `/api/v1/metrics` frontier savings telemetry | ✅ **7/7 PASS** |
| **PRD Core Functional Suite** | [`scripts/run-all-tests.js`](file:///d:/02%20AI%20agent%20application/03%20Projects/13%20hackathon/paypal/scripts/run-all-tests.js) | **9** | PRD TC-POS-01..03, TC-NEG-01..06 core business validation matrix | ✅ **9/9 PASS** |
| **Total Automated Tests** | — | **60** | **End-to-End Complete Production Coverage** | ✅ **100% PASS** |

<p align="center">
  <img src="docs/screenshots/04-terminal-test-suite-passing.png" alt="Automated Test Suites Passing in Terminal - 100% Success Rate" width="88%" />
</p>

---

## 🏛️ Project Directory Structure

```
paypal/
├── docs/
│   └── COST_ANALYSIS_REPORT.md       # Automated Unit Economics & Cost Profiling Report
├── scripts/
│   ├── generate-cost-report.js       # OpEx analysis generator script
│   ├── run-all-tests.js              # PRD core test suite runner
│   ├── simulate-prompt-injection.js  # Adversarial prompt injection simulation (TC-NEG-01)
│   ├── simulate-safe-transaction.js   # Legitimate payment simulation (TC-POS-01)
│   └── simulate-salami-attack.js     # Salami micro-drain burst simulation (TC-NEG-03)
├── services/
│   └── semanticEngine.js             # Root Provider Adapter for dynamic models & pricing
├── src/
│   ├── config.js                     # Enterprise thresholds, approved vendors & credentials
│   ├── index.js                      # Express server, pipeline orchestration & SSE router
│   ├── paypal/
│   │   └── client.js                 # PayPal Orders API v2 (OAuth 2.0, order create & capture)
│   ├── public/
│   │   ├── app.js                    # Client SSE listener, radial gauge updater & HITL dialogs
│   │   └── index.html                # Real-time dark-mode telemetry dashboard & simulator UI
│   ├── services/
│   │   └── semanticEngine.js         # Core semantic engine adapter (Flash & Pro token profiling)
│   ├── telemetry/
│   │   ├── auditLedger.js            # Immutable compliance ledger (RFC 4180 CSV / JSON)
│   │   └── eventBus.js               # SSE event broadcaster & financial metrics accumulator
│   ├── tier1/
│   │   ├── budgetGuard.js            # Single cap & cumulative daily budget enforcement
│   │   ├── schemaValidator.js        # Strict input sanitization & boundary validation
│   │   ├── tier1Pipeline.js          # Tier-1 orchestration (<1ms execution target)
│   │   ├── velocityLimiter.js        # Atomic sliding-window rate limiter (Salami defense)
│   │   └── vendorWhitelist.js        # Exact regex & anti-homoglyph vendor verification
│   ├── tier2/
│   │   ├── intentClassifier.js       # Gemini 1.5 semantic intent classification kernel
│   │   └── promptTemplates.js        # Calibrated system prompts for prompt injection defense
│   └── utils/
│       ├── idempotencyStore.js       # In-memory idempotency engine with 120s TTL
│       └── statePersistence.js       # State serializer & rehydrator (.cache/runtime-state.json)
├── tests/
│   ├── audit-webhook-hitl.test.js    # Webhooks, audit ledger & HITL triaging suite (13 tests)
│   ├── dynamic-model-metrics.test.js # Dynamic models & metrics calculation suite (7 tests)
│   ├── edge-cases-remediation.test.js# Idempotency, 4000 char bounding, webhook security (8 tests)
│   ├── load-test.js                  # Concurrency, throughput & high-burst stress benchmark
│   ├── resilience-fail-secure.test.js# Gateway outages, malformed JSON & PayPal rollback (5 tests)
│   └── security.test.js              # Comprehensive penetration audit suite (18 tests)
├── .env.example                      # Environment variables template with Webhook ID & URL
├── CONTRIBUTING.md                   # Open-source developer contribution guidelines
├── LICENSE                           # MIT License
├── package.json                      # Project dependencies, scripts & metadata
├── README.md                         # Publication-grade documentation
└── SECURITY.md                       # Enterprise FinTech vulnerability disclosure policy
```

---

## 🏆 PayPal AI Hackathon Highlights

1. **Addresses the Missing Link in Agentic Commerce:** API keys authenticate the caller; PromptPay Guard authenticates the *semantic intent* behind the financial transaction.
2. **Sub-Millisecond Edge Defense:** Tier-1 heuristics resolve in **<0.1ms** at **$0.00** marginal cost, filtering out 38% of malicious traffic before invoking LLMs.
3. **Sub-Second E2E Settlement:** Full pipeline evaluation (Tier-1 + Tier-2 Gemini + PayPal Orders API v2) settles in **~380ms**.
4. **98.8% Operational Cost Reduction:** Replacing brute-force frontier LLM architectures with PromptPay Guard saves **$23,238 per 10M transactions**.
5. **Turnkey Judge Evaluation:** Start the application via `npm start` and test all 5 attack presets in real-time via the interactive dashboard at [http://localhost:3000](http://localhost:3000).

---

## ⚖️ License & Attribution

This project is licensed under the terms of the **MIT License** (or **Apache License 2.0**).  
See the [LICENSE](LICENSE) file for complete details.

### 👤 Author & Architecture
* **Original Creator & Lead Architect:** Kanan Gandhi
* **Submission Platform:** PayPal AI Agent Hackathon 2026
* **Project Showcase:** [Devpost Project](https://devpost.com/software/promptpay-guard) | [YouTube Demonstration](https://youtu.be/2_1kc6dqQbE)

> **Notice:** "PromptPay Guard", its Two-Tier Zero-Trust heuristics pipeline, radial risk assessment workflows, and architectural designs are original intellectual work developed by Kanan Gandhi. Any public re-distribution, derivative research, or implementation must retain proper attribution to the original author.
