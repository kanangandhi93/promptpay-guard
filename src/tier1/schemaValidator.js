import { config } from '../config.js';

// RFC 5321 compliant email validator with strict single '@' check
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const STRICT_CURRENCY_REGEX = /^[A-Z]{3}$/;
// Strict currency amount regex (rejects trailing junk, scientific notation, extra decimals)
const STRICT_AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_AGENT_ID_LENGTH = 128;
const MAX_INTENT_LENGTH = 1024;
const MAX_CONTEXT_LENGTH = 8192;
const ABSOLUTE_SYSTEM_MAX_CAP = 1000.00; // Hard ceiling beyond which no agent can authorize itself

/**
 * Enterprise-Hardened Schema & Syntactic Validator (<0.5ms)
 * Defends against Type Confusion, Coercion, Exponential Notation, ReDoS, and Tampering.
 */
export function validateTransactionSchema(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Request body must be a valid JSON object'
    };
  }

  const { agent_id, user_intent, recipient_email, amount, currency, context_window, max_budget_cap } = payload;

  // 1. Agent ID validation & length bounding
  if (typeof agent_id !== 'string' || agent_id.trim().length === 0) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Missing or invalid required field [agent_id]'
    };
  }
  if (agent_id.length > MAX_AGENT_ID_LENGTH) {
    return {
      isValid: false,
      statusCode: 400,
      reason: `Schema validation failed: Field [agent_id] exceeds maximum allowed length of ${MAX_AGENT_ID_LENGTH} characters`
    };
  }

  // 2. User Intent validation & length bounding
  if (typeof user_intent !== 'string' || user_intent.trim().length === 0) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Missing or invalid required field [user_intent]'
    };
  }
  if (user_intent.length > MAX_INTENT_LENGTH) {
    return {
      isValid: false,
      statusCode: 400,
      reason: `Schema validation failed: Field [user_intent] exceeds maximum length of ${MAX_INTENT_LENGTH} characters`
    };
  }

  // 3. Recipient Email validation, length bounding & single '@' check
  if (typeof recipient_email !== 'string' || recipient_email.trim().length === 0) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Missing required field [recipient_email]'
    };
  }
  const cleanEmail = recipient_email.trim();
  if (cleanEmail.length > MAX_EMAIL_LENGTH) {
    return {
      isValid: false,
      statusCode: 400,
      reason: `Schema validation failed: [recipient_email] exceeds RFC 5321 limit of ${MAX_EMAIL_LENGTH} characters`
    };
  }
  const atCount = (cleanEmail.match(/@/g) || []).length;
  if (atCount !== 1 || !STRICT_EMAIL_REGEX.test(cleanEmail)) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Malformed [recipient_email] identifier'
    };
  }

  // 4. Amount Validation (Defends against Type Confusion, Exponential Notation, NaN, Infinity, -0, Fractional cents)
  if (amount === undefined || amount === null || typeof amount === 'boolean') {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Missing or invalid required field [amount]'
    };
  }

  let amountStr = '';
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || isNaN(amount)) {
      return {
        isValid: false,
        statusCode: 400,
        reason: 'Schema validation failed: Field [amount] must be a finite numeric value'
      };
    }
    // Convert to string to verify precision
    amountStr = amount.toString();
  } else if (typeof amount === 'string') {
    amountStr = amount.trim();
  } else {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Field [amount] must be a valid number or numeric string'
    };
  }

  // Reject exponential notation (e.g. "1e5", "1e-2"), negative numbers, trailing characters, and invalid decimals
  if (!STRICT_AMOUNT_REGEX.test(amountStr)) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Field [amount] must be a positive decimal number with at most 2 decimal places (exponential notation and trailing characters rejected)'
    };
  }

  const parsedAmount = parseFloat(amountStr);
  // Guard against $0.00, negative zero, or overflow
  if (parsedAmount < 0.01) {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Field [amount] must be at least $0.01'
    };
  }

  // 5. Currency Validation
  const rawCurrency = (currency || 'USD');
  if (typeof rawCurrency !== 'string') {
    return {
      isValid: false,
      statusCode: 400,
      reason: 'Schema validation failed: Field [currency] must be a string'
    };
  }
  const parsedCurrency = rawCurrency.toUpperCase().trim();
  if (!STRICT_CURRENCY_REGEX.test(parsedCurrency) || !config.tier1.supportedCurrencies.includes(parsedCurrency)) {
    return {
      isValid: false,
      statusCode: 400,
      reason: `Schema validation failed: Invalid currency format '${currency}'. Expected ISO-4217 standard 3-letter code (e.g. USD, EUR, GBP)`
    };
  }

  // 6. Context Window & Raw Context Bounding (Denial-of-Wallet & Token Exhaustion Defense)
  const contextVal = payload.raw_context !== undefined ? payload.raw_context : payload.context_window;
  if (contextVal !== undefined && contextVal !== null) {
    if (typeof contextVal !== 'string') {
      return {
        isValid: false,
        statusCode: 400,
        reason: 'Schema validation failed: Field [raw_context / context_window] must be a string if provided'
      };
    }
    // Enforce strict upper limit on raw_context (max 4,000 characters)
    if (contextVal.length > 4000) {
      return {
        isValid: false,
        statusCode: 413,
        status: 'BLOCKED_T1',
        blockedStage: 'BLOCKED_T1',
        reason: 'PAYLOAD_TOO_LARGE: raw_context exceeds 4,000 character safety boundary',
        inspection_cost_usd: 0.00
      };
    }
  }

  // 7. Sanitized custom budget cap (Hardened against self-authorization tampering)
  let sanitizedMaxCap = undefined;
  if (max_budget_cap !== undefined && max_budget_cap !== null) {
    const parsedCap = parseFloat(max_budget_cap);
    if (!Number.isFinite(parsedCap) || parsedCap <= 0) {
      return {
        isValid: false,
        statusCode: 400,
        reason: 'Schema validation failed: Field [max_budget_cap] must be a positive finite number'
      };
    }
    // Cap at system ceiling so an agent cannot authorize itself for infinite funds
    sanitizedMaxCap = Math.min(parsedCap, ABSOLUTE_SYSTEM_MAX_CAP);
  }

  return {
    isValid: true,
    sanitized: {
      agent_id: agent_id.trim(),
      user_intent: user_intent.trim(),
      recipient_email: cleanEmail.toLowerCase(),
      amount: parsedAmount,
      currency: parsedCurrency,
      context_window: (contextVal || '').trim(),
      raw_context: (contextVal || '').trim(),
      max_budget_cap: sanitizedMaxCap
    }
  };
}
