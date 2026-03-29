const redis = require('redis');
const { fetchWithIpv4 } = require('../utils/httpFetch');

const REST_TIMEOUT_MS = Math.max(1000, Number(process.env.REDIS_REST_TIMEOUT_MS || 10000));
const REST_COOLDOWN_MS = Math.max(5000, Number(process.env.REDIS_REST_COOLDOWN_MS || 30000));
const REST_ERROR_LOG_INTERVAL_MS = Math.max(5000, Number(process.env.REDIS_REST_ERROR_LOG_INTERVAL_MS || 15000));

function describeError(error) {
  const parts = [error?.message || 'Unknown error'];

  if (error?.code) {
    parts.push(`code=${error.code}`);
  }

  if (error?.cause?.code && error.cause.code !== error.code) {
    parts.push(`causeCode=${error.cause.code}`);
  }

  if (error?.cause?.message) {
    parts.push(`cause=${error.cause.message}`);
  }

  return parts.join(' | ');
}

function isConnectivityError(error) {
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

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.mode = null; // 'rest' or 'tcp'
    this.restProbeTimer = null;
    this.lastRestFailureLogAt = 0;
  }

  async connect() {
    if (process.env.REDIS_URL) {
      return this._connectTcp();
    }

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return this._connectRest();
    }

    console.log('Redis: No REDIS_URL or UPSTASH_REDIS_REST_URL provided, caching disabled');
    return null;
  }

  _shouldLogOperationalError(error) {
    return !(this.mode === 'rest' && isConnectivityError(error));
  }

  _logOperationalError(label, error) {
    if (!this._shouldLogOperationalError(error)) {
      return;
    }

    console.error(`${label}: ${describeError(error)}`);
  }

  _scheduleRestProbe(delayMs = REST_COOLDOWN_MS) {
    if (this.restProbeTimer || this.mode !== 'rest' || !this.client) {
      return;
    }

    this.restProbeTimer = setTimeout(async () => {
      this.restProbeTimer = null;

      if (this.mode !== 'rest' || !this.client) {
        return;
      }

      try {
        const pong = await this.client.ping();
        if (pong === 'PONG') {
          this.isConnected = true;
          this.lastRestFailureLogAt = 0;
          console.log('Redis: Upstash REST connectivity restored');
        }
      } catch (error) {
        this._logOperationalError('Redis REST health probe error', error);
        this._handleRestConnectivityError(error, { fromProbe: true });
      }
    }, Math.max(1000, delayMs));

    if (typeof this.restProbeTimer.unref === 'function') {
      this.restProbeTimer.unref();
    }
  }

  _handleRestConnectivityError(error, { fromProbe = false } = {}) {
    const now = Date.now();
    const shouldLog = now - this.lastRestFailureLogAt >= REST_ERROR_LOG_INTERVAL_MS;

    this.isConnected = false;

    if (shouldLog) {
      const suffix = fromProbe ? ' during health probe' : '';
      console.warn(
        `Redis: Upstash REST unavailable${suffix}; falling back without Redis for ${REST_COOLDOWN_MS}ms. ${describeError(error)}`,
      );
      this.lastRestFailureLogAt = now;
    }

    const retryInMs =
      typeof this.client?.getRemainingCooldownMs === 'function'
        ? this.client.getRemainingCooldownMs()
        : REST_COOLDOWN_MS;

    this._scheduleRestProbe(retryInMs || REST_COOLDOWN_MS);
  }

  async _connectRest() {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      this.mode = 'rest';
      this.client =
        this.client instanceof UpstashRestClient
          ? this.client
          : new UpstashRestClient(url, token, {
              timeoutMs: REST_TIMEOUT_MS,
              circuitBreakMs: REST_COOLDOWN_MS,
              onConnectivityError: (error) => this._handleRestConnectivityError(error),
            });

      const pong = await this.client.ping();
      if (pong !== 'PONG') {
        throw new Error(`Unexpected PING response: ${pong}`);
      }

      this.isConnected = true;
      this.lastRestFailureLogAt = 0;
      console.log('Redis: Connected via Upstash REST API');
      return this.client;
    } catch (error) {
      console.error(`Redis (REST) connection failed: ${describeError(error)}`);
      console.log('Continuing without Redis cache');
      this.isConnected = false;

      if (this.client instanceof UpstashRestClient) {
        this._scheduleRestProbe(REST_COOLDOWN_MS);
      } else {
        this.client = null;
      }

      return null;
    }
  }

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
              console.error('Redis: Too many reconnection attempts, giving up');
              this.isConnected = false;
              return new Error('Too many retries');
            }

            const delay = Math.min(retries * 500 + Math.random() * 100, 5000);
            console.log(`Redis: Reconnecting in ${Math.round(delay)}ms (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 10000,
          keepAlive: 5000,
        },
      });

      this.client.on('error', (err) => {
        console.error(`Redis client error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('Redis: Connected via TCP');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('end', () => {
        console.log('Redis: Connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis: Reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error(`Redis (TCP) connection failed: ${describeError(error)}`);
      console.log('Continuing without Redis cache');
      this.isConnected = false;
      this.client = null;
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (_error) {
        return value;
      }
    } catch (error) {
      this._logOperationalError('Redis GET error', error);
      return null;
    }
  }

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
      this._logOperationalError('Redis SET error', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this._logOperationalError('Redis DEL error', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1 || result === true;
    } catch (error) {
      this._logOperationalError('Redis EXISTS error', error);
      return false;
    }
  }

  async delByPattern(pattern) {
    if (!this.isConnected || !this.client) return 0;

    try {
      if (this.mode === 'rest') {
        return this.client.delByPattern(pattern);
      }

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
      this._logOperationalError('Redis DEL pattern error', error);
      return 0;
    }
  }

  async getTTL(key) {
    if (!this.isConnected || !this.client) return -2;

    try {
      return this.client.ttl(key);
    } catch (error) {
      this._logOperationalError('Redis TTL error', error);
      return -2;
    }
  }

  async disconnect() {
    if (this.restProbeTimer) {
      clearTimeout(this.restProbeTimer);
      this.restProbeTimer = null;
    }

    if (!this.client) {
      return;
    }

    try {
      if (this.mode === 'tcp') {
        await this.client.quit();
      }

      this.isConnected = false;
      console.log('Redis: Disconnected');
    } catch (error) {
      console.error(`Redis disconnect error: ${describeError(error)}`);
    }
  }
}

class UpstashRestClient {
  constructor(baseUrl, token, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.timeoutMs = Math.max(1000, Number(options.timeoutMs || REST_TIMEOUT_MS));
    this.circuitBreakMs = Math.max(5000, Number(options.circuitBreakMs || REST_COOLDOWN_MS));
    this.onConnectivityError =
      typeof options.onConnectivityError === 'function' ? options.onConnectivityError : null;
    this.cooldownUntil = 0;
  }

  getRemainingCooldownMs() {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  _assertCircuitClosed() {
    const retryInMs = this.getRemainingCooldownMs();
    if (retryInMs <= 0) {
      return;
    }

    const error = new Error(`Upstash REST circuit open (${retryInMs}ms remaining)`);
    error.code = 'REDIS_REST_CIRCUIT_OPEN';
    throw error;
  }

  _markConnectivityFailure(error) {
    if (!isConnectivityError(error)) {
      return;
    }

    this.cooldownUntil = Date.now() + this.circuitBreakMs;
    if (this.onConnectivityError) {
      this.onConnectivityError(error);
    }
  }

  async _request(path, payload, errorPrefix) {
    this._assertCircuitClosed();

    try {
      const response = await fetchWithIpv4(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeoutMs: this.timeoutMs,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${errorPrefix} ${response.status}: ${text}`);
      }

      this.cooldownUntil = 0;
      return response.json();
    } catch (error) {
      this._markConnectivityFailure(error);
      throw error;
    }
  }

  async _exec(command) {
    const data = await this._request('', command, 'Upstash REST error');
    if (data.error) {
      throw new Error(`Upstash error: ${data.error}`);
    }
    return data.result;
  }

  async _pipeline(commands) {
    const data = await this._request('/pipeline', commands, 'Upstash pipeline error');
    return data.map((item) => {
      if (item.error) {
        throw new Error(`Upstash pipeline error: ${item.error}`);
      }
      return item.result;
    });
  }

  async ping() {
    return this._exec(['PING']);
  }

  async get(key) {
    return this._exec(['GET', key]);
  }

  async set(key, value) {
    return this._exec(['SET', key, value]);
  }

  async setEx(key, seconds, value) {
    return this._exec(['SET', key, value, 'EX', seconds]);
  }

  async del(keyOrKeys) {
    if (Array.isArray(keyOrKeys)) {
      return this._exec(['DEL', ...keyOrKeys]);
    }
    return this._exec(['DEL', keyOrKeys]);
  }

  async exists(key) {
    return this._exec(['EXISTS', key]);
  }

  async ttl(key) {
    return this._exec(['TTL', key]);
  }

  async sCard(key) {
    return this._exec(['SCARD', key]);
  }

  async sendCommand(args) {
    return this._exec(args);
  }

  multi() {
    return new UpstashPipeline(this);
  }

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
    if (this._commands.length === 0) {
      return [];
    }

    return this._client._pipeline(this._commands);
  }
}

module.exports = new RedisService();
