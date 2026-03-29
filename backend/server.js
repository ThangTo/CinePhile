const dotenv = require('dotenv');
dotenv.config();
const dns = require('dns');
const mongoose = require('mongoose');
const http = require('http');
const { connectDB } = require('./config/db/db');
const redisService = require('./services/redis.service');
const { initCronJobs } = require('./services/cron.service');
const { initVoiceSocket } = require('./services/voiceSocket.service');
const { initProgressSocket } = require('./services/progressSocket.service');
const app = require('./app');
const PORT = process.env.PORT || 5000;
const DNS_RESULT_ORDER = process.env.DNS_RESULT_ORDER || 'ipv4first';
const SOURCE_TLS_MIN_VERSION = process.env.SOURCE_TLS_MIN_VERSION || 'TLSv1.2';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder(DNS_RESULT_ORDER);
}

// Connect to database
connectDB();

// Connect to Redis (async, doesn't block server start)
redisService.connect().catch((err) => {
  console.error('Redis connection error:', err.message);
  console.log('⚠️ Server will continue without Redis cache');
});

// Initialize cron jobs for automated tasks
initCronJobs();

// Create HTTP server from Express app (required for Socket.IO)
const httpServer = http.createServer(app);

// Attach Voice WebSocket (Deepgram + Timi)
initVoiceSocket(httpServer);

// Attach Viral Progress WebSocket
initProgressSocket(httpServer);

// Start server
const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Server (PID: ${process.pid}) listening at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`DNS result order: ${DNS_RESULT_ORDER}`);
  console.log(`Proxy TLS min version: ${SOURCE_TLS_MIN_VERSION}`);

  // Signal PM2 that app is ready (for wait_ready: true)
  if (process.send) {
    process.send('ready');
  }
});

// Graceful shutdown
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  await new Promise((resolve) => server.close(resolve));
  console.log('✅ HTTP server closed');

  // Close Bull queues
  try {
    const { closeQueue } = require('./services/videoQueue.service');
    await closeQueue();
    const { closeAnalysisQueue } = require('./services/analysisQueue.service');
    await closeAnalysisQueue();
  } catch (err) {
    console.warn('⚠️ Queue close error:', err.message);
  }

  // Close Redis connection
  if (redisService.isConnected) {
    try {
      await redisService.disconnect();
    } catch (err) {
      console.warn('⚠️ Redis close error:', err.message);
    }
  }

  // Close MongoDB connection (Mongoose 8+ returns Promise, no callback)
  try {
    await mongoose.connection.close(false);
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.warn('⚠️ MongoDB close error:', err.message);
  }

  process.exit(0);
};

// Force close after 10 seconds
const forceExit = () => {
  console.error('❌ Forcing shutdown...');
  process.exit(1);
};

// PM2 graceful shutdown signals
process.on('SIGTERM', () => { gracefulShutdown('SIGTERM').catch(() => {}); setTimeout(forceExit, 10000); });
process.on('SIGINT',  () => { gracefulShutdown('SIGINT').catch(() => {});  setTimeout(forceExit, 10000); });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException').catch(() => {});
  setTimeout(forceExit, 10000);
});

// Handle unhandled promise rejections — log but do NOT shut down (avoids cascade loops)
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection reason:', reason);
  // Only shut down for truly fatal errors, not routine operational rejections
});

