// src/lib/auth-storage.js
const TOKEN_KEY = "token";
const USER_KEY = "user";
const REFRESH_KEY = "refresh_token"; // nếu backend có refresh

export const getToken = () => localStorage.getItem(TOKEN_KEY) || null;
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || null;

export const setAuthData = ({ token, refreshToken, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const isAuthenticated = () => Boolean(getToken());

export const getCurrentUserLocal = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};
