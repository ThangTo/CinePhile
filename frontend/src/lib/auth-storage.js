// src/lib/auth-storage.js
const USER_KEY = "user";
const TOKEN_KEY = "token"; // legacy key
const REFRESH_KEY = "refresh_token"; // legacy key

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token || null;
};

export const getRefreshToken = () => {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  return refreshToken || null;
};

export const setToken = (token) => {
  try {
    if (token) {
      //  Kiểm tra localStorage có available không
      if (typeof Storage !== "undefined") {
        localStorage.setItem(TOKEN_KEY, token);
        // Verify write
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved !== token) {
          throw new Error("Failed to save token to localStorage");
        }
      } else {
        throw new Error("localStorage is not available");
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("❌ Error saving token to localStorage:", error);
    throw error;
  }
};

export const setRefreshToken = (refreshToken) => {
  try {
    if (refreshToken) {
      //  Kiểm tra localStorage có available không
      if (typeof Storage !== "undefined") {
        localStorage.setItem(REFRESH_KEY, refreshToken);
        // Verify write
        const saved = localStorage.getItem(REFRESH_KEY);
        if (saved !== refreshToken) {
          throw new Error("Failed to save refreshToken to localStorage");
        }
      } else {
        throw new Error("localStorage is not available");
      }
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  } catch (error) {
    console.error("❌ Error saving refreshToken to localStorage:", error);
    throw error;
  }
};

export const setAuthData = ({ user, token, refreshToken }) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  if (token) {
    setToken(token);
  }
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }
};

export const isAuthenticated = () => Boolean(getCurrentUserLocal());

export const getCurrentUserLocal = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuthData = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

// ============================================================================
// Return Location Management - Lưu vị trí trước khi đăng nhập
// ============================================================================
const RETURN_LOCATION_KEY = "return_location";

/**
 * Lưu location hiện tại để redirect về sau khi đăng nhập
 * @param {string} pathname - Path hiện tại
 * @param {string} search - Query string
 * @param {Object} state - Location state
 */
export const saveReturnLocation = (pathname, search = "", state = null) => {
  try {
    const locationData = {
      pathname: pathname || "/",
      search: search || "",
      state: state || null,
      timestamp: Date.now(),
    };
    localStorage.setItem(RETURN_LOCATION_KEY, JSON.stringify(locationData));
  } catch (error) {
    console.error("Error saving return location:", error);
  }
};

/**
 * Lấy và xóa return location đã lưu
 * @returns {Object|null} { pathname, search, state } hoặc null
 */
export const getAndClearReturnLocation = () => {
  try {
    const stored = localStorage.getItem(RETURN_LOCATION_KEY);
    if (!stored) return null;

    const locationData = JSON.parse(stored);

    // Kiểm tra timestamp - nếu quá 1 giờ thì xóa (tránh redirect về trang cũ quá lâu)
    const maxAge = 60 * 60 * 1000; // 1 giờ
    if (Date.now() - locationData.timestamp > maxAge) {
      localStorage.removeItem(RETURN_LOCATION_KEY);
      return null;
    }

    // Xóa location đã lưu sau khi lấy
    localStorage.removeItem(RETURN_LOCATION_KEY);
    return {
      pathname: locationData.pathname || "/",
      search: locationData.search || "",
      state: locationData.state || null,
    };
  } catch (error) {
    console.error("Error getting return location:", error);
    localStorage.removeItem(RETURN_LOCATION_KEY);
    return null;
  }
};

/**
 * Xóa return location mà không lấy (cleanup)
 */
export const clearReturnLocation = () => {
  try {
    localStorage.removeItem(RETURN_LOCATION_KEY);
  } catch (error) {
    console.error("Error clearing return location:", error);
  }
};
