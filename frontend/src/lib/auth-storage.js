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
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const setRefreshToken = (refreshToken) => {
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_KEY);
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
