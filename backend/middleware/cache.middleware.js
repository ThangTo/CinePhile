const redisService = require('../services/redis.service');

/**
 * Cache middleware - Cache API responses
 * @param {number} duration - Cache duration in seconds (default: 300 = 5 minutes)
 * @param {Object} options - Additional options
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (duration = 300, options = {}) => {
  const { keyGenerator, shouldCache } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if Redis not available
    if (!redisService.isConnected) {
      return next();
    }

    // Custom shouldCache function
    if (shouldCache && !shouldCache(req)) {
      return next();
    }

    // Skip cache for authenticated requests (optional - can be customized)
    // Uncomment if you want to skip cache for logged-in users
    // if (req.user) {
    //   return next();
    // }

    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : `cache:${req.originalUrl || req.url}`;

    try {
      // Try to get from cache
      const cached = await redisService.get(cacheKey);
      if (cached) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cached);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Cache miss - override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Only cache successful responses (status 200)
        if (res.statusCode === 200) {
          // Cache the response
          redisService.set(cacheKey, data, duration).catch((err) => {
            console.error('Cache SET error:', err.message);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Clear cache for specific key or pattern
 * @param {string} keyOrPattern - Cache key or pattern
 * @returns {Promise<number>} Number of keys deleted
 */
const clearCache = async (keyOrPattern) => {
  if (!redisService.isConnected) return 0;

  try {
    // If pattern contains *, use pattern deletion
    if (keyOrPattern.includes('*')) {
      return await redisService.delByPattern(keyOrPattern);
    }
    // Otherwise, delete single key
    const deleted = await redisService.del(keyOrPattern);
    return deleted ? 1 : 0;
  } catch (error) {
    console.error('Clear cache error:', error.message);
    return 0;
  }
};

/**
 * Invalidate cache for movie-related endpoints
 * Call this when movies are updated/created/deleted
 * Invalidates both HTTP response cache and service-level cache
 */
const invalidateMovieCache = async () => {
  // HTTP Response Cache (Middleware level)
  const httpCachePatterns = [
    'cache:/api/v1/movies/trending*',
    'cache:/api/v1/movies/top-rated*',
    'cache:/api/v1/movies/new-releases*',
    'cache:/api/v1/movies/meta/top-genres*',
  ];

  // Service-level Cache (Business logic level)
  const serviceCachePatterns = [
    'movies:trending:*', // movies:trending:10, movies:trending:20, ...
    'movies:top-rated:*', // movies:top-rated:10, movies:top-rated:20, ...
    'movies:new-releases:*', // movies:new-releases:10, ...
    'movies:top-genres:*', // movies:top-genres:10, ...
  ];

  let totalDeleted = 0;

  // Invalidate HTTP response cache
  for (const pattern of httpCachePatterns) {
    const deleted = await clearCache(pattern);
    totalDeleted += deleted;
  }

  // Invalidate service-level cache
  for (const pattern of serviceCachePatterns) {
    const deleted = await clearCache(pattern);
    totalDeleted += deleted;
  }

  console.log(`🗑️ Invalidated ${totalDeleted} movie cache entries (HTTP + Service)`);
  return totalDeleted;
};

module.exports = {
  cacheMiddleware,
  clearCache,
  invalidateMovieCache,
};
