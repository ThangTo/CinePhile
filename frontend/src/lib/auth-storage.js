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
