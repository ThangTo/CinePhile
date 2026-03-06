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

  // Run location tracking asynchronously so it doesn't block the request
  (async () => {
    try {
      if (!redisService.isConnected || !redisService.client) return;

      let identifier = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
      if (identifier.includes(',')) {
        identifier = identifier.split(',')[0].trim();
      }
      
      let trackIdentifier = null;
      if (req.user && req.user._id) {
        trackIdentifier = `user_${req.user._id}`;
      } else {
        trackIdentifier = `ip_${identifier}`;
      }

      // GeoIP Lookup
      const geoip = require('geoip-lite');
      // For local testing, assign a mock IP if it's localhost
      let lookupIp = identifier;
      if (lookupIp === '127.0.0.1' || lookupIp === '::1' || lookupIp === '::ffff:127.0.0.1') {
        const mockIps = ['8.8.8.8', '1.1.1.1', '208.67.222.222', '9.9.9.9']; // Mix of US/Global IPs
        lookupIp = mockIps[Math.floor(Math.random() * mockIps.length)];
      }

      const geo = geoip.lookup(lookupIp);
      if (geo) {
        const locationData = {
          lat: geo.ll[0],
          lon: geo.ll[1],
          city: geo.city || 'Unknown City',
          country: geo.country || 'Unknown Country'
        };
        const locationKey = `analytics:location:${trackIdentifier}`;
        await redisService.client.sendCommand(['SET', locationKey, JSON.stringify(locationData)]);
        await redisService.client.sendCommand(['EXPIRE', locationKey, (60 * 60 * 24 * 60).toString()]); // 60 days
      }
    } catch (error) {
      console.error('Error in tracking middleware geolocation:', error);
    }
  })();

  next();
};

module.exports = { trackingMiddleware };
