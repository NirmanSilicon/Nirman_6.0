const app = require('./app');
const { getEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const {
  recoverPendingGraceTimers,
  startGraceSweepTimer,
  stopGraceSweepTimer,
} = require('./services/warningEscalation.service');
const { initSocketServer } = require('./socket/socket.server');

let server;

const startServer = async () => {
  try {
    const { port, nodeEnv } = getEnv();
    await connectDB();

    // Recover 120-second grace timers persisted in MongoDB, then keep sweeping every 2 seconds
    const recovery = await recoverPendingGraceTimers();
    console.log(
      `[GraceTimer] Boot recovery: ${recovery.escalated} expired warning(s) escalated, ${recovery.stillPending} still counting down`
    );
    startGraceSweepTimer(2000);

    server = app.listen(port, () => {
      console.log(`[Server] SmartPPE — Warden's Eye Backend listening on port ${port} (${nodeEnv})`);
    });
    initSocketServer(server);

    // Graceful shutdown handler
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      stopGraceSweepTimer();
      if (server) {
        server.close(async () => {
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(`[Server] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
