const CursorEffect = require('../models/cursorEffect.model');
const User = require('../models/user.model');
const { isPremiumActive } = require('../utils/premiumUtils');

const createCursorEffectError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Lấy danh sách tất cả hiệu ứng (public — không cần auth)
 * @returns {Promise<Array>}
 */
const getAllEffects = async () => {
  return CursorEffect.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
};

/**
 * Lấy danh sách hiệu ứng kèm trạng thái owned của user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getEffectsWithOwnership = async (userId) => {
  const [effects, user] = await Promise.all([
    CursorEffect.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    userId ? User.findById(userId) : null,
  ]);

  await syncUserCursorEffectAccess(user, { effects });

  const isPremium = user ? isPremiumActive(user) : false;

  return effects.map((effect) => {
    const isOwned = checkOwnership(effect, user, isPremium);
    const isEquipped = Boolean(user && isOwned && user.cursorEffectId === effect.effectId);

    return {
      ...effect,
      isOwned,
      isEquipped,
      canEquip: isOwned,
      canBuy: !isOwned && canBuy(effect, user, isPremium),
    };
  });
};

/**
 * Kiểm tra user có sở hữu effect không
 */
const checkOwnership = (effect, user, isPremium) => {
  // Base: không hiệu ứng luôn owned
  if (effect.effectId === 'none') return true;
  if (!user) return false;

  // Premium users sở hữu mặc định các effect premium
  if (effect.unlockType === 'premium' && isPremium) return true;

  // Shop items: kiểm tra ownedEffectIds
  if (user.ownedCursorEffects && user.ownedCursorEffects.includes(effect.effectId)) {
    return true;
  }

  return false;
};

/**
 * Kiểm tra user có thể mua effect không
 */
const canBuy = (effect, user, isPremium) => {
  if (!user) return false;
  if (effect.effectId === 'none') return false;
  if (effect.unlockType === 'premium') return isPremium;
  if (effect.unlockType === 'event') return false; // event-based, không mua được
  return true;
};

/**
 * Đảm bảo effect đang trang bị vẫn hợp lệ với quyền hiện tại của user.
 * Premium hết hạn hoặc effect bị vô hiệu hóa thì trả về "none".
 * @param {Object|null} user
 * @param {Object} [options]
 * @param {Array<Object>} [options.effects]
 * @returns {Promise<Object|null>}
 */
const syncUserCursorEffectAccess = async (user, options = {}) => {
  if (!user) return null;

  const currentEffectId = user.cursorEffectId || 'none';
  if (currentEffectId === 'none') return user;

  const effect =
    options.effects?.find((item) => item.effectId === currentEffectId) ||
    (await CursorEffect.findOne({ effectId: currentEffectId, isActive: true }).lean());

  const isPremium = isPremiumActive(user);
  if (effect && checkOwnership(effect, user, isPremium)) {
    return user;
  }

  user.cursorEffectId = 'none';

  if (typeof user.save === 'function') {
    await user.save();
  } else if (user._id) {
    await User.updateOne({ _id: user._id }, { $set: { cursorEffectId: 'none' } });
  }

  return user;
};

/**
 * Mua hiệu ứng bằng coin
 * @param {string} userId
 * @param {string} effectId
 * @returns {Promise<Object>}
 */
