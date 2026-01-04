const redis = require('redis');

/**
 * Redis Service
 * Handles Redis connection and provides caching utilities
 * Gracefully falls back if Redis is unavailable
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
  }

  /**
   * Connect to Redis
   * @returns {Promise<redis.RedisClient>}
   */
  async connect() {
    // Skip if Redis URL not provided (optional dependency)
    if (!process.env.REDIS_URL) {
      console.log('⚠️ Redis URL not provided, caching disabled');
      return null;
    }

    // Already connected
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            this.connectionAttempts = retries;
            if (retries > this.maxConnectionAttempts) {
              console.error('❌ Redis: Too many reconnection attempts, giving up');
              this.isConnected = false;
              return new Error('Too many retries');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 5000,
        },
      });

      // Event handlers
      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Connected and ready');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('end', () => {
        console.log('⚠️ Redis: Connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis: Reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      console.log('⚠️ Continuing without Redis cache');
      this.isConnected = false;
      this.client = null;
      return null;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    if (!this.isConnected || !this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} expirationSeconds - Expiration in seconds (default: 3600 = 1 hour)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, expirationSeconds = 3600) {
    if (!this.isConnected || !this.client) return false;

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (expirationSeconds > 0) {
        await this.client.setEx(key, expirationSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * Note: Use with caution, SCAN is expensive
   * @param {string} pattern - Key pattern (e.g., 'cache:movies:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async delByPattern(pattern) {
    if (!this.isConnected || !this.client) return 0;

    try {
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          const deleted = await this.client.del(result.keys);
          deletedCount += deleted;
        }
      } while (cursor !== 0);

      return deletedCount;
    } catch (error) {
      console.error('Redis DEL pattern error:', error.message);
      return 0;
    }
  }

  /**
   * Get TTL (Time To Live) of a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   */
  async getTTL(key) {
    if (!this.isConnected || !this.client) return -2;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error.message);
      return -2;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('✅ Redis: Disconnected');
      } catch (error) {
        console.error('Redis disconnect error:', error.message);
      }
    }
  }
}

// Export singleton instance
module.exports = new RedisService();
