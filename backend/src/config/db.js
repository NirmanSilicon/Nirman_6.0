const dns = require('dns');
const mongoose = require('mongoose');
const { getEnv } = require('./env');

// Configure public DNS fallback (8.8.8.8 / 1.1.1.1) so Windows c-ares SRV lookups
// (`_mongodb._tcp.*.mongodb.net`) succeed even on mobile hotspots or campus networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
} catch (_e) {}

let isConnected = false;
let activeDbMode = 'DISCONNECTED';

/**
 * Connect to MongoDB using Mongoose.
 * Connects to primary `MONGODB_URI` (MongoDB Atlas Cloud `mongodb+srv://...`) and
 * automatically falls back to `LOCAL_MONGODB_URI` (`mongodb://127.0.0.1:27017/...`)
 * if internet/Atlas is temporarily unreachable (Offline-First Resilience).
 */
const connectDB = async (customUri) => {
  const { mongodbUri, nodeEnv } = getEnv();
  const uri = customUri || mongodbUri;
  const fallbackLocalUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/smartppe_wardens_eye';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please configure it in .env.');
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    activeDbMode = uri.startsWith('mongodb+srv://') ? 'MONGODB_ATLAS_CLOUD' : 'LOCAL_MONGODB';
    if (nodeEnv !== 'test') {
      console.log(`[Database] MongoDB connected successfully (${activeDbMode}): ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn.connection;
  } catch (error) {
    if (!customUri && uri.startsWith('mongodb+srv://') && fallbackLocalUri) {
      console.warn(`[Database] MongoDB Atlas Cloud unreachable (${error.message}). Falling back to Offline-First Local MongoDB...`);
      const localConn = await mongoose.connect(fallbackLocalUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      activeDbMode = 'LOCAL_MONGODB_OFFLINE_FALLBACK';
      if (nodeEnv !== 'test') {
        console.log(`[Database] Local MongoDB fallback connected: ${localConn.connection.host}/${localConn.connection.name}`);
      }
      return localConn.connection;
    }
    isConnected = false;
    if (nodeEnv !== 'test') {
      console.error(`[Database] MongoDB connection error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    activeDbMode = 'DISCONNECTED';
    const { nodeEnv } = getEnv();
    if (nodeEnv !== 'test') {
      console.log('[Database] MongoDB connection closed gracefully.');
    }
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getIsConnected: () => isConnected || mongoose.connection.readyState === 1,
  getActiveDbMode: () => activeDbMode,
  getDbHost: () => (mongoose.connection && mongoose.connection.host) || null,
};
