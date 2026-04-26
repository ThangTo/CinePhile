const redisService = require('./redis.service');
const moment = require('moment-timezone');
const DailyAnalytics = require('../models/daily_analytics.model');
const PeriodAnalytics = require('../models/period_analytics.model');

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

      // Execute commands directly on client — sendCommand() works on both node-redis v4 TCP & Upstash REST
      const [todayMembers, weekMembers, monthMembers] = await Promise.all([
        redisService.client.sendCommand(['SMEMBERS', todayKey]).catch(() => []),
        weekKeys.length > 0
          ? redisService.client.sendCommand(['SUNION', ...weekKeys]).catch(() => [])
          : Promise.resolve([]),
        monthKeys.length > 0
          ? redisService.client.sendCommand(['SUNION', ...monthKeys]).catch(() => [])
          : Promise.resolve([]),
      ]);

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
      // sendCommand() works on both node-redis v4 TCP client and Upstash REST client
      const [thisWeekMembers, lastWeekMembers] = await Promise.all([
        thisWeekKeys.length > 0
          ? redisService.client.sendCommand(['SUNION', ...thisWeekKeys]).catch(() => [])
          : Promise.resolve([]),
        lastWeekKeys.length > 0
          ? redisService.client.sendCommand(['SUNION', ...lastWeekKeys]).catch(() => [])
          : Promise.resolve([]),
      ]);
      const results = [thisWeekMembers, lastWeekMembers];
      
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

  // =========================================================================
  // PERSISTENT ANALYTICS — MongoDB snapshot layer
  // =========================================================================

  /**
   * Snapshot one day's Redis visit data into MongoDB.
   * Safe to call multiple times (upsert), so cron retries are harmless.
   * @param {string} dateStr - "YYYY-MM-DD" in Asia/Ho_Chi_Minh
   * @returns {Promise<Object>} The saved document
   */
  async snapshotDailyVisits(dateStr) {
    const key = `analytics:visits:${dateStr}`;
    let identifiers = [];

    if (redisService.isConnected && redisService.client) {
      try {
        identifiers = await redisService.client.sendCommand(['SMEMBERS', key]);
      } catch (err) {
        console.warn(`[Analytics] Redis SMEMBERS failed for ${key}:`, err.message);
      }
    }

    // Also merge any in-memory fallback data
    const localSet = this.localVisits.get(key);
    if (localSet) {
      localSet.forEach((id) => identifiers.push(id));
      identifiers = [...new Set(identifiers)];
    }

    const { total, guestCount, userCount } = this._countUserTypes(identifiers);

    const m = moment.tz(dateStr, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
    const doc = {
      date: dateStr,
      year: m.year(),
      month: m.month() + 1, // moment month() is 0-indexed
      week: m.isoWeek(),
      dayOfWeek: m.isoWeekday(),
      total,
      guestCount,
      userCount,
    };

    const result = await DailyAnalytics.findOneAndUpdate(
      { date: dateStr },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return result;
  }

  /**
   * Backfill historical data from Redis for all days still in TTL window.
   * Called once at server startup. Skips days already in MongoDB.
   * @returns {Promise<{processed: number, skipped: number}>}
   */
  async backfillHistoricalData() {
    let processed = 0;
    let skipped = 0;
    const now = moment().tz('Asia/Ho_Chi_Minh');

    // Scan up to 2 days back (instead of 60) to reduce load on startup
    for (let i = 0; i < 2; i++) {
      const dateStr = now.clone().subtract(i, 'days').format('YYYY-MM-DD');

      // Skip if already snapshotted
      const existing = await DailyAnalytics.findOne({ date: dateStr }).lean();
      if (existing && existing.total > 0) {
        skipped++;
        continue;
      }

      try {
        await this.snapshotDailyVisits(dateStr);
        processed++;
      } catch (err) {
        console.error(`[Analytics] Backfill failed for ${dateStr}:`, err.message);
      }
    }

    return { processed, skipped };
  }

  /**
   * Get historical analytics grouped by granularity from MongoDB.
   * @param {Object} options
   * @param {string} options.granularity - 'day' | 'week' | 'month' | 'year'
   * @param {string} options.from - Start date 'YYYY-MM-DD'
   * @param {string} options.to - End date 'YYYY-MM-DD'
   * @returns {Promise<Array>} Array of { label, total, guestCount, userCount }
   */
  async getHistoricalStats({ granularity = 'day', from, to } = {}) {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const fromDate = from || now.clone().subtract(30, 'days').format('YYYY-MM-DD');
    const toDate = to || now.format('YYYY-MM-DD');

    const matchStage = { $match: { date: { $gte: fromDate, $lte: toDate } } };

    let groupStage;
    let labelField;

    if (granularity === 'year') {
      groupStage = {
        $group: {
          _id: { year: '$year' },
          total: { $sum: '$total' },
          guestCount: { $sum: '$guestCount' },
          userCount: { $sum: '$userCount' },
        },
      };
      labelField = (doc) => `${doc._id.year}`;
    } else if (granularity === 'month') {
      groupStage = {
        $group: {
          _id: { year: '$year', month: '$month' },
          total: { $sum: '$total' },
          guestCount: { $sum: '$guestCount' },
          userCount: { $sum: '$userCount' },
        },
      };
      labelField = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, '0')}`;
    } else if (granularity === 'week') {
      groupStage = {
        $group: {
          _id: { year: '$year', week: '$week' },
          total: { $sum: '$total' },
          guestCount: { $sum: '$guestCount' },
          userCount: { $sum: '$userCount' },
        },
      };
      labelField = (doc) => `${doc._id.year}-W${String(doc._id.week).padStart(2, '0')}`;
    } else {
      // Default: day
      groupStage = {
        $group: {
          _id: { date: '$date' },
          total: { $sum: '$total' },
          guestCount: { $sum: '$guestCount' },
          userCount: { $sum: '$userCount' },
        },
      };
      labelField = (doc) => doc._id.date;
    }

    const sortStage = { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.date': 1 } };

    const results = await DailyAnalytics.aggregate([
      matchStage,
      groupStage,
      sortStage,
    ]);

    return results.map((doc) => ({
      label: labelField(doc),
      total: doc.total,
      guestCount: doc.guestCount,
      userCount: doc.userCount,
    }));
  }

  /**
   * Get all-time cumulative visitor totals from MongoDB.
   * @returns {Promise<Object>} { total, guestCount, userCount, oldestDate, newestDate, totalDays }
   */
  async getAllTimeSummary() {
    const result = await DailyAnalytics.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          guestCount: { $sum: '$guestCount' },
          userCount: { $sum: '$userCount' },
          oldestDate: { $min: '$date' },
          newestDate: { $max: '$date' },
          totalDays: { $sum: 1 },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return { total: 0, guestCount: 0, userCount: 0, oldestDate: null, newestDate: null, totalDays: 0 };
    }

    const { _id, ...summary } = result[0];
    return summary;
  }

  // =========================================================================
  // UNIQUE ANALYTICS — PeriodAnalytics (true deduplicated counts via SUNION)
  // =========================================================================

  /**
   * Snapshot TRUE unique visitors for the current week or month via Redis SUNION.
   * Unlike daily snapshot (which stores per-day unique), this stores unique
   * across the entire period — e.g. one user visiting Mon+Wed counts as 1.
   *
   * @param {'week'|'month'} periodType
   * @returns {Promise<Object>} The saved document
   */
  async snapshotPeriodUnique(periodType) {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    let periodKey, year, keys;

    if (periodType === 'week') {
      year = now.isoWeekYear();
      periodKey = `${year}-W${String(now.isoWeek()).padStart(2, '0')}`;
      const startOfWeek = now.clone().startOf('isoWeek');
      keys = [];
      let curr = startOfWeek.clone();
      while (curr.isSameOrBefore(now, 'day')) {
        keys.push(`analytics:visits:${curr.format('YYYY-MM-DD')}`);
        curr.add(1, 'days');
      }
    } else if (periodType === 'month') {
      year = now.year();
      periodKey = now.format('YYYY-MM');
      const startOfMonth = now.clone().startOf('month');
      keys = [];
      let curr = startOfMonth.clone();
      while (curr.isSameOrBefore(now, 'day')) {
        keys.push(`analytics:visits:${curr.format('YYYY-MM-DD')}`);
        curr.add(1, 'days');
      }
    } else {
      throw new Error(`Invalid periodType: ${periodType}`);
    }

    let identifiers = [];

    if (redisService.isConnected && redisService.client && keys.length > 0) {
      try {
        if (keys.length === 1) {
          identifiers = await redisService.client.sendCommand(['SMEMBERS', keys[0]]);
        } else {
          identifiers = await redisService.client.sendCommand(['SUNION', ...keys]);
        }
      } catch (err) {
        console.warn(`[Analytics] Redis SUNION failed for ${periodType} ${periodKey}:`, err.message);
      }
    }

    const { total, guestCount, userCount } = this._countUserTypes(identifiers);
    const doc = { periodType, periodKey, year, total, guestCount, userCount };

    const result = await PeriodAnalytics.findOneAndUpdate(
      { periodType, periodKey },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return result;
  }

  /**
   * Backfill period analytics from Redis for past weeks and months still in TTL.
   * Skips periods already present in MongoDB.
   * @returns {Promise<{processed: number, skipped: number}>}
   */
  async backfillPeriodData() {
    let processed = 0;
    let skipped = 0;
    const now = moment().tz('Asia/Ho_Chi_Minh');

    // Last 1 week (instead of 8)
    for (let w = 0; w < 1; w++) {
      const weekMoment = now.clone().subtract(w, 'weeks');
      const year = weekMoment.isoWeekYear();
      const periodKey = `${year}-W${String(weekMoment.isoWeek()).padStart(2, '0')}`;

      const existing = await PeriodAnalytics.findOne({ periodType: 'week', periodKey }).lean();
      if (existing && existing.total > 0) {
        skipped++;
        continue;
      }

      // Temporarily override "now" context for past weeks by computing exact keys
      const startOfWeek = weekMoment.clone().startOf('isoWeek');
      const endOfWeek = weekMoment.clone().endOf('isoWeek');
      const keys = [];
      let curr = startOfWeek.clone();
      while (curr.isSameOrBefore(endOfWeek, 'day') && curr.isSameOrBefore(now, 'day')) {
        keys.push(`analytics:visits:${curr.format('YYYY-MM-DD')}`);
        curr.add(1, 'days');
      }

      try {
        let identifiers = [];
        if (redisService.isConnected && redisService.client && keys.length > 0) {
          identifiers = keys.length === 1
            ? await redisService.client.sendCommand(['SMEMBERS', keys[0]])
            : await redisService.client.sendCommand(['SUNION', ...keys]);
        }
        const { total, guestCount, userCount } = this._countUserTypes(identifiers);
        await PeriodAnalytics.findOneAndUpdate(
          { periodType: 'week', periodKey },
          { $set: { periodType: 'week', periodKey, year, total, guestCount, userCount } },
          { upsert: true, new: true }
        );
        processed++;
      } catch (err) {
        console.error(`[Analytics] Period backfill failed for week ${periodKey}:`, err.message);
      }
    }

    // Last 3 months
    for (let m = 0; m < 3; m++) {
      const monthMoment = now.clone().subtract(m, 'months');
      const year = monthMoment.year();
      const periodKey = monthMoment.format('YYYY-MM');

      const existing = await PeriodAnalytics.findOne({ periodType: 'month', periodKey }).lean();
      if (existing && existing.total > 0) {
        skipped++;
        continue;
      }

      const startOfMonth = monthMoment.clone().startOf('month');
      const endOfMonth = monthMoment.clone().endOf('month');
      const keys = [];
      let curr = startOfMonth.clone();
      while (curr.isSameOrBefore(endOfMonth, 'day') && curr.isSameOrBefore(now, 'day')) {
        keys.push(`analytics:visits:${curr.format('YYYY-MM-DD')}`);
        curr.add(1, 'days');
      }

      try {
        let identifiers = [];
        if (redisService.isConnected && redisService.client && keys.length > 0) {
          identifiers = keys.length === 1
            ? await redisService.client.sendCommand(['SMEMBERS', keys[0]])
            : await redisService.client.sendCommand(['SUNION', ...keys]);
        }
        const { total, guestCount, userCount } = this._countUserTypes(identifiers);
        await PeriodAnalytics.findOneAndUpdate(
          { periodType: 'month', periodKey },
          { $set: { periodType: 'month', periodKey, year, total, guestCount, userCount } },
          { upsert: true, new: true }
        );
        processed++;
      } catch (err) {
        console.error(`[Analytics] Period backfill failed for month ${periodKey}:`, err.message);
      }
    }

    return { processed, skipped };
  }

  /**
   * Get TRUE unique visitor stats grouped by granularity.
   * - day:   reads DailyAnalytics (daily unique = per-day unique, correct)
   * - week:  reads PeriodAnalytics type='week' (SUNION per week)
   * - month: reads PeriodAnalytics type='month' (SUNION per month)
   * - year:  groups monthly PeriodAnalytics by year (approx — cross-month
   *          visitors counted once per month, so slight over-count)
   *
   * @param {Object} options
   * @param {string} options.granularity - 'day' | 'week' | 'month' | 'year'
   * @param {string} options.from - Start date 'YYYY-MM-DD'
   * @param {string} options.to   - End date   'YYYY-MM-DD'
   * @returns {Promise<Array>} [{ label, total, guestCount, userCount }]
   */
  async getUniqueStats({ granularity = 'day', from, to } = {}) {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const fromDate = from || now.clone().subtract(30, 'days').format('YYYY-MM-DD');
    const toDate = to || now.format('YYYY-MM-DD');

    // Day: re-use DailyAnalytics (per-day unique IS unique that day)
    if (granularity === 'day') {
      return this.getHistoricalStats({ granularity: 'day', from: fromDate, to: toDate });
    }

    if (granularity === 'week') {
      const fromMoment = moment.tz(fromDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
      const toMoment = moment.tz(toDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
      const fromKey = `${fromMoment.isoWeekYear()}-W${String(fromMoment.isoWeek()).padStart(2, '0')}`;
      const toKey = `${toMoment.isoWeekYear()}-W${String(toMoment.isoWeek()).padStart(2, '0')}`;

      const docs = await PeriodAnalytics.find({
        periodType: 'week',
        periodKey: { $gte: fromKey, $lte: toKey },
      }).sort({ periodKey: 1 }).lean();

      return docs.map((d) => ({
        label: d.periodKey,
        total: d.total,
        guestCount: d.guestCount,
        userCount: d.userCount,
      }));
    }

    if (granularity === 'month') {
      const fromKey = fromDate.slice(0, 7); // 'YYYY-MM'
      const toKey = toDate.slice(0, 7);

      const docs = await PeriodAnalytics.find({
        periodType: 'month',
        periodKey: { $gte: fromKey, $lte: toKey },
      }).sort({ periodKey: 1 }).lean();

      return docs.map((d) => ({
        label: d.periodKey,
        total: d.total,
        guestCount: d.guestCount,
        userCount: d.userCount,
      }));
    }

    if (granularity === 'year') {
      // Aggregate monthly periods by year
      const fromKey = fromDate.slice(0, 7);
      const toKey = toDate.slice(0, 7);

      const results = await PeriodAnalytics.aggregate([
        { $match: { periodType: 'month', periodKey: { $gte: fromKey, $lte: toKey } } },
        {
          $group: {
            _id: { year: '$year' },
            total: { $sum: '$total' },
            guestCount: { $sum: '$guestCount' },
            userCount: { $sum: '$userCount' },
          },
        },
        { $sort: { '_id.year': 1 } },
      ]);

      return results.map((d) => ({
        label: String(d._id.year),
        total: d.total,
        guestCount: d.guestCount,
        userCount: d.userCount,
      }));
    }

    return [];
  }

  /**
   * Get all-time unique summary from PeriodAnalytics (monthly level).
   * @returns {Promise<Object>} { total, guestCount, userCount, oldestPeriod, newestPeriod, totalPeriods }
   */
  async getAllTimeUniqueSummary() {
    // Sum monthly uniques for all-time (best approximation without storing identifiers)
    const result = await PeriodAnalytics.aggregate([
      { $match: { periodType: 'month' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          guestCount: { $sum: '$guestCount' },
          userCount: { $sum: '$userCount' },
          oldestPeriod: { $min: '$periodKey' },
          newestPeriod: { $max: '$periodKey' },
          totalPeriods: { $sum: 1 },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return { total: 0, guestCount: 0, userCount: 0, oldestPeriod: null, newestPeriod: null, totalPeriods: 0 };
    }

    const { _id, ...summary } = result[0];
    return summary;
  }
}

module.exports = new AnalyticsService();

