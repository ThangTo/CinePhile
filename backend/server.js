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

connectDB().catch(() => {});

redisService.connect().catch((err) => {
  console.error(`Redis connection error: ${err.message}`);
  console.log('Server will continue without Redis cache');
});

initCronJobs();

const httpServer = http.createServer(app);
const openSockets = new Set();

httpServer.on('connection', (socket) => {
  openSockets.add(socket);
  socket.on('close', () => {
    openSockets.delete(socket);
  });
});

initVoiceSocket(httpServer);
initProgressSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`Server (PID: ${process.pid}) listening at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`DNS result order: ${DNS_RESULT_ORDER}`);
  console.log(`Proxy TLS min version: ${SOURCE_TLS_MIN_VERSION}`);

  if (process.send) {
    process.send('ready');
  }
});

let isShuttingDown = false;
let forceExitTimer = null;

const closeHttpServer = async () =>
  new Promise((resolve) => {
    const destroyHungSocketsTimer = setTimeout(() => {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }

      openSockets.forEach((socket) => {
        try {
          socket.destroy();
        } catch (_error) {
          // Ignore socket destroy race conditions during shutdown.
        }
      });
    }, 2000);

    if (typeof destroyHungSocketsTimer.unref === 'function') {
      destroyHungSocketsTimer.unref();
    }

    server.close(() => {
      clearTimeout(destroyHungSocketsTimer);
      resolve();
    });

    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
  });

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received. Shutting down gracefully...`);

  await closeHttpServer();
  console.log('HTTP server closed');

  const queueClosers = [];

  try {
    const { closeQueue } = require('./services/videoQueue.service');
    queueClosers.push(closeQueue());
  } catch (err) {
    console.warn(`Video queue close setup error: ${err.message}`);
  }

  try {
    const { closeAnalysisQueue } = require('./services/analysisQueue.service');
    queueClosers.push(closeAnalysisQueue());
  } catch (err) {
    console.warn(`Analysis queue close setup error: ${err.message}`);
  }

  if (queueClosers.length > 0) {
    const queueResults = await Promise.allSettled(queueClosers);
    queueResults
      .filter((result) => result.status === 'rejected')
      .forEach((result) => {
        console.warn(`Queue close error: ${result.reason?.message || result.reason}`);
      });
  }

  try {
    await redisService.disconnect();
  } catch (err) {
    console.warn(`Redis close error: ${err.message}`);
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed');
    }
  } catch (err) {
    console.warn(`MongoDB close error: ${err.message}`);
  }

  if (forceExitTimer) {
    clearTimeout(forceExitTimer);
    forceExitTimer = null;
  }

  process.exit(0);
};

const forceExit = () => {
  console.error('Forcing shutdown...');
  openSockets.forEach((socket) => {
    try {
      socket.destroy();
    } catch (_error) {
      // Ignore socket destroy race conditions during forced shutdown.
    }
  });
  process.exit(1);
};

const scheduleForceExit = () => {
  if (forceExitTimer) {
    clearTimeout(forceExitTimer);
  }

  forceExitTimer = setTimeout(forceExit, 10000);
};

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(() => {});
  scheduleForceExit();
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(() => {});
  scheduleForceExit();
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException').catch(() => {});
  scheduleForceExit();
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection reason:', reason);
});
