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
 * onError handler for avatar <img> tags.
 * Reads the `alt` attribute (which is typically the username) to produce
 * a DETERMINISTIC fallback — so the same user always gets the same avatar
 * no matter which component renders it.
 *
 * Usage: <img src={user.avatar} alt={user.username} onError={handleAvatarError} />
 */
export const handleAvatarError = (e) => {
  const img = e.target;
  // Prevent infinite loop if fallback also fails
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = 'true';
  // Use alt text (username) for deterministic selection
  img.src = getAvatarUrlByKey(img.alt || 'default');
};
