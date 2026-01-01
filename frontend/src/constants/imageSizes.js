/**
 * Image Size Constants
 * Standardized image sizes and quality settings for consistent caching
 *
 * Strategy: Use a limited set of sizes to maximize browser cache reuse
 */

export const IMAGE_SIZES = {
  // Thumbnail - Small images for lists, search results
  THUMBNAIL: {
    size: "160",
    quality: "75",
    description: "Thumbnail for search results, compact movie cards",
  },

  // Card - Standard movie card size
  CARD: {
    size: "250",
    quality: "85",
    description: "Standard movie card poster",
  },

  // Detail - Medium size for detail pages, hover cards
  DETAIL: {
    size: "400",
    quality: "90",
    description: "Detail page poster, hover card header",
  },

  // Banner - Large background images
  BANNER: {
    size: "1200",
    quality: "85",
    description: "Banner background images",
  },

  // Sidebar - Sidebar poster in detail page
  SIDEBAR: {
    size: "200",
    quality: "90",
    description: "Sidebar poster in detail page",
  },
};

/**
 * Get image size config by key
 * @param {string} key - Size key (THUMBNAIL, CARD, DETAIL, BANNER, SIDEBAR)
 * @returns {Object} - { size, quality }
 */
export const getImageSize = (key) => {
  return IMAGE_SIZES[key] || IMAGE_SIZES.CARD;
};

/**
 * Generate optimized image URL
 * @param {string} src - Original image URL
 * @param {string} sizeKey - Size key (THUMBNAIL, CARD, DETAIL, BANNER, SIDEBAR)
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (src, sizeKey = "CARD") => {
  if (!src) return null;
  const config = getImageSize(sizeKey);
  return `https://images.weserv.nl/?url=${src}&w=${config.size}&q=${config.quality}&output=webp`;
};

/**
 * Generate optimized image URL with custom size/quality
 * @param {string} src - Original image URL
 * @param {string} size - Custom size
 * @param {string} quality - Custom quality
 * @returns {string} - Optimized image URL
 */
export const getCustomOptimizedImageUrl = (src, size, quality) => {
  if (!src) return null;
  return `https://images.weserv.nl/?url=${src}&w=${size}&q=${quality}&output=webp`;
};
