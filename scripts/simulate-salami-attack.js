/**
 * PromptPay Guard — Test Simulation 3: Salami / Micro-Drain Attack
 * Corresponds to TC-NEG-03 in PRD
 * Tests high-frequency micro-drain loop exceeding sliding-window velocity threshold
 */

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/api/v1/orders/execute';

async function runSalamiAttackSimulation() {
  console.log('==================================================================');
  console.log('  SIMULATION: High-Frequency Micro-Drain (Salami Attack)');
  console.log('  Testing Sliding-Window Velocity Limiter (<5ms Tier-1 Filter)');
  console.log('  Target Endpoint: ' + TARGET_URL);
  console.log('==================================================================\n');

  const attackAgentId = `salami_attacker_agent_${Date.now()}`;
  const totalBursts = 12;
  let approvedCount = 0;
  let throttledCount = 0;

  console.log(`Firing burst of ${totalBursts} rapid micro-transactions ($0.99) to test atomic sliding-log limiter...\n`);

  for (let i = 1; i <= totalBursts; i++) {
    const payload = {
      agent_id: attackAgentId,
      user_intent: `Automated recurring micro-settlement #${i}`,
      recipient_email: 'donations@wikimedia.org',
      amount: 0.99,
      currency: 'USD',
      context_window: `Micro-drain loop iteration #${i}`
    };

    const startTime = Date.now();
    try {
      const res = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const elapsed = Date.now() - startTime;
      const data = await res.json();

      if (res.status === 200 && data.status === 'APPROVED') {
        approvedCount++;
        console.log(`[Req #${i.toString().padStart(2, '0')}] APPROVED   (${elapsed}ms) - Settled via PayPal. Order: ${data.order_id}`);
      } else if (res.status === 429 && data.status === 'BLOCKED') {
        throttledCount++;
        console.log(`[Req #${i.toString().padStart(2, '0')}] THROTTLED  (${elapsed}ms) - Blocked at Tier-1. Reason: ${data.reason}`);
      } else {
        console.log(`[Req #${i.toString().padStart(2, '0')}] BLOCKED    (${elapsed}ms) - Status: ${res.status}`);
      }
    } catch (err) {
      console.error(`Req #${i} failed:`, err.message);
    }

    // Small delay between bursts (150ms)
    await new Promise(r => setTimeout(r, 150));
  }

  console.log('\n==================================================================');
  console.log('  SALAMI ATTACK SIMULATION RESULTS');
  console.log('==================================================================');
  console.log(`  Total Invocations:       ${totalBursts}`);
  console.log(`  Allowed Under Limit:     ${approvedCount} transactions`);
  console.log(`  Throttled & Neutralized: ${throttledCount} transactions`);
  console.log('==================================================================');

  if (throttledCount > 0) {
    console.log('SUCCESS: Sliding-window velocity limiter successfully halted runway loop.');
  } else {
    console.error('FAILURE: Velocity limiter did not throttle excessive transactions!');
    process.exit(1);
  }
}

runSalamiAttackSimulation();
