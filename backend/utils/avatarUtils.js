/**
 * Default avatars for new users
 * Avatar files are stored in backend/data/avatars/
 */
const DEFAULT_AVATARS = [
  'avt1.jpg', // Smiling person
  'avt2.webp', // Person with glasses
  'avt3.jpg', // Person with hat
  'avt4.jpg', // Person with beard
  'avt5.jpg', // Person with smile
];

/**
 * Get a random default avatar
 * @returns {string} Random avatar URL
 */
const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  const avatarFilename = DEFAULT_AVATARS[randomIndex];

  // Build full URL using API_BASE_URL or default to localhost
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

  return `${apiBaseUrl}/api/v1/avatars/${avatarFilename}`;
};

module.exports = {
  DEFAULT_AVATARS,
  getRandomAvatar,
};
