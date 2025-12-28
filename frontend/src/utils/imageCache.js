/**
 * Image Cache Utility
 * Tracks loaded images to prevent re-downloading when navigating back
 */

class ImageCache {
  constructor() {
    this.cache = new Map(); // Store image load status
    this.loadedImages = new Set(); // Track successfully loaded image URLs
  }

  /**
   * Check if image is already loaded/cached
   * @param {string} url - Image URL
   * @returns {boolean} - True if image is cached
   */
  isCached(url) {
    if (!url) return false;
    return this.loadedImages.has(url) || this.cache.has(url);
  }

  /**
   * Mark image as loaded
   * @param {string} url - Image URL
   */
  markAsLoaded(url) {
    if (!url) return;
    this.loadedImages.add(url);
    this.cache.set(url, { loaded: true, timestamp: Date.now() });
  }

  /**
   * Mark image as failed
   * @param {string} url - Image URL
   */
  markAsFailed(url) {
    if (!url) return;
    this.cache.set(url, { loaded: false, timestamp: Date.now() });
  }

  /**
   * Check if image exists in browser cache
   * @param {string} url - Image URL
   * @returns {Promise<boolean>} - True if image is in browser cache
   */
  async checkBrowserCache(url) {
    if (!url) return false;

    return new Promise((resolve) => {
      const img = new Image();

      // If image is already loaded in our cache, return true
      if (this.isCached(url)) {
        resolve(true);
        return;
      }

      // Check browser cache by trying to load with cache
      img.onload = () => {
        // Image loaded (either from cache or network)
        // Check if it was from cache by checking if it loaded very quickly
        this.markAsLoaded(url);
        resolve(true);
      };

      img.onerror = () => {
        resolve(false);
      };

      // Use cache-first strategy
      img.src = url;

      // If image is already complete (cached), resolve immediately
      if (img.complete) {
        this.markAsLoaded(url);
        resolve(true);
      }
    });
  }

  /**
   * Clear cache (optional, for memory management)
   */
  clear() {
    this.cache.clear();
    this.loadedImages.clear();
  }

  /**
   * Get cache size
   * @returns {number} - Number of cached images
   */
  getSize() {
    return this.cache.size;
  }
}

// Singleton instance
const imageCache = new ImageCache();

export default imageCache;
