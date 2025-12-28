/**
 * Favorites Cache Utility
 * Caches favorites list to avoid repeated API calls
 */

class FavoritesCache {
  constructor() {
    this.cache = null;
    this.timestamp = null;
    this.CACHE_DURATION = 60000; // 1 minute cache duration
    this.pendingRequest = null;
  }

  /**
   * Check if cache is still valid
   * @returns {boolean} - True if cache is valid
   */
  isValid() {
    if (!this.cache || !this.timestamp) return false;
    return Date.now() - this.timestamp < this.CACHE_DURATION;
  }

  /**
   * Get cached favorites
   * @returns {Array|null} - Cached favorites or null
   */
  get() {
    return this.isValid() ? this.cache : null;
  }

  /**
   * Set cached favorites
   * @param {Array} favorites - Favorites list
   */
  set(favorites) {
    this.cache = favorites;
    this.timestamp = Date.now();
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache = null;
    this.timestamp = null;
    this.pendingRequest = null;
  }

  /**
   * Get or create pending request
   * @param {Function} fetchFn - Function to fetch favorites
   * @returns {Promise} - Promise that resolves with favorites
   */
  async getOrFetch(fetchFn) {
    // Return cached data if valid
    const cached = this.get();
    if (cached) {
      return cached;
    }

    // If there's already a pending request, return it
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    // Create new request
    this.pendingRequest = fetchFn()
      .then((data) => {
        this.set(data);
        this.pendingRequest = null;
        return data;
      })
      .catch((error) => {
        this.pendingRequest = null;
        throw error;
      });

    return this.pendingRequest;
  }
}

// Singleton instance
const favoritesCache = new FavoritesCache();

export default favoritesCache;

