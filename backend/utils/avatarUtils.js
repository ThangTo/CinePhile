/**
 * Default avatars for new users
 * Fun and colorful avatar images
 */
const DEFAULT_AVATARS = [
  'https://i.pravatar.cc/150?img=1', // Smiling person
  'https://i.pravatar.cc/150?img=5', // Person with glasses
  'https://i.pravatar.cc/150?img=12', // Person with hat
  'https://i.pravatar.cc/150?img=33', // Person with beard
  'https://i.pravatar.cc/150?img=68', // Person with smile
];

/**
 * Get a random default avatar
 * @returns {string} Random avatar URL
 */
const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[randomIndex];
};

module.exports = {
  DEFAULT_AVATARS,
  getRandomAvatar,
};
