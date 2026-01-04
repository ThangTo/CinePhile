const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db/db');
const redisService = require('./services/redis.service');
const app = require('./app');
const PORT = process.env.PORT || 5000;
// Connect to database
connectDB();

// Connect to Redis (async, doesn't block server start)
redisService.connect().catch((err) => {
  console.error('Redis connection error:', err.message);
  console.log('⚠️ Server will continue without Redis cache');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server (PID: ${process.pid}) listening at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Signal PM2 that app is ready (for wait_ready: true)
  if (process.send) {
    process.send('ready');
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('✅ HTTP server closed');

    // Close Redis connection
    if (redisService.isConnected) {
      await redisService.disconnect();
    }

    // Close MongoDB connection
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

// PM2 graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
