import apiRequest from "./utils/apiRequest";
import {
  setAuthData,
  clearAuthData,
  getCurrentUserLocal,
  isAuthenticated,
  getToken,
  getRefreshToken,
} from "lib/auth-storage";

// ============================================================================
// Authentication Service
// ============================================================================

const authService = {
  /**
   * Đăng ký tài khoản mới
   * Hỗ trợ 2 cách gọi:
   * - register({ username, email, password })
   * - register(username, email, password)
   *
   * @param {string|Object} usernameOrData - Username string hoặc userData object
   * @param {string} email - Email (nếu usernameOrData là string)
   * @param {string} password - Password (nếu usernameOrData là string)
   * @returns {Promise<Object>} { user, token, refreshToken }
   */
  register: async (usernameOrData, email, password) => {
    // Normalize input - hỗ trợ cả hai cách gọi
    const userData =
      typeof usernameOrData === "string"
        ? { username: usernameOrData, email, password }
        : usernameOrData;

    const data = await apiRequest("/auth/register", {
      method: "POST",
      data: userData,
    });

    // Save auth data to localStorage
    setAuthData({
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.user,
    });

    return data;
  },

  /**
   * Đăng nhập
   * Hỗ trợ 2 cách gọi:
   * - login({ email, password })
   * - login(email, password)
   *
   * @param {string|Object} emailOrCredentials - Email string hoặc credentials object
   * @param {string} password - Password (nếu emailOrCredentials là string)
   * @returns {Promise<Object>} { user, token, refreshToken }
   */
  login: async (emailOrCredentials, password) => {
    // Normalize input - hỗ trợ cả hai cách gọi
    const credentials =
      typeof emailOrCredentials === "string"
        ? { email: emailOrCredentials, password }
        : emailOrCredentials;

    const data = await apiRequest("/auth/login", {
      method: "POST",
      data: credentials,
    });

    // Save auth data to localStorage
    setAuthData({
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.user,
    });

    return data;
  },

  /**
   * Đăng xuất
   * @returns {Promise<Object>} { message }
   */
  logout: async () => {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        requiresAuth: true,
      });
    } finally {
      // Always clear local storage regardless of success/failure
      clearAuthData();
    }
    return { message: "Đăng xuất thành công" };
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} { token }
   */
  refreshToken: async (refreshToken) => {
    const data = await apiRequest("/auth/refresh-token", {
      method: "POST",
      data: { refreshToken },
    });

    // Update token in storage if response includes new token
    if (data.token) {
      const currentUser = getCurrentUserLocal();
      if (currentUser) {
        setAuthData({ token: data.token, user: currentUser, refreshToken: getRefreshToken() });
      }
    }

    return data;
  },

  /**
   * Lấy thông tin user hiện tại
   * @returns {Promise<Object>} User object
   */
  getCurrentUser: async () => {
    const data = await apiRequest("/auth/me", {
      requiresAuth: true,
    });

    // Update localStorage with fresh user data from API
    const userData = data?.data || data;
    if (userData) {
      setAuthData({
        token: getToken(),
        refreshToken: getRefreshToken(),
        user: userData,
      });
    }

    return userData || data;
  },

  /**
   * Cập nhật profile
   * @param {Object} updates - { fullName?, avatar?, bio?, ... }
   * @returns {Promise<Object>} Updated user object
   */
  updateProfile: async (updates) => {
    const data = await apiRequest("/auth/profile", {
      method: "PUT",
      data: updates,
      requiresAuth: true,
    });

    // Update localStorage with new user data
    const userData = data?.user || data;
    if (userData) {
      setAuthData({
        token: getToken(),
        refreshToken: getRefreshToken(),
        user: userData,
      });
    }

    return userData || data;
  },

  /**
   * Đổi mật khẩu
   * @param {Object} passwords - { currentPassword, newPassword }
   * @returns {Promise<Object>} { message }
   */
  changePassword: async (passwords) => {
    return apiRequest("/auth/change-password", {
      method: "PUT",
      data: passwords,
      requiresAuth: true,
    });
  },

  /**
   * Quên mật khẩu - Gửi email reset
   * @param {string} email - Email của user
   * @returns {Promise<Object>} { message }
   */
  forgotPassword: async (email) => {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      data: { email },
    });
  },

  /**
   * Reset mật khẩu với token
   * @param {Object} resetData - { token, newPassword }
   * @returns {Promise<Object>} { message }
   */
  resetPassword: async (resetData) => {
    return apiRequest("/auth/reset-password", {
      method: "POST",
      data: resetData,
    });
  },

  // ============================================================================
  // Pass-through utilities from auth-storage.js
  // ============================================================================

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated,

  /**
   * Get current auth token
   * @returns {string|null}
   */
  getToken,

  /**
   * Get refresh token
   * @returns {string|null}
   */
  getRefreshToken,

  /**
   * Get current user from localStorage (synchronous)
   * @returns {Object|null}
   */
  getCurrentUserLocal,

  /**
   * Set auth data (helper method for external use)
   * @param {string} token - Auth token
   * @param {Object} user - User object
   * @param {string} refreshToken - Refresh token (optional)
   */
  setAuthData: (token, user, refreshToken) => {
    setAuthData({ token, user, refreshToken });
  },

  /**
   * Clear auth data from localStorage
   * @returns {void}
   */
  clearAuthData,
};

export default authService;
