/**
 * ActuaYa — OT State Machine Automated Tests
 * 
 * Comprehensive test suite that verifies:
 * 1. ✅ Full valid lifecycle transitions
 * 2. ❌ Skipping states is rejected (422)
 * 3. ❌ Backward transitions are rejected (422)
 * 4. ❌ Pause without justification is rejected (422)
 * 5. ✅ Pause with justification is accepted
 * 6. ❌ Regular user cannot modify closed OT (403)
 * 7. ✅ Admin can modify closed OT with audit trail
 * 8. ✅ Audit log captures all required fields
 * 9. ✅ Status history is recorded
 * 10. ❌ Missing auth is rejected (401)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { initDB } from '../src/db.js';
import { authMiddleware } from '../src/middleware/auth.js';
import { createWorkOrderRoutes } from '../src/routes/work-orders.js';

// ─── Test Helpers ───

let app;
let db;

/** Simple HTTP request helper (no dependencies needed) */
async function request(method, path, { body, userId = 'user-001', role = 'user' } = {}) {
  const port = app.__testPort;
  const url = `http://localhost:${port}${path}`;

  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-User-Role': role,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();
  return { status: res.status, data };
}

/** Create a fresh OT and return its id */
async function createOT(title = 'Test OT', role = 'user') {
  const res = await request('POST', '/api/ot', {
    body: { title },
    role,
  });
  return res.data.data.id;
}

/** Transition an OT to a target state with optional justification */
async function transition(id, status, justification_reason, role = 'user') {
  return request('PATCH', `/api/ot/${id}/transition`, {
    body: { status, justification_reason },
    role,
  });
}

/** Walk an OT through the full lifecycle up to a given state */
async function walkToState(id, targetState) {
  const lifecycle = ['asignada', 'en_camino', 'en_ejecucion', 'completada', 'cerrada'];
  for (const state of lifecycle) {
    const res = await transition(id, state);
    if (res.status !== 200) throw new Error(`Failed to transition to ${state}: ${JSON.stringify(res.data)}`);
    if (state === targetState) break;
  }
}

// ─── Setup & Teardown ───

beforeAll(async () => {
  // Use in-memory SQLite for tests
  db = initDB(':memory:');

  app = express();
  app.use(express.json());
  app.use('/api/ot', authMiddleware, createWorkOrderRoutes(db));

  // Start server on random available port
  await new Promise((resolve) => {
    const server = app.listen(0, () => {
      app.__testPort = server.address().port;
      app.__server = server;
      resolve();
    });
  });
});

afterAll(() => {
  if (app.__server) app.__server.close();
  if (db) db.close();
});

beforeEach(() => {
  // Clean database between tests
  db.clear();
});

// ═══════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════

