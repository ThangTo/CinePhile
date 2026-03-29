const moment = require('moment-timezone');
const analyticsService = require('../services/analytics.service');
const redisService = require('../services/redis.service');

const TRACKING_SKIP_PREFIXES = [
  '/health',
  '/api/v1/avatars',
  '/api/v1/movies/proxy-m3u8',
  '/api/v1/movies/proxy-ts',
  '/movies/proxy-m3u8',
  '/movies/proxy-ts',
];

function shouldSkipTracking(req) {
  return req.path === '/' || TRACKING_SKIP_PREFIXES.some((prefix) => req.path.startsWith(prefix));
}

function getClientIp(req) {
  let identifier = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
  if (typeof identifier === 'string' && identifier.includes(',')) {
    identifier = identifier.split(',')[0].trim();
  }
  return identifier;
}

function getTrackingIdentifier(req) {
  if (req.user && req.user._id) {
    return `user_${req.user._id}`;
  }
  return `ip_${getClientIp(req)}`;
}

function isRedisConnectivityError(error) {
  const codes = new Set([
    'ABORT_ERR',
    'ECONNRESET',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_SOCKET',
    'REDIS_REST_CIRCUIT_OPEN',
  ]);

  const candidates = [error, error?.cause].filter(Boolean);
  return candidates.some((candidate) => {
    const message = String(candidate.message || '').toLowerCase();
    return (
      codes.has(candidate.code) ||
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('socket hang up') ||
      message.includes('terminated') ||
      message.includes('network')
    );
  });
}

function degradeRedisGracefully(error) {
  if (!isRedisConnectivityError(error)) {
    return false;
  }

  redisService.isConnected = false;
  return true;
}

function trackLocally(identifier, visitsKey, now) {
  analyticsService.localActiveUsers.set(identifier, now);

  if (!analyticsService.localVisits.has(visitsKey)) {
    analyticsService.localVisits.set(visitsKey, new Set());
  }

  analyticsService.localVisits.get(visitsKey).add(identifier);
}

async function trackingMiddleware(req, res, next) {
  if (shouldSkipTracking(req)) {
    return next();
  }

  const now = Date.now();
  const identifier = getTrackingIdentifier(req);
  const visitsKey = `analytics:visits:${moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')}`;

  try {
    if (!redisService.isConnected || !redisService.client) {
      trackLocally(identifier, visitsKey, now);
    } else {
      await Promise.all([
        redisService.client.sendCommand(['ZADD', 'analytics:active_users', now.toString(), identifier]),
        redisService.client.sendCommand(['SADD', visitsKey, identifier]),
        redisService.client.sendCommand(['EXPIRE', visitsKey, (60 * 60 * 24 * 60).toString()]),
      ]);
    }
  } catch (error) {
    if (!degradeRedisGracefully(error)) {
      console.error(`Error in tracking middleware: ${error.message}`);
    }

    trackLocally(identifier, visitsKey, now);
  }

  void (async () => {
    try {
      if (!redisService.isConnected || !redisService.client) {
        return;
      }

      const geoip = require('geoip-lite');
      let lookupIp = getClientIp(req);

      if (lookupIp === '127.0.0.1' || lookupIp === '::1' || lookupIp === '::ffff:127.0.0.1') {
        const mockIps = ['8.8.8.8', '1.1.1.1', '208.67.222.222', '9.9.9.9'];
        lookupIp = mockIps[Math.floor(Math.random() * mockIps.length)];
      }

      const geo = geoip.lookup(lookupIp);
      if (!geo) {
        return;
      }

      const locationData = {
        lat: geo.ll[0],
        lon: geo.ll[1],
        city: geo.city || 'Unknown City',
        country: geo.country || 'Unknown Country',
      };

      const locationKey = `analytics:location:${identifier}`;
      await Promise.all([
        redisService.client.sendCommand(['SET', locationKey, JSON.stringify(locationData)]),
        redisService.client.sendCommand(['EXPIRE', locationKey, (60 * 60 * 24 * 60).toString()]),
      ]);
    } catch (error) {
      if (!degradeRedisGracefully(error)) {
        console.error(`Error in tracking middleware geolocation: ${error.message}`);
      }
    }
  })();

  next();
}

module.exports = { trackingMiddleware };
