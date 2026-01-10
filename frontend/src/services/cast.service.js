import apiRequest from "./utils/apiRequest";

// ============================================================================
// Cast Service
// ============================================================================

const castService = {
  /**
   * Lấy thông tin chi tiết của diễn viên và danh sách phim đã đóng
   * @param {string|number} id - Cast _id hoặc tmdbId
   * @param {Object} params - { page?, limit?, sort? }
   * @returns {Promise<Object>} { cast: {}, movies: [], pagination: {} }
   */
  getCastDetails: (id, params = {}) => apiRequest(`/cast/${id}`, { params }),

  /**
   * Lấy thông tin diễn viên theo ID
   * @param {string|number} id - Cast _id hoặc tmdbId
   * @returns {Promise<Object>} Cast object
   */
  getCastById: (id) => apiRequest(`/cast/${id}`),
};

export default castService;
