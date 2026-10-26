import { config } from '../config.js';

/**
 * Budget Guard
 * Enforces strict hard constraints on single-transaction value and daily cumulative spend.
 * Protects against unexpected large transfers and gradual balance depletion.
 */
class BudgetGuard {
  constructor(
    defaultSingleLimit = config.tier1.singleTransactionLimit,
    defaultDailyLimit = config.tier1.dailyCumulativeLimit
  ) {
    this.defaultSingleLimit = defaultSingleLimit;
    this.defaultDailyLimit = defaultDailyLimit;

    // Map: agentId -> { date: 'YYYY-MM-DD', spentToday: number, transactionCount: number }
    this.dailySpendMap = new Map();
  }

  /**
   * Get current UTC date key 'YYYY-MM-DD'
   */
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get current spend state for an agent, resetting if date has changed
   * @param {string} agentId
   */
  getAgentSpend(agentId) {
    const today = this.getTodayKey();
    let record = this.dailySpendMap.get(agentId);

    if (!record || record.date !== today) {
      record = { date: today, spentToday: 0.0, transactionCount: 0 };
      this.dailySpendMap.set(agentId, record);
    }

    return record;
  }

  /**
   * Check if a transaction amount violates single or daily budget limits.
   * @param {string} agentId
   * @param {number} amount
   * @param {object} [options]
   * @param {number} [options.customSingleLimit] Optional custom single cap (e.g. enterprise procurement allowance)
   * @param {number} [options.customDailyLimit] Optional custom daily cap
   * @returns {{ allowed: boolean, currentDailySpend: number, remainingDaily: number, reason?: string }}
   */
  evaluate(agentId = 'default_agent', amount, options = {}) {
    const singleLimit = options.customSingleLimit ?? this.defaultSingleLimit;
    const dailyLimit = Math.max(options.customDailyLimit ?? this.defaultDailyLimit, singleLimit);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return {
        allowed: false,
        currentDailySpend: 0,
        remainingDaily: dailyLimit,
        reason: `Invalid transaction amount: ${amount}`
      };
    }

    // 1. Single transaction cap check
    if (parsedAmount > singleLimit) {
      return {
        allowed: false,
        currentDailySpend: this.getAgentSpend(agentId).spentToday,
        remainingDaily: Math.max(0, dailyLimit - this.getAgentSpend(agentId).spentToday),
        reason: `Hard ceiling violation: Single transaction $${parsedAmount.toFixed(2)} exceeds cap of $${singleLimit.toFixed(2)}`
      };
    }

    // 2. Cumulative daily spend check
    const record = this.getAgentSpend(agentId);
    const projectedSpend = record.spentToday + parsedAmount;

    if (projectedSpend > dailyLimit) {
      return {
        allowed: false,
        currentDailySpend: record.spentToday,
        remainingDaily: Math.max(0, dailyLimit - record.spentToday),
        reason: `Daily budget exceeded: Projected $${projectedSpend.toFixed(2)} exceeds daily limit of $${dailyLimit.toFixed(2)} (Already spent today: $${record.spentToday.toFixed(2)})`
      };
    }

    return {
      allowed: true,
      currentDailySpend: record.spentToday,
      remainingDaily: parseFloat((dailyLimit - record.spentToday).toFixed(2))
    };
  }

  /**
   * Record settled transaction spend
   * @param {string} agentId
   * @param {number} amount
   */
  recordSpend(agentId = 'default_agent', amount) {
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) {
      const record = this.getAgentSpend(agentId);
      record.spentToday = parseFloat((record.spentToday + parsedAmount).toFixed(2));
      record.transactionCount += 1;
    }
  }

  /**
   * Reset spend tracking
   * @param {string} [agentId]
   */
  reset(agentId) {
    if (agentId) {
      this.dailySpendMap.delete(agentId);
    } else {
      this.dailySpendMap.clear();
    }
  }

  /**
   * Dump in-memory spend tracking state for persistence
   * @returns {object}
   */
  dumpState() {
    return Object.fromEntries(this.dailySpendMap);
  }

  /**
   * Rehydrate spend tracking state from persistence object
   * @param {object} stateObj
   */
  loadState(stateObj) {
    if (!stateObj || typeof stateObj !== 'object') return;
    this.dailySpendMap.clear();
    for (const [agentId, record] of Object.entries(stateObj)) {
      if (record && typeof record === 'object') {
        this.dailySpendMap.set(agentId, {
          date: record.date || this.getTodayKey(),
          spentToday: parseFloat(record.spentToday || 0),
          transactionCount: parseInt(record.transactionCount || 0, 10)
        });
      }
    }
  }
}

export const budgetGuard = new BudgetGuard();
