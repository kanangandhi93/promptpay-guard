/**
 * PromptPay Guard — Runtime State Persistence Manager
 * Serializes in-memory budget spend tracking and pending HITL triaging states
 * to disk on shutdown (SIGINT/SIGTERM) and rehydrates on server startup.
 */

import fs from 'fs';
import path from 'path';

export const DEFAULT_STATE_FILE = path.join(process.cwd(), '.cache', 'runtime-state.json');
export const ALT_STATE_FILE = path.join(process.cwd(), '.cache', 'state.json');

export class StatePersistenceManager {
  constructor(defaultPath = DEFAULT_STATE_FILE) {
    this.defaultPath = defaultPath;
  }

  /**
   * Serialize budgetGuard and pendingHitlStore state to JSON file
   * @param {object} options
   * @param {object} options.budgetGuard
   * @param {Map} options.pendingHitlStore
   * @param {string} [options.filePath]
   * @returns {boolean}
   */
  saveState({ budgetGuard, pendingHitlStore, filePath } = {}) {
    try {
      const targetPath = filePath || this.defaultPath;
      const targetDir = path.dirname(targetPath);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Extract budget state
      let budgetState = {};
      if (budgetGuard) {
        if (typeof budgetGuard.dumpState === 'function') {
          budgetState = budgetGuard.dumpState();
        } else if (budgetGuard.dailySpendMap instanceof Map) {
          budgetState = Object.fromEntries(budgetGuard.dailySpendMap);
        }
      }

      // Extract pending HITL records
      let hitlRecords = [];
      if (pendingHitlStore) {
        if (pendingHitlStore instanceof Map) {
          hitlRecords = Array.from(pendingHitlStore.entries()).map(([k, v]) => ({ id: k, data: v }));
        } else if (typeof pendingHitlStore === 'object') {
          hitlRecords = Object.entries(pendingHitlStore).map(([k, v]) => ({ id: k, data: v }));
        }
      }

      const snapshot = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        timestamp: Date.now(),
        budgetGuard: budgetState,
        pendingHitl: hitlRecords
      };

      // Atomic write using temporary file then rename to prevent corruption
      const tempPath = `${targetPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tempPath, targetPath);

      // Also update ALT_STATE_FILE for backward compatibility if path is default
      if (targetPath === this.defaultPath) {
        try {
          fs.writeFileSync(ALT_STATE_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
        } catch {
          // Ignore secondary write errors
        }
      }

      return true;
    } catch (err) {
      console.error('[StatePersistence] Failed to serialize state to disk:', err.message);
      return false;
    }
  }

  /**
   * Rehydrate budgetGuard and pendingHitlStore from disk if state file exists
   * @param {object} options
   * @param {object} options.budgetGuard
   * @param {Map} options.pendingHitlStore
   * @param {string} [options.filePath]
   * @returns {object|null}
   */
  loadState({ budgetGuard, pendingHitlStore, filePath } = {}) {
    try {
      let targetPath = filePath || this.defaultPath;
      if (!fs.existsSync(targetPath)) {
        if (fs.existsSync(ALT_STATE_FILE)) {
          targetPath = ALT_STATE_FILE;
        } else {
          return null;
        }
      }

      const raw = fs.readFileSync(targetPath, 'utf-8');
      const snapshot = JSON.parse(raw);

      // Rehydrate budgetGuard
      if (snapshot.budgetGuard && budgetGuard) {
        if (typeof budgetGuard.loadState === 'function') {
          budgetGuard.loadState(snapshot.budgetGuard);
        } else if (budgetGuard.dailySpendMap instanceof Map) {
          budgetGuard.dailySpendMap.clear();
          for (const [k, v] of Object.entries(snapshot.budgetGuard)) {
            budgetGuard.dailySpendMap.set(k, v);
          }
        }
      }

      // Rehydrate pendingHitlStore
      if (Array.isArray(snapshot.pendingHitl) && pendingHitlStore instanceof Map) {
        pendingHitlStore.clear();
        for (const item of snapshot.pendingHitl) {
          if (item && item.id && item.data) {
            pendingHitlStore.set(item.id, item.data);
          }
        }
      }

      return snapshot;
    } catch (err) {
      console.error('[StatePersistence] Failed to rehydrate state from disk:', err.message);
      return null;
    }
  }

  /**
   * Clear state files
   * @param {string} [filePath]
   */
  clearState(filePath) {
    const targetPath = filePath || this.defaultPath;
    try {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      if (fs.existsSync(ALT_STATE_FILE)) fs.unlinkSync(ALT_STATE_FILE);
    } catch {
      // Ignore
    }
  }

  /**
   * Register graceful shutdown listeners
   */
  initProcessLifecycle({ budgetGuard, pendingHitlStore, server } = {}) {
    const handleShutdown = (signal) => {
      console.log(`\n[Server Lifecycle] Received ${signal}. Persisting runtime state to disk...`);
      this.saveState({ budgetGuard, pendingHitlStore });
      console.log(`[Server Lifecycle] State successfully persisted to ${this.defaultPath}.`);

      if (server && typeof server.close === 'function') {
        server.close(() => {
          process.exit(0);
        });
        setTimeout(() => process.exit(0), 1500).unref();
      } else {
        process.exit(0);
      }
    };

    process.once('SIGINT', () => handleShutdown('SIGINT'));
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  }
}

export const statePersistence = new StatePersistenceManager();
export default statePersistence;
