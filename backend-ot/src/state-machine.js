/**
 * ActuaYa — OT State Machine
 * 
 * Strict finite state machine for Órdenes de Trabajo.
 * Defines valid transitions and enforces business rules.
 * 
 * States:
 *   abierta → asignada → en_camino → en_ejecucion → en_pausa → completada → cerrada
 *                                                     ↕ (pause/resume loop)
 */

// ─── All valid states ───
export const STATES = Object.freeze({
  ABIERTA:       'abierta',
  ASIGNADA:      'asignada',
  EN_CAMINO:     'en_camino',
  EN_EJECUCION:  'en_ejecucion',
  EN_PAUSA:      'en_pausa',
  COMPLETADA:    'completada',
  CERRADA:       'cerrada',
});

// ─── State labels for display ───
export const STATE_LABELS = Object.freeze({
  abierta:       'Abierta/Pendiente',
  asignada:      'Asignada',
  en_camino:     'En Camino',
  en_ejecucion:  'En Ejecución',
  en_pausa:      'En Pausa',
  completada:    'Completada',
  cerrada:       'Cerrada/Auditada',
});

// ─── Valid transition map ───
// Key: current state → Value: array of allowed next states
const TRANSITIONS = Object.freeze({
  [STATES.ABIERTA]:      [STATES.ASIGNADA],
  [STATES.ASIGNADA]:     [STATES.EN_CAMINO],
  [STATES.EN_CAMINO]:    [STATES.EN_EJECUCION],
  [STATES.EN_EJECUCION]: [STATES.EN_PAUSA, STATES.COMPLETADA],
  [STATES.EN_PAUSA]:     [STATES.EN_EJECUCION],
  [STATES.COMPLETADA]:   [STATES.CERRADA],
  [STATES.CERRADA]:      [], // Terminal state — no further transitions
});

/**
 * Check if a transition from one state to another is valid.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function isValidTransition(fromStatus, toStatus) {
  const allowed = TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Get all allowed next states for a given current state.
 * @param {string} currentStatus
 * @returns {string[]}
 */
export function getAllowedTransitions(currentStatus) {
  return TRANSITIONS[currentStatus] || [];
}

/**
 * Validate a state transition and enforce business rules.
 * Returns an error object if invalid, or null if valid.
 * 
 * @param {string} fromStatus - Current state
 * @param {string} toStatus - Desired next state
 * @param {object} payload - Request body (must contain justification_reason for pause)
 * @returns {{ code: number, error: string } | null}
 */
export function validateTransition(fromStatus, toStatus, payload = {}) {
  // Validate toStatus is a known state
  const validStates = Object.values(STATES);
  if (!validStates.includes(toStatus)) {
    return {
      code: 422,
      error: `Estado desconocido: '${toStatus}'. Estados válidos: ${validStates.join(', ')}`,
    };
  }

  // Check if transition is allowed
  if (!isValidTransition(fromStatus, toStatus)) {
    const allowed = getAllowedTransitions(fromStatus);
    return {
      code: 422,
      error: `Transición inválida: '${STATE_LABELS[fromStatus]}' → '${STATE_LABELS[toStatus]}'. ` +
             `Transiciones permitidas desde '${STATE_LABELS[fromStatus]}': ` +
             (allowed.length > 0
               ? allowed.map(s => STATE_LABELS[s]).join(', ')
               : 'ninguna (estado terminal)'),
    };
  }

  // Business rule: En Pausa requires justification_reason
  if (toStatus === STATES.EN_PAUSA) {
    const reason = (payload.justification_reason || '').trim();
    if (!reason) {
      return {
        code: 422,
        error: 'La transición a "En Pausa" requiere un campo obligatorio: justification_reason ' +
               '(ej. "Falta de repuesto", "Esperando aprobación").',
      };
    }
  }

  return null; // Valid transition
}

/**
 * Check if a work order is in an immutable (closed/audited) state.
 * @param {string} status
 * @returns {boolean}
 */
export function isImmutable(status) {
  return status === STATES.CERRADA;
}
