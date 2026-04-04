const User = require('../models/user.model');
const UserFavorite = require('../models/user_favorite.model');
const UserWatchlist = require('../models/user_watchlist.model');
const UserHistory = require('../models/user_history.model');

const userService = require('../services/user.service');
const authService = require('../services/auth.service');
const adminService = require('../services/admin.service');
const cursorEffectService = require('../services/cursorEffect.service');
const { PLANS } = require('../config/premium.config');
// Helper to get user ID from authenticated request (via auth middleware)
const getUserId = (req) => {
  if (req.user && req.user._id) {
    return req.user._id;
  }
  throw new Error('User ID required');
};

/**
 * GET /users/:id
 * Get current user profile
 * @param {Object} req.user - User object (optional)
 * @returns {Object} User profile object
 */
const getProfile = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /users/:id
 * Update current user profile (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - Profile updates
 * @returns {Object} Updated user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const updates = {};
    // Only allow updating specific fields
    if (req.body.username) updates.username = req.body.username;
    if (req.body.email) updates.email = req.body.email;
    if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) updates.avatar = req.body.avatar;
    if (req.body.gender) updates.gender = req.body.gender;

    const user = await authService.updateProfile(userId, updates, req.file);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users/:id/favorites
 * Add movie to favorites (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { movieId }
 * @returns {Object} { message: string }
 */
const addToFavorites = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { movieId } = req.body;
    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    await UserFavorite.create({
      userId: userId,
      movieId,
    });

    res.status(201).json({ message: 'Added to favorites' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Movie already in favorites' });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /users/:id/favorites/:movieId
 * Remove movie from favorites (requires authentication)
 * @param {string} req.params.movieId - Movie ID
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} { message: string }
 */
const removeFromFavorites = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { movieId } = req.params;
    const result = await UserFavorite.findOneAndDelete({
      userId: userId,
      movieId,
    });

    if (!result) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.status(200).json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /users/:id/favorites
 * Get favorites list (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.query - { page?, limit? }
 * @returns {Object} { data: Array, pagination: Object }
 */
const getFavorites = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const favorites = await UserFavorite.find({ userId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('movieId'); // Assuming 'movieId' ref is 'Movie'

    const total = await UserFavorite.countDocuments({ userId: userId });

    res.status(200).json({
      data: favorites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users/:id/watchlist
 * Add movie to watchlist (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { movieId }
 * @returns {Object} { message: string }
 */
const addToWatchlist = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { movieId } = req.body;
    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    await UserWatchlist.create({
      userId: userId,
      movieId,
    });

    res.status(201).json({ message: 'Added to watchlist' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Movie already in watchlist' });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /users/:id/watchlist/:movieId
 * Remove movie from watchlist (requires authentication)
 * @param {string} req.params.movieId - Movie ID
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} { message: string }
 */
const removeFromWatchlist = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { movieId } = req.params;
    const result = await UserWatchlist.findOneAndDelete({
      userId: userId,
      movieId,
    });

    if (!result) {
      return res.status(404).json({ message: 'Watchlist item not found' });
    }

    res.status(200).json({ message: 'Removed from watchlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /users/:id/watchlist
 * Get watchlist (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.query - { page?, limit? }
 * @returns {Object} { data: Array, pagination: Object }
 */
const getWatchlist = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const watchlist = await UserWatchlist.find({ userId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('movieId');

    const total = await UserWatchlist.countDocuments({ userId: userId });

    res.status(200).json({
      data: watchlist,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /users/:id/history
 * Get watch history (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.query - { page?, limit? }
 * @returns {Object} { data: Array, pagination: Object }
 */
const getHistory = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await userService.getHistory(userId, { page, limit });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /users/continue-watching
 * Get continue watching list (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.query - { page?, limit? }
 * @returns {Object} { data: Array, pagination: Object }
 */
const getContinueWatching = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await userService.getContinueWatching(userId, { page, limit });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /users/progress/:movieId
 * Get watch progress for a specific movie
 * @param {string} req.params.movieId - Movie ID
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} Progress object or null
 */
const getProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    const progress = await userService.getProgress(userId, movieId);

    if (!progress) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users/progress
 * Save/Update watch progress
 * @param {Object} req.body - { movieId, episodeId, watchTime, duration }
 */
const saveProgress = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!req.body.movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    // Gọi Service để xử lý Upsert
    const result = await userService.saveProgress(userId, req.body);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // Validation errors
    if (error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /users/progress/:movieId
 * Delete watch progress/history for a specific movie
 * @param {string} req.params.movieId - Movie ID
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} { success: boolean, message: string }
 */
const deleteProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    const deleted = await userService.deleteProgress(userId, movieId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    res.status(200).json({ success: true, message: 'Progress deleted successfully' });
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users/upgrade-premium
 * Upgrade to premium using coins (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { plan: 'monthly' | 'yearly' }
 * @returns {Object} Updated user object
 */
const upgradePremium = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { plan = 'monthly' } = req.body;

    // Read price from Settings DB first; fall back to config file
    const dbPlan = await adminService.getPremiumPlanPrice(plan);
    const planConfig = dbPlan
      ? { days: dbPlan.days, coins: dbPlan.coins }
      : PLANS[plan];
    if (!planConfig) {
      return res.status(400).json({ message: 'Invalid plan. Use "weekly", "monthly" or "yearly"' });
    }

    const requiredCoins = planConfig.coins;
    if (!requiredCoins) {
      return res.status(400).json({ message: 'Invalid plan. Use "weekly", "monthly" or "yearly"' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already premium and still valid
    const now = new Date();
    if (user.role === 'premium' && user.premiumExpiresAt && user.premiumExpiresAt > now) {
      return res.status(400).json({
        message: `Bạn đã là thành viên Premium ${
          user.premiumPlan || ''
        }. Gói còn hiệu lực đến ${user.premiumExpiresAt.toLocaleDateString('vi-VN')}`,
      });
    }

    // Check if user has enough coins
    if (user.coin < requiredCoins) {
      return res.status(400).json({
        message: `Không đủ coin. Cần ${requiredCoins} coin nhưng bạn chỉ có ${user.coin} coin`,
        required: requiredCoins,
        current: user.coin,
      });
    }

    // Calculate expiry date based on plan
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planConfig.days);

    // Deduct coins and upgrade to premium
    user.coin -= requiredCoins;
    user.role = 'premium';
    user.premiumPlan = plan;
    user.premiumExpiresAt = expiryDate;
    // Premium: mặc định bật glitter nếu chưa có effect
    if (!user.cursorEffectId || user.cursorEffectId === 'none') {
      user.cursorEffectId = 'glitter';
    }

    await user.save();

    res.status(200).json({
      message: `Nâng cấp Premium thành công! Đã trừ ${requiredCoins} coin`,
      user: user,
      remainingCoins: user.coin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users/add-coins
 * Add coins to user account (for testing/admin)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { amount: number }
 * @returns {Object} Updated user object
 */
const addCoins = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số coin phải lớn hơn 0' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.coin = (user.coin || 0) + amount;
    await user.save();

    res.status(200).json({
      message: `Đã thêm ${amount} coin vào tài khoản`,
      user: user,
      totalCoins: user.coin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getHistory,
  getContinueWatching,
  getProgress,
  saveProgress,
  deleteProgress,
  upgradePremium,
  addCoins,
};
