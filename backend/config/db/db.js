const mongoose = require('mongoose');

const MONGO_RETRY_DELAY_MS = Math.max(5000, Number(process.env.MONGODB_RETRY_DELAY_MS || 10000));

let isConnecting = false;
let reconnectTimer = null;
let hasLoggedInitialSuccess = false;

function parsePoolSize(name, fallback) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const configuredMaxPoolSize = Math.max(1, parsePoolSize('MONGODB_MAX_POOL_SIZE', 10));
const configuredMinPoolSize = Math.min(
  configuredMaxPoolSize,
  parsePoolSize('MONGODB_MIN_POOL_SIZE', 0),
);

const options = {
  maxPoolSize: configuredMaxPoolSize,
  minPoolSize: configuredMinPoolSize,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
};

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectDB().catch(() => {});
  }, MONGO_RETRY_DELAY_MS);

  if (typeof reconnectTimer.unref === 'function') {
    reconnectTimer.unref();
  }
}

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MongoDB connection skipped: MONGODB_URI is missing');
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return mongoose.connection;
  }

  isConnecting = true;

  try {
    await mongoose.connect(process.env.MONGODB_URI, options);

    if (!hasLoggedInitialSuccess) {
      console.log('MongoDB connected');
      console.log(`Connection pool: min=${options.minPoolSize}, max=${options.maxPoolSize}`);
      hasLoggedInitialSuccess = true;
    }

    return mongoose.connection;
  } catch (err) {
    console.error(`DB connection failed: ${err.message}`);
    scheduleReconnect();
    return null;
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
  scheduleReconnect();
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

mongoose.connection.on('connected', () => {
  // Seed default pricing settings if not already present
  try {
    const adminService = require('../../services/admin.service');
    adminService.seedPricingSettings().catch((err) => {
      console.warn('Pricing seed skipped:', err.message);
    });
  } catch (err) {
    // adminService may not be loaded yet; skip silently
  }

  try {
    const cursorEffectService = require('../../services/cursorEffect.service');
    cursorEffectService.seedEffects().catch((err) => {
      console.warn('CursorEffect seed skipped:', err.message);
    });
  } catch (err) {
    // cursorEffectService may not be loaded yet; skip silently
  }

  try {
    const Mailbox = require('../../models/mailbox.model');
    Mailbox.syncIndexes().catch((err) => {
      console.warn('Mailbox index sync skipped:', err.message);
    });
  } catch (err) {
    console.warn('Mailbox index sync setup skipped:', err.message);
  }
});

module.exports = {
  connectDB,
};
