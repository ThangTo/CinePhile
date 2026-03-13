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
   * Helper to count guests vs users from an array of identifiers
   * @param {string[]} identifiers Array of identifiers (e.g. ['ip_127.0.0.1', 'user_12345'])
   * @returns {Object} { total, guestCount, userCount }
   */
  _countUserTypes(identifiers) {
    let guestCount = 0;
    let userCount = 0;
    
    identifiers.forEach(id => {
      if (id.startsWith('user_')) {
        userCount++;
      } else {
        // Includes 'ip_' and any unknown format
        guestCount++;
      }
    });

    return {
      total: identifiers.length,
      guestCount,
      userCount
    };
  }

  /**
   * Get current real-time active users count + breakdown
   * Also cleans up expired entries from the sorted set
   * @returns {Promise<Object>} { total, guestCount, userCount }
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
      return this._countUserTypes(Array.from(this.localActiveUsers.keys()));
    }

    try {
      // 1. Remove entries older than 5 minutes
      await redisService.client.sendCommand(['ZREMRANGEBYSCORE', this.ACTIVE_USERS_KEY, '-inf', cutoff.toString()]);
      
      // 2. Fetch all remaining identifiers to break down by type
      const activeUsers = await redisService.client.sendCommand(['ZRANGE', this.ACTIVE_USERS_KEY, '0', '-1']);
      return this._countUserTypes(activeUsers);
    } catch (error) {
      console.error('Error in getRealtimeActiveUsers:', error);
      return { total: 0, guestCount: 0, userCount: 0 };
    }
  }

  /**
   * Get total visit stats (Today, This Week, This Month) with breakdown
   * @returns {Promise<Object>} { today: {total, guestCount, userCount}, week: {...}, month: {...} }
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

    const emptyStats = { total: 0, guestCount: 0, userCount: 0 };

    if (!redisService.isConnected || !redisService.client) {
      // Memory Fallback
      const getUniqueVisitsBreakdown = (keys) => {
        const combinedSet = new Set();
        keys.forEach(key => {
          const set = this.localVisits.get(key);
          if (set) {
            set.forEach(id => combinedSet.add(id));
          }
        });
        return this._countUserTypes(Array.from(combinedSet));
      };

      const todayVisits = getUniqueVisitsBreakdown([todayKey]);
      const weekVisits = getUniqueVisitsBreakdown(weekKeys);
      const monthVisits = getUniqueVisitsBreakdown(monthKeys);

      return {
        today: todayVisits,
        week: weekVisits,
        month: monthVisits
      };
    }

    try {
      if (allKeysToFetch.length === 0) {
          return { today: emptyStats, week: emptyStats, month: emptyStats };
      }

      // We need to use SUNION to combine sets and get unique elements across multiple days
      // For pipelining, we'll fetch the members directly
      const multi = redisService.client.multi();
      
      // 1. Today's members
      multi.sendCommand(['SMEMBERS', todayKey]);
      
      // 2. This week's unique members across all days
      if (weekKeys.length > 0) {
        multi.sendCommand(['SUNION', ...weekKeys]);
      } else {
        multi.sendCommand(['SMEMBERS', 'nonexistent_key']); // Dummy command to keep array indexes aligned
      }
      
      // 3. This month's unique members across all days
      if (monthKeys.length > 0) {
        multi.sendCommand(['SUNION', ...monthKeys]);
      } else {
        multi.sendCommand(['SMEMBERS', 'nonexistent_key']);
      }
      
      const results = await multi.exec();
      
      const todayMembers = results[0] || [];
      const weekMembers = results[1] || [];
      const monthMembers = results[2] || [];

      return {
        today: this._countUserTypes(todayMembers),
        week: this._countUserTypes(weekMembers),
        month: this._countUserTypes(monthMembers)
      };
    } catch (error) {
      console.error('Error in getVisitsStats:', error);
      return { today: emptyStats, week: emptyStats, month: emptyStats };
    }
  }
  
  /**
   * Get weekly visits comparison (This Week vs Last Week)
   * @returns {Promise<Object>} { thisWeek: {total, guestCount, userCount}, lastWeek: {total, guestCount, userCount} }
   */
  async getWeeklyVisitsComparison() {
    const startOfThisWeek = moment().tz('Asia/Ho_Chi_Minh').startOf('isoWeek');
    const startOfLastWeek = moment().tz('Asia/Ho_Chi_Minh').subtract(1, 'week').startOf('isoWeek');
    const endOfLastWeek = moment(startOfLastWeek).endOf('isoWeek');
    const nowNode = moment().tz('Asia/Ho_Chi_Minh');

    const getKeysInRange = (start, end) => {
      let keys = [];
      let current = start.clone();
      while (current.isSameOrBefore(end, 'day')) {
        keys.push(`analytics:visits:${current.format('YYYY-MM-DD')}`);
        current.add(1, 'days');
      }
      return keys;
    };

    const thisWeekKeys = getKeysInRange(startOfThisWeek, nowNode);
    const lastWeekKeys = getKeysInRange(startOfLastWeek, endOfLastWeek);

    const emptyStats = { total: 0, guestCount: 0, userCount: 0 };

    if (!redisService.isConnected || !redisService.client) {
      const getUniqueVisitsBreakdown = (keys) => {
        const combinedSet = new Set();
        keys.forEach(key => {
          const set = this.localVisits.get(key);
          if (set) {
            set.forEach(id => combinedSet.add(id));
          }
        });
        return this._countUserTypes(Array.from(combinedSet));
      };

      return {
        thisWeek: getUniqueVisitsBreakdown(thisWeekKeys),
        lastWeek: getUniqueVisitsBreakdown(lastWeekKeys)
      };
    }

    try {
      const multi = redisService.client.multi();
      
      if (thisWeekKeys.length > 0) multi.sendCommand(['SUNION', ...thisWeekKeys]);
      else multi.sendCommand(['SMEMBERS', 'nonexistent']);

      if (lastWeekKeys.length > 0) multi.sendCommand(['SUNION', ...lastWeekKeys]);
      else multi.sendCommand(['SMEMBERS', 'nonexistent']);

      const results = await multi.exec();
      
      return {
        thisWeek: this._countUserTypes(results[0] || []),
        lastWeek: this._countUserTypes(results[1] || [])
      };
    } catch (error) {
      console.error('Error in getWeeklyVisitsComparison:', error);
      return { thisWeek: emptyStats, lastWeek: emptyStats };
    }
  }

  /**
   * Get locations of users for a specific period
   * @param {string} period 'realtime', 'today', 'week', 'month'
   * @returns {Promise<Array>} Array of location objects with counts
   */
  async getLocationsByPeriod(period) {
    if (!redisService.isConnected || !redisService.client) {
      return [];
    }

    try {
      let identifiers = [];

      if (period === 'realtime') {
        const now = Date.now();
        const cutoff = now - this.ACTIVE_WINDOW_MS;
        identifiers = await redisService.client.sendCommand(['ZRANGE', this.ACTIVE_USERS_KEY, '0', '-1']);
      } else {
        const todayDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
        const startOfWeek = moment().tz('Asia/Ho_Chi_Minh').startOf('isoWeek');
        const startOfMonth = moment().tz('Asia/Ho_Chi_Minh').startOf('month');
        const nowNode = moment().tz('Asia/Ho_Chi_Minh');

        let keys = [];
        if (period === 'today') {
          keys.push(`analytics:visits:${todayDate}`);
        } else if (period === 'week') {
          let curr = startOfWeek.clone();
          while (curr.isSameOrBefore(nowNode, 'day')) {
            keys.push(`analytics:visits:${curr.format('YYYY-MM-DD')}`);
            curr.add(1, 'days');
          }
        } else if (period === 'month') {
          let curr = startOfMonth.clone();
          while (curr.isSameOrBefore(nowNode, 'day')) {
            keys.push(`analytics:visits:${curr.format('YYYY-MM-DD')}`);
            curr.add(1, 'days');
          }
        }

        if (keys.length === 1) {
          identifiers = await redisService.client.sendCommand(['SMEMBERS', keys[0]]);
        } else if (keys.length > 1) {
          identifiers = await redisService.client.sendCommand(['SUNION', ...keys]);
        }
      }

      if (!identifiers || identifiers.length === 0) {
        return [];
      }

      // Fetch location data for these identifiers
      const locationKeys = identifiers.map(id => `analytics:location:${id}`);
      
      const locationsData = await redisService.client.sendCommand(['MGET', ...locationKeys]);
      
      // Aggregate by coordinates
      const locationMap = new Map();
      const geoip = require('geoip-lite');

      locationsData.forEach((data, index) => {
        let loc = null;
        if (data) {
          try {
            loc = JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Fallback: If no location data exists in cache, try to extract IP from the identifier and look it up on the fly
        if (!loc) {
           const id = identifiers[index];
           if (id && id.startsWith('ip_')) {
              let ipToLookup = id.replace('ip_', '');
              // Mock for local testing
              if (ipToLookup === '127.0.0.1' || ipToLookup === '::1' || ipToLookup === '::ffff:127.0.0.1' || ipToLookup === 'unknown') {
                 // We don't want to randomly assign historical IPs locally to avoid skewing logic unnecessarily,
                 // but if needed we can fallback to a known location, e.g., Ho Chi Minh City
                 loc = { lat: 10.762622, lon: 106.660172, city: 'Ho Chi Minh City', country: 'VN' };
              } else {
                 const geo = geoip.lookup(ipToLookup);
                 if (geo) {
                   loc = {
                     lat: geo.ll[0],
                     lon: geo.ll[1],
                     city: geo.city || 'Unknown City',
                     country: geo.country || 'Unknown Country'
                   };
                 }
              }
              
              // Cache the fallback lookup result into Redis so we don't calculate it again next time
              if (loc) {
                const locationKey = `analytics:location:${id}`;
                // Fire and forget to not block the main logic loop
                redisService.client.sendCommand(['SET', locationKey, JSON.stringify(loc)]).catch(() => {});
                redisService.client.sendCommand(['EXPIRE', locationKey, (60 * 60 * 24 * 60).toString()]).catch(() => {});
              }
           }
        }

        if (loc && loc.lat !== undefined && loc.lon !== undefined) {
          const coordKey = `${loc.lat},${loc.lon}`;
          if (locationMap.has(coordKey)) {
            const existing = locationMap.get(coordKey);
            existing.count += 1;
          } else {
            locationMap.set(coordKey, { ...loc, count: 1 });
          }
        }
      });

      return Array.from(locationMap.values());
    } catch (error) {
      console.error(`Error in getLocationsByPeriod(${period}):`, error);
      return [];
    }
  }
}

module.exports = new AnalyticsService();
