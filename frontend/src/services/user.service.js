import apiRequest from "./utils/apiRequest";

// ============================================================================
// User Service
// ============================================================================

const userService = {
  /**
   * Lấy profile của user hiện tại (dựa trên token/cookie)
   * @returns {Promise<Object>} User profile object
   */
  getProfile: () => apiRequest(`/users`, { requiresAuth: true }),

  /**
   * Cập nhật profile của user hiện tại
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user profile
   */
  updateProfile: (updates) =>
    apiRequest(`/users`, {
      method: "PUT",
      data: updates,
      requiresAuth: true,
    }),

  /**
   * Thêm movie vào favorites của user hiện tại
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  addToFavorites: (movieId) =>
    apiRequest(`/users/favorites`, {
      method: "POST",
      data: { movieId },
      requiresAuth: true,
    }),

  /**
   * Xóa movie khỏi favorites của user hiện tại
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  removeFromFavorites: (movieId) =>
    apiRequest(`/users/favorites/${movieId}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  /**
   * Lấy danh sách favorites của user hiện tại
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getFavorites: (params = {}) =>
    apiRequest(`/users/favorites`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Thêm movie vào watchlist của user hiện tại
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  addToWatchlist: (movieId) =>
    apiRequest(`/users/watchlist`, {
      method: "POST",
      data: { movieId },
      requiresAuth: true,
    }),

  /**
   * Xóa movie khỏi watchlist của user hiện tại
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  removeFromWatchlist: (movieId) =>
    apiRequest(`/users/watchlist/${movieId}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  /**
   * Lấy danh sách watchlist của user hiện tại
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getWatchlist: (params = {}) =>
    apiRequest(`/users/watchlist`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Lấy lịch sử xem của user hiện tại
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getHistory: (params = {}) =>
    apiRequest(`/users/history`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Lấy danh sách phim đang xem tiếp (continue watching) của user hiện tại
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getContinueWatching: (params = {}) =>
    apiRequest(`/users/continue-watching`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Lấy tiến độ xem phim cho một movie cụ thể
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { success: boolean, data: progress object hoặc null }
   */
  getProgress: (movieId) =>
    apiRequest(`/users/progress/${movieId}`, {
      requiresAuth: true,
    }),

  /**
   * Lưu/Cập nhật tiến độ xem phim cho user hiện tại
   * @param {Object} progressData - { movieId, episodeId?, watchTime, duration }
   * @returns {Promise<Object>} { success: boolean, data: progress object }
   */
  saveProgress: (progressData) =>
    apiRequest(`/users/progress`, {
      method: "POST",
      data: progressData,
      requiresAuth: true,
    }),

  /**
   * Xóa tiến độ xem phim (resume watching) cho một movie cụ thể
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  deleteProgress: (movieId) =>
    apiRequest(`/users/progress/${movieId}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  /**
   * Cập nhật tiến độ xem phim cho user hiện tại (deprecated - dùng saveProgress)
   * @param {Object} progressData - { movieId, episodeId, progress, watchTime }
   * @returns {Promise<Object>} { message }
   */
  updateWatchProgress: (progressData) =>
    apiRequest(`/users/watch-progress`, {
      method: "POST",
      data: progressData,
      requiresAuth: true,
    }),

  /**
   * Nâng cấp lên Premium bằng coin
   * @param {string} plan - 'monthly' hoặc 'yearly'
   * @returns {Promise<Object>} { message, user, remainingCoins }
   */
  upgradePremium: (plan) =>
    apiRequest(`/users/upgrade-premium`, {
      method: "POST",
      data: { plan },
      requiresAuth: true,
    }),

  /**
   * Thêm coin vào tài khoản (for testing/admin)
   * @param {number} amount - Số coin cần thêm
   * @returns {Promise<Object>} { message, user, totalCoins }
   */
  addCoins: (amount) =>
    apiRequest(`/users/add-coins`, {
      method: "POST",
      data: { amount },
      requiresAuth: true,
    }),
};

export default userService;
