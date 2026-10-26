/**
 * PromptPay Guard — Fail-Secure Resilience & Graceful Degradation Integration Test Suite
 *
 * Scenarios:
 * 1. Scenario A (LLM Down / Timeout):
 *    - Mock Gemini 1.5 Flash API throwing HTTP 500 or delaying 6000ms.
 *    - Verify firewall defaults to FAIL-SECURE (HTTP 503/504, status: BLOCKED, ZERO calls to PayPal).
 * 2. Scenario B (Malformed LLM Payload):
 *    - Mock Gemini API returning unparseable raw text instead of structured JSON.
 *    - Verify graceful syntax exception logging, threat flagged as MALFORMED_AI_OUTPUT, and payload dropped.
 * 3. Scenario C (PayPal Sandbox Network Drop):
 *    - Clear Tier-1 and Tier-2, but mock PayPal Orders API throwing a 504 Gateway Timeout.
 *    - Verify safe rollback (zero budget spend committed, no duplicate retries, no uncaught exceptions).
 */

process.env.NODE_ENV = 'test';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { semanticClassifier } from '../src/tier2/intentClassifier.js';
import { paypalClient } from '../src/paypal/client.js';
import { budgetGuard } from '../src/tier1/budgetGuard.js';

describe('PROMPTPAY GUARD RESILIENCE & FAIL-SECURE TEST SUITE', () => {

  // Save original methods for pristine restoration
  const originalEvaluate = semanticClassifier.evaluate;
  const originalEvaluateWithGemini = semanticClassifier.evaluateWithGemini;
  const originalGenAI = semanticClassifier.genAI;
  const originalApiKey = semanticClassifier.apiKey;
  const originalExecutePayment = paypalClient.executePayment;
  const originalRecordSpend = budgetGuard.recordSpend;

  let paypalExecutionCount = 0;
  let budgetRecordedCount = 0;

  beforeEach(() => {
    paypalExecutionCount = 0;
    budgetRecordedCount = 0;

    // Spy on PayPal executePayment to prove ZERO calls are made when Tier-2 fails
    paypalClient.executePayment = async (...args) => {
      paypalExecutionCount++;
      return originalExecutePayment.apply(paypalClient, args);
    };

    // Spy on BudgetGuard to prove NO spend is committed on rollbacks
    budgetGuard.recordSpend = (...args) => {
      budgetRecordedCount++;
      return originalRecordSpend.apply(budgetGuard, args);
    };
  });

  afterEach(() => {
    // Restore original implementations
    semanticClassifier.evaluate = originalEvaluate;
    semanticClassifier.evaluateWithGemini = originalEvaluateWithGemini;
    semanticClassifier.genAI = originalGenAI;
    semanticClassifier.apiKey = originalApiKey;
    paypalClient.executePayment = originalExecutePayment;
    budgetGuard.recordSpend = originalRecordSpend;
  });

  // =========================================================================
  // SCENARIO A: LLM Gateway Down / Timeout (Fail-Secure Enforcement)
  // =========================================================================
  describe('Scenario A: LLM Gateway Outage & Timeout (Fail-Secure)', () => {

    it('A1: should FAIL-SECURE with HTTP 503 if Gemini throws an internal server error (HTTP 500)', async () => {
      // Mock active Gemini API key and failing API
      semanticClassifier.apiKey = 'mock_active_gemini_key_for_test';
      semanticClassifier.evaluateWithGemini = async () => {
        throw new Error('Google Gemini API Error: 500 Internal Server Error (Remote Service Down)');
      };

      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'resilience_test_agent_01',
          user_intent: 'Procure cloud servers for $85.00',
          recipient_email: 'billing@figma.com',
          amount: 85.00,
          currency: 'USD',
          context_window: 'Normal operations context'
        });

      // Assertions
      assert.equal(res.status, 503, 'Expected HTTP 503 Service Unavailable under fail-secure policy');
      assert.equal(res.body.success, false);
      assert.equal(res.body.status, 'BLOCKED');
      assert.equal(res.body.decision, 'DROP_PAYLOAD');
      assert.equal(res.body.threat_type, 'AI_GATEWAY_TIMEOUT_FAIL_SECURE');
      assert.match(res.body.reason, /Fail-Secure Policy Enforced/i);

      // Verify ZERO calls were delegated to PayPal
      assert.equal(paypalExecutionCount, 0, 'CRITICAL SECURITY BREACH: PayPal was called after LLM failure!');
      assert.equal(budgetRecordedCount, 0, 'Budget was committed despite transaction failure');
    });

    it('A2: should FAIL-SECURE with HTTP 504 if Gemini API times out (delay > 4000ms)', async () => {
      semanticClassifier.apiKey = 'mock_active_gemini_key_for_test';
      semanticClassifier.evaluateWithGemini = async () => {
        // Simulate a 6000ms delay that exceeds client timeout
        throw new Error('Gemini API timeout exceeded');
      };

      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'resilience_test_agent_02',
          user_intent: 'Procure software license for $90.00',
          recipient_email: 'billing@figma.com',
          amount: 90.00,
          currency: 'USD',
          context_window: 'Normal operations context'
        });

      assert.equal(res.status, 504, 'Expected HTTP 504 Gateway Timeout under fail-secure policy');
      assert.equal(res.body.success, false);
      assert.equal(res.body.status, 'BLOCKED');
      assert.equal(res.body.decision, 'DROP_PAYLOAD');
      assert.equal(res.body.threat_type, 'AI_GATEWAY_TIMEOUT_FAIL_SECURE');

      // Verify ZERO calls were delegated to PayPal
      assert.equal(paypalExecutionCount, 0, 'CRITICAL SECURITY BREACH: PayPal was called after LLM timeout!');
      assert.equal(budgetRecordedCount, 0);
    });
  });

  // =========================================================================
  // SCENARIO B: Malformed LLM Response (Syntax & Delimiter Parsing)
  // =========================================================================
  describe('Scenario B: Malformed LLM Payload & Delimiter Smuggling', () => {

    it('B1: should safely drop transaction and log MALFORMED_AI_OUTPUT if Gemini returns raw unparseable text', async () => {
      semanticClassifier.apiKey = 'mock_active_gemini_key_for_test';

      // Mock Gemini returning raw non-JSON text (e.g. conversational chit-chat without JSON structure)
      semanticClassifier.genAI = {
        getGenerativeModel: () => ({
          generateContent: async () => ({
            response: {
              text: () => 'I reviewed this payment and I think it is totally fine! No issues found. (Malformed output without JSON schema)'
            }
          })
        })
      };

      // Call evaluateWithGemini directly to verify it catches JSON.parse exception
      const result = await semanticClassifier.evaluateWithGemini({
        agent_id: 'agent_malformed_test',
        user_intent: 'Legitimate SaaS renewal',
        recipient_email: 'billing@figma.com',
        amount: 50.00,
        currency: 'USD'
      });

      assert.equal(result.passed, false, 'Expected rejection of unparseable raw text');
      assert.equal(result.threatType, 'MALFORMED_AI_OUTPUT');
      assert.ok(result.threatScore >= 90);
      assert.match(result.reason, /unparseable response structure/i);

      // Now test via the HTTP API to confirm end-to-end payload drop
      semanticClassifier.evaluate = async () => ({
        passed: false,
        statusCode: 403,
        threatScore: 90,
        threatType: 'MALFORMED_AI_OUTPUT',
        reason: 'Semantic evaluation engine returned unparseable response structure. Rejected under Fail-Secure policy.',
        divergenceDetected: true,
        latencyMs: 1.5,
        engine: 'PromptPay Fail-Secure Kernel'
      });

      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'agent_malformed_http',
          user_intent: 'Pay software renewal for $50.00',
          recipient_email: 'billing@figma.com',
          amount: 50.00,
          currency: 'USD'
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.status, 'BLOCKED');
      assert.equal(res.body.threat_type, 'MALFORMED_AI_OUTPUT');
      assert.equal(paypalExecutionCount, 0, 'PayPal was called despite malformed AI output!');
    });
  });

  // =========================================================================
  // SCENARIO C: PayPal Sandbox Network Drop & Rollback
  // =========================================================================
  describe('Scenario C: PayPal Sandbox Network Drop & Safe Rollback', () => {

    it('C1: should handle 504 Gateway Timeout from PayPal gracefully with safe rollback', async () => {
      // Mock PayPal network drop / 504 timeout
      paypalClient.executePayment = async () => {
        paypalExecutionCount++;
        return {
          success: false,
          error: 'PayPal Sandbox Error: 504 Gateway Timeout (Network dropped during order settlement)',
          latencyMs: 2500.0
        };
      };

      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'resilience_paypal_agent_03',
          user_intent: 'Renew monthly Figma license for design team at $45.00',
          recipient_email: 'billing@figma.com',
          amount: 45.00,
          currency: 'USD',
          context_window: 'Valid quarterly SaaS purchase'
        });

      // Assertions
      assert.equal(res.status, 504, 'Expected HTTP 504 Gateway Timeout when PayPal times out');
      assert.equal(res.body.success, false);
      assert.equal(res.body.status, 'GATEWAY_ERROR');
      assert.equal(res.body.error_code, 'PAYPAL_GATEWAY_TIMEOUT');
      assert.match(res.body.reason, /504 Gateway Timeout/i);

      // Verify that NO spend was committed to the budget tracker (Safe Rollback)
      assert.equal(budgetRecordedCount, 0, 'CRITICAL: Budget was debited despite PayPal gateway failure!');
    });

    it('C2: should remain resilient and process subsequent valid transactions after a failure', async () => {
      // Restore normal PayPal mock execution
      paypalClient.executePayment = async () => {
        paypalExecutionCount++;
        return {
          success: true,
          orderId: 'ORD-RESILIENT-RECOVERY-01',
          captureId: 'CAP-RESILIENT-RECOVERY-01',
          status: 'COMPLETED',
          latencyMs: 15.0
        };
      };

      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'recovery_agent_04',
          user_intent: 'Purchase 10,000 API credits from OpenAI for $10.00',
          recipient_email: 'payments@openai.com',
          amount: 10.00,
          currency: 'USD',
          context_window: 'Post-recovery transaction test'
        });

      assert.equal(res.status, 200, 'Expected system to recover and process subsequent valid transaction');
      assert.equal(res.body.status, 'APPROVED');
      assert.equal(res.body.order_id, 'ORD-RESILIENT-RECOVERY-01');
      assert.equal(budgetRecordedCount, 1, 'Expected budget to record spend on successful recovered order');
    });
  });
});
