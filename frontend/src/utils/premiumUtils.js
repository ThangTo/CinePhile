/**
 * Utility functions for premium subscription management
 */

/**
 * Check if user has active premium subscription
 * @param {Object} user - User object
 * @returns {boolean} True if user has active premium
 */
export const isPremiumActive = (user) => {
  if (!user || user.role !== "premium") return false;
  
  const now = new Date();
  const premiumExpiresAt = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
  
  return premiumExpiresAt && premiumExpiresAt > now;
};

/**
 * Check if premium is set to "forever" (no expiry).
 * Treats any premiumExpiresAt in year 2100+ as permanent.
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isPermanentPremium = (user) => {
  if (!user || user.role !== 'premium' || !user.premiumExpiresAt) return false;
  const expiry = new Date(user.premiumExpiresAt);
  return expiry.getFullYear() >= 2100;
};

/**
 * Calculate remaining days of premium subscription.
 * Returns -1 when premium is permanent (no expiry).
 * @param {Object} user - User object
 * @returns {number} Remaining days (-1 = permanent, 0 = expired/not premium)
 */
export const getRemainingDays = (user) => {
  if (!isPremiumActive(user)) return 0;

  if (isPermanentPremium(user)) return -1;

  const now = new Date();
  const premiumExpiresAt = new Date(user.premiumExpiresAt);
  const diffTime = premiumExpiresAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Get premium plan name in Vietnamese
 * @param {string} plan - Plan ID (weekly, monthly, yearly)
 * @returns {string} Plan name in Vietnamese
 */
export const getPlanName = (plan) => {
  const planNames = {
    weekly: 'Tuần',
    monthly: 'Tháng',
    yearly: 'Năm',
  };
  return planNames[plan] || '';
};

/**
 * Get premium status text
 * @param {Object} user - User object
 * @returns {string} Status text (e.g., "Premium Tháng 30 ngày" or "Premium Tháng — Vĩnh viễn")
 */
export const getPremiumStatusText = (user) => {
  if (!isPremiumActive(user)) return '';

  const remainingDays = getRemainingDays(user);
  const planName = getPlanName(user.premiumPlan);

  if (remainingDays === -1) {
    return `Premium ${planName} — Vĩnh viễn`;
  }

  return `Premium ${planName} ${remainingDays} ngày`;
};

