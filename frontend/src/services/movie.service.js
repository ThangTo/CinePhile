import apiRequest from "./utils/apiRequest";

// ============================================================================
// Movie Service
// ============================================================================

const movieService = {
  /**
   * Lấy tất cả movies với pagination và filters
   * @param {Object} params - { page?, limit?, genre?, country?, year?, sort? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getAll: (params = {}) => apiRequest("/movies", { params }),

  /**
   * Lấy movie theo ID
   * @param {string|number} id - Movie ID
   * @returns {Promise<Object>} Movie object
   */
  getById: (id) => apiRequest(`/movies/${id}`),

  /**
   * Lấy trending movies
   * @param {number} limit - Số lượng movies (default: 10)
   * @returns {Promise<Object>} { data: [] }
   */
  getTrending: (limit = 10) => apiRequest("/movies/trending/now", { params: { limit } }),

  /**
   * Lấy top rated movies
   * @param {number} limit - Số lượng movies (default: 10)
   * @returns {Promise<Object>} { data: [] }
   */
  getTopRated: (limit = 10) => apiRequest("/movies/top/rated", { params: { limit } }),

  /**
   * Lấy new releases
   * @param {number} limit - Số lượng movies (default: 10)
   * @returns {Promise<Object>} { data: [] }
   */
  getNewReleases: (limit = 10) => apiRequest("/movies/new/releases", { params: { limit } }),

  /**
   * Lấy movies theo genre
   * @param {string} genre - Genre name
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getByGenre: (genre, params = {}) => apiRequest(`/movies/genre/${genre}`, { params }),

  /**
   * Tìm kiếm movies
   * @param {string} query - Search query
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  search: (query, params = {}) =>
    apiRequest("/movies/search/query", {
      params: { q: query, ...params },
    }),

  /**
   * Lấy danh sách episodes của movie
   * @param {string|number} id - Movie ID
   * @param {number} season - Season number (optional)
   * @returns {Promise<Object>} { data: [] }
   */
  getEpisodes: (id, season) =>
    apiRequest(`/movies/${id}/episodes`, {
      params: season ? { season } : undefined,
    }),

  /**
   * Lấy cast của movie
   * @param {string|number} id - Movie ID
   * @returns {Promise<Object>} { data: [] }
   */
  getCast: (id) => apiRequest(`/movies/${id}/cast`),

  /**
   * Lấy comments của movie
   * @param {string|number} id - Movie ID
   * @param {Object} params - { page?, limit?, sort? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getComments: (id, params = {}) => apiRequest(`/movies/${id}/comments`, { params }),

  /**
   * Đăng comment cho movie (yêu cầu auth)
   * @param {string|number} id - Movie ID
   * @param {Object} commentData - { content, rating?, episode?, isSpoiler? }
   * @returns {Promise<Object>} Comment object
   */
  postComment: (id, commentData) =>
    apiRequest(`/movies/${id}/comments`, {
      method: "POST",
      data: commentData,
      requiresAuth: true,
    }),

  /**
   * Đánh giá movie (yêu cầu auth)
   * @param {string|number} id - Movie ID
   * @param {number} rating - Rating từ 1-10
   * @returns {Promise<Object>} { message }
   */
  rateMovie: (id, rating) =>
    apiRequest(`/movies/${id}/rate`, {
      method: "POST",
      data: { rating },
      requiresAuth: true,
    }),
};

/**
 * Helper Functions
 * Functions tương thích ngược cho các component đã dùng
 */

/**
 * Fetch movie by ID (Helper function)
 * @param {string|number} movieId - Movie ID
 * @returns {Promise<Object>} Movie object
 */
export async function fetchMovieById(movieId) {
  try {
    const data = await movieService.getById(movieId);
    // Handle response format: could be { data: {...} } or direct object
    return data?.data || data;
  } catch (error) {
    console.error("Error fetching movie:", error);
    throw error;
  }
}

/**
 * Fetch episodes (Helper function)
 * @param {string|number} movieId - Movie ID
 * @param {number} season - Season number (optional)
 * @returns {Promise<Array>} Episodes array
 */
export async function fetchEpisodes(movieId, season) {
  try {
    const data = await movieService.getEpisodes(movieId, season);
    // Handle response format: could be { data: [...] } or direct array
    return data?.data || data || [];
  } catch (error) {
    console.error("Error fetching episodes:", error);
    throw error;
  }
}

export default movieService;
