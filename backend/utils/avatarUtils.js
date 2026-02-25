/**
 * Default avatars for new users.
 *
 * The actual images should now be stored on an external object storage / CDN
 * (e.g. Cloudflare R2). We keep only the filenames here and build full URLs
 * using an environment-configured base URL.
 */
const DEFAULT_AVATARS = [
  'avt1.jpg',
  'avt2.webp',
  'avt3.jpg',
  'avt4.jpg',
  'avt5.jpg',
];

// Base URL for avatars hosted on R2 / CDN, e.g.:
// https://your-bucket.r2.dev/avatars
const R2_AVATAR_BASE_URL =
  process.env.PUBLIC_DOMAIN + '/avatars' || null;

/**
 * Get a random default avatar URL.
 * Priority:
 * 1. R2 / CDN base URL if configured (recommended)
 * 2. Legacy local /api/v1/avatars path as a fallback (for dev)
 *
 * @returns {string} Random avatar URL
 */
const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  const avatarFilename = DEFAULT_AVATARS[randomIndex];

  // Preferred: build URL from R2/CDN base if provided
  if (R2_AVATAR_BASE_URL) {
    const base = R2_AVATAR_BASE_URL.replace(/\/$/, '');
    return `${base}/${avatarFilename}`;
  }

  // Fallback: old behaviour using local static folder (useful for local dev)
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${apiBaseUrl}/api/v1/avatars/${avatarFilename}`;
};

module.exports = {
  DEFAULT_AVATARS,
  getRandomAvatar,
};
