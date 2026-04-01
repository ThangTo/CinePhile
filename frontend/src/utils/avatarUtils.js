/**
 * Frontend avatar utilities - mirrors backend/utils/avatarUtils.js
 *
 * Provides fallback avatar URLs from R2 CDN when user avatars fail to load.
 * Fallback is DETERMINISTIC based on username so the same user always gets
 * the same fallback avatar across all components.
 */

const DEFAULT_AVATARS = [
  'avt1.jpg',
  'avt2.webp',
  'avt3.jpg',
  'avt4.jpg',
  'avt5.jpg',
];

// R2 / CDN base URL for default avatars
const R2_AVATAR_BASE_URL = 'https://pub-e00827b92ed84d85a314a9c12ba6f2e7.r2.dev/avatars';

/**
 * Simple string hash → consistent index.
 * Same string always produces the same number.
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

/**
 * Get a deterministic default avatar URL based on a key (e.g. username).
 * Same key always returns the same avatar.
 * @param {string} key - username or any identifier
 * @returns {string} Avatar URL
 */
export const getAvatarUrlByKey = (key) => {
  const index = hashString(key || 'default') % DEFAULT_AVATARS.length;
  return `${R2_AVATAR_BASE_URL}/${DEFAULT_AVATARS[index]}`;
};

/**
 * Get a random default avatar URL from R2 CDN (non-deterministic).
 * @returns {string} Random avatar URL
 */
export const getRandomAvatarUrl = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return `${R2_AVATAR_BASE_URL}/${DEFAULT_AVATARS[randomIndex]}`;
};

/**
 * Check if a URL is reachable via a HEAD request (max 3s timeout).
 * Returns true if the resource exists (2xx/3xx), false otherwise.
 * Falls back to false for CORS-blocked responses (which still means the URL works).
 * Base64 data URLs skip the fetch check and always return true.
 * @param {string} src - Image src URL
 * @returns {Promise<boolean>}
 */
const isUrlReachable = (src) =>
  new Promise((resolve) => {
    // Base64 data URLs: can't validate via fetch, assume valid unless clearly broken
    if (src.startsWith('data:image')) {
      // Basic sanity: must start with "data:image/" and have a comma
      resolve(src.startsWith('data:image/') && src.includes(','));
      return;
    }

    // Protocol-relative or relative URL: skip fetch (only works same-origin)
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      resolve(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch(src, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        // 2xx/3xx = valid; 0 with ok=false still means CORS/network issue but URL exists
        resolve(res.ok || res.status < 400);
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve(false);
      });
  });

/**
 * onError handler for avatar <img> tags.
 *
 * Attempts to verify the original URL before falling back:
 * - For http(s) URLs: makes a HEAD request (3s timeout) to confirm the resource is
 *   truly unreachable (not just a transient network blip).
 * - For data URLs: basic format validation only.
 *
 * If the URL is confirmed unreachable, replaces `src` with a deterministic default
 * avatar (based on the `alt` attribute / username) and marks the element so the
 * fallback is never applied twice.
 *
 * Usage: <img src={user.avatar} alt={user.username} onError={handleAvatarError} />
 */
export const handleAvatarError = async (e) => {
  const img = e.target;

  // Already applied fallback → skip (prevents infinite loop)
  if (img.dataset.fallbackApplied) return;

  const originalSrc = img.src;

  // Attempt to revalidate the original URL before falling back
  const reachable = await isUrlReachable(originalSrc);

  // If the URL is reachable now, the previous error was transient — do nothing
  if (reachable) return;

  // Confirmed unreachable: apply deterministic fallback
  img.dataset.fallbackApplied = 'true';
  img.src = getAvatarUrlByKey(img.alt || 'default');
};
