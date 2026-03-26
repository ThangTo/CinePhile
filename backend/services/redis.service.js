const redis = require('redis');

/**
 * Redis Service
 * Handles Redis connection and provides caching utilities.
 * 
 * Supports TWO modes (auto-detected):
 * 1. Upstash REST API (HTTPS) — for production on Hugging Face / serverless platforms
 *    Set env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * 2. TCP Redis client — for local development or VPS
 *    Set env: REDIS_URL
 * 
 * Gracefully falls back if Redis is unavailable.
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.mode = null; // 'rest' or 'tcp'
  }

  /**
   * Connect to Redis
   * Auto-detects Upstash REST API vs TCP based on env vars
   */
  async connect() {
    // Priority 1: Standard TCP Redis client for local/VPS Redis
    if (process.env.REDIS_URL) {
      return this._connectTcp();
    }

    // Priority 2: Upstash REST API (works on HF Spaces, serverless, etc.)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return this._connectRest();
    }

    console.log('⚠️ Redis: No REDIS_URL or UPSTASH_REDIS_REST_URL provided, caching disabled');
    return null;
  }

  /**
   * Connect via Upstash REST API (HTTPS, port 443)
   * No TCP connection needed — works on platforms that block port 6379
   */
  async _connectRest() {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      this.mode = 'rest';
      this.client = new UpstashRestClient(url, token);

      // Test the connection
      const pong = await this.client.ping();
      if (pong === 'PONG') {
        this.isConnected = true;
        console.log('✅ Redis: Connected via Upstash REST API');
        return this.client;
      } else {
        throw new Error(`Unexpected PING response: ${pong}`);
      }
    } catch (error) {
      console.error('❌ Redis (REST) connection failed:', error.message);
      console.log('⚠️ Continuing without Redis cache');
      this.isConnected = false;
      this.client = null;
      return null;
    }
  }

  /**
   * Connect via standard TCP Redis protocol
   */
  async _connectTcp() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      this.mode = 'tcp';
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
            const delay = Math.min(retries * 500 + Math.random() * 100, 5000);
            console.log(`🔄 Redis: Reconnecting in ${Math.round(delay)}ms (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 10000,
          keepAlive: 5000,
        },
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Connected via TCP');
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
      console.error('❌ Redis (TCP) connection failed:', error.message);
      console.log('⚠️ Continuing without Redis cache');
      this.isConnected = false;
      this.client = null;
      return null;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected || !this.client) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      try { return JSON.parse(value); } catch { return value; }
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, expirationSeconds = 3600) {
    if (!this.isConnected || !this.client) return false;
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (this.mode === 'rest') {
        if (expirationSeconds > 0) {
          await this.client.setEx(key, expirationSeconds, stringValue);
        } else {
          await this.client.set(key, stringValue);
        }
      } else {
        if (expirationSeconds > 0) {
          await this.client.setEx(key, expirationSeconds, stringValue);
        } else {
          await this.client.set(key, stringValue);
        }
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
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
   */
  async exists(key) {
    if (!this.isConnected || !this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1 || result === true;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern) {
    if (!this.isConnected || !this.client) return 0;
    try {
      if (this.mode === 'rest') {
        return await this.client.delByPattern(pattern);
      }
      // TCP mode — use SCAN
      let cursor = 0;
      let deletedCount = 0;
      do {
        const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
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
   * Get TTL of a key
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
        if (this.mode === 'tcp') {
          await this.client.quit();
        }
        // REST mode doesn't need explicit disconnect
        this.isConnected = false;
        console.log('✅ Redis: Disconnected');
      } catch (error) {
        console.error('Redis disconnect error:', error.message);
      }
    }
  }
}


/**
 * Upstash REST API Client
 * Wraps Upstash's HTTP REST API to provide same interface as node-redis client.
 * Uses native fetch (Node 18+) — no extra dependencies needed.
 */
class UpstashRestClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /**
   * Execute a raw Redis command via REST API
   */
  async _exec(command) {
    const res = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash REST error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`Upstash error: ${data.error}`);
    }
    return data.result;
  }

  /**
   * Execute a pipeline of commands (replacement for multi().exec())
   */
  async _pipeline(commands) {
    const res = await fetch(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash pipeline error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.map(item => {
      if (item.error) throw new Error(`Upstash pipeline error: ${item.error}`);
      return item.result;
    });
  }

  async ping() {
    return await this._exec(['PING']);
  }

  async get(key) {
    return await this._exec(['GET', key]);
  }

  async set(key, value) {
    return await this._exec(['SET', key, value]);
  }

  async setEx(key, seconds, value) {
    return await this._exec(['SET', key, value, 'EX', seconds]);
  }

  async del(keyOrKeys) {
    if (Array.isArray(keyOrKeys)) {
      return await this._exec(['DEL', ...keyOrKeys]);
    }
    return await this._exec(['DEL', keyOrKeys]);
  }

  async exists(key) {
    return await this._exec(['EXISTS', key]);
  }

  async ttl(key) {
    return await this._exec(['TTL', key]);
  }

  async sCard(key) {
    return await this._exec(['SCARD', key]);
  }

  /**
   * sendCommand — compatibility with node-redis client.sendCommand()
   * Used by analytics middleware/service and rate-limit-redis
   */
  async sendCommand(args) {
    return await this._exec(args);
  }

  /**
   * multi() — returns a pipeline builder compatible with node-redis multi()
   */
  multi() {
    return new UpstashPipeline(this);
  }

  /**
   * Delete keys by pattern using SCAN
   */
  async delByPattern(pattern) {
    let cursor = '0';
    let deletedCount = 0;
    do {
      const result = await this._exec(['SCAN', cursor, 'MATCH', pattern, 'COUNT', '100']);
      cursor = String(result[0]);
      const keys = result[1];
      if (keys && keys.length > 0) {
        const deleted = await this.del(keys);
        deletedCount += deleted;
      }
    } while (cursor !== '0');
    return deletedCount;
  }
}


/**
 * Pipeline builder that mimics node-redis multi() interface
 */
class UpstashPipeline {
  constructor(client) {
    this._client = client;
    this._commands = [];
  }

  sendCommand(args) {
    this._commands.push(args);
    return this;
  }

  sCard(key) {
    this._commands.push(['SCARD', key]);
    return this;
  }

  async exec() {
    if (this._commands.length === 0) return [];
    return await this._client._pipeline(this._commands);
  }
}


// Export singleton instance
module.exports = new RedisService();
