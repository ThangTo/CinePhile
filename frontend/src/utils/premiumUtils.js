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
  
  return Boolean(premiumExpiresAt && premiumExpiresAt > now);
};

/**
 * Calculate remaining days of premium subscription.
 * @param {Object} user - User object
 * @returns {number} Remaining days (0 = expired/not premium)
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
    weekly: 'Tuần',
    monthly: 'Tháng',
    yearly: 'Năm',
  };
  return planNames[plan] || '';
};

export const formatPremiumDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const getPremiumSummary = (user) => {
  const isActive = isPremiumActive(user);
  const planName = getPlanName(user?.premiumPlan);
  const remainingDays = getRemainingDays(user);
  const expiresAtLabel = isActive ? formatPremiumDate(user?.premiumExpiresAt) : '';
  const title = isActive ? `Premium ${planName || ''}`.trim() : 'Thành viên thường';
  const statusText = isActive
    ? `Premium ${planName ? `${planName} ` : ''}${remainingDays} ngày`
    : '';

  return {
    isActive,
    planKey: user?.premiumPlan || null,
    planName,
    remainingDays,
    expiresAt: isActive ? user?.premiumExpiresAt || null : null,
    expiresAtLabel,
    title,
    statusText,
    compactText: isActive
      ? `Gói ${planName || 'Premium'} • còn ${remainingDays} ngày`
      : 'Thành viên thường',
  };
};

/**
 * Get premium status text
 * @param {Object} user - User object
 * @returns {string} Status text (e.g., "Premium Tháng 30 ngày")
 */
export const getPremiumStatusText = (user) => {
  return getPremiumSummary(user).statusText;
};
