const redisService = require('./redis.service');
const moment = require('moment-timezone');

/**
 * Analytics Service
 * Handles fetching real-time website traffic data using Redis
 */
class AnalyticsService {
  constructor() {
    this.ACTIVE_USERS_KEY = 'analytics:active_users';
    // Active window: consider a user "active" if they sent a request within the last 5 minutes
    this.ACTIVE_WINDOW_MS = 5 * 60 * 1000; 
    
    // In-memory fallbacks when Redis is not available
    this.localActiveUsers = new Map(); // identifier -> timestamp
    this.localVisits = new Map(); // YYYY-MM-DD -> Set(identifiers)
  }

  /**
   * Get current real-time active users count
   * Also cleans up expired entries from the sorted set
   * @returns {Promise<number>} Number of active users
   */
  async getRealtimeActiveUsers() {
    const now = Date.now();
    const cutoff = now - this.ACTIVE_WINDOW_MS;

    if (!redisService.isConnected || !redisService.client) {
      // Memory Fallback cleanup
      for (const [id, timestamp] of this.localActiveUsers.entries()) {
        if (timestamp < cutoff) {
          this.localActiveUsers.delete(id);
        }
      }
      return this.localActiveUsers.size;
    }

    try {
      const now = Date.now();
      const cutoff = now - this.ACTIVE_WINDOW_MS;

      // 1. Remove entries older than 5 minutes
      await redisService.client.sendCommand(['ZREMRANGEBYSCORE', this.ACTIVE_USERS_KEY, '-inf', cutoff.toString()]);
      
      // 2. Count remaining users
      const count = await redisService.client.sendCommand(['ZCARD', this.ACTIVE_USERS_KEY]);
      return parseInt(count, 10) || 0;
    } catch (error) {
      console.error('Error in getRealtimeActiveUsers:', error);
      return 0;
    }
  }

  /**
   * Get total visit stats (Today, This Week, This Month)
   * @returns {Promise<Object>} { today, week, month }
   */
  async getVisitsStats() {
    const todayDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const startOfWeek = moment().tz('Asia/Ho_Chi_Minh').startOf('isoWeek');
    const startOfMonth = moment().tz('Asia/Ho_Chi_Minh').startOf('month');
    const nowNode = moment().tz('Asia/Ho_Chi_Minh');

    // Build keys for today, and all days in current week/month up to today
    const todayKey = `analytics:visits:${todayDate}`;
    
    let weekKeys = [];
    let currentDateW = startOfWeek.clone();
    while (currentDateW.isSameOrBefore(nowNode, 'day')) {
      weekKeys.push(`analytics:visits:${currentDateW.format('YYYY-MM-DD')}`);
      currentDateW.add(1, 'days');
    }

    let monthKeys = [];
    let currentDateM = startOfMonth.clone();
    while (currentDateM.isSameOrBefore(nowNode, 'day')) {
      monthKeys.push(`analytics:visits:${currentDateM.format('YYYY-MM-DD')}`);
      currentDateM.add(1, 'days');
    }

    const allKeysToFetch = [...new Set([todayKey, ...weekKeys, ...monthKeys])];

    if (!redisService.isConnected || !redisService.client) {
      // Memory Fallback
      const getUniqueVisits = (key) => {
        const set = this.localVisits.get(key);
        return set ? set.size : 0;
      };

      const valuesMap = {};
      allKeysToFetch.forEach(key => {
        valuesMap[key] = getUniqueVisits(key);
      });

      const todayVisits = valuesMap[todayKey] || 0;
      const weekVisits = weekKeys.reduce((sum, key) => sum + (valuesMap[key] || 0), 0);
      const monthVisits = monthKeys.reduce((sum, key) => sum + (valuesMap[key] || 0), 0);

      return {
        today: todayVisits,
        week: weekVisits,
        month: monthVisits
      };
    }

    try {
      if (allKeysToFetch.length === 0) {
          return { today: 0, week: 0, month: 0 };
      }

      // Fetch SCARD (Set Cardinality) for all keys using pipelining or multiple commands
      // Since MGET only works for STRINGS, we need to execute SCARD manually.
      const multi = redisService.client.multi();
      allKeysToFetch.forEach(key => {
        multi.sCard(key);
      });
      
      const values = await multi.exec();
      
      // Map values back to their keys
      const valuesMap = {};
      allKeysToFetch.forEach((key, index) => {
        valuesMap[key] = values[index] || 0;
      });

      // Sum them up
      const todayVisits = valuesMap[todayKey] || 0;
      
      const weekVisits = weekKeys.reduce((sum, key) => sum + (valuesMap[key] || 0), 0);
      const monthVisits = monthKeys.reduce((sum, key) => sum + (valuesMap[key] || 0), 0);

      return {
        today: todayVisits,
        week: weekVisits,
        month: monthVisits
      };
    } catch (error) {
      console.error('Error in getVisitsStats:', error);
      return { today: 0, week: 0, month: 0 };
    }
  }
}

module.exports = new AnalyticsService();
