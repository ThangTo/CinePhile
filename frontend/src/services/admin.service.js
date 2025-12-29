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

  /**
   * Crawl movies by page range with Server-Sent Events
   * @param {Object} params - { startPage, endPage? }
   * @param {Function} onProgress - Callback for progress updates
   * @returns {Promise<Object>} Final result
   */
  crawlByPage: async (params, onProgress) => {
    // Import axios để lấy baseURL
    const http = (await import("lib/axios")).default;
    const baseURL = http.defaults.baseURL || process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
    
    // Lấy token từ auth-storage
    let token = null;
    try {
      const authStorage = require("lib/auth-storage");
      token = authStorage.getToken();
    } catch (e) {
      token = localStorage.getItem('token');
    }
    
    const url = `${baseURL}/admin/movies/crawl/by-page`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new Promise((resolve, reject) => {
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (onProgress) {
                    onProgress(data);
                  }
                  if (data.type === 'complete') {
                    resolve(data);
                    return;
                  } else if (data.type === 'error') {
                    reject(new Error(data.message));
                    return;
                  }
                } catch (err) {
                  console.error('Error parsing SSE data:', err);
                }
              }
            }
          }
        } catch (error) {
          reject(error);
        }
      };

      processStream();
    });
  },

  /**
   * Search movies for crawling
   * @param {string} movieName - Movie name to search
   * @returns {Promise<Array>} Array of search results
   */
  searchForCrawl: async (movieName) => {
    const response = await apiRequest("/admin/movies/crawl/search", {
      method: "POST",
      data: { movieName },
      requiresAuth: true,
    });
    return response.movies || [];
  },

  /**
   * Crawl a single movie by slug
   * @param {string} slug - Movie slug
   * @returns {Promise<Object>} Crawled movie data
   */
  crawlBySlug: async (slug) => {
    const response = await apiRequest("/admin/movies/crawl/by-slug", {
      method: "POST",
      data: { slug },
      requiresAuth: true,
    });
    return response;
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

// ... (previous code)

/**
 * Comments API
 */
export const commentAPI = {
  /**
   * Get all comments with pagination and filters
   * @param {Object} params - { page?, limit?, search?, status? }
   * @returns {Promise<Array>} Array of comments
   */
  getAll: async (params = {}) => {
    const response = await apiRequest("/admin/comments", {
      params,
      requiresAuth: true,
    });
    return response; // Return full response to get pagination
  },

  /**
   * Delete comment
   * @param {string|number} id - Comment ID
   * @returns {Promise<Object>} { success: true }
   */
  delete: async (id) => {
    const response = await apiRequest(`/admin/comments/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response || { success: true };
  },

  /**
   * Update comment status (allow, ban, dismiss)
   * @param {string|number} id - Comment ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated comment object
   */
  updateStatus: async (id, status) => {
    const response = await apiRequest(`/admin/comments/${id}/status`, {
      method: "PATCH",
      data: { status },
      requiresAuth: true,
    });
    return response.data || response;
  },
};

/**
 * Stats API
 */
export const statsAPI = {
// ... (rest of the file)
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
