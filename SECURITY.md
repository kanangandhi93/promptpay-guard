# Security Policy & Vulnerability Disclosure

PromptPay Guard is designed as a mission-critical, Zero-Trust security firewall for autonomous financial agent payments settling via PayPal Orders API v2. Security and resilience are primary architectural concerns.

---

## 🛡️ Supported Versions

We actively provide security patches and dependency updates for the following versions:

| Version | Supported | Node.js Runtime | Status |
| :--- | :---: | :--- | :--- |
| `1.0.x` | ✅ Yes | Node.js `>=20.0.0` (Tested on v24.15.0) | Current Production Release |
| `< 1.0.0` | ❌ No | — | Deprecated Pre-release |

---

## 🔒 Threat Model & Security Posture

PromptPay Guard addresses unique attack vectors introduced by autonomous AI payment agents:

1. **Adversarial Context Smuggling & Direct/Indirect Prompt Injections:**
   - Evaluated by the **Tier-2 Semantic Intent Engine** using Google Gemini 1.5.
   - Any instruction override, developer jailbreak, or attempt to divert funds to unauthorized escrows triggers an immediate `403 Forbidden` drop with zero PayPal network activity.

2. **Salami Micro-Drain Bursts & Velocity Abuse:**
   - Throttled by an atomic **sliding-window rate limiter** in Tier-1.
   - Restricts agents to configurable velocity caps (default: 5 transactions / 60 seconds), protecting corporate balances from runway execution loops.

3. **Vendor Spoofing & Typo-Squatting Homoglyphs:**
   - Screened by strict domain regex and anti-homoglyph checks (e.g. `amaz0n-billing.net` vs `amazon.com`) before external calls.

4. **Fail-Secure & Graceful Degradation:**
   - In the event of upstream LLM gateway timeouts or HTTP 500 errors, PromptPay Guard enforces **Fail-Secure** (`HTTP 503/504`). Transactions are safely dropped, never accidentally cleared to PayPal.

5. **Secrets & Credentials Protection:**
   - PayPal Client Secrets and Gemini API Keys are strictly confined to server-side memory and never serialized to SSE event streams or client-facing responses.
   - HTTP transport is hardened via Helmet (CSP, nosniff, frameguard) and JSON payload ceilings (512KB).

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability or exploit vector in PromptPay Guard:

1. **Do NOT open a public GitHub issue.**
2. Please disclose the vulnerability privately by emailing our security team at `security@promptpayguard.io` or creating a [Private Security Advisory](https://github.com/features/security/advisories) on GitHub.
3. Include the following details:
   - Type of vulnerability (e.g., Tier-1 bypass, ReDoS, Prompt Injection smuggling, race condition).
   - Minimal proof-of-concept (PoC) payload or automated test script.
   - Expected vs. observed behavior.
   - Affected files and components.

### Response Timelines
- **Initial Acknowledgement:** Within 24 hours.
- **Triage & Severity Assessment:** Within 48 hours.
- **Patch & Advisory Release:** Critical vulnerabilities are patched within 5 business days.
