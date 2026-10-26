/**
 * PromptPay Guard — In-Memory Idempotency Engine
 * Caches evaluated responses for 120 seconds to prevent duplicate PayPal captures
 * and short-circuits replayed transactions with HTTP header `x-cache: HIT`.
 */

export class IdempotencyStore {
  constructor(defaultTtlSeconds = 120) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.store = new Map();

    // Periodic sweep of expired keys every 60s
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Retrieve cached idempotent outcome if valid and not expired
   * @param {string} key
   * @returns {{ statusCode: number, body: object, createdAt: number, expiresAt: number } | null}
   */
  get(key) {
    if (!key || typeof key !== 'string') return null;
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  /**
   * Cache evaluated response
   * @param {string} key
   * @param {number} statusCode
   * @param {object} body
   * @param {number} [ttlSeconds]
   */
  set(key, statusCode, body, ttlSeconds = 120) {
    if (!key || typeof key !== 'string') return;
    const ttlMs = (ttlSeconds || 120) * 1000;
    this.store.set(key, {
      statusCode: statusCode || 200,
      body: JSON.parse(JSON.stringify(body)),
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  size() {
    this.cleanup();
    return this.store.size;
  }
}

export const idempotencyStore = new IdempotencyStore(120);
export default idempotencyStore;
