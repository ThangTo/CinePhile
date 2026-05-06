const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db/db');
const redisService = require('../services/redis.service');

const DNS_RESULT_ORDER = process.env.DNS_RESULT_ORDER || 'ipv4first';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder(DNS_RESULT_ORDER);
}

function createKeepAliveTimer() {
  return setInterval(() => {}, 60 * 60 * 1000);
}

async function closeMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed');
  }
}

async function startWorkerProcess({
  name,
  start,
  close,
  connectMongo = true,
  connectRedisService = false,
  keepAlive = true,
}) {
  if (!name || typeof start !== 'function') {
    throw new Error('Worker name and start function are required');
  }

  if (connectMongo) {
    await connectDB().catch(() => {});
  }

  if (connectRedisService) {
    await redisService.connect().catch((error) => {
      console.error(`Redis connection error: ${error.message}`);
    });
  }

  const started = start();
  const keepAliveTimer = keepAlive ? createKeepAliveTimer() : null;

  console.log(`[${name}] Process started (PID: ${process.pid}, active=${started !== false})`);

  let isShuttingDown = false;
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[${name}] ${signal} received. Shutting down...`);

    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
    }

    if (typeof close === 'function') {
      await close().catch((error) => {
        console.warn(`[${name}] Close error: ${error.message}`);
      });
    }

    if (connectRedisService) {
      await redisService.disconnect().catch((error) => {
        console.warn(`[${name}] Redis close error: ${error.message}`);
      });
    }

    if (connectMongo) {
      await closeMongo().catch((error) => {
        console.warn(`[${name}] Mongo close error: ${error.message}`);
      });
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(1));
  });

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(1));
  });

  process.on('uncaughtException', (error) => {
    console.error(`[${name}] Uncaught exception:`, error);
    shutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`[${name}] Unhandled rejection:`, reason);
  });
}

module.exports = {
  startWorkerProcess,
};
