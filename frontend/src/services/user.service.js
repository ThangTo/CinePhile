import apiRequest from "./utils/apiRequest";

// ============================================================================
// User Service
// ============================================================================

const userService = {
  /**
   * Lấy profile của user
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} User profile object
   */
  getProfile: (userId) => apiRequest(`/users/${userId}`, { requiresAuth: true }),

  /**
   * Cập nhật profile của user
   * @param {string|number} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user profile
   */
  updateProfile: (userId, updates) =>
    apiRequest(`/users/${userId}`, {
      method: "PUT",
      data: updates,
      requiresAuth: true,
    }),

  /**
   * Thêm movie vào favorites
   * @param {string|number} userId - User ID
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  addToFavorites: (userId, movieId) =>
    apiRequest(`/users/${userId}/favorites`, {
      method: "POST",
      data: { movieId },
      requiresAuth: true,
    }),

  /**
   * Xóa movie khỏi favorites
   * @param {string|number} userId - User ID
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  removeFromFavorites: (userId, movieId) =>
    apiRequest(`/users/${userId}/favorites/${movieId}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  /**
   * Lấy danh sách favorites
   * @param {string|number} userId - User ID
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getFavorites: (userId, params = {}) =>
    apiRequest(`/users/${userId}/favorites`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Thêm movie vào watchlist
   * @param {string|number} userId - User ID
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  addToWatchlist: (userId, movieId) =>
    apiRequest(`/users/${userId}/watchlist`, {
      method: "POST",
      data: { movieId },
      requiresAuth: true,
    }),

  /**
   * Xóa movie khỏi watchlist
   * @param {string|number} userId - User ID
   * @param {string|number} movieId - Movie ID
   * @returns {Promise<Object>} { message }
   */
  removeFromWatchlist: (userId, movieId) =>
    apiRequest(`/users/${userId}/watchlist/${movieId}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  /**
   * Lấy danh sách watchlist
   * @param {string|number} userId - User ID
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getWatchlist: (userId, params = {}) =>
    apiRequest(`/users/${userId}/watchlist`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Lấy lịch sử xem
   * @param {string|number} userId - User ID
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getHistory: (userId, params = {}) =>
    apiRequest(`/users/${userId}/history`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Lấy danh sách phim đang xem tiếp (continue watching)
   * @param {string|number} userId - User ID
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getContinueWatching: (userId, params = {}) =>
    apiRequest(`/users/${userId}/continue-watching`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Cập nhật tiến độ xem phim
   * @param {string|number} userId - User ID
   * @param {Object} progressData - { movieId, episodeId, progress, watchTime }
   * @returns {Promise<Object>} { message }
   */
  updateWatchProgress: (userId, progressData) =>
    apiRequest(`/users/${userId}/watch-progress`, {
      method: "POST",
      data: progressData,
      requiresAuth: true,
    }),
};

export default userService;
