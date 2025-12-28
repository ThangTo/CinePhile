/**
 * Image Preloader Utility
 * Preloads images to improve user experience and reduce loading delays
 */

import imageCache from "./imageCache";

/**
 * Preload a single image
 * @param {string} src - Image URL
 * @param {boolean} markInCache - Whether to mark image in cache (default: true)
 * @returns {Promise} - Resolves when image is loaded
 */
export const preloadImage = (src, markInCache = true) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Image source is required"));
      return;
    }

    // Check if already cached
    if (markInCache && imageCache.isCached(src)) {
      resolve(new Image());
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Mark as loaded in cache
      if (markInCache) {
        imageCache.markAsLoaded(src);
      }
      resolve(img);
    };
    img.onerror = () => {
      // Mark as failed in cache
      if (markInCache) {
        imageCache.markAsFailed(src);
      }
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

/**
 * Preload multiple images
 * @param {string[]} sources - Array of image URLs
 * @param {Object} options - Options for preloading
 * @param {number} options.batchSize - Number of images to load concurrently (default: 5)
 * @param {Function} options.onProgress - Callback for progress updates
 * @returns {Promise} - Resolves when all images are loaded
 */
export const preloadImages = async (sources, options = {}) => {
  const { batchSize = 5, onProgress } = options;
  const validSources = sources.filter(Boolean);
  const total = validSources.length;
  let loaded = 0;
  const errors = [];

  // Process in batches to avoid overwhelming the browser
  for (let i = 0; i < validSources.length; i += batchSize) {
    const batch = validSources.slice(i, i + batchSize);
    // eslint-disable-next-line no-loop-func
    const promises = batch.map(async (src) => {
      try {
        await preloadImage(src);
        loaded++;
        if (onProgress) {
          onProgress({ loaded, total, percentage: (loaded / total) * 100 });
        }
      } catch (error) {
        errors.push({ src, error });
        loaded++;
        if (onProgress) {
          onProgress({ loaded, total, percentage: (loaded / total) * 100 });
        }
      }
    });

    await Promise.allSettled(promises);
  }

  if (errors.length > 0) {
    console.warn("Some images failed to preload:", errors);
  }

  return { loaded, total, errors };
};

/**
 * Preload images from movie objects
 * @param {Array} movies - Array of movie objects
 * @param {Object} options - Options for preloading
 * @returns {Promise} - Resolves when all images are loaded
 */
export const preloadMovieImages = async (movies, options = {}) => {
  if (!movies || movies.length === 0) return { loaded: 0, total: 0, errors: [] };

  const sources = movies
    .map((movie) => {
      const images = [];
      if (movie.poster) images.push(movie.poster);
      if (movie.backgroundImage) images.push(movie.backgroundImage);
      if (movie.bgImage) images.push(movie.bgImage);
      return images;
    })
    .flat()
    .filter(Boolean);

  return preloadImages(sources, options);
};

/**
 * Preload critical images (above the fold)
 * @param {Array} movies - Array of movie objects for critical images
 * @returns {Promise} - Resolves when critical images are loaded
 */
export const preloadCriticalImages = async (movies) => {
  // Only preload first 10-15 movies (visible on initial load)
  const criticalMovies = movies.slice(0, 15);
  return preloadMovieImages(criticalMovies, { batchSize: 3 });
};

/**
 * Add preload link to document head
 * @param {string} href - Image URL
 * @param {string} as - Resource type (default: 'image')
 */
export const addPreloadLink = (href, as = "image") => {
  if (!href) return;

  // Check if link already exists
  const existingLink = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existingLink) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = as;
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

/**
 * Remove preload link from document head
 * @param {string} href - Image URL
 */
export const removePreloadLink = (href) => {
  const link = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (link) {
    link.remove();
  }
};
