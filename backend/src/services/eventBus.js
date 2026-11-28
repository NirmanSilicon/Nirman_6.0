const { EventEmitter } = require('events');

/**
 * In-process event bus for safety workflow events.
 *
 * Emitted events (consumed by the Socket.IO / Web Push layer in Phase 8):
 * - `speaker:play`      local speaker warning issued
 * - `warning:started`   120-second grace period started
 * - `warning:resolved`  worker corrected PPE within the grace period
 * - `incident:new`      grace period expired and the incident was escalated to OPEN
 * - `incident:updated`  supervisor acknowledged / verified / rejected / resolved an incident
 */
const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

module.exports = { eventBus };
