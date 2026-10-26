import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { TIER2_SYSTEM_INSTRUCTION, buildTier2Prompt } from './promptTemplates.js';
import { semanticEngine, MODEL_PRICING, resolveRiskZone } from '../services/semanticEngine.js';

class SemanticIntentClassifier {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.modelName = config.gemini.model || 'gemini-1.5-flash';
    this.threshold = config.gemini.threatThreshold;
    this.timeoutMs = config.gemini.timeoutMs;

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Evaluates the semantic safety and intent reconciliation of a transaction
   * Implements dynamic model switching, 3-zone risk evaluation, and strict Fail-Secure behavior.
   * @param {object} transactionData
   * @param {string} [overrideModel]
   * @returns {Promise<object>}
   */
  async evaluate(transactionData, overrideModel) {
    const startHr = process.hrtime.bigint();
    const modelToUse = overrideModel || transactionData.model || transactionData.evaluation_model || this.modelName || 'gemini-1.5-flash';
    const pricing = semanticEngine.getPricing(modelToUse);
    const resolvedModelName = pricing.modelKey;

    // 1. Attempt Live Gemini evaluation if API key is present
    if (this.apiKey && this.apiKey !== 'your_gemini_api_key_here') {
      try {
        const geminiResult = await this.evaluateWithGemini(transactionData, resolvedModelName);
        const endHr = process.hrtime.bigint();
        const latencyMs = Number(endHr - startHr) / 1_000_000;

        return {
          ...geminiResult,
          latencyMs: parseFloat(latencyMs.toFixed(2)),
          modelUsed: resolvedModelName,
          engine: pricing.name
        };
      } catch (err) {
        console.warn(`[Tier-2 Gemini Error (${resolvedModelName})] ${err.message}. Applying Fail-Secure Policy.`);

        const endHr = process.hrtime.bigint();
        const latencyMs = Number(endHr - startHr) / 1_000_000;
        const isTimeout = err.message.toLowerCase().includes('timeout');
        const failSecureRisk = resolveRiskZone(90);

        return {
          passed: false,
          requiresHitl: false,
          riskZone: failSecureRisk.zone,
          riskLabel: failSecureRisk.label,
          statusCode: isTimeout ? 504 : 503,
          threatScore: 90,
          threatType: 'AI_GATEWAY_TIMEOUT_FAIL_SECURE',
          reason: `Fail-Secure Policy Enforced: Semantic evaluation engine unavailable (${err.message}). Transaction dropped to prevent fail-open state.`,
          divergenceDetected: true,
          latencyMs: parseFloat(latencyMs.toFixed(2)),
          modelUsed: resolvedModelName,
          engine: 'PromptPay Fail-Secure Kernel',
          tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          inferenceCostUsd: 0.00
        };
      }
    }

    // 2. Local Semantic Heuristic Engine (deterministic fallback for testing & offline)
    const localResult = this.evaluateWithLocalHeuristics(transactionData);
    const endHr = process.hrtime.bigint();
    const latencyMs = Number(endHr - startHr) / 1_000_000;

    const promptLength = (transactionData.user_intent || '').length + (transactionData.context_window || '').length;
    const estInputTokens = Math.max(120, Math.round(promptLength / 3.5) + 150);
    const estOutputTokens = 85;
    const tokenCost = semanticEngine.calculateCost(resolvedModelName, estInputTokens, estOutputTokens);

    return {
      ...localResult,
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      modelUsed: resolvedModelName,
      engine: `${pricing.name} (Local Kernel)`,
      tokens: {
        inputTokens: tokenCost.inputTokens,
        outputTokens: tokenCost.outputTokens,
        totalTokens: tokenCost.totalTokens
      },
      inferenceCostUsd: tokenCost.costUsd
    };
  }

  /**
   * Calls Gemini model with timeout handling, token usage profiling, and resilient JSON parsing
   */
  async evaluateWithGemini(transactionData, modelName) {
    const pricing = semanticEngine.getPricing(modelName || this.modelName);
    const resolvedModelName = pricing.modelKey;

    const model = this.genAI.getGenerativeModel({
      model: resolvedModelName,
      systemInstruction: TIER2_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const prompt = buildTier2Prompt(transactionData);

    // Timeout race
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout exceeded')), this.timeoutMs)
    );

    const apiPromise = model.generateContent(prompt);
    const result = await Promise.race([apiPromise, timeoutPromise]);
    const responseText = result.response.text();

    // Extract exact token metrics if provided by Gemini metadata
    const usage = result.response.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || Math.max(120, Math.round(prompt.length / 3.8));
    const outputTokens = usage.candidatesTokenCount || Math.max(40, Math.round(responseText.length / 3.8));
    const tokenCost = semanticEngine.calculateCost(resolvedModelName, inputTokens, outputTokens);

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      const risk = resolveRiskZone(90);
      return {
        passed: false,
        requiresHitl: false,
        riskZone: risk.zone,
        riskLabel: risk.label,
        threatScore: 90,
        threatType: 'MALFORMED_AI_OUTPUT',
        reason: 'Semantic evaluation engine returned unparseable response structure. Rejected under Fail-Secure policy.',
        divergenceDetected: true,
        tokens: {
          inputTokens: tokenCost.inputTokens,
          outputTokens: tokenCost.outputTokens,
          totalTokens: tokenCost.totalTokens
        },
        inferenceCostUsd: tokenCost.costUsd
      };
    }

    const rawThreatScore = typeof parsed.threat_score === 'number' ? parsed.threat_score : 100;
    const risk = resolveRiskZone(rawThreatScore);

    return {
      passed: risk.zone === 'LOW_RISK',
      requiresHitl: risk.zone === 'MEDIUM_RISK',
      riskZone: risk.zone,
      riskLabel: risk.label,
      threatScore: risk.score,
      threatType: parsed.threat_type || (risk.zone === 'MEDIUM_RISK' ? 'HITL_SUSPICION' : null),
      reason: parsed.reason || risk.label,
      divergenceDetected: !!parsed.divergence_detected,
      tokens: {
        inputTokens: tokenCost.inputTokens,
        outputTokens: tokenCost.outputTokens,
        totalTokens: tokenCost.totalTokens
      },
      inferenceCostUsd: tokenCost.costUsd
    };
  }

