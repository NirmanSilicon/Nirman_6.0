const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { getEnv } = require('./config/env');
const { getIsConnected, getActiveDbMode, getDbHost } = require('./config/db');
const { sendSuccess } = require('./utils/apiResponse');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const workerRoutes = require('./routes/worker.routes');
const zoneRoutes = require('./routes/zone.routes');
const adminRoutes = require('./routes/admin.routes');
const deviceRoutes = require('./routes/device.routes');
const rfidRoutes = require('./routes/rfid.routes');
const sensorRoutes = require('./routes/sensor.routes');
const cameraRoutes = require('./routes/camera.routes');
const detectionRoutes = require('./routes/detection.routes');
const incidentRoutes = require('./routes/incident.routes');
const supervisorRoutes = require('./routes/supervisor.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const syncRoutes = require('./routes/sync.routes');
const saasRoutes = require('./routes/saas.routes');
const { Device } = require('./models/Device.model');
const { Camera } = require('./models/Camera.model');
const { getCloudSyncStatusSummary } = require('./services/cloudSync.service');

const app = express();

// 1. Security Headers (configured to allow frontend CDN scripts & local ML stream on port 8765)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const { clientUrl, nodeEnv } = getEnv();
      const allowedOrigins = clientUrl.split(',').map((o) => o.trim());
      if (
        !origin ||
        origin === 'null' ||
        nodeEnv !== 'production' ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// 3. HTTP Request Logging (disabled in test mode to keep test output clean)
if (getEnv().nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// 4. Global API Rate Limiting (sized for real-time multi-camera dashboard & IoT telemetry)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (getEnv().nodeEnv === 'production' ? 5000 : 50000),
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/health/connectivity' ||
    Boolean(req.headers['x-ml-service-key']) ||
    Boolean(req.headers['x-device-key']),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});
app.use('/api', apiLimiter);

// 5. Body Parsing with Safe Size Limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 6. Health Check & Offline/Online Connectivity Endpoints
app.get('/api/health', (_req, res) => {
  return sendSuccess(res, 200, 'SmartPPE - Warden\'s Eye Backend API is operational', {
    status: 'UP',
    databaseConnected: getIsConnected(),
    databaseMode: getActiveDbMode(),
    databaseHost: getDbHost(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/connectivity', async (_req, res, next) => {
  try {
    const [onlineDevices, onlineCameras, syncSummary] = await Promise.all([
      Device.countDocuments({ status: 'ONLINE' }),
      Camera.countDocuments({ status: 'ONLINE' }),
      getCloudSyncStatusSummary(),
    ]);
    return sendSuccess(res, 200, 'Connectivity and offline autonomy status retrieved', {
      lanMode: 'ACTIVE',
      mode: getActiveDbMode(),
      databaseHost: getDbHost(),
      databaseConnected: getIsConnected(),
      onlineDevices,
      onlineCameras,
      cloudSyncState: syncSummary.cloudSyncState,
      pendingSyncCount: syncSummary.pendingCount,
      failedRetryCount: syncSummary.failedRetryCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// 7. Initial Foundation, Phase 2 Admin & Phase 3 Hardware Ingestion API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api', saasRoutes);

// Serve Frontend UI directly at http://localhost:5000/
const frontendDir = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// 8. 404 Not Found & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
