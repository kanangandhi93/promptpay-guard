import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { TIER2_SYSTEM_INSTRUCTION, buildTier2Prompt } from '../tier2/promptTemplates.js';

/**
 * Enterprise Model Pricing Table (Per Million Tokens & Per Token)
 */
export const MODEL_PRICING = {
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.300,
    inputCostPerToken: 0.075 / 1_000_000,
    outputCostPerToken: 0.300 / 1_000_000,
    defaultLatencyMs: 180
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    inputCostPerMillion: 1.250,
    outputCostPerMillion: 5.000,
    inputCostPerToken: 1.250 / 1_000_000,
    outputCostPerToken: 5.000 / 1_000_000,
    defaultLatencyMs: 420
  }
};

/**
 * Maps Tier-2 Threat Scores to 3 Distinct Operational Zones:
 * - 0 to 30: LOW RISK (Autonomous Clearance -> Direct PayPal Capture)
 * - 31 to 70: MEDIUM RISK (Requires Human Confirmation -> Suspends execution for Admin HITL override)
 * - 71 to 100: CRITICAL RISK (Adversarial Threat Intercepted -> Instant Drop)
 * @param {number} threatScore
 * @returns {object}
 */
export function resolveRiskZone(threatScore) {
  const score = Math.max(0, Math.min(100, Math.round(Number(threatScore) || 0)));
  if (score <= 30) {
    return {
      zone: 'LOW_RISK',
      label: 'Autonomous Clearance',
      action: 'AUTONOMOUS_APPROVAL',
      requiresHitl: false,
      badgeColor: 'emerald',
      score
    };
  } else if (score <= 70) {
    return {
      zone: 'MEDIUM_RISK',
      label: 'Requires Human Confirmation (HITL)',
      action: 'HITL_ESCALATE',
      requiresHitl: true,
      badgeColor: 'amber',
      score
    };
  } else {
    return {
      zone: 'CRITICAL_RISK',
      label: 'Adversarial Threat Intercepted',
      action: 'INSTANT_DROP',
      requiresHitl: false,
      badgeColor: 'crimson',
      score
    };
  }
}

/**
 * Dynamic Semantic Intent Provider Adapter
 * Supports dynamic runtime switching between gemini-1.5-flash and gemini-1.5-pro,
 * computes exact token counts and unit inference cost, and enforces Fail-Secure behavior.
 */
export class SemanticEngineAdapter {
  constructor(options = {}) {
    this.apiKey = options.apiKey || config.gemini.apiKey;
    this.defaultModel = options.defaultModel || config.gemini.model || 'gemini-1.5-flash';
    this.threshold = options.threshold || config.gemini.threatThreshold || 40;
    this.timeoutMs = options.timeoutMs || config.gemini.timeoutMs || 4000;

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Resolve pricing configuration for requested model
   */
  getPricing(modelName) {
    const key = (modelName || '').toLowerCase().trim();
    if (key.includes('pro')) {
      return { modelKey: 'gemini-1.5-pro', ...MODEL_PRICING['gemini-1.5-pro'] };
    }
    return { modelKey: 'gemini-1.5-flash', ...MODEL_PRICING['gemini-1.5-flash'] };
  }

  /**
   * Computes inference cost from token metrics
   */
  calculateCost(modelKey, inputTokens, outputTokens) {
    const pricing = this.getPricing(modelKey);
    const cost = (inputTokens * pricing.inputCostPerToken) + (outputTokens * pricing.outputCostPerToken);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd: parseFloat(cost.toFixed(7))
    };
  }

  /**
   * Main evaluation entry point with dynamic model switching and token profiling
   * @param {object} transactionData - Transaction payload
   * @param {string} [overrideModel] - Optional dynamic model selection
   */
  async evaluate(transactionData, overrideModel) {
    const startHr = process.hrtime.bigint();
    const requestedModel = overrideModel || transactionData.model || transactionData.evaluation_model || this.defaultModel;
    const pricing = this.getPricing(requestedModel);
    const resolvedModelName = pricing.modelKey;

    // 1. Live Gemini API execution when valid API key is present
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

    // 2. Deterministic Local Semantic Kernel (mock / test / zero-config mode)
    const localResult = this.evaluateWithLocalHeuristics(transactionData);
    const endHr = process.hrtime.bigint();
    const latencyMs = Number(endHr - startHr) / 1_000_000;

    // Estimate realistic tokens based on context payload size (avg ~350 in, ~80 out)
    const promptLength = (transactionData.user_intent || '').length + (transactionData.context_window || '').length;
    const estInputTokens = Math.max(120, Math.round(promptLength / 3.5) + 150);
    const estOutputTokens = 85;
    const tokenCost = this.calculateCost(resolvedModelName, estInputTokens, estOutputTokens);

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
   * Calls Google Gemini model with selected architecture and token profiling
   */
  async evaluateWithGemini(transactionData, modelName) {
    const pricing = this.getPricing(modelName);
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
    const tokenCost = this.calculateCost(resolvedModelName, inputTokens, outputTokens);

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
   * Deterministic local heuristic checks for jailbreaks, adversarial prompt injection, intent divergence,
   * and Human-in-the-Loop (HITL) medium-risk escalation.
   */
  evaluateWithLocalHeuristics(transactionData) {
    const { user_intent = '', amount, context_window = '', force_hitl } = transactionData;
    const combinedContext = `${user_intent} ${context_window}`.toLowerCase();

    // 1. Direct / Indirect Prompt Injection (CRITICAL RISK -> 98)
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

    // 3. Significant Semantic Intent Divergence (CRITICAL RISK -> 75)
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

export const semanticEngine = new SemanticEngineAdapter();
export default semanticEngine;
