/**
 * PromptPay Guard — Enterprise Edge Cases & Architectural Remediation Test Suite
 *
 * TC-EDGE-01: Idempotency replay returns cached payload without invoking PayPal
 * TC-EDGE-02: Payloads with raw_context > 4000 chars are blocked at Tier-1 with HTTP 413 and $0.00 cost
 * TC-EDGE-03: Webhook endpoint rejects requests lacking PayPal transmission headers with HTTP 401
 * TC-EDGE-04: Webhook duplicate transmission ID replay is rejected or ignored
 * TC-EDGE-05: State serialization and rehydration test across process cycle
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { budgetGuard } from '../src/tier1/budgetGuard.js';
import { statePersistence } from '../src/utils/statePersistence.js';

const BASE_URL = 'http://localhost:3000';

describe('PromptPay Guard: Enterprise Edge Cases & Architectural Remediation Suite', () => {

  before(async () => {
    await fetch(`${BASE_URL}/api/v1/telemetry/reset`, { method: 'POST' });
  });

  describe('TC-EDGE-01: Idempotency Protection Engine', () => {
    it('should process novel transaction and cache the response for replay', async () => {
      const idempotencyKey = `idem-key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const payload = {
        agent_id: 'agent_idempotent_tester',
        user_intent: 'Quarterly Figma software subscription renewal',
        recipient_email: 'billing@figma.com',
        amount: 35.00,
        currency: 'USD',
        context_window: 'Verified SaaS subscription renewal for design workspace'
      };

      // 1. Initial Request (MISS)
      const res1 = await fetch(`${BASE_URL}/api/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.headers.get('x-cache'), 'MISS');
      const data1 = await res1.json();
      assert.strictEqual(data1.status, 'APPROVED');
      assert(data1.order_id);
      assert(data1.capture_id);

      // 2. Replay Request with identical x-idempotency-key (HIT)
      const res2 = await fetch(`${BASE_URL}/api/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.headers.get('x-cache'), 'HIT');
      const data2 = await res2.json();
      assert.strictEqual(data2.idempotent_replay, true);
      assert.strictEqual(data2.order_id, data1.order_id);
      assert.strictEqual(data2.capture_id, data1.capture_id);
    });

    it('should support fallback idempotency key provided in request body', async () => {
      const idempotencyKey = `idem-body-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const payload = {
        idempotency_key: idempotencyKey,
        agent_id: 'agent_idempotent_body',
        user_intent: 'Routine Figma license allocation',
        recipient_email: 'billing@figma.com',
        amount: 25.00,
        currency: 'USD',
        context_window: 'Normal operations context'
      };

      // Initial request
      const res1 = await fetch(`${BASE_URL}/api/v1/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();

      // Replay request
      const res2 = await fetch(`${BASE_URL}/api/v1/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.headers.get('x-cache'), 'HIT');
      const data2 = await res2.json();
      assert.strictEqual(data2.idempotent_replay, true);
      assert.strictEqual(data2.order_id, data1.order_id);
    });
  });

  describe('TC-EDGE-02: Context Truncation & Token Exhaustion Defense', () => {
    it('should immediately short-circuit with HTTP 413 when raw_context exceeds 4000 characters', async () => {
      const massiveContext = 'MALICIOUS_PADDING_'.repeat(250); // 4500 chars > 4000
      assert(massiveContext.length > 4000);

      const payload = {
        agent_id: 'agent_token_exhaustion_attacker',
        user_intent: 'Renew Figma design seat',
        recipient_email: 'billing@figma.com',
        amount: 45.00,
        currency: 'USD',
        raw_context: massiveContext
      };

      const res = await fetch(`${BASE_URL}/api/v1/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.strictEqual(res.status, 413, 'Must return HTTP 413 Payload Too Large');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.status, 'BLOCKED_T1');
      assert(data.reason.includes('raw_context exceeds 4,000 character safety boundary'));
      assert.strictEqual(data.inspection_cost_usd, 0.00, 'Must incur exactly $0.00 marginal LLM inference cost');
    });

    it('should also enforce the 4000 character limit on context_window', async () => {
      const massiveContext = 'X'.repeat(4050);

      const payload = {
        agent_id: 'agent_exhaustion_context_window',
        user_intent: 'Renew Figma design seat',
        recipient_email: 'billing@figma.com',
        amount: 30.00,
        currency: 'USD',
        context_window: massiveContext
      };

      const res = await fetch(`${BASE_URL}/api/v1/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.strictEqual(res.status, 413);
      const data = await res.json();
      assert.strictEqual(data.status, 'BLOCKED_T1');
      assert.strictEqual(data.inspection_cost_usd, 0.00);
    });
  });

  describe('TC-EDGE-03: PayPal Webhook Cryptographic Transmission Verification', () => {
    it('should reject unauthenticated webhook requests lacking transmission headers with HTTP 401', async () => {
      const payload = {
        id: 'WH-FORGED-001',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAPTURE-FORGED-999', amount: { value: '100.00', currency_code: 'USD' } }
      };

      const res = await fetch(`${BASE_URL}/api/v1/paypal-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Missing paypal-transmission-* headers
        body: JSON.stringify(payload)
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error, 'UNAUTHORIZED_WEBHOOK');
    });

    it('should reject requests with expired timestamp skew exceeding 10 minutes with HTTP 401', async () => {
      const staleTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago

      const res = await fetch(`${BASE_URL}/api/v1/paypal-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-id': 'TX-STALE-101',
          'paypal-transmission-time': staleTime,
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360',
          'paypal-transmission-sig': 'MEYCIQCI2qF9...test_sig...',
          'paypal-auth-algo': 'SHA256withRSA'
        },
        body: JSON.stringify({
          id: 'WH-STALE-001',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: { id: 'CAPTURE-STALE-101' }
        })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'WEBHOOK_TIMESTAMP_EXPIRED');
    });
  });

  describe('TC-EDGE-04: PayPal Webhook Replay Protection', () => {
    it('should reject duplicate webhook transmission IDs as replay attacks', async () => {
      const transmissionId = `TX-REPLAY-TEST-${Date.now()}`;
      const headers = {
        'Content-Type': 'application/json',
        'paypal-transmission-id': transmissionId,
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360',
        'paypal-transmission-sig': 'MEYCIQCI2qF9...test_sig...',
        'paypal-auth-algo': 'SHA256withRSA'
      };

      const payload = {
        id: `WH-EVENT-${Date.now()}`,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: `CAP-REPLAY-${Date.now()}`, amount: { value: '45.00', currency_code: 'USD' } }
      };

      // 1. Initial Webhook submission (Accepted)
      const res1 = await fetch(`${BASE_URL}/api/v1/paypal-webhook`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      assert.strictEqual(res1.status, 200);

      // 2. Duplicate submission with identical transmission ID (Replay attack blocked)
      const res2 = await fetch(`${BASE_URL}/api/v1/paypal-webhook`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      assert.strictEqual(res2.status, 409, 'Replay transmission ID must be rejected with HTTP 409 Conflict');
      const data2 = await res2.json();
      assert.strictEqual(data2.error, 'DUPLICATE_WEBHOOK_TRANSMISSION');
    });
  });

  describe('TC-EDGE-05: State Persistence & Rehydration across Lifecycle Cycle', () => {
    const testStateFile = path.join(process.cwd(), '.cache', 'test-lifecycle-state.json');

    after(() => {
      statePersistence.clearState(testStateFile);
    });

    it('should serialize budget spend and rehydrate correctly', () => {
      // 1. Record known spend in budgetGuard
      const testAgent = `agent_lifecycle_${Date.now()}`;
      budgetGuard.recordSpend(testAgent, 65.50);
      assert.strictEqual(budgetGuard.getAgentSpend(testAgent).spentToday, 65.50);

      // 2. Create mock pending HITL map
      const mockHitlStore = new Map();
      mockHitlStore.set('HITL-TEST-99', {
        id: 'HITL-TEST-99',
        cleanData: { agent_id: testAgent, amount: 65.50 },
        status: 'PENDING_HITL'
      });

      // 3. Save state to disk
      const saved = statePersistence.saveState({
        budgetGuard,
        pendingHitlStore: mockHitlStore,
        filePath: testStateFile
      });
      assert.strictEqual(saved, true);
      assert(fs.existsSync(testStateFile));

      // 4. Clear in-memory state
      budgetGuard.reset(testAgent);
      assert.strictEqual(budgetGuard.getAgentSpend(testAgent).spentToday, 0.0);
      mockHitlStore.clear();
      assert.strictEqual(mockHitlStore.size, 0);

      // 5. Rehydrate from disk
      const loaded = statePersistence.loadState({
        budgetGuard,
        pendingHitlStore: mockHitlStore,
        filePath: testStateFile
      });
      assert(loaded !== null);
      assert.strictEqual(budgetGuard.getAgentSpend(testAgent).spentToday, 65.50);
      assert.strictEqual(mockHitlStore.size, 1);
      assert(mockHitlStore.has('HITL-TEST-99'));
    });
  });
});
