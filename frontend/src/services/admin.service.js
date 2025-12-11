import apiRequest from "./utils/apiRequest";

// ============================================================================
// Admin Service - API calls for admin dashboard
// Uses real HTTP API requests to backend
// ============================================================================

/**
 * Movies API
 */
export const movieAPI = {
  /**
   * Get all movies with pagination and filters
   * @param {Object} params - { page?, limit?, search? }
   * @returns {Promise<Array>} Array of movies
   */
  getAll: async (params = {}) => {
    const response = await apiRequest("/admin/movies", {
      params,
      requiresAuth: true,
    });
    // Handle both wrapped response { data: [] } and direct array
    return response;
  },

  /**
   * Get movie by ID
   * @param {string|number} id - Movie ID
   * @returns {Promise<Object>} Movie object or null
   */
  getById: async (id) => {
    const response = await apiRequest(`/admin/movies/${id}`, {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Create new movie
   * @param {Object} movieData - Movie data
   * @returns {Promise<Object>} Created movie object
   */
  create: async (movieData) => {
    const response = await apiRequest("/admin/movies", {
      method: "POST",
      data: movieData,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Update movie
   * @param {string|number} id - Movie ID
   * @param {Object} movieData - Updated movie data
   * @returns {Promise<Object>} Updated movie object
   */
  update: async (id, movieData) => {
    const response = await apiRequest(`/admin/movies/${id}`, {
      method: "PUT",
      data: movieData,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Delete movie
   * @param {string|number} id - Movie ID
   * @returns {Promise<Object>} { success: true }
   */
  delete: async (id) => {
    const response = await apiRequest(`/admin/movies/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response || { success: true };
  },

  /**
   * Search movies
   * @param {string} query - Search query
   * @param {Object} params - { page?, limit? }
   * @returns {Promise<Array>} Array of movies
   */
  search: async (query, params = {}) => {
    const response = await apiRequest("/admin/movies/search", {
      params: { q: query, ...params },
      requiresAuth: true,
    });
    return Array.isArray(response) ? response : response.data || response;
  },
};

/**
 * Users API
 */
export const userAPI = {
  /**
   * Get all users with pagination and filters
   * @param {Object} params - { page?, limit?, search? }
   * @returns {Promise<Array>} Array of users
   */
  getAll: async (params = {}) => {
    const response = await apiRequest("/admin/users", {
      params,
      requiresAuth: true,
    });
    return Array.isArray(response) ? response : response.data || response;
  },

  /**
   * Get user by ID
   * @param {string|number} id - User ID
   * @returns {Promise<Object>} User object or null
   */
  getById: async (id) => {
    const response = await apiRequest(`/admin/users/${id}`, {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user object
   */
  create: async (userData) => {
    const response = await apiRequest("/admin/users", {
      method: "POST",
      data: userData,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Update user
   * @param {string|number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user object
   */
  update: async (id, userData) => {
    const response = await apiRequest(`/admin/users/${id}`, {
      method: "PUT",
      data: userData,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Delete user
   * @param {string|number} id - User ID
   * @returns {Promise<Object>} { success: true }
   */
  delete: async (id) => {
    const response = await apiRequest(`/admin/users/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response || { success: true };
  },

  /**
   * Toggle user status (active/inactive)
   * @param {string|number} id - User ID
   * @returns {Promise<Object>} Updated user object
   */
  toggleStatus: async (id) => {
    const response = await apiRequest(`/admin/users/${id}/toggle-status`, {
      method: "PATCH",
      requiresAuth: true,
    });
    return response.data || response;
  },
};

/**
 * Stats API
 */
export const statsAPI = {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Stats object
   */
  getStats: async () => {
    const response = await apiRequest("/admin/stats", {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get chart data
   * @param {string} type - Chart type (views, genres, growth)
   * @returns {Promise<Object>} Chart data object
   */
  getChartData: async (type) => {
    const response = await apiRequest(`/admin/stats/charts/${type}`, {
      requiresAuth: true,
    });
    return response;
  },
};
