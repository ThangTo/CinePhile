const CursorEffect = require('../models/cursorEffect.model');
const User = require('../models/user.model');

const DEFAULT_ADMIN_PREMIUM_DAYS = 30;
const VALID_PREMIUM_PLAN_KEYS = ['weekly', 'monthly', 'yearly'];
const FALLBACK_PREMIUM_EFFECT_IDS = ['glitter'];

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isPremiumActive = (user, now = new Date()) => {
  if (!user || user.role !== 'premium') return false;
  const expiresAt = parseDate(user.premiumExpiresAt);
  return Boolean(expiresAt && expiresAt > now);
};

const getDefaultPremiumExpiry = (now = new Date()) =>
  addDays(now, DEFAULT_ADMIN_PREMIUM_DAYS);

const getPremiumEffectIds = async () => {
  try {
    const effects = await CursorEffect.find({ unlockType: 'premium' })
      .select('effectId')
      .lean();
    const effectIds = effects.map((effect) => effect.effectId).filter(Boolean);
    return effectIds.length > 0 ? effectIds : FALLBACK_PREMIUM_EFFECT_IDS;
  } catch (_error) {
    return FALLBACK_PREMIUM_EFFECT_IDS;
  }
};

const toPlainUser = (user) => (user?.toObject ? user.toObject() : { ...(user || {}) });

const normalizePremiumSnapshot = (user, now = new Date()) => {
  const snapshot = toPlainUser(user);
  const active = isPremiumActive(snapshot, now);

  if (!active && snapshot.role === 'premium') {
    snapshot.role = 'user';
    snapshot.premiumPlan = null;
    snapshot.premiumExpiresAt = null;
  }

  snapshot.isPremium = active;
  return snapshot;
};

const normalizePremiumUser = async (user, options = {}) => {
  if (!user) return null;

  const { now = new Date(), save = true } = options;
  if (isPremiumActive(user, now) || user.role !== 'premium') {
    return user;
  }

  const premiumEffectIds = await getPremiumEffectIds();
  user.role = 'user';
  user.premiumPlan = null;
  user.premiumExpiresAt = null;

  if (premiumEffectIds.includes(user.cursorEffectId)) {
    user.cursorEffectId = 'none';
  }

  if (save && typeof user.save === 'function') {
    await user.save();
  }

  return user;
};

const buildAdminPremiumUpdate = (userData = {}, now = new Date(), options = {}) => {
  const { defaultMissingPremiumFields = true } = options;
  const nextData = { ...userData };
  if (!Object.prototype.hasOwnProperty.call(nextData, 'role')) return nextData;

  if (nextData.role !== 'premium') {
    nextData.premiumPlan = null;
    nextData.premiumExpiresAt = null;
    return nextData;
  }

  const hasPremiumPlan = Object.prototype.hasOwnProperty.call(nextData, 'premiumPlan');
  const planKey = hasPremiumPlan
    ? nextData.premiumPlan || 'monthly'
    : defaultMissingPremiumFields
      ? 'monthly'
      : null;
  if (planKey) {
    if (!VALID_PREMIUM_PLAN_KEYS.includes(planKey)) {
      throw new Error('Invalid premium plan');
    }
    nextData.premiumPlan = planKey;
  } else {
    delete nextData.premiumPlan;
  }

  const hasPremiumExpiry = Object.prototype.hasOwnProperty.call(nextData, 'premiumExpiresAt');
  const expiresAt =
    parseDate(nextData.premiumExpiresAt) ||
    (hasPremiumExpiry || defaultMissingPremiumFields ? getDefaultPremiumExpiry(now) : null);
  if (expiresAt) {
    if (expiresAt <= now) {
      throw new Error('Premium expiry must be in the future');
    }
    nextData.premiumExpiresAt = expiresAt;
  } else {
    delete nextData.premiumExpiresAt;
  }

  return nextData;
};

const buildExpiredPremiumFilter = (now = new Date()) => ({
  role: 'premium',
  $or: [
    { premiumExpiresAt: { $exists: false } },
    { premiumExpiresAt: null },
    { premiumExpiresAt: { $lte: now } },
  ],
});

const expirePremiumUsers = async (now = new Date()) => {
  const expiredFilter = buildExpiredPremiumFilter(now);
  const [expiredUsers, premiumEffectIds] = await Promise.all([
    User.find(expiredFilter).select('_id cursorEffectId').lean(),
    getPremiumEffectIds(),
  ]);

  const expiredUserIds = expiredUsers.map((user) => user._id);
  if (expiredUserIds.length === 0) {
    return { matched: 0, modified: 0, cursorReset: 0 };
  }

  const roleResult = await User.updateMany(
    { _id: { $in: expiredUserIds } },
    {
      $set: {
        role: 'user',
        premiumPlan: null,
        premiumExpiresAt: null,
      },
    },
  );

  let cursorReset = 0;
  if (premiumEffectIds.length > 0) {
    const cursorResult = await User.updateMany(
      {
        _id: { $in: expiredUserIds },
        cursorEffectId: { $in: premiumEffectIds },
      },
      { $set: { cursorEffectId: 'none' } },
    );
    cursorReset = cursorResult.modifiedCount || 0;
  }

  return {
    matched: expiredUserIds.length,
    modified: roleResult.modifiedCount || 0,
    cursorReset,
  };
};

module.exports = {
  DEFAULT_ADMIN_PREMIUM_DAYS,
  VALID_PREMIUM_PLAN_KEYS,
  buildAdminPremiumUpdate,
  expirePremiumUsers,
  getDefaultPremiumExpiry,
  isPremiumActive,
  normalizePremiumSnapshot,
  normalizePremiumUser,
};
