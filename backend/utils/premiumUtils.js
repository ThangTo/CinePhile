/**
 * Premium subscription utilities — Backend only
 */

/**
 * Check if user has active premium subscription
 * @param {Object} user - User object
 * @returns {boolean}
 */
const isPremiumActive = (user) => {
  if (!user || user.role !== 'premium') return false;
  const now = new Date();
  const premiumExpiresAt = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
  return premiumExpiresAt && premiumExpiresAt > now;
};

module.exports = { isPremiumActive };
