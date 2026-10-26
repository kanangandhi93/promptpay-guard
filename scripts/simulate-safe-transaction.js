/**
 * PromptPay Guard — Test Simulation 1: Safe Autonomous Agent Payment
 * Corresponds to TC-POS-01 & TC-POS-02 in PRD
 */

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/api/v1/orders/execute';

async function runSafeTransaction() {
  console.log('==================================================================');
  console.log('  SIMULATION: Safe Autonomous Agent Payment');
  console.log('  Target Endpoint: ' + TARGET_URL);
  console.log('==================================================================\n');

  const safePayload = {
    agent_id: 'agent_procurement_figma_01',
    user_intent: 'Renew annual Figma enterprise license for design department at $144.00',
    recipient_email: 'billing@figma.com',
    amount: 144.00,
    currency: 'USD',
    max_budget_cap: 500.00,
    context_window: 'Quarterly review approved. Verified vendor license renewal for Figma design suite.'
  };

  console.log('[1/3] Transmitting legitimate agent payment payload...');
  console.log(JSON.stringify(safePayload, null, 2));

  try {
    const startTime = Date.now();
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload)
    });

    const elapsed = Date.now() - startTime;
    const data = await res.json();

    console.log(`\n[2/3] Response Received (Status: ${res.status}, Latency: ${elapsed}ms)`);
    console.log(JSON.stringify(data, null, 2));

    if (res.status === 200 && data.status === 'APPROVED') {
      console.log('\n[3/3] RESULT: SUCCESS (PASSED)');
      console.log(`  - Tier-1 Fast Heuristics: PASSED (${data.security_verification.latency_breakdown.tier1_heuristics_ms}ms)`);
      console.log(`  - Tier-2 Semantic Intent: PASSED (Threat Score: ${data.security_verification.threat_score}/100)`);
      console.log(`  - PayPal Orders API v2:   CAPTURED (Order ID: ${data.order_id}, Capture ID: ${data.capture_id})`);
      console.log('\nTransaction successfully verified and settled without friction.');
    } else {
      console.error('\n[3/3] RESULT: UNEXPECTED REJECTION', data);
      process.exit(1);
    }
  } catch (err) {
    console.error('\nRequest failed. Is PromptPay Guard running on port 3000?', err.message);
    process.exit(1);
  }
}

runSafeTransaction();