  /**
   * Robust local semantic heuristic analysis
   * Matches common jailbreak signatures, adversarial overrides, intent amount mismatch,
   * and Human-in-the-Loop (HITL) conditions.
   */
  evaluateWithLocalHeuristics(transactionData) {
    const { user_intent = '', amount, context_window = '', force_hitl } = transactionData;
    const combinedContext = `${user_intent} ${context_window}`.toLowerCase();

    // 1. Adversarial injection patterns (CRITICAL RISK -> 98)
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /disregard\s+(prior|previous)\s+(task|constraints|rules)/i,
      /critical:\s*system\s*administrator\s*override/i,
      /system\s*override/i,
      /admin\s*mode\s*activated/i,
      /emergency\s*escrow\s*account/i,
      /authorized\s*payee\s*is\s*now/i,
      /redirected.*authorized\s*payee/i,
      /prompt\s*injection/i,
      /jailbreak/i,
      /bypass\s*guard/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(combinedContext)) {
        const risk = resolveRiskZone(98);
        return {
          passed: false,
          requiresHitl: false,
          riskZone: risk.zone,
          riskLabel: risk.label,
          threatScore: 98,
          threatType: 'PROMPT_INJECTION',
          reason: 'Direct / Indirect Prompt Injection detected: Adversarial instruction override sequence identified in agent context window.',
          divergenceDetected: true
        };
      }
    }

    // 2. Role-reversal / Jailbreak indicators (CRITICAL RISK -> 92)
    const rolePlayPatterns = [
      /you\s+are\s+now\s+in\s+unrestricted\s+mode/i,
      /developer\s+debug\s+mode/i,
      /pretend\s+there\s+are\s+no\s+rules/i,
      /do\s+anything\s+now/i
    ];

    for (const pattern of rolePlayPatterns) {
      if (pattern.test(combinedContext)) {
        const risk = resolveRiskZone(92);
        return {
          passed: false,
          requiresHitl: false,
          riskZone: risk.zone,
          riskLabel: risk.label,
          threatScore: 92,
          threatType: 'ROLE_REVERSAL',
          reason: 'Role-reversal / Jailbreak attempt detected attempting to disable payment safety constraints.',
          divergenceDetected: true
        };
      }
    }

    // 3. Semantic Intent Divergence Check (CRITICAL RISK -> 75)
    const amountMatches = user_intent.match(/\$?\s*([0-9]+(\.[0-9]{1,2})?)/g);
    if (amountMatches && amountMatches.length > 0) {
      const extractedAmounts = amountMatches.map(m => parseFloat(m.replace('$', '').trim()));
      const matchesDeclaredAmount = extractedAmounts.some(declared => Math.abs(declared - amount) < 0.05);

      if (!matchesDeclaredAmount && extractedAmounts.length === 1 && Math.abs(extractedAmounts[0] - amount) > 5) {
        const risk = resolveRiskZone(75);
        return {
          passed: false,
          requiresHitl: false,
          riskZone: risk.zone,
          riskLabel: risk.label,
          threatScore: 75,
          threatType: 'INTENT_DIVERGENCE',
          reason: `Declared user intent specified $${extractedAmounts[0]}, but agent attempted to settle order for $${amount}. Intent divergence threshold exceeded.`,
          divergenceDetected: true
        };
      }
    }

    // 4. MEDIUM RISK OPERATIONAL ZONE (Score 31 to 70: Requires Human Confirmation / HITL Escalate)
    const hitlTriggers = [
      /human-in-the-loop/i,
      /pending\s+review/i,
      /unverified\s+discount/i,
      /medium\s*risk/i,
      /flagged\s+for\s+audit/i,
      /requires\s+(human|admin)\s+(approval|confirmation|override)/i,
      /ambiguous\s+intent/i,
      /high\s+variance/i
    ];

    const isHitlTriggered = force_hitl || hitlTriggers.some(pattern => pattern.test(combinedContext));
    if (isHitlTriggered) {
      const risk = resolveRiskZone(52);
      return {
        passed: false,
        requiresHitl: true,
        riskZone: risk.zone,
        riskLabel: risk.label,
        threatScore: 52,
        threatType: 'HITL_REVIEW_REQUIRED',
        reason: 'Pending Human Approval: Moderate intent ambiguity or manual audit condition flagged. Execution suspended pending admin override.',
        divergenceDetected: false
      };
    }

    // 5. LOW RISK OPERATIONAL ZONE (Score 0 to 30: Autonomous Clearance -> Direct PayPal Capture)
    const risk = resolveRiskZone(2);
    return {
      passed: true,
      requiresHitl: false,
      riskZone: risk.zone,
      riskLabel: risk.label,
      threatScore: 2,
      threatType: null,
      reason: 'Transaction context semantically consistent with declared user intent. Autonomous clearance granted.',
      divergenceDetected: false
    };
  }
}

export const semanticClassifier = new SemanticIntentClassifier();
export { MODEL_PRICING, resolveRiskZone };
