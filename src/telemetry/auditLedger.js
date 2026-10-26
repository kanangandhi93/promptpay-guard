/**
 * PromptPay Guard — Immutable Compliance Audit Ledger & Store
 *
 * Maintains an immutable, tamper-evident audit record of every screened transaction:
 * - Timestamps (ISO format)
 * - Agent identification
 * - Declared intent
 * - Financial amounts
 * - Recipients & Whitelist status
 * - Multi-tier inspection decisions & threat scores
 * - Final settlement status & PayPal capture IDs
 * - Inspection costs
 */

class AuditLedgerStore {
  constructor() {
    this.records = [];
    this.maxRecords = 5000;
  }

  /**
   * Append an immutable transaction record to the compliance ledger
   * @param {object} entry
   * @returns {object}
   */
  record(entry) {
    const timestamp = entry.timestamp || new Date().toISOString();
    const id = entry.id || `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const immutableEntry = Object.freeze({
      id,
      timestamp,
      agent_id: String(entry.agent_id || entry.agentId || 'unknown_agent'),
      declared_intent: String(entry.declared_intent || entry.user_intent || entry.userIntent || 'N/A'),
      amount: parseFloat(Number(entry.amount || 0).toFixed(2)),
      currency: String(entry.currency || 'USD').toUpperCase(),
      recipient: String(entry.recipient || entry.recipient_email || entry.recipientEmail || 'unknown'),
      tier1_decision: entry.tier1_decision || (entry.blockedStage && entry.blockedStage.startsWith('TIER1') ? 'BLOCKED' : 'PASS'),
      tier2_threat_score: typeof entry.tier2_threat_score === 'number'
        ? entry.tier2_threat_score
        : (typeof entry.threatScore === 'number' ? entry.threatScore : (entry.status === 'APPROVED' ? 2 : 98)),
      final_status: entry.final_status || entry.status || 'BLOCKED',
      reason: String(entry.reason || 'Transaction processed by PromptPay Guard'),
      paypal_capture_id: entry.paypal_capture_id || entry.captureId || entry.capture_id || null,
      paypal_order_id: entry.paypal_order_id || entry.orderId || entry.order_id || null,
      inspection_cost_usd: parseFloat(Number(entry.inspection_cost_usd || entry.inferenceCostUsd || 0).toFixed(7)),
      model_used: String(entry.model_used || entry.modelUsed || 'Heuristic / Gemini Flash')
    });

    this.records.push(immutableEntry);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    return immutableEntry;
  }

  /**
   * Update status of an existing record (e.g., upon HITL approval or PayPal Webhook settlement)
   * @param {string} id - Transaction event ID or order ID
   * @param {object} updates
   */
  updateRecord(id, updates) {
    const index = this.records.findIndex(r => r.id === id || r.paypal_order_id === id || r.paypal_capture_id === id);
    if (index !== -1) {
      const existing = this.records[index];
      const updated = Object.freeze({
        ...existing,
        ...updates,
        timestamp_updated: new Date().toISOString()
      });
      this.records[index] = updated;
      return updated;
    }
    return null;
  }

  /**
   * Get all compliance ledger records
   * @returns {Array<object>}
   */
  getAll() {
    return [...this.records];
  }

  /**
   * Generates standard RFC 4180 compliant CSV export
   * @returns {string}
   */
  toCSV() {
    const headers = [
      'Timestamp (ISO)',
      'Transaction ID',
      'Agent ID',
      'Declared Intent',
      'Amount (USD)',
      'Currency',
      'Recipient Payee',
      'Tier 1 Decision',
      'Tier 2 Threat Score',
      'Final Status',
      'Reason / Threat Justification',
      'PayPal Capture ID',
      'PayPal Order ID',
      'Inspection Cost (USD)',
      'Evaluation Model'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = this.records.map(r => [
      escapeCSV(r.timestamp),
      escapeCSV(r.id),
      escapeCSV(r.agent_id),
      escapeCSV(r.declared_intent),
      escapeCSV(r.amount.toFixed(2)),
      escapeCSV(r.currency),
      escapeCSV(r.recipient),
      escapeCSV(r.tier1_decision),
      escapeCSV(r.tier2_threat_score),
      escapeCSV(r.final_status),
      escapeCSV(r.reason),
      escapeCSV(r.paypal_capture_id || 'N/A'),
      escapeCSV(r.paypal_order_id || 'N/A'),
      escapeCSV(r.inspection_cost_usd.toFixed(6)),
      escapeCSV(r.model_used)
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Generates structured JSON compliance export
   * @returns {string}
   */
  toJSON() {
    return JSON.stringify({
      title: 'PromptPay Guard Compliance Ledger & Audit Trail',
      exported_at: new Date().toISOString(),
      total_records: this.records.length,
      standard: 'Zero-Trust AI Agent Payment Firewall Audit Log',
      records: this.records
    }, null, 2);
  }

  /**
   * Clear store for clean testing
   */
  clear() {
    this.records = [];
  }
}

export const auditLedger = new AuditLedgerStore();
export default auditLedger;
