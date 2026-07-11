/**
 * ActuaYa — OT Work Orders Routes
 * 
 * REST API endpoints for Órdenes de Trabajo CRUD + state transitions.
 * Implements strict state machine, pause justification, and audit immutability.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  validateTransition,
  isImmutable,
  STATES,
  STATE_LABELS,
  getAllowedTransitions,
} from '../state-machine.js';

/**
 * Create work order routes.
 * @param {import('../db.js').Database} db
 * @returns {Router}
 */
export function createWorkOrderRoutes(db) {
  const router = Router();

  // ═══════════════════════════════════════
  //  POST /api/ot — Create a new work order
  // ═══════════════════════════════════════
  router.post('/', (req, res) => {
    const { title, description, assigned_to } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El campo "title" es obligatorio.' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    const ot = {
      id,
      title: title.trim(),
      description: (description || '').trim(),
      status: STATES.ABIERTA,
      assigned_to: assigned_to || null,
      justification_reason: null,
      created_by: req.user.id,
      created_at: now,
      updated_at: now,
    };

    db.insertWorkOrder(ot);

    // Record initial status in history
    db.insertStatusHistory({
      work_order_id: ot.id,
      from_status: null,
      to_status: STATES.ABIERTA,
      changed_by: req.user.id,
      justification_reason: null,
      timestamp: now,
    });

    return res.status(201).json({
      success: true,
      data: ot,
      message: `OT creada con estado: ${STATE_LABELS[STATES.ABIERTA]}`,
    });
  });

  // ═══════════════════════════════════════
  //  GET /api/ot — List all work orders
  // ═══════════════════════════════════════
  router.get('/', (_req, res) => {
    const orders = db.getAllWorkOrders();
    return res.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  });

  // ═══════════════════════════════════════
  //  GET /api/ot/:id — Get a single work order
  // ═══════════════════════════════════════
  router.get('/:id', (req, res) => {
    const ot = db.getWorkOrder(req.params.id);
    if (!ot) {
      return res.status(404).json({ error: `OT con id '${req.params.id}' no encontrada.` });
    }

    const allowedTransitions = getAllowedTransitions(ot.status);

    return res.json({
      success: true,
      data: ot,
      meta: {
        currentStateLabel: STATE_LABELS[ot.status],
        allowedTransitions: allowedTransitions.map(s => ({
          status: s,
          label: STATE_LABELS[s],
        })),
        isImmutable: isImmutable(ot.status),
      },
    });
  });

  // ═══════════════════════════════════════
  //  PATCH /api/ot/:id/transition — Change state
  // ═══════════════════════════════════════
  router.patch('/:id/transition', (req, res) => {
    const { status: newStatus, justification_reason } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: 'El campo "status" es obligatorio en el body.' });
    }

    const ot = db.getWorkOrder(req.params.id);
    if (!ot) {
      return res.status(404).json({ error: `OT con id '${req.params.id}' no encontrada.` });
    }

    // Validate transition
    const validationError = validateTransition(ot.status, newStatus, { justification_reason });
    if (validationError) {
      return res.status(validationError.code).json({ error: validationError.error });
    }

    const now = new Date().toISOString();
    const reason = newStatus === STATES.EN_PAUSA ? (justification_reason || '').trim() : null;
    const fromStatus = ot.status; // Capture BEFORE mutation

    // Perform transition
    db.updateWorkOrderStatus(ot.id, newStatus, reason, now);
    db.insertStatusHistory({
      work_order_id: ot.id,
      from_status: fromStatus,
      to_status: newStatus,
      changed_by: req.user.id,
      justification_reason: reason,
      timestamp: now,
    });

    const updated = db.getWorkOrder(ot.id);

    return res.json({
      success: true,
      message: `Transición exitosa: ${STATE_LABELS[fromStatus]} → ${STATE_LABELS[newStatus]}`,
      data: updated,
      meta: {
        currentStateLabel: STATE_LABELS[newStatus],
        allowedTransitions: getAllowedTransitions(newStatus).map(s => ({
          status: s,
          label: STATE_LABELS[s],
        })),
      },
    });
  });

  // ═══════════════════════════════════════
  //  PUT /api/ot/:id — Update fields (with immutability enforcement)
  // ═══════════════════════════════════════
  router.put('/:id', (req, res) => {
    const ot = db.getWorkOrder(req.params.id);
    if (!ot) {
      return res.status(404).json({ error: `OT con id '${req.params.id}' no encontrada.` });
    }

    // ─── Immutability check for closed/audited OTs ───
    if (isImmutable(ot.status)) {
      if (!req.user.isAdmin) {
        return res.status(403).json({
          error: 'Esta OT está en estado "Cerrada/Auditada" y no puede ser modificada. ' +
                 'Se requieren privilegios de administrador.',
        });
      }

      // Admin can modify — but every change is audited
      return handleAdminUpdate(ot, req, res);
    }

    // ─── Regular update for non-closed OTs ───
    const updatableFields = ['title', 'description', 'assigned_to'];
    const updates = {};
    const now = new Date().toISOString();

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: `No se proporcionaron campos actualizables. Campos permitidos: ${updatableFields.join(', ')}`,
      });
    }

    updates.updated_at = now;
    db.updateWorkOrderFields(ot.id, updates);

    const updated = db.getWorkOrder(ot.id);

    return res.json({
      success: true,
      message: 'OT actualizada exitosamente.',
      data: updated,
    });
  });

  /**
   * Handle admin update on closed/audited OTs.
   * Every field change is recorded in audit_logs.
   */
  function handleAdminUpdate(ot, req, res) {
    const updatableFields = ['title', 'description', 'assigned_to'];
    const changes = [];
    const now = new Date().toISOString();

    for (const field of updatableFields) {
      if (req.body[field] !== undefined && req.body[field] !== ot[field]) {
        changes.push({
          field,
          oldValue: ot[field],
          newValue: req.body[field],
        });
      }
    }

    if (changes.length === 0) {
      return res.status(400).json({
        error: 'No se detectaron cambios en los campos editables.',
      });
    }

    // Build updates object
    const updates = { updated_at: now };
    for (const change of changes) {
      updates[change.field] = change.newValue;

      // Record in audit_logs
      db.insertAuditLog({
        work_order_id: ot.id,
        user_id: req.user.id,
        field_changed: change.field,
        old_value: change.oldValue,
        new_value: change.newValue,
        timestamp: now,
      });
    }

    db.updateWorkOrderFields(ot.id, updates);

    const updated = db.getWorkOrder(ot.id);
    const auditEntries = db.getAuditLogs(ot.id);

    return res.json({
      success: true,
      message: `OT cerrada modificada por admin. ${changes.length} campo(s) actualizado(s) y registrado(s) en audit_logs.`,
      data: updated,
      auditLog: auditEntries,
    });
  }

  // ═══════════════════════════════════════
  //  GET /api/ot/:id/history — Status transition history
  // ═══════════════════════════════════════
  router.get('/:id/history', (req, res) => {
    const ot = db.getWorkOrder(req.params.id);
    if (!ot) {
      return res.status(404).json({ error: `OT con id '${req.params.id}' no encontrada.` });
    }

    const history = db.getStatusHistory(ot.id);

    return res.json({
      success: true,
      data: history.map(h => ({
        ...h,
        fromLabel: h.from_status ? STATE_LABELS[h.from_status] : null,
        toLabel: STATE_LABELS[h.to_status],
      })),
    });
  });

  // ═══════════════════════════════════════
  //  GET /api/ot/:id/audit — Audit log for closed OTs
  // ═══════════════════════════════════════
  router.get('/:id/audit', (req, res) => {
    const ot = db.getWorkOrder(req.params.id);
    if (!ot) {
      return res.status(404).json({ error: `OT con id '${req.params.id}' no encontrada.` });
    }

    const audit = db.getAuditLogs(ot.id);

    return res.json({
      success: true,
      data: audit,
      total: audit.length,
    });
  });

  return router;
}
