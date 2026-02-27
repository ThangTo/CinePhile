const redisService = require('../services/redis.service');
const analyticsService = require('../services/analytics.service');
const moment = require('moment-timezone');

/**
 * Middleware to track real-time active users and daily visit counts
 * Works for both authenticated guests and users.
 */
const trackingMiddleware = async (req, res, next) => {
  // Skip static assets, health checks, or caching routes if needed
  if (req.path === '/health' || req.path === '/' || req.path.startsWith('/api/v1/avatars')) {
    return next();
  }

  try {
    const now = Date.now();
    const ACTIVE_USERS_KEY = 'analytics:active_users';

    // Unique identifier for the user: user ID if logged in, else IP address
    let identifier = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
    if (identifier.includes(',')) {
      identifier = identifier.split(',')[0].trim();
    }
    
    // If auth info is present:
    if (req.user && req.user._id) {
      identifier = `user_${req.user._id}`;
    } else {
      identifier = `ip_${identifier}`;
    }

    // Track total visits
    const todayDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const visitsKey = `analytics:visits:${todayDate}`;

    if (!redisService.isConnected || !redisService.client) {
      // Memory Fallback
      analyticsService.localActiveUsers.set(identifier, now);
      
      if (!analyticsService.localVisits.has(visitsKey)) {
        analyticsService.localVisits.set(visitsKey, new Set());
      }
      analyticsService.localVisits.get(visitsKey).add(identifier);
    } else {
      // Redis
      await redisService.client.sendCommand(['ZADD', ACTIVE_USERS_KEY, now.toString(), identifier]);
      // SADD to track unique visitors efficiently
      await redisService.client.sendCommand(['SADD', visitsKey, identifier]);
      await redisService.client.sendCommand(['EXPIRE', visitsKey, (60 * 60 * 24 * 60).toString()]); // 60 days
    }

  } catch (error) {
    console.error('Error in tracking middleware:', error);
  }

  next();
};

module.exports = { trackingMiddleware };
