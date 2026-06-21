import apiRequest from "./utils/apiRequest";
import http from "lib/axios";

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
   * Toggle movie hidden status (hide/unhide)
   * @param {string|number} id - Movie ID
   * @returns {Promise<Object>} { success: true, isHidden: boolean, message: string }
   */
  toggleHidden: async (id) => {
    const response = await apiRequest(`/admin/movies/${id}/toggle-hidden`, {
      method: "PATCH",
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Toggle movie featured status (pin/unpin to banner)
   * @param {string|number} id - Movie ID
   * @returns {Promise<Object>} { success: true, isFeatured: boolean, message: string }
   */
  toggleFeatured: async (id) => {
    const response = await apiRequest(`/admin/movies/${id}/toggle-featured`, {
      method: "PATCH",
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Hide all movies
   * @returns {Promise<Object>} { success: true, count: number, message: string }
   */
  hideAll: async () => {
    const response = await apiRequest("/admin/movies/hide-all", {
      method: "POST",
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Unhide all movies
   * @returns {Promise<Object>} { success: true, count: number, message: string }
   */
  unhideAll: async () => {
    const response = await apiRequest("/admin/movies/unhide-all", {
      method: "POST",
      requiresAuth: true,
    });
    return response.data || response;
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
   * @param {AbortController} abortController - Optional AbortController to cancel the request
   * @returns {Promise<Object>} Final result
   */
  crawlByPage: async (params, onProgress, abortController = null) => {
    // Import axios để lấy baseURL
    const http = (await import("lib/axios")).default;
    const baseURL =
      http.defaults.baseURL || process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

    // Lấy token từ auth-storage
    let token = null;
    try {
      const authStorage = require("lib/auth-storage");
      token = authStorage.getToken();
    } catch (e) {
      token = localStorage.getItem("token");
    }

    const url = `${baseURL}/admin/movies/crawl/by-page`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
      credentials: "include",
      signal: abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new Promise((resolve, reject) => {
      const processStream = async () => {
        try {
          while (true) {
            // Kiểm tra nếu đã bị hủy
            if (abortController?.signal.aborted) {
              reader.cancel();
              reject(new Error("Crawl đã bị hủy bởi người dùng"));
              return;
            }

            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (onProgress) {
                    onProgress(data);
                  }
                  if (data.type === "complete") {
                    resolve(data);
                    return;
                  } else if (data.type === "error") {
                    reject(new Error(data.message));
                    return;
                  }
                } catch (err) {
                  console.error("Error parsing SSE data:", err);
                }
              }
            }
          }
        } catch (error) {
          // Nếu lỗi do abort, không reject nữa vì đã reject ở trên
          if (error.name === "AbortError" || abortController?.signal.aborted) {
            return;
          }
          reject(error);
        }
      };

      processStream();
    });
  },

  /**
   * Search movies for crawling (by name) with advanced filters
   * @param {Object} params - { movieName, page, sort_field, sort_type, sort_lang, category, country, year, limit }
   * @returns {Promise<Array>} Array of search results
   */
  searchForCrawl: async (params) => {
    const response = await apiRequest("/admin/movies/crawl/search", {
      method: "POST",
      data: params,
      requiresAuth: true,
    });
    return response.movies || [];
  },

  /**
   * Search movies by genre/category for crawling
   * @param {Object} params - { type_list, page, sort_field, sort_type, sort_lang, country, year, limit }
   * @returns {Promise<Array>} Array of movies
   */
  searchByGenre: async (params) => {
    const response = await apiRequest("/admin/movies/crawl/by-genre", {
      method: "POST",
      data: params,
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

  /**
   * Get movies with ongoing/upcoming status for episode update
   * @param {Object} params - { page?, limit?, search? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getUpdatingMovies: async (params = {}) => {
    const response = await apiRequest("/admin/movies/updating", {
      params,
      requiresAuth: true,
    });
    return response;
  },

  /**
   * Update episodes for selected movies with Server-Sent Events
   * @param {Array<string>} movieIds - Array of movie IDs
   * @param {Boolean} onlyNewEpisodes - If true, only update new episodes
   * @param {Function} onProgress - Callback for progress updates
   * @param {AbortController} abortController - Optional AbortController to cancel the request
   * @returns {Promise<Object>} Final result
   */
  updateEpisodes: async (movieIds, onlyNewEpisodes, onProgress, abortController = null) => {
    // Import axios để lấy baseURL
    const http = (await import("lib/axios")).default;
    const baseURL =
      http.defaults.baseURL || process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

    // Lấy token từ auth-storage
    let token = null;
    try {
      const authStorage = require("lib/auth-storage");
      token = authStorage.getToken();
    } catch (e) {
      token = localStorage.getItem("token");
    }

    const url = `${baseURL}/admin/movies/update-episodes`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movieIds, onlyNewEpisodes }),
      credentials: "include",
      signal: abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new Promise((resolve, reject) => {
      const processStream = async () => {
        try {
          while (true) {
            // Kiểm tra nếu đã bị hủy
            if (abortController?.signal.aborted) {
              reader.cancel();
              reject(new Error("Cập nhật tập đã bị hủy bởi người dùng"));
              return;
            }

            const { done, value } = await reader.read();

            if (done) {
              // Xử lý phần buffer còn lại
              if (buffer.trim()) {
                const lines = buffer.split("\n");
                for (const line of lines) {
                  if (line.trim() && line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (onProgress) {
                        onProgress(data);
                      }
                      if (data.type === "complete") {
                        resolve(data);
                        return;
                      } else if (data.type === "error") {
                        reject(new Error(data.message));
                        return;
                      }
                    } catch (err) {
                      console.error("Error parsing SSE data:", err);
                    }
                  }
                }
              }
              break;
            }

            // Decode và xử lý ngay lập tức
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Giữ lại dòng cuối chưa hoàn chỉnh
            buffer = lines.pop() || "";

            // Xử lý từng dòng ngay lập tức
            for (const line of lines) {
              if (line.trim() && line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  // Gọi callback ngay lập tức để cập nhật UI
                  if (onProgress) {
                    onProgress(data);
                  }
                  // Nếu là complete hoặc error, resolve/reject ngay
                  if (data.type === "complete") {
                    resolve(data);
                    return;
                  } else if (data.type === "error") {
                    reject(new Error(data.message));
                    return;
                  }
                } catch (err) {
                  console.error("Error parsing SSE data:", err, "Line:", line);
                }
              }
            }
          }
        } catch (error) {
          // Nếu lỗi do abort, không reject nữa vì đã reject ở trên
          if (error.name === "AbortError" || abortController?.signal.aborted) {
            return;
          }
          reject(error);
        }
      };

      processStream();
    });
  },

  /**
   * Update quality for CAM movies (upgrade to HD)
   * @param {Array<string>} movieIds - Array of movie IDs to update
   * @param {Function} onProgress - Callback for progress updates
   * @param {AbortController} abortController - Optional abort controller
   * @returns {Promise<Object>} Update result
   */
  updateQuality: async (movieIds, onProgress, abortController = null) => {
    // Import axios để lấy baseURL
    const http = (await import("lib/axios")).default;
    const baseURL =
      http.defaults.baseURL || process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

    // Lấy token từ auth-storage
    let token = null;
    try {
      const authStorage = require("lib/auth-storage");
      token = authStorage.getToken();
    } catch (e) {
      token = localStorage.getItem("token");
    }

    const url = `${baseURL}/admin/movies/update-quality`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movieIds }),
      credentials: "include",
      signal: abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new Promise((resolve, reject) => {
      const processStream = async () => {
        try {
          while (true) {
            // Kiểm tra nếu đã bị hủy
            if (abortController?.signal.aborted) {
              reader.cancel();
              reject(new Error("Cập nhật chất lượng đã bị hủy bởi người dùng"));
              return;
            }

            const { done, value } = await reader.read();

            if (done) {
              // Xử lý phần buffer còn lại
              if (buffer.trim()) {
                const lines = buffer.split("\n");
                for (const line of lines) {
                  if (line.trim() && line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (onProgress) {
                        onProgress(data);
                      }
                      if (data.type === "complete") {
                        resolve(data);
                        return;
                      } else if (data.type === "error") {
                        reject(new Error(data.message));
                        return;
                      }
                    } catch (err) {
                      console.error("Error parsing SSE data:", err);
                    }
                  }
                }
              }
              break;
            }

            // Decode và xử lý ngay lập tức
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Giữ lại dòng cuối chưa hoàn chỉnh
            buffer = lines.pop() || "";

            // Xử lý từng dòng ngay lập tức
            for (const line of lines) {
              if (line.trim() && line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  // Gọi callback ngay lập tức để cập nhật UI
                  if (onProgress) {
                    onProgress(data);
                  }
                  // Nếu là complete hoặc error, resolve/reject ngay
                  if (data.type === "complete") {
                    resolve(data);
                    return;
                  } else if (data.type === "error") {
                    reject(new Error(data.message));
                    return;
                  }
                } catch (err) {
                  console.error("Error parsing SSE data:", err, "Line:", line);
                }
              }
            }
          }
        } catch (error) {
          // Nếu lỗi do abort, không reject nữa vì đã reject ở trên
          if (error.name === "AbortError" || abortController?.signal.aborted) {
            return;
          }
          reject(error);
        }
      };

      processStream();
    });
  },

  /**
   * Process movies: Download video from m3u8 and generate thumbnails
   * @param {Array<string>} movieIds - Array of movie IDs
   * @param {boolean} force - Force regenerate thumbnails
   * @param {Function} onProgress - Progress callback
   * @param {AbortController} abortController - Optional abort controller
   * @returns {Promise<Object>} Final result
   */
  processThumbnails: async (movieIds, force = false, onProgress, abortController = null) => {
    // Import axios để lấy baseURL
    const http = (await import("lib/axios")).default;
    const baseURL = http.defaults.baseURL;

    // Lấy token từ auth-storage
    let token = null;
    try {
      const authStorage = require("lib/auth-storage");
      token = authStorage.getToken();
    } catch (e) {
      token = localStorage.getItem("token");
    }

    return new Promise(async (resolve, reject) => {
      // Kiểm tra abort ngay từ đầu
      if (abortController?.signal.aborted) {
        reject(new Error("Request was cancelled"));
        return;
      }

      try {
        const response = await fetch(`${baseURL}/admin/thumbnails/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ movieIds, force }),
          credentials: "include",
          signal: abortController?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processStream = async () => {
          try {
            while (true) {
              // Kiểm tra abort trước mỗi lần đọc
              if (abortController?.signal.aborted) {
                reader.cancel();
                reject(new Error("Request was cancelled"));
                return;
              }

              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.trim() && line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (onProgress) {
                      onProgress(data);
                    }
                    if (data.type === "complete") {
                      resolve(data);
                      return;
                    } else if (data.type === "error") {
                      reject(new Error(data.message));
                      return;
                    }
                  } catch (err) {
                    console.error("Error parsing SSE data:", err, "Line:", line);
                  }
                }
              }
            }
          } catch (error) {
            if (error.name === "AbortError" || abortController?.signal.aborted) {
              return;
            }
            reject(error);
          }
        };

        processStream();
      } catch (error) {
        if (error.name === "AbortError" || abortController?.signal.aborted) {
          reject(new Error("Request was cancelled"));
          return;
        }
        reject(error);
      }
    });
  },
};

/**
 * Users API
 */
export const userAPI = {
  /**
   * Get all users with pagination and filters
   * @param {Object} params - { page?, limit?, search? }
   * @returns {Promise<Object>} { data: [], pagination: {} } or { data: [], pagination: {} }
   */
  getAll: async (params = {}) => {
    const response = await apiRequest("/admin/users", {
      params,
      requiresAuth: true,
    });
    // Handle both paginated response { data: [], pagination: {} } and direct array
    if (response.data && response.pagination) {
      return {
        data: Array.isArray(response.data) ? response.data : [],
        pagination: {
          currentPage: response.pagination.page || 1,
          totalPages: response.pagination.totalPages || 1,
          totalItems: response.pagination.total || 0,
          limit: response.pagination.limit || 20,
        },
      };
    }
    // Fallback for direct array response
    const usersData = Array.isArray(response) ? response : [];
    return {
      data: usersData,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: usersData.length,
        limit: 20,
      },
    };
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
   * Get specific user's watch analytics
   * @param {string|number} id - User ID
   * @returns {Promise<Object>} Analytics data
   */
  getUserAnalytics: async (id) => {
    const response = await apiRequest(`/admin/users/${id}/analytics`, {
      requiresAuth: true,
    });
    return response;
  },

  /**
   * Get specific user's watch streak
   * @param {string} id - User ID
   * @returns {Promise<Object>} Streak data
   */
  getUserStreak: async (id) => {
    const response = await apiRequest(`/admin/users/${id}/streak`, {
      requiresAuth: true,
    });
    return response;
  },

  /**
   * Get user quest summary (daily & weekly)
   * @param {string} id - User ID
   * @returns {Promise<Object>} Quest summary { daily, weekly }
   */
  getUserQuestSummary: async (id) => {
    const response = await apiRequest(`/admin/users/${id}/quests`, {
      requiresAuth: true,
    });
    return response;
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
   * Adjust user coins through the ledger-backed admin endpoint.
   * @param {string|number} id - User ID
   * @param {Object} payload - { amount, note? }
   * @returns {Promise<Object>} { message, user, entry, totalCoins }
   */
  adjustCoins: async (id, payload) => {
    const response = await apiRequest(`/admin/users/${id}/coins`, {
      method: "POST",
      data: payload,
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

  /**
   * Get top trending movies by timeframe with pagination
   * @param {string} timeframe - 'today', 'week', 'month'
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<{data: Array, total: number, page: number, limit: number, totalPages: number}>}
   */
  getTrendingMovies: async (timeframe = "today", page = 1, limit = 10) => {
    const response = await apiRequest("/admin/analytics/trending", {
      params: { timeframe, page, limit },
      requiresAuth: true,
    });
    // response is already the unwrapped body: { data, total, page, limit, totalPages }
    return response;
  },

  /**
   * Get real-time active users count
   * @returns {Promise<Object>} Active users count
   */
  getRealtimeActiveUsers: async () => {
    const response = await apiRequest("/admin/analytics/realtime", {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get total visit stats
   * @returns {Promise<Object>} Visits object {today, week, month}
   */
  getRealtimeVisits: async () => {
    const response = await apiRequest("/admin/analytics/visits", {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get locations of visitors
   * @param {string} period 'realtime', 'today', 'week', 'month'
   * @returns {Promise<Object>} Locations object {success, count, locations}
   */
  getAnalyticsLocations: async (period = "realtime") => {
    const response = await apiRequest("/admin/analytics/locations", {
      params: { period },
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get historical visit data grouped by granularity from MongoDB
   * @param {Object} params - { granularity: 'day'|'week'|'month'|'year', from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
   * @returns {Promise<Object>} { success, granularity, data: [ { label, total, guestCount, userCount } ] }
   */
  getHistoricalVisits: async (params = {}) => {
    const response = await apiRequest("/admin/analytics/historical", {
      params,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get all-time cumulative visitor totals from MongoDB
   * @returns {Promise<Object>} { success, summary: { total, guestCount, userCount, oldestDate, newestDate, totalDays } }
   */
  getAnalyticsSummary: async () => {
    const response = await apiRequest("/admin/analytics/summary", {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get TRUE unique visitor stats per period from PeriodAnalytics
   * @param {Object} params - { granularity: 'day'|'week'|'month'|'year', from, to }
   * @returns {Promise<Object>} { success, data: [ { label, total, guestCount, userCount } ] }
   */
  getUniqueVisits: async (params = {}) => {
    const response = await apiRequest("/admin/analytics/unique", {
      params,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Get all-time unique visitor totals from PeriodAnalytics
   * @returns {Promise<Object>} { success, summary: { total, guestCount, userCount, oldestPeriod, newestPeriod, totalPeriods } }
   */
  getUniqueAnalyticsSummary: async () => {
    const response = await apiRequest("/admin/analytics/unique-summary", {
      requiresAuth: true,
    });
    return response.data || response;
  },
};

/**
 * Settings API
 */
export const settingsAPI = {
  /**
   * Get current theme setting
   * @returns {Promise<string>} Theme name
   */
  getTheme: async () => {
    const response = await apiRequest("/admin/settings/theme", {
      requiresAuth: true,
    });
    return response.theme || response.data?.theme || "default";
  },

  /**
   * Update theme setting
   * @param {string} theme - Theme name
   * @returns {Promise<Object>} Response object
   */
  setTheme: async (theme) => {
    const response = await apiRequest("/admin/settings/theme", {
      method: "PUT",
      data: { theme },
      requiresAuth: true,
    });
    return response;
  },

  /**
   * Get feature permissions
   */
  getFeaturePermissions: async () => {
    const response = await apiRequest("/admin/settings/features", {
      requiresAuth: true,
    });
    return response.data || {};
  },

  /**
   * Update feature permissions
   */
  updateFeaturePermissions: async (features) => {
    const response = await apiRequest("/admin/settings/features", {
      method: "PUT",
      data: { features },
      requiresAuth: true,
    });
    return response.data || {};
  },

  // ─── Pricing ──────────────────────────────────────────────────────────────

  /**
   * Get all coin packages — public endpoint, no auth required
   */
  getCoinPackages: async () => {
    const response = await apiRequest("/settings/coin-packages", {
      requiresAuth: false,
    });
    return response.data || response || [];
  },

  /**
   * Add or update a coin package
   * @param {Object} pkg - { id?, amount, bonus, label, sortOrder? }
   */
  upsertCoinPackage: async (pkg) => {
    const response = await apiRequest("/admin/pricing/coin-packages", {
      method: "POST",
      data: pkg,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Delete a coin package
   * @param {string} id - Package id
   */
  deleteCoinPackage: async (id) => {
    const response = await apiRequest(`/admin/pricing/coin-packages/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Reorder coin packages
   * @param {string[]} orderedIds - IDs in new display order
   */
  reorderCoinPackages: async (orderedIds) => {
    const response = await apiRequest("/admin/pricing/coin-packages/reorder", {
      method: "PUT",
      data: { orderedIds },
      requiresAuth: true,
    });
    return response.data || response;
  },

  // ─── Premium Plans ─────────────────────────────────────────────────────────

  /**
   * Get all premium plans — public endpoint, no auth required
   */
  getPremiumPlans: async () => {
    const response = await apiRequest("/settings/premium-plans", {
      requiresAuth: false,
    });
    return response.data || response || [];
  },

  /**
   * Add or update a premium plan
   * @param {Object} plan - { id?, planKey, label, days, coins, sortOrder? }
   */
  upsertPremiumPlan: async (plan) => {
    const response = await apiRequest("/admin/pricing/premium-plans", {
      method: "POST",
      data: plan,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Delete a premium plan
   * @param {string} id - Plan id
   */
  deletePremiumPlan: async (id) => {
    const response = await apiRequest(`/admin/pricing/premium-plans/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response;
  },

  // ─── Remote Whisper ────────────────────────────────────────────────────────

  /**
   * Get episodes requiring subtitles sorted by request count
   * @param {Object} params - { page, limit }
   */
  getSubtitleRequests: async (params = { page: 1, limit: 20 }) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiRequest(`/admin/subtitles/requests?${query}`, {
      requiresAuth: true,
    });
    return response;
  },

  /**
   * Get current Colab Whisper URL
   * @returns {Promise<string>} Colab Ngrok URL
   */
  getColabUrl: async () => {
    const response = await apiRequest("/admin/colab-url", {
      requiresAuth: true,
    });
    return response.url || "";
  },

  /**
   * Update Colab Whisper URL
   * @param {string} url - New Colab Ngrok URL
   * @returns {Promise<Object>} Response object
   */
  updateColabUrl: async (url) => {
    const response = await apiRequest("/admin/colab-url", {
      method: "POST",
      data: { url },
      requiresAuth: true,
    });
    return response.data || response;
  },
};

/**
 * Playback Metadata API
 */
export const playbackAPI = {
  getEpisodes: async (params = {}) => {
    const response = await apiRequest("/admin/playback/episodes", {
      params,
      requiresAuth: true,
    });
    return response;
  },

  updateEpisode: async (episodeId, data) => {
    const response = await apiRequest(`/admin/playback/episodes/${episodeId}`, {
      method: "PATCH",
      data,
      requiresAuth: true,
    });
    return response.data || response;
  },

  detectIntro: async (data) => {
    const response = await apiRequest("/admin/playback/detect-intro", {
      method: "POST",
      data,
      requiresAuth: true,
      timeout: 60000,
    });
    return response;
  },

  getDetectionStatus: async (jobId) => {
    const response = await apiRequest(`/admin/playback/detect-intro/${jobId}`, {
      requiresAuth: true,
    });
    return response.data || response;
  },

  getIntroBatchLatest: async () => {
    const response = await apiRequest("/admin/playback/intro-batches/latest", {
      requiresAuth: true,
    });
    return response.data || response;
  },

  getIntroBatches: async (params = {}) => {
    const response = await apiRequest("/admin/playback/intro-batches", {
      params,
      requiresAuth: true,
    });
    return response.data || response;
  },

  getIntroBatch: async (batchId) => {
    const response = await apiRequest(`/admin/playback/intro-batches/${batchId}`, {
      requiresAuth: true,
    });
    return response.data || response;
  },

  getIntroBatchMovies: async (batchId, params = {}) => {
    const response = await apiRequest(`/admin/playback/intro-batches/${batchId}/movies`, {
      params,
      requiresAuth: true,
    });
    return response.data || response;
  },

  getIntroBatchStats: async (params = {}) => {
    const response = await apiRequest("/admin/playback/intro-batches/stats", {
      params,
      requiresAuth: true,
    });
    return response.data || response;
  },

  getIntroBatchPreview: async (params = {}) => {
    const response = await apiRequest("/admin/playback/intro-batches/preview", {
      params,
      requiresAuth: true,
    });
    return response.data || response;
  },
};

/**
 * HLS Lab API
 */
export const hlsLabAPI = {
  inspect: async ({ url, patterns, variantUrl } = {}) => {
    const response = await apiRequest("/admin/hls-lab/inspect", {
      params: { url, patterns, variantUrl },
      requiresAuth: true,
      timeout: 30000,
    });
    return response.data || response;
  },

  processSnippet: async ({ content, baseUrl, patterns, segmentMode = "direct" } = {}) => {
    const response = await apiRequest("/admin/hls-lab/snippet", {
      method: "POST",
      data: { content, baseUrl, patterns, segmentMode },
      requiresAuth: true,
      timeout: 30000,
    });
    return response.data || response;
  },

  buildPlaylistUrl: ({ url, variant = "raw", segmentMode = "direct", patterns = "", variantUrl = "" } = {}) => {
    const apiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
    const previewUrl = new URL(`${apiBaseUrl.replace(/\/$/, "")}/admin/hls-lab/playlist`);
    previewUrl.searchParams.set("url", url);
    previewUrl.searchParams.set("variant", variant);
    previewUrl.searchParams.set("segmentMode", segmentMode);
    if (patterns) previewUrl.searchParams.set("patterns", patterns);
    if (variantUrl) previewUrl.searchParams.set("variantUrl", variantUrl);
    return previewUrl.toString();
  },

  getPlaylistText: async ({ url, variant = "raw", segmentMode = "direct", patterns = "", variantUrl = "" } = {}) => {
    const response = await http.get("/admin/hls-lab/playlist", {
      params: { url, variant, segmentMode, patterns, variantUrl },
      responseType: "text",
      timeout: 30000,
      meta: { requiresAuth: true },
    });
    return response.data;
  },
};

/**
 * Quest Admin API
 */
export const questAdminAPI = {
  getConfig: async () => {
    const response = await apiRequest("/admin/quests/config", {
      requiresAuth: true,
    });
    return response.data || response;
  },

  updateConfig: async (type, payload) => {
    const response = await apiRequest(`/admin/quests/config/${type}`, {
      method: "PUT",
      data: payload,
      requiresAuth: true,
    });
    return response.data || response;
  },

  upsertTemplate: async (payload) => {
    const response = await apiRequest("/admin/quests/templates", {
      method: "POST",
      data: payload,
      requiresAuth: true,
    });
    return response.data || response;
  },

  archiveTemplate: async (id) => {
    const response = await apiRequest(`/admin/quests/templates/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response;
  },
};

/**
 * Cast API - Admin CRUD cho diễn viên
 */
export const castAPI = {
  /**
   * Lấy danh sách tất cả Cast với phân trang và tìm kiếm
   * @param {Object} params - { page?, limit?, search?, role?, department? }
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  getAll: async (params = {}) => {
    const response = await apiRequest("/admin/casts", {
      params,
      requiresAuth: true,
    });
    return response;
  },

  /**
   * Lấy Cast theo ID
   * @param {string} id - Cast ID
   * @returns {Promise<Object>} Cast object
   */
  getById: async (id) => {
    const response = await apiRequest(`/admin/casts/${id}`, {
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Tạo Cast mới
   * @param {Object} castData - Cast data
   * @returns {Promise<Object>} Created cast
   */
  create: async (castData) => {
    const response = await apiRequest("/admin/casts", {
      method: "POST",
      data: castData,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Cập nhật Cast
   * @param {string} id - Cast ID
   * @param {Object} castData - Updated cast data
   * @returns {Promise<Object>} Updated cast
   */
  update: async (id, castData) => {
    const response = await apiRequest(`/admin/casts/${id}`, {
      method: "PUT",
      data: castData,
      requiresAuth: true,
    });
    return response.data || response;
  },

  /**
   * Xóa Cast
   * @param {string} id - Cast ID
   * @returns {Promise<Object>} { success: true }
   */
  delete: async (id) => {
    const response = await apiRequest(`/admin/casts/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
    return response.data || response || { success: true };
  },
};

/**
 * Payments / Transactions API
 */
export const paymentAPI = {
  getTransactions: async (params = {}) => {
    const response = await apiRequest("/admin/payments", { params, requiresAuth: true });
    return response;
  },
  getStats: async () => {
    const response = await apiRequest("/admin/payments/stats", { requiresAuth: true });
    return response;
  },
};