describe('OT State Machine — Órdenes de Trabajo', () => {

  // ─────────────────────────────────────
  // 1. CRUD Básico
  // ─────────────────────────────────────
  describe('CRUD Básico', () => {
    it('debe crear una OT con estado inicial "abierta"', async () => {
      const res = await request('POST', '/api/ot', {
        body: { title: 'Instalar equipo de aire acondicionado' },
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBe('abierta');
      expect(res.data.data.title).toBe('Instalar equipo de aire acondicionado');
      expect(res.data.data.id).toBeDefined();
    });

    it('debe rechazar creación sin título (400)', async () => {
      const res = await request('POST', '/api/ot', { body: {} });
      expect(res.status).toBe(400);
    });

    it('debe listar todas las OT', async () => {
      await createOT('OT 1');
      await createOT('OT 2');

      const res = await request('GET', '/api/ot');
      expect(res.status).toBe(200);
      expect(res.data.data).toHaveLength(2);
      expect(res.data.total).toBe(2);
    });

    it('debe obtener una OT por ID con metadata de transiciones', async () => {
      const id = await createOT('OT detalle');

      const res = await request('GET', `/api/ot/${id}`);
      expect(res.status).toBe(200);
      expect(res.data.data.id).toBe(id);
      expect(res.data.meta.currentStateLabel).toBe('Abierta/Pendiente');
      expect(res.data.meta.allowedTransitions).toHaveLength(1);
      expect(res.data.meta.allowedTransitions[0].status).toBe('asignada');
    });

    it('debe devolver 404 para OT inexistente', async () => {
      const res = await request('GET', '/api/ot/inexistente-uuid');
      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────
  // 2. Ciclo de Vida Completo (Happy Path)
  // ─────────────────────────────────────
  describe('Ciclo de Vida Completo (Happy Path)', () => {
    it('debe completar el ciclo: abierta → asignada → en_camino → en_ejecucion → completada → cerrada', async () => {
      const id = await createOT('Mantenimiento preventivo');

      // abierta → asignada
      let res = await transition(id, 'asignada');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('asignada');

      // asignada → en_camino
      res = await transition(id, 'en_camino');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('en_camino');

      // en_camino → en_ejecucion
      res = await transition(id, 'en_ejecucion');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('en_ejecucion');

      // en_ejecucion → completada
      res = await transition(id, 'completada');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('completada');

      // completada → cerrada
      res = await transition(id, 'cerrada');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('cerrada');
    });

    it('debe completar el ciclo con pausa intermedia: → en_ejecucion → en_pausa → en_ejecucion → completada', async () => {
      const id = await createOT('Reparación eléctrica');

      await walkToState(id, 'en_ejecucion');

      // en_ejecucion → en_pausa (con justificación)
      let res = await transition(id, 'en_pausa', 'Falta de repuesto: capacitor 10μF');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('en_pausa');
      expect(res.data.data.justification_reason).toBe('Falta de repuesto: capacitor 10μF');

      // en_pausa → en_ejecucion (de vuelta)
      res = await transition(id, 'en_ejecucion');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('en_ejecucion');

      // en_ejecucion → completada
      res = await transition(id, 'completada');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('completada');
    });
  });

  // ─────────────────────────────────────
  // 3. Violaciones de la Máquina de Estados
  // ─────────────────────────────────────
  describe('Violaciones de Máquina de Estados (deben ser rechazadas)', () => {
    it('❌ NO debe permitir saltar de "abierta" directamente a "completada" (422)', async () => {
      const id = await createOT('Intento de salto');

      const res = await transition(id, 'completada');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('Transición inválida');
    });

    it('❌ NO debe permitir saltar de "abierta" directamente a "en_ejecucion" (422)', async () => {
      const id = await createOT('Otro salto');

      const res = await transition(id, 'en_ejecucion');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('Transición inválida');
    });

    it('❌ NO debe permitir saltar de "abierta" directamente a "cerrada" (422)', async () => {
      const id = await createOT('Salto a cerrada');

      const res = await transition(id, 'cerrada');
      expect(res.status).toBe(422);
    });

    it('❌ NO debe permitir transición hacia atrás: "en_ejecucion" → "asignada" (422)', async () => {
      const id = await createOT('Retroceso');
      await walkToState(id, 'en_ejecucion');

      const res = await transition(id, 'asignada');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('Transición inválida');
    });

    it('❌ NO debe permitir transición hacia atrás: "completada" → "en_ejecucion" (422)', async () => {
      const id = await createOT('Retroceso 2');
      await walkToState(id, 'completada');

      const res = await transition(id, 'en_ejecucion');
      expect(res.status).toBe(422);
    });

    it('❌ NO debe permitir transiciones desde estado "cerrada" (terminal) (422)', async () => {
      const id = await createOT('Terminal');
      await walkToState(id, 'cerrada');

      const res = await transition(id, 'abierta');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('estado terminal');
    });

    it('❌ NO debe permitir saltar de "asignada" a "completada" (422)', async () => {
      const id = await createOT('Salto medio');
      await walkToState(id, 'asignada');

      const res = await transition(id, 'completada');
      expect(res.status).toBe(422);
    });

    it('❌ NO debe permitir estado desconocido (422)', async () => {
      const id = await createOT('Estado inválido');

      const res = await transition(id, 'estado_inventado');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('Estado desconocido');
    });
  });

  // ─────────────────────────────────────
  // 4. Pausa con Justificación Obligatoria
  // ─────────────────────────────────────
  describe('Pausa con Justificación Obligatoria', () => {
    it('❌ NO debe permitir pausar SIN justificación (422)', async () => {
      const id = await createOT('Sin justificación');
      await walkToState(id, 'en_ejecucion');

      const res = await transition(id, 'en_pausa');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('justification_reason');
    });

    it('❌ NO debe permitir pausar con justificación vacía (422)', async () => {
      const id = await createOT('Justificación vacía');
      await walkToState(id, 'en_ejecucion');

      const res = await transition(id, 'en_pausa', '   ');
      expect(res.status).toBe(422);
      expect(res.data.error).toContain('justification_reason');
    });

    it('✅ DEBE permitir pausar CON justificación válida', async () => {
      const id = await createOT('Con justificación');
      await walkToState(id, 'en_ejecucion');

      const res = await transition(id, 'en_pausa', 'Esperando aprobación del supervisor');
      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe('en_pausa');
      expect(res.data.data.justification_reason).toBe('Esperando aprobación del supervisor');
    });
  });

  // ─────────────────────────────────────
  // 5. Inmutabilidad de OTs Cerradas
  // ─────────────────────────────────────
  describe('Inmutabilidad de OTs Cerradas/Auditadas', () => {
    it('❌ Usuario regular NO puede modificar OT cerrada (403)', async () => {
      const id = await createOT('Inmutable');
      await walkToState(id, 'cerrada');

      const res = await request('PUT', `/api/ot/${id}`, {
        body: { title: 'Título modificado ilegalmente' },
        role: 'user',
      });

      expect(res.status).toBe(403);
      expect(res.data.error).toContain('privilegios de administrador');
    });

    it('✅ Admin PUEDE modificar OT cerrada (200)', async () => {
      const id = await createOT('Modificable por admin');
      await walkToState(id, 'cerrada');

      const res = await request('PUT', `/api/ot/${id}`, {
        body: { title: 'Título corregido por administrador' },
        userId: 'admin-001',
        role: 'admin',
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.title).toBe('Título corregido por administrador');
    });

    it('✅ Modificación admin genera registro en audit_logs', async () => {
      const id = await createOT('Auditable');
      await walkToState(id, 'cerrada');

      // Modificar como admin
      await request('PUT', `/api/ot/${id}`, {
        body: { title: 'Nuevo título auditado', description: 'Nueva descripción' },
        userId: 'admin-999',
        role: 'admin',
      });

      // Verificar audit log
      const auditRes = await request('GET', `/api/ot/${id}/audit`);
      expect(auditRes.status).toBe(200);
      expect(auditRes.data.data.length).toBeGreaterThanOrEqual(2);

      const titleEntry = auditRes.data.data.find(e => e.field_changed === 'title');
      expect(titleEntry).toBeDefined();
      expect(titleEntry.user_id).toBe('admin-999');
      expect(titleEntry.old_value).toBe('Auditable');
      expect(titleEntry.new_value).toBe('Nuevo título auditado');
      expect(titleEntry.timestamp).toBeDefined();

      const descEntry = auditRes.data.data.find(e => e.field_changed === 'description');
      expect(descEntry).toBeDefined();
    });
  });

  // ─────────────────────────────────────
  // 6. Historial de Estados
  // ─────────────────────────────────────
  describe('Historial de Estados', () => {
    it('debe registrar todo el historial de transiciones', async () => {
      const id = await createOT('Con historial');
      await walkToState(id, 'cerrada');

      const res = await request('GET', `/api/ot/${id}/history`);
      expect(res.status).toBe(200);

      // Initial creation + 5 transitions = 6 entries
      const history = res.data.data;
      expect(history.length).toBe(6);

      // First entry: creation (null → abierta)
      expect(history[0].from_status).toBeNull();
      expect(history[0].to_status).toBe('abierta');

      // Verify full sequence of transitions
      const transitions = history.map(h => `${h.from_status} → ${h.to_status}`);
      expect(transitions).toEqual([
        'null → abierta',
        'abierta → asignada',
        'asignada → en_camino',
        'en_camino → en_ejecucion',
        'en_ejecucion → completada',
        'completada → cerrada',
      ]);

      // Last entry: completada → cerrada
      const lastEntry = history[history.length - 1];
      expect(lastEntry.from_status).toBe('completada');
      expect(lastEntry.to_status).toBe('cerrada');
    });
  });

  // ─────────────────────────────────────
  // 7. Autenticación
  // ─────────────────────────────────────
  describe('Autenticación', () => {
    it('❌ debe rechazar peticiones sin X-User-Id (401)', async () => {
      const port = app.__testPort;
      const res = await fetch(`http://localhost:${port}/api/ot`, {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────
  // 8. Actualización de Campos (non-closed)
  // ─────────────────────────────────────
  describe('Actualización de Campos (OTs no cerradas)', () => {
    it('debe permitir actualizar título y descripción en OT abierta', async () => {
      const id = await createOT('Original');

      const res = await request('PUT', `/api/ot/${id}`, {
        body: { title: 'Título actualizado', description: 'Nueva descripción' },
      });

      expect(res.status).toBe(200);
      expect(res.data.data.title).toBe('Título actualizado');
      expect(res.data.data.description).toBe('Nueva descripción');
    });

    it('no debe permitir actualizar sin campos editables', async () => {
      const id = await createOT('Sin cambios');

      const res = await request('PUT', `/api/ot/${id}`, {
        body: { status: 'cerrada' },
      });

      expect(res.status).toBe(400);
    });
  });
});
