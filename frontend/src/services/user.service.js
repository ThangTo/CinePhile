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
   * Cập nhật tiến độ xem phim cho user hiện tại
   * @param {Object} progressData - { movieId, episodeId, progress, watchTime }
   * @returns {Promise<Object>} { message }
   */
  updateWatchProgress: (progressData) =>
    apiRequest(`/users/watch-progress`, {
      method: "POST",
      data: progressData,
      requiresAuth: true,
    }),
};

export default userService;
