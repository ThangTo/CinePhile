const User = require('../models/user.model');
const UserFavorite = require('../models/user_favorite.model');
const UserWatchlist = require('../models/user_watchlist.model');
const UserHistory = require('../models/user_history.model');

const userService = require('../services/user.service');
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
    if (req.body.avatar) updates.avatar = req.body.avatar;
    if (req.body.gender) updates.gender = req.body.gender;
    console.log(updates);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true },
    );
    console.log('user', user);

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
    const skip = (page - 1) * limit;

    const history = await UserHistory.find({ userId: userId })
      .sort({ lastWatchedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('movieId')
      .populate('episodeId');

    const total = await UserHistory.countDocuments({ userId: userId });

    res.status(200).json({
      data: history,
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
 * POST /users/history/sync (hoặc /progress)
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
  } catch (error){
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
  saveProgress
};