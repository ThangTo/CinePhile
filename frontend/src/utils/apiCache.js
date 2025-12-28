/**
 * API Response Cache Utility
 * Caches API responses to prevent duplicate requests
 */

class ApiCache {
  constructor() {
    this.cache = new Map(); // Store API responses
    this.pendingRequests = new Map(); // Store pending promises to prevent duplicate concurrent requests
    this.TTL = 5 * 60 * 1000; // 5 minutes TTL
  }

  /**
   * Generate cache key from request parameters
   * @param {string} endpoint - API endpoint (e.g., 'getByType', 'getByGenre', 'search')
   * @param {string} key - Filter key (e.g., genre slug, country slug, search query)
   * @param {Object} params - Request parameters (page, limit, etc.)
   * @returns {string} - Cache key
   */
  generateKey(endpoint, key, params = {}) {
    const paramsStr = JSON.stringify(params);
    return `${endpoint}:${key}:${paramsStr}`;
  }

  /**
   * Get cached response
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} - Cached response or null if not found/expired
   */
  get(cacheKey) {
    if (!cacheKey) return null;

    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > this.TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached response
   * @param {string} cacheKey - Cache key
   * @param {*} data - Response data to cache
   */
  set(cacheKey, data) {
    if (!cacheKey) return;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if request is pending
   * @param {string} cacheKey - Cache key
   * @returns {Promise|null} - Pending promise or null
   */
  getPending(cacheKey) {
    return this.pendingRequests.get(cacheKey) || null;
  }

  /**
   * Set pending request
   * @param {string} cacheKey - Cache key
   * @param {Promise} promise - Pending promise
   */
  setPending(cacheKey, promise) {
    if (!cacheKey) return;
    this.pendingRequests.set(cacheKey, promise);

    // Clean up pending request after it resolves/rejects
    promise
      .then(() => {
        this.pendingRequests.delete(cacheKey);
      })
      .catch(() => {
        this.pendingRequests.delete(cacheKey);
      });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear cache for specific endpoint
   * @param {string} endpoint - API endpoint
   */
  clearEndpoint(endpoint) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${endpoint}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache size
   * @returns {number} - Number of cached responses
   */
  getSize() {
    return this.cache.size;
  }
}

// Singleton instance
const apiCache = new ApiCache();

export default apiCache;

