import { useEffect, useState } from "react";
import { preloadMovieImages, preloadCriticalImages } from "utils/imagePreloader";

/**
 * Hook to preload images for movies
 * @param {Array} movies - Array of movie objects
 * @param {Object} options - Preload options
 * @param {boolean} options.criticalOnly - Only preload critical images (first 15)
 * @param {number} options.batchSize - Number of images to load concurrently
 * @param {boolean} options.enabled - Whether preloading is enabled
 * @returns {Object} - { isLoading, progress, error }
 */
export const useImagePreloader = (movies, options = {}) => {
  const { criticalOnly = false, batchSize = 5, enabled = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !movies || movies.length === 0) return;

    const preload = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = criticalOnly
          ? await preloadCriticalImages(movies)
          : await preloadMovieImages(movies, {
              batchSize,
              onProgress: setProgress,
            });

        setProgress({
          loaded: result.loaded,
          total: result.total,
          percentage: result.total > 0 ? (result.loaded / result.total) * 100 : 0,
        });
      } catch (err) {
        setError(err);
        console.error("Error preloading images:", err);
      } finally {
        setIsLoading(false);
      }
    };

    preload();
  }, [movies, criticalOnly, batchSize, enabled]);

  return { isLoading, progress, error };
};
