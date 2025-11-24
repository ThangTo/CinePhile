// src/lib/auth-storage.js
const USER_KEY = "user";
const TOKEN_KEY = "token"; // legacy key
const REFRESH_KEY = "refresh_token"; // legacy key

export const getToken = () => null;
export const getRefreshToken = () => null;

export const setAuthData = ({ user }) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
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
