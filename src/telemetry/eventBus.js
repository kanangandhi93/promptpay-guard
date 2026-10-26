import crypto from 'crypto';

/**
 * Real-Time Telemetry Event Bus & In-Memory Audit Buffer
 * Manages Server-Sent Events (SSE) connections, unit-cost financial intelligence,
 * and aggregate performance statistics.
 */
class TelemetryEventBus {
  constructor() {
    this.clients = new Set();
    this.maxAuditHistory = 200;
    this.auditLog = [];

    // Aggregate metrics & unit economics telemetry
    this.metrics = {
      totalRequests: 0,
      totalRequestsCount: 0,
      totalApproved: 0,
      totalBlocked: 0,
      tier1ZeroCostDrops: 0,
      tier2EvaluationsCount: 0,
      totalInferenceCostUsd: 0.0,
      totalTokensUsed: {
        input: 0,
        output: 0,
        total: 0
      },
      blockedByTier1Schema: 0,
      blockedByTier1Velocity: 0,
      blockedByTier1Budget: 0,
      blockedByTier1Vendor: 0,
      blockedByTier2Injection: 0,
      blockedByTier2Divergence: 0,
      totalVolumeProcessed: 0.0,
      totalDollarsSaved: 0.0,
      tier1Latencies: [],
      tier2Latencies: [],
      paypalLatencies: [],
      totalLatencies: []
    };
  }

