import { config } from '../config.js';

/**
 * Sliding-Window Velocity Limiter
 * Tracks transaction timestamps in-memory using an atomic sliding log algorithm.
 * Hardened with maximum capacity bounds and LRU-style pruning to prevent memory exhaustion DoS.
 */
class SlidingWindowVelocityLimiter {
  constructor(
    maxRequests = config.tier1.maxVelocityPerWindow,
    windowSeconds = config.tier1.velocityWindowSeconds,
    maxTrackedAgents = 5000
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
    this.maxTrackedAgents = maxTrackedAgents;
    // Map of agentId -> Array of timestamps (ms)
    this.requestLogs = new Map();
  }

  /**
   * Prune expired timestamps across all agents when capacity limit is reached
   */
  pruneStaleAgents() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [agentId, timestamps] of this.requestLogs.entries()) {
      while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        this.requestLogs.delete(agentId);
      }
    }
  }

  /**
   * Evaluate whether an agent is within rate limit bounds.
   * If allowed, atomically records the timestamp.
   * @param {string} agentId
   * @returns {{ allowed: boolean, currentCount: number, limit: number, windowSeconds: number, reason?: string }}
   */
  checkAndRecord(agentId = 'default_agent') {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Guard against memory exhaustion from adversary generating unlimited random agent_ids
    if (this.requestLogs.size >= this.maxTrackedAgents) {
      this.pruneStaleAgents();
      // If still overflowing, evict oldest entry
      if (this.requestLogs.size >= this.maxTrackedAgents) {
        const oldestKey = this.requestLogs.keys().next().value;
        this.requestLogs.delete(oldestKey);
      }
    }

    // Retrieve or initialize sliding log for this agent
    let timestamps = this.requestLogs.get(agentId);
    if (!timestamps) {
      timestamps = [];
      this.requestLogs.set(agentId, timestamps);
    }

    // Prune entries outside the sliding window
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
      timestamps.shift();
    }

    // Check count against threshold
    if (timestamps.length >= this.maxRequests) {
      return {
        allowed: false,
        currentCount: timestamps.length,
        limit: this.maxRequests,
        windowSeconds: this.windowMs / 1000,
        reason: `Sliding-window velocity exceeded: ${timestamps.length + 1} requests exceeds limit of ${this.maxRequests} per ${this.windowMs / 1000}s window`
      };
    }

    // Record this request timestamp atomically
    timestamps.push(now);

    return {
      allowed: true,
      currentCount: timestamps.length,
      limit: this.maxRequests,
      windowSeconds: this.windowMs / 1000
    };
  }

  /**
   * Reset logs for testing or agent reset
   * @param {string} [agentId]
   */
  reset(agentId) {
    if (agentId) {
      this.requestLogs.delete(agentId);
    } else {
      this.requestLogs.clear();
    }
  }
}

export const velocityLimiter = new SlidingWindowVelocityLimiter();
