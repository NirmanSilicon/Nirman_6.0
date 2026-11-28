const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');
const { User } = require('../models/User.model');
const { attachRoleContext, isTokenRevoked } = require('../middleware/auth.middleware');
const { eventBus } = require('../services/eventBus');
const { notifyZoneSupervisorsPush } = require('../services/push.service');

let ioInstance = null;
let listenersBound = false;

/**
 * Emit a real-time Socket.IO event isolated strictly to:
 * - `admin:all` (Organisation Administrators)
 * - `zone:<zoneId>` (Supervisors assigned to that workplace zone)
 */
const emitZoneEvent = (zoneId, eventName, payload) => {
  if (!ioInstance || !zoneId) return;
  ioInstance.to(`zone:${String(zoneId)}`).to('admin:all').emit(eventName, payload);
};

/**
 * Bind internal `eventBus` safety events to Socket.IO zone rooms and Web Push.
 */
const bindEventBusToSockets = () => {
  if (listenersBound) return;
  listenersBound = true;

  eventBus.on('warning:started', (payload) => {
    emitZoneEvent(payload.zoneId, 'warning:started', payload);
  });

  eventBus.on('warning:resolved', (payload) => {
    emitZoneEvent(payload.zoneId, 'warning:resolved', payload);
  });

  eventBus.on('incident:new', (payload) => {
    emitZoneEvent(payload.zoneId, 'incident:new', payload);
    notifyZoneSupervisorsPush({
      incidentId: payload.incidentId,
      zoneId: payload.zoneId,
      title: `PPE Violation Escalated (${payload.incidentType})`,
      body: `120-second grace period expired in zone ${payload.zoneId}. Supervisor verification required.`,
      urgency: 'high',
    }).catch(() => {});
  });

  eventBus.on('incident:updated', (payload) => {
    if (ioInstance) {
      ioInstance.to('admin:all').emit('incident:updated', payload);
      if (payload.zoneId) {
        ioInstance.to(`zone:${String(payload.zoneId)}`).emit('incident:updated', payload);
      }
    }
  });

  eventBus.on('emergency:critical', (payload) => {
    emitZoneEvent(payload.zoneId, 'emergency:critical', payload);
    notifyZoneSupervisorsPush({
      incidentId: payload.incidentId,
      zoneId: payload.zoneId,
      title: `CRITICAL EMERGENCY: ${payload.incidentType}`,
      body: `${payload.zoneLabel || 'Workplace Zone'} — Immediate evacuation & manual SOS dispatch required!`,
      urgency: 'high',
    }).catch(() => {});
  });

  eventBus.on('rfid:scan', (payload) => {
    emitZoneEvent(payload.zoneId, 'rfid:scan', payload);
  });

  eventBus.on('notification:test', (payload) => {
    if (ioInstance) {
      ioInstance.to('admin:all').emit('notification:test', payload);
      if (payload.targetZoneId) {
        ioInstance.to(`zone:${String(payload.targetZoneId)}`).emit('notification:test', payload);
      }
    }
  });
};

/**
 * Attach Socket.IO server with strict JWT handshake verification and role/zone room isolation.
 */
const initSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();

      if (!rawToken) {
        return next(new Error('UNAUTHORIZED: Missing JWT token'));
      }
      if (isTokenRevoked && isTokenRevoked(rawToken)) {
        return next(new Error('TOKEN_REVOKED'));
      }

      const { jwtSecret } = getEnv();
      const decoded = jwt.verify(rawToken, jwtSecret);
      const userDoc = await User.findById(decoded.sub);
      if (!userDoc || userDoc.status !== 'ACTIVE') {
        return next(new Error('UNAUTHORIZED: Invalid or inactive user'));
      }

      socket.user = await attachRoleContext(userDoc);
      return next();
    } catch (_err) {
      return next(new Error('UNAUTHORIZED: Invalid token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.user;
    if (user.role === 'ADMINISTRATOR') {
      socket.join('admin:all');
    } else if (user.role === 'SUPERVISOR') {
      for (const zId of user.assignedZoneIds || []) {
        socket.join(`zone:${String(zId)}`);
      }
    } else if (user.role === 'WORKER' && user.workerId) {
      socket.join(`worker:${String(user.workerId)}`);
    }

    if (user.organisationId) {
      socket.join(`org:${String(user.organisationId)}`);
    }

    socket.emit('socket:authenticated', {
      userId: user.userId,
      role: user.role,
      assignedZoneIds: user.assignedZoneIds || [],
      workerId: user.workerId || null,
    });
  });

  bindEventBusToSockets();
  return ioInstance;
};

const getIo = () => ioInstance;

module.exports = {
  initSocketServer,
  emitZoneEvent,
  getIo,
};
