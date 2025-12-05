const UserHistory = require('../models/user_history.model');

/**
 * Add movie to favorites
 * @param {string|number} userId - User ID
 * @param {string|number} movieId - Movie ID
 * @returns {Promise<Object>} { message: string }
 */
const addToFavorites = async (movieId) => {
  // TODO: Implement
};

/**
 * Remove movie from favorites
 * @param {string|number} userId - User ID
 * @param {string|number} movieId - Movie ID
 * @returns {Promise<Object>} { message: string }
 */
const removeFromFavorites = async (movieId) => {
  // TODO: Implement
};

/**
 * Get favorites list
 * @param {string|number} userId - User ID
 * @param {Object} filters - { page?, limit? }
 * @returns {Promise<Object>} { data: Array, pagination: Object }
 */
const getFavorites = async (filters) => {
  // TODO: Implement
};

/**
 * Add movie to watchlist
 * @param {string|number} userId - User ID
 * @param {string|number} movieId - Movie ID
 * @returns {Promise<Object>} { message: string }
 */
const addToWatchlist = async (movieId) => {
  // TODO: Implement
};

/**
 * Remove movie from watchlist
 * @param {string|number} userId - User ID
 * @param {string|number} movieId - Movie ID
 * @returns {Promise<Object>} { message: string }
 */
const removeFromWatchlist = async (movieId) => {
  // TODO: Implement
};

/**
 * Get watchlist
 * @param {string|number} userId - User ID
 * @param {Object} filters - { page?, limit? }
 * @returns {Promise<Object>} { data: Array, pagination: Object }
 */
const getWatchlist = async (filters) => {
  // TODO: Implement
};

/**
 * Get watch history
 * @param {string|number} userId - User ID
 * @param {Object} filters - { page?, limit? }
 * @returns {Promise<Object>} { data: Array, pagination: Object }
 */
const getHistory = async (userId, { page = 1, limit = 10 }) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const [history, total] = await Promise.all([
    UserHistory.find({ userId })
      .sort({ lastWatchedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('movieId', 'name slug thumb_url poster_url')
      .populate('episodeId', 'name slug filename'),
    UserHistory.countDocuments({ userId })
  ]);
  return {
    data: history,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Save/Sync Progress (Lưu tiến độ xem phim)
 * @param {string} userId - ID của user
 * @param {Object} data - Dữ liệu { movieId, episodeId, watchTime, duration }
 */
const saveProgress = async (userId, { movieId, episodeId, watchTime, duration }) => {
  // 1. Tính phần trăm tiến độ (0-100%)
  let progressPercent = 0;
  if (duration > 0) {
    progressPercent = (watchTime / duration) * 100;
    // Giới hạn max là 100% để tránh lỗi số học
    if (progressPercent > 100) progressPercent = 100;
  }

  // 2. Thực hiện Upsert (Update hoặc Insert)
  // Tìm theo [userId + movieId]. Nếu có rồi thì cập nhật, chưa có thì tạo mới.
  const history = await UserHistory.findOneAndUpdate(
    { userId: userId, movieId: movieId }, 
    {
      episodeId: episodeId,
      watchTime: watchTime,
      duration: duration,
      progress: progressPercent,
      lastWatchedAt: Date.now() // Cập nhật thời gian xem mới nhất
    },
    { 
      new: true,    // Trả về dữ liệu mới sau khi update
      upsert: true, // Quan trọng: Chưa có thì tạo mới
      setDefaultsOnInsert: true 
    }
  );
  return history;
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getHistory,
  saveProgress
};