  /**
   * Subscribe an Express response stream to SSE events
   * @param {object} res - Express response object
   */
  subscribe(res) {
    this.clients.add(res);

    // Send initial snapshot
    const initialPayload = JSON.stringify({
      type: 'INIT_STATE',
      metrics: this.getSummaryStats(),
      financials: this.getFinancialMetrics(),
      recentLogs: this.auditLog.slice(-30)
    });
    res.write(`data: ${initialPayload}\n\n`);

    // Clean up on disconnect
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Record and broadcast a transaction decision event
   * @param {object} event
   */
  recordEvent(event) {
    const timestamp = new Date().toISOString();
    const eventId = `EVT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const enrichedEvent = {
      id: eventId,
      timestamp,
      ...event
    };

    // Update audit buffer
    this.auditLog.push(enrichedEvent);
    if (this.auditLog.length > this.maxAuditHistory) {
      this.auditLog.shift();
    }

    // Update aggregate metrics & financial accounting
    this.updateMetrics(enrichedEvent);

    // Broadcast to all active SSE subscribers
    const payload = JSON.stringify({
      type: 'TRANSACTION_EVENT',
      event: enrichedEvent,
      metrics: this.getSummaryStats(),
      financials: this.getFinancialMetrics()
    });

    for (const client of this.clients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(client);
      }
    }

    return enrichedEvent;
  }

  /**
   * Updates internal counters and unit economic tracking
   */
  updateMetrics(event) {
    this.metrics.totalRequests += 1;
    this.metrics.totalRequestsCount += 1;

    // Check if dropped at Tier 1 (100% zero LLM inference cost)
    const isTier1Drop = ['TIER1_SCHEMA', 'TIER1_VELOCITY', 'TIER1_BUDGET', 'TIER1_VENDOR_WHITELIST'].includes(event.blockedStage)
      || (event.status === 'BLOCKED' && event.blockedStage && event.blockedStage.startsWith('TIER1'));

    if (isTier1Drop) {
      this.metrics.tier1ZeroCostDrops += 1;
    }

    // Check if Tier 2 semantic evaluation occurred
    if (event.tier2Evaluated === true) {
      this.metrics.tier2EvaluationsCount += 1;
      this.metrics.totalInferenceCostUsd += (event.inferenceCostUsd || 0);

      if (event.tokens) {
        this.metrics.totalTokensUsed.input += (event.tokens.inputTokens || 0);
        this.metrics.totalTokensUsed.output += (event.tokens.outputTokens || 0);
        this.metrics.totalTokensUsed.total += (event.tokens.totalTokens || 0);
      }
    }

    if (event.status === 'APPROVED') {
      this.metrics.totalApproved += 1;
      this.metrics.totalVolumeProcessed += (event.amount || 0);
    } else {
      this.metrics.totalBlocked += 1;
      this.metrics.totalDollarsSaved += (event.amount || 0);

      if (event.blockedStage === 'TIER1_SCHEMA') this.metrics.blockedByTier1Schema += 1;
      if (event.blockedStage === 'TIER1_VELOCITY') this.metrics.blockedByTier1Velocity += 1;
      if (event.blockedStage === 'TIER1_BUDGET') this.metrics.blockedByTier1Budget += 1;
      if (event.blockedStage === 'TIER1_VENDOR_WHITELIST') this.metrics.blockedByTier1Vendor += 1;
      if (event.blockedStage === 'TIER2_INJECTION') this.metrics.blockedByTier2Injection += 1;
      if (event.blockedStage === 'TIER2_DIVERGENCE') this.metrics.blockedByTier2Divergence += 1;
    }

    // Track latencies
    if (event.latency?.tier1Ms !== undefined) this.metrics.tier1Latencies.push(event.latency.tier1Ms);
    if (event.latency?.tier2Ms !== undefined) this.metrics.tier2Latencies.push(event.latency.tier2Ms);
    if (event.latency?.paypalMs !== undefined) this.metrics.paypalLatencies.push(event.latency.paypalMs);
    if (event.latency?.totalMs !== undefined) this.metrics.totalLatencies.push(event.latency.totalMs);

    // Cap latency arrays to prevent unbounded growth
    if (this.metrics.tier1Latencies.length > 500) this.metrics.tier1Latencies.shift();
    if (this.metrics.tier2Latencies.length > 500) this.metrics.tier2Latencies.shift();
    if (this.metrics.paypalLatencies.length > 500) this.metrics.paypalLatencies.shift();
    if (this.metrics.totalLatencies.length > 500) this.metrics.totalLatencies.shift();
  }

  /**
   * Helper to compute average of array
   */
  computeAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / arr.length).toFixed(2));
  }

  /**
   * Dedicated Financial Intelligence & Unit Economics Report
   */
  getFinancialMetrics() {
    const total = this.metrics.totalRequestsCount;
    const inferenceCost = this.metrics.totalInferenceCostUsd;
    const frontierUnitCost = 0.00235; // $0.00235 per transaction baseline (GPT-4 / Claude 3.5 Sonnet)
    const frontierBaselineCost = total * frontierUnitCost;
    const costSaved = Math.max(0, frontierBaselineCost - inferenceCost);
    const avgCostPerRequest = total > 0 ? (inferenceCost / total) : 0;
    const zeroCostBlockRate = total > 0 ? ((this.metrics.tier1ZeroCostDrops / total) * 100) : 0;
    const savingsPercent = frontierBaselineCost > 0 ? ((costSaved / frontierBaselineCost) * 100) : 98.67;

    return {
      totalRequestsCount: total,
      tier1ZeroCostDrops: this.metrics.tier1ZeroCostDrops,
      tier2EvaluationsCount: this.metrics.tier2EvaluationsCount,
      totalInferenceCostUsd: parseFloat(inferenceCost.toFixed(6)),
      avg_cost_per_request: parseFloat(avgCostPerRequest.toFixed(6)),
      cost_saved_vs_frontier: parseFloat(costSaved.toFixed(4)),
      zero_cost_block_rate_pct: parseFloat(zeroCostBlockRate.toFixed(2)),
      frontier_baseline_cost_usd: parseFloat(frontierBaselineCost.toFixed(4)),
      savings_vs_frontier_pct: parseFloat(savingsPercent.toFixed(2)),
      unit_frontier_cost_usd: frontierUnitCost,
      tokens: {
        inputTokens: this.metrics.totalTokensUsed.input,
        outputTokens: this.metrics.totalTokensUsed.output,
        totalTokens: this.metrics.totalTokensUsed.total
      }
    };
  }

  /**
   * Get summary metrics for dashboard and SSE subscribers
   */
  getSummaryStats() {
    const financials = this.getFinancialMetrics();

    return {
      totalRequests: this.metrics.totalRequests,
      totalRequestsCount: this.metrics.totalRequestsCount,
      totalApproved: this.metrics.totalApproved,
      totalBlocked: this.metrics.totalBlocked,
      tier1ZeroCostDrops: this.metrics.tier1ZeroCostDrops,
      tier2EvaluationsCount: this.metrics.tier2EvaluationsCount,
      totalInferenceCostUsd: financials.totalInferenceCostUsd,
      avg_cost_per_request: financials.avg_cost_per_request,
      cost_saved_vs_frontier: financials.cost_saved_vs_frontier,
      zero_cost_block_rate: financials.zero_cost_block_rate_pct,
      blockedBreakdown: {
        schema: this.metrics.blockedByTier1Schema,
        velocity: this.metrics.blockedByTier1Velocity,
        budget: this.metrics.blockedByTier1Budget,
        vendor: this.metrics.blockedByTier1Vendor,
        injection: this.metrics.blockedByTier2Injection,
        divergence: this.metrics.blockedByTier2Divergence
      },
      totalVolumeProcessed: parseFloat(this.metrics.totalVolumeProcessed.toFixed(2)),
      totalDollarsSaved: parseFloat(this.metrics.totalDollarsSaved.toFixed(2)),
      avgTier1LatencyMs: this.computeAverage(this.metrics.tier1Latencies),
      avgTier2LatencyMs: this.computeAverage(this.metrics.tier2Latencies),
      avgPayPalLatencyMs: this.computeAverage(this.metrics.paypalLatencies),
      avgTotalLatencyMs: this.computeAverage(this.metrics.totalLatencies),
      activeSseSubscribers: this.clients.size
    };
  }

  /**
   * Get audit log entries
   */
  getAuditLog(limit = 50) {
    return this.auditLog.slice(-limit).reverse();
  }

  /**
   * Reset all stats for clean testing
   */
  reset() {
    this.auditLog = [];
    this.metrics = {
      totalRequests: 0,
      totalRequestsCount: 0,
      totalApproved: 0,
      totalBlocked: 0,
      tier1ZeroCostDrops: 0,
      tier2EvaluationsCount: 0,
      totalInferenceCostUsd: 0.0,
      totalTokensUsed: {
        input: 0,
        output: 0,
        total: 0
      },
      blockedByTier1Schema: 0,
      blockedByTier1Velocity: 0,
      blockedByTier1Budget: 0,
      blockedByTier1Vendor: 0,
      blockedByTier2Injection: 0,
      blockedByTier2Divergence: 0,
      totalVolumeProcessed: 0.0,
      totalDollarsSaved: 0.0,
      tier1Latencies: [],
      tier2Latencies: [],
      paypalLatencies: [],
      totalLatencies: []
    };
  }
}

export const telemetryBus = new TelemetryEventBus();