const purchaseEffect = async (userId, effectId) => {
  const effect = await CursorEffect.findOne({ effectId, isActive: true }).lean();
  if (!effect) {
    throw createCursorEffectError('Hiệu ứng không tồn tại', 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createCursorEffectError('User not found', 404);
  }

  const isPremium = isPremiumActive(user);

  if (!canBuy(effect, user, isPremium)) {
    if (effect.unlockType === 'event') {
      throw createCursorEffectError(
        'Hiệu ứng này không thể mua. Hãy hoàn thành điều kiện sự kiện để mở khóa.',
        400
      );
    }
    throw createCursorEffectError('Bạn không thể mua hiệu ứng này', 400);
  }

  // Kiểm tra đã sở hữu chưa
  if (checkOwnership(effect, user, isPremium)) {
    throw createCursorEffectError('Bạn đã sở hữu hiệu ứng này', 409);
  }

  // Kiểm tra coin
  if (user.coin < effect.price) {
    throw createCursorEffectError(
      `Không đủ coin. Cần ${effect.price} coin, bạn có ${user.coin} coin`,
      400
    );
  }

  // Trừ coin và thêm vào owned
  user.coin -= effect.price;
  user.ownedCursorEffects = user.ownedCursorEffects || [];
  user.ownedCursorEffects.push(effectId);
  await user.save();

  return {
    message: `Đã mua thành công hiệu ứng "${effect.nameVi}"`,
    remainingCoins: user.coin,
    effectId,
  };
};

/**
 * Trang bị hiệu ứng cho user
 * @param {string} userId
 * @param {string} effectId
 * @returns {Promise<Object>}
 */
const equipEffect = async (userId, effectId) => {
  const effect = await CursorEffect.findOne({ effectId, isActive: true }).lean();
  if (!effect) {
    throw createCursorEffectError('Hiệu ứng không tồn tại', 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createCursorEffectError('User not found', 404);
  }

  const isPremium = isPremiumActive(user);

  if (!checkOwnership(effect, user, isPremium)) {
    throw createCursorEffectError('Bạn chưa sở hữu hiệu ứng này', 400);
  }

  user.cursorEffectId = effectId;
  await user.save();

  return {
    message: `Đã trang bị hiệu ứng "${effect.nameVi}"`,
    cursorEffectId: effectId,
  };
};

/**
 * Tạo seed data cho cursor effects
 * @returns {Promise<void>}
 */
const seedEffects = async () => {
  const effects = [
    {
      effectId: 'none',
      name: 'No Effect',
      nameVi: 'Không hiệu ứng',
      description: 'Tắt hoàn toàn hiệu ứng con trỏ chuột',
      descriptionVi: 'Tắt hoàn toàn hiệu ứng con trỏ chuột',
      price: 0,
      requiredRole: 'user',
      unlockType: 'shop',
      sortOrder: 0,
    },
    {
      effectId: 'glitter',
      name: 'Glitter Trail',
      nameVi: 'Kim Tuyến Lấp Lánh',
      description: 'Hạt cát vàng/cam lấp lánh theo con trỏ chuột',
      descriptionVi: 'Hạt cát vàng/cam lấp lánh theo con trỏ chuột. Hiệu ứng độc quyền dành cho Premium.',
      price: 0,
      requiredRole: 'premium',
      unlockType: 'premium',
      sortOrder: 1,
    },
    {
      effectId: 'galaxy',
      name: 'Galaxy Trail',
      nameVi: 'Dải Ngân Hà',
      description: 'Hạt tím/xanh hồng với đuôi sao băng dài',
      descriptionVi: 'Hạt tím xanh dương pha chút hồng, vẽ ra những vệt sáng dài như đuôi sao băng vũ trụ.',
      price: 500,
      requiredRole: 'user',
      unlockType: 'shop',
      sortOrder: 10,
    },
    {
      effectId: 'firefly',
      name: 'Firefly Trail',
      nameVi: 'Đom Đóm Bay',
      description: 'Chấm xanh vàng nhỏ bay lên cao rồi tắt từ từ',
      descriptionVi: 'Những chấm xanh vàng nhỏ như đom đóm, bay nhẹ nhàng lên cao rồi tắt dần.',
      price: 300,
      requiredRole: 'user',
      unlockType: 'shop',
      sortOrder: 11,
    },
    {
      effectId: 'crystal',
      name: 'Snowflake',
      nameVi: 'Bông Tuyết',
      description: 'Bông tuyết 6 cánh với nhánh phụ phức tạp, phát sáng lạnh lung linh',
      descriptionVi: 'Bông tuyết 6 cánh chân thật với nhánh phụ tỏa sáng, xoay nhẹ nhàng theo con trỏ chuột.',
      price: 400,
      requiredRole: 'user',
      unlockType: 'shop',
      sortOrder: 12,
    },
    {
      effectId: 'sakura',
      name: 'Sakura Petals',
      nameVi: 'Cánh Hoa Anh Đào',
      description: 'Cánh hoa hồng rơi chậm lệch hướng',
      descriptionVi: 'Những cánh hoa anh đào hồng nhạt rơi chậm rãi theo con trỏ chuột.',
      price: 450,
      requiredRole: 'user',
      unlockType: 'shop',
      sortOrder: 13,
    },
  ];

  // Upsert all effects (update if exists, insert if not)
  await Promise.all(
    effects.map((e) =>
      CursorEffect.updateOne({ effectId: e.effectId }, { $set: e }, { upsert: true })
    )
  );
};

module.exports = {
  getAllEffects,
  getEffectsWithOwnership,
  purchaseEffect,
  equipEffect,
  seedEffects,
  checkOwnership,
  syncUserCursorEffectAccess,
};
