/**
 * Video utility functions
 */

/**
 * Convert YouTube URL to embed URL
 * @param {string} url - YouTube URL in various formats
 * @returns {string|null} - Embed URL or null if invalid
 */
export const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;

  // Already an embed URL
  if (url.includes("youtube.com/embed/")) return url;

  // Extract video ID from various YouTube URL formats
  let videoId = null;

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  if (url.includes("youtube.com/watch")) {
    const urlParams = new URLSearchParams(url.split("?")[1]);
    videoId = urlParams.get("v");
  }
  // Format: https://youtu.be/VIDEO_ID
  else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  }
  // Format: https://www.youtube.com/v/VIDEO_ID
  else if (url.includes("youtube.com/v/")) {
    videoId = url.split("youtube.com/v/")[1]?.split("?")[0];
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }

  return url; // Return original if can't parse
};

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
export const extractYouTubeVideoId = (url) => {
  if (!url) return null;

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  if (url.includes("youtube.com/watch")) {
    const urlParams = new URLSearchParams(url.split("?")[1]);
    return urlParams.get("v");
  }
  // Format: https://youtu.be/VIDEO_ID
  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1]?.split("?")[0];
  }
  // Format: https://www.youtube.com/v/VIDEO_ID
  if (url.includes("youtube.com/v/")) {
    return url.split("youtube.com/v/")[1]?.split("?")[0];
  }
  // Format: https://www.youtube.com/embed/VIDEO_ID
  if (url.includes("youtube.com/embed/")) {
    return url.split("youtube.com/embed/")[1]?.split("?")[0];
  }

  return null;
};

/**
 * Check if URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} - True if YouTube URL
 */
export const isYouTubeUrl = (url) => {
  if (!url) return false;
  return url.includes("youtube.com") || url.includes("youtu.be");
};
