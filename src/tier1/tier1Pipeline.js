import { validateTransactionSchema } from './schemaValidator.js';
import { velocityLimiter } from './velocityLimiter.js';
import { vendorWhitelist } from './vendorWhitelist.js';
import { budgetGuard } from './budgetGuard.js';

/**
 * Tier-1 Fast Local Engine (<5ms execution target)
 * Evaluates non-discretionary safety rules in pure in-memory operations.
 *
 * @param {object} payload - Incoming AI agent transaction payload
 * @returns {object} Tier-1 evaluation result with sub-millisecond precision
 */
export function evaluateTier1(payload) {
  const startHr = process.hrtime.bigint();

  // 1. Schema Validation
  const schemaResult = validateTransactionSchema(payload);
  if (!schemaResult.isValid) {
    const endHr = process.hrtime.bigint();
    const latencyMs = Number(endHr - startHr) / 1_000_000;
    return {
      passed: false,
      blockedStage: schemaResult.blockedStage || 'TIER1_SCHEMA',
      status: schemaResult.status || 'BLOCKED',
      reason: schemaResult.reason,
      statusCode: schemaResult.statusCode || 400,
      inspection_cost_usd: schemaResult.inspection_cost_usd ?? 0.00,
      latencyMs: parseFloat(latencyMs.toFixed(3))
    };
  }

  const data = schemaResult.sanitized;

  // 2. Sliding-Window Velocity Limiter
  const velocityResult = velocityLimiter.checkAndRecord(data.agent_id);
  if (!velocityResult.allowed) {
    const endHr = process.hrtime.bigint();
    const latencyMs = Number(endHr - startHr) / 1_000_000;
    return {
      passed: false,
      blockedStage: 'TIER1_VELOCITY',
      threatType: 'SALAMI_MICRO_DRAIN',
      reason: velocityResult.reason,
      statusCode: 429,
      latencyMs: parseFloat(latencyMs.toFixed(3)),
      metadata: {
        agentId: data.agent_id,
        currentCount: velocityResult.currentCount,
        limit: velocityResult.limit,
        windowSeconds: velocityResult.windowSeconds
      }
    };
  }

  // 3. Vendor Whitelist & Typo-squatting Check
  const vendorResult = vendorWhitelist.evaluate(data.recipient_email);
  if (!vendorResult.allowed) {
    const endHr = process.hrtime.bigint();
    const latencyMs = Number(endHr - startHr) / 1_000_000;
    return {
      passed: false,
      blockedStage: 'TIER1_VENDOR_WHITELIST',
      threatType: vendorResult.isTypoSquat ? 'TYPO_SQUATTING_ATTACK' : 'UNAUTHORIZED_VENDOR',
      reason: vendorResult.reason,
      statusCode: 403,
      latencyMs: parseFloat(latencyMs.toFixed(3)),
      metadata: {
        recipient: data.recipient_email,
        isTypoSquat: vendorResult.isTypoSquat
      }
    };
  }

  // 4. Strict Budget Bounds (Single Cap & Daily Cumulative)
  const budgetResult = budgetGuard.evaluate(data.agent_id, data.amount, {
    customSingleLimit: data.max_budget_cap
  });
  if (!budgetResult.allowed) {
    const endHr = process.hrtime.bigint();
    const latencyMs = Number(endHr - startHr) / 1_000_000;
    return {
      passed: false,
      blockedStage: 'TIER1_BUDGET',
      threatType: 'BUDGET_OVERRUN',
      reason: budgetResult.reason,
      statusCode: 403,
      latencyMs: parseFloat(latencyMs.toFixed(3)),
      metadata: {
        amount: data.amount,
        currentDailySpend: budgetResult.currentDailySpend,
        remainingDaily: budgetResult.remainingDaily
      }
    };
  }

  const endHr = process.hrtime.bigint();
  const latencyMs = Number(endHr - startHr) / 1_000_000;

  return {
    passed: true,
    data,
    vendor: vendorResult.vendor,
    latencyMs: parseFloat(latencyMs.toFixed(3)),
    budgetRemaining: budgetResult.remainingDaily
  };
}
