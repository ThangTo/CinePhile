import apiRequest from "./utils/apiRequest";
import { setAuthData, clearAuthData, getCurrentUserLocal, isAuthenticated, saveMobileTokens } from "lib/auth-storage";

// ============================================================================
// Authentication Service
// ============================================================================

const authService = {
  /**
   * Yêu cầu gửi mã OTP đăng ký
   * @param {Object} userData - { username, email }
   */
  requestRegistrationOTP: async (userData) => {
    return apiRequest("/auth/request-registration-otp", {
      method: "POST",
      data: userData,
    });
  },

  /**
   * Đăng ký tài khoản mới với OTP
   * @param {Object} userData - { username, email, password, otp }
   */
  register: async (userData) => {
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        data: userData,
      });

      const user = data?.user || data;
      if (user) {
        setAuthData({ user });
        // Mobile: save tokens to localStorage (desktop uses cookies only)
        saveMobileTokens(data?.accessToken, data?.refreshToken);
      }

      return data;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  },

  /**
   * Đăng nhập
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} { user, token, refreshToken }
   */
  login: async ({ email, password }) => {
    const payload = { email, password };
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        data: payload,
      });
      const user = data?.user || data;
      if (user) {
        setAuthData({ user });
        // Mobile: save tokens to localStorage (desktop uses cookies only)
        saveMobileTokens(data?.accessToken, data?.refreshToken);
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
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
  refreshToken: async () => {
    const data = await apiRequest("/auth/refresh-token", {
      method: "POST",
      requiresAuth: true,
    });
    // Mobile: save new tokens to localStorage
    saveMobileTokens(data?.accessToken, data?.refreshToken);
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
      setAuthData({ user: userData });
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
      setAuthData({ user: userData });
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
   * Xác thực OTP reset mật khẩu
   * @param {Object} data - { email, otp }
   * @returns {Promise<Object>} { resetToken, message }
   */
  verifyPasswordResetOTP: async (data) => {
    return apiRequest("/auth/verify-reset-otp", {
      method: "POST",
      data,
    });
  },

  /**
   * Reset mật khẩu với token
   * @param {Object} resetData - { resetToken, newPassword }
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
  setAuthData: (_token, user) => {
    setAuthData({ user });
  },

  /**
   * Clear auth data from localStorage
   * @returns {void}
   */
  clearAuthData,
};

export default authService;
