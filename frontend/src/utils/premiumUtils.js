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
 * Calculate remaining days of premium subscription
 * @param {Object} user - User object
 * @returns {number} Remaining days (0 if expired or not premium)
 */
export const getRemainingDays = (user) => {
  if (!isPremiumActive(user)) return 0;
  
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
    weekly: "Tuần",
    monthly: "Tháng",
    yearly: "Năm",
  };
  return planNames[plan] || "";
};

/**
 * Get premium status text
 * @param {Object} user - User object
 * @returns {string} Status text (e.g., "Premium 30 ngày")
 */
export const getPremiumStatusText = (user) => {
  if (!isPremiumActive(user)) return "";
  
  const remainingDays = getRemainingDays(user);
  const planName = getPlanName(user.premiumPlan);
  
  return `Premium ${planName} ${remainingDays} ngày`;
};

