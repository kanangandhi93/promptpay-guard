/**
 * PromptPay Guard — Dynamic Model Switching & Financial Intelligence Unit / Integration Tests
 *
 * Verifies:
 * 1. Semantic Engine Provider Adapter pricing & model mapping (gemini-1.5-flash vs gemini-1.5-pro)
 * 2. Token usage & exact unit cost calculations
 * 3. Dynamic model switching via POST /api/v1/pay payload
 * 4. Tier-1 zero-cost drop telemetry tracking
 * 5. GET /api/v1/metrics endpoint responses (avg_cost_per_request & cost_saved_vs_frontier)
 */

process.env.NODE_ENV = 'test';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { semanticEngine, MODEL_PRICING } from '../src/services/semanticEngine.js';
import { telemetryBus } from '../src/telemetry/eventBus.js';
import { velocityLimiter } from '../src/tier1/velocityLimiter.js';
import { budgetGuard } from '../src/tier1/budgetGuard.js';

describe('DYNAMIC MODEL SELECTION & UNIT COST TELEMETRY SUITE', () => {

  beforeEach(() => {
    telemetryBus.reset();
    velocityLimiter.reset();
    budgetGuard.reset();
  });

  // =========================================================================
  // 1. Semantic Engine Provider Adapter & Pricing Calculations
  // =========================================================================
  describe('1. Provider Adapter & Pricing Table', () => {

    it('1.1 should correctly resolve gemini-1.5-flash pricing constants', () => {
      const pricing = semanticEngine.getPricing('gemini-1.5-flash');
      assert.equal(pricing.modelKey, 'gemini-1.5-flash');
      assert.equal(pricing.inputCostPerMillion, 0.075);
      assert.equal(pricing.outputCostPerMillion, 0.300);
      assert.equal(pricing.inputCostPerToken, 0.075 / 1_000_000);
      assert.equal(pricing.outputCostPerToken, 0.300 / 1_000_000);
    });

    it('1.2 should correctly resolve gemini-1.5-pro pricing constants', () => {
      const pricing = semanticEngine.getPricing('gemini-1.5-pro');
      assert.equal(pricing.modelKey, 'gemini-1.5-pro');
      assert.equal(pricing.inputCostPerMillion, 1.250);
      assert.equal(pricing.outputCostPerMillion, 5.000);
      assert.equal(pricing.inputCostPerToken, 1.250 / 1_000_000);
      assert.equal(pricing.outputCostPerToken, 5.000 / 1_000_000);
    });

    it('1.3 should compute accurate inference costs for given token counts', () => {
      // 350 input tokens, 80 output tokens
      const flashCost = semanticEngine.calculateCost('gemini-1.5-flash', 350, 80);
      const expectedFlash = (350 * (0.075 / 1_000_000)) + (80 * (0.30 / 1_000_000));
      assert.equal(flashCost.costUsd, parseFloat(expectedFlash.toFixed(7)));
      assert.equal(flashCost.totalTokens, 430);

      const proCost = semanticEngine.calculateCost('gemini-1.5-pro', 350, 80);
      const expectedPro = (350 * (1.25 / 1_000_000)) + (80 * (5.00 / 1_000_000));
      assert.equal(proCost.costUsd, parseFloat(expectedPro.toFixed(7)));
      assert.equal(proCost.totalTokens, 430);

      // Pro should be significantly higher cost than flash (~16.6x)
      assert.ok(proCost.costUsd > flashCost.costUsd);
    });
  });

  // =========================================================================
  // 2. Dynamic Model Switching via API Payload
  // =========================================================================
  describe('2. Dynamic Model Switching via API', () => {

    it('2.1 should evaluate using gemini-1.5-flash when specified', async () => {
      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'agent_model_flash_01',
          user_intent: 'Purchase Figma subscription license for $45.00',
          recipient_email: 'billing@figma.com',
          amount: 45.00,
          currency: 'USD',
          model: 'gemini-1.5-flash'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'APPROVED');
      assert.equal(res.body.security_verification.model_used, 'gemini-1.5-flash');
      assert.ok(res.body.security_verification.inference_cost_usd > 0);
    });

    it('2.2 should evaluate using gemini-1.5-pro when specified', async () => {
      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'agent_model_pro_02',
          user_intent: 'Renew OpenAI developer credits for $50.00',
          recipient_email: 'payments@openai.com',
          amount: 50.00,
          currency: 'USD',
          model: 'gemini-1.5-pro'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'APPROVED');
      assert.equal(res.body.security_verification.model_used, 'gemini-1.5-pro');
      assert.ok(res.body.security_verification.inference_cost_usd > 0);
    });
  });

  // =========================================================================
  // 3. Unit Cost & Financial Intelligence Telemetry (/api/v1/metrics)
  // =========================================================================
  describe('3. Unit Cost Telemetry & GET /api/v1/metrics', () => {

    it('3.1 should track zero-cost drops when Tier-1 heuristic blocks an invalid transaction', async () => {
      // Send typo-squatted vendor -> blocked at Tier 1
      const res = await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'attacker_agent_03',
          user_intent: 'Pay domain provider',
          recipient_email: 'billing@amaz0n-fake.net',
          amount: 50.00,
          currency: 'USD'
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.status, 'BLOCKED');

      const metricsRes = await request(app).get('/api/v1/metrics');
      assert.equal(metricsRes.status, 200);
      assert.equal(metricsRes.body.totalRequestsCount, 1);
      assert.equal(metricsRes.body.tier1ZeroCostDrops, 1);
      assert.equal(metricsRes.body.tier2EvaluationsCount, 0);
      assert.equal(metricsRes.body.totalInferenceCostUsd, 0.0);
      assert.equal(metricsRes.body.avg_cost_per_request, 0.0);
      assert.equal(metricsRes.body.zero_cost_block_rate_pct, 100.0);
    });

    it('3.2 should compute avg_cost_per_request and cost_saved_vs_frontier accurately', async () => {
      // 1. Send 1 blocked request (Tier-1 drop, $0.00 cost)
      await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'bad_vendor_agent',
          user_intent: 'Pay rogue account',
          recipient_email: 'hacker@unauthorized.com',
          amount: 25.00,
          currency: 'USD'
        });

      // 2. Send 1 valid request (Tier-2 evaluation with gemini-1.5-flash)
      await request(app)
        .post('/api/v1/pay')
        .send({
          agent_id: 'valid_agent_04',
          user_intent: 'Purchase Figma subscription license for $45.00',
          recipient_email: 'billing@figma.com',
          amount: 45.00,
          currency: 'USD',
          model: 'gemini-1.5-flash'
        });

      const metricsRes = await request(app).get('/api/v1/metrics');
      assert.equal(metricsRes.status, 200);
      const metrics = metricsRes.body;

      assert.equal(metrics.totalRequestsCount, 2);
      assert.equal(metrics.tier1ZeroCostDrops, 1);
      assert.equal(metrics.tier2EvaluationsCount, 1);
      assert.equal(metrics.zero_cost_block_rate_pct, 50.0);

      // Verify avg_cost_per_request = totalInferenceCostUsd / 2
      const expectedAvg = metrics.totalInferenceCostUsd / 2;
      assert.equal(metrics.avg_cost_per_request, parseFloat(expectedAvg.toFixed(6)));

      // Verify cost_saved_vs_frontier vs $0.00235 baseline
      const frontierBaseline = 2 * 0.00235;
      const expectedSaved = frontierBaseline - metrics.totalInferenceCostUsd;
      assert.equal(metrics.cost_saved_vs_frontier, parseFloat(expectedSaved.toFixed(4)));
      assert.ok(metrics.savings_vs_frontier_pct > 95.0, 'Expected > 95% cost savings vs frontier baseline');
    });
  });
});
