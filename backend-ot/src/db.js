/**
 * ActuaYa — OT Database Layer (JSON-File Persistence)
 * 
 * Provides a repository-pattern data layer backed by JSON files.
 * Compatible with Hostinger hosting (no native addons needed).
 * 
 * Tables simulated:
 *   - work_orders
 *   - status_history
 *   - audit_logs
 * 
 * For tests, use initDB(':memory:') to get a purely in-memory store.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @typedef {Object} Database
 * @property {Function} getWorkOrder
 * @property {Function} getAllWorkOrders
 * @property {Function} insertWorkOrder
 * @property {Function} updateWorkOrderFields
 * @property {Function} updateWorkOrderStatus
 * @property {Function} insertStatusHistory
 * @property {Function} getStatusHistory
 * @property {Function} insertAuditLog
 * @property {Function} getAuditLogs
 * @property {Function} clear
 * @property {Function} close
 */

/**
 * Initialize database.
 * @param {string} [dbPath] - ':memory:' for in-memory or path to JSON file
 * @returns {Database}
 */
export function initDB(dbPath) {
  let store = {
    work_orders: [],
    status_history: [],
    audit_logs: [],
  };

  const isMemory = dbPath === ':memory:';
  let filePath = null;

  if (!isMemory) {
    const dataDir = dbPath || join(__dirname, '..', 'data');
    mkdirSync(dataDir, { recursive: true });
    filePath = join(dataDir, 'ot_data.json');

    if (existsSync(filePath)) {
      try {
        store = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch {
        // Corrupted file — start fresh
      }
    }
  }

  let auditIdCounter = store.audit_logs.length;
  let historyIdCounter = store.status_history.length;

  function persist() {
    if (!isMemory && filePath) {
      writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
    }
  }

  return {
    // ─── Work Orders ───
    getWorkOrder(id) {
      return store.work_orders.find(wo => wo.id === id) || null;
    },

    getAllWorkOrders() {
      return [...store.work_orders].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
    },

    insertWorkOrder(wo) {
      store.work_orders.push({ ...wo });
      persist();
    },

    updateWorkOrderFields(id, fields) {
      const idx = store.work_orders.findIndex(wo => wo.id === id);
      if (idx === -1) return null;
      Object.assign(store.work_orders[idx], fields);
      persist();
      return store.work_orders[idx];
    },

    updateWorkOrderStatus(id, status, justificationReason, updatedAt) {
      const idx = store.work_orders.findIndex(wo => wo.id === id);
      if (idx === -1) return null;
      store.work_orders[idx].status = status;
      store.work_orders[idx].justification_reason = justificationReason;
      store.work_orders[idx].updated_at = updatedAt;
      persist();
      return store.work_orders[idx];
    },

    // ─── Status History ───
    insertStatusHistory(entry) {
      historyIdCounter++;
      const record = { id: historyIdCounter, ...entry };
      store.status_history.push(record);
      persist();
      return record;
    },

    getStatusHistory(workOrderId) {
      return store.status_history
        .filter(h => h.work_order_id === workOrderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // ─── Audit Logs ───
    insertAuditLog(entry) {
      auditIdCounter++;
      const record = { id: auditIdCounter, ...entry };
      store.audit_logs.push(record);
      persist();
      return record;
    },

    getAuditLogs(workOrderId) {
      return store.audit_logs
        .filter(a => a.work_order_id === workOrderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // ─── Utilities ───
    clear() {
      store.work_orders = [];
      store.status_history = [];
      store.audit_logs = [];
      auditIdCounter = 0;
      historyIdCounter = 0;
      persist();
    },

    close() {
      persist();
    },
  };
}
