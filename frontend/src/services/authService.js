// Authentication service for API calls
// Replace API_URL with your actual backend URL

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Mock mode for development (set to false when backend is ready)
const USE_MOCK = true;

/**
 * Login user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export const login = async (email, password) => {
  // Mock login for development
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simple mock validation
        if (email && password) {
          resolve({
            token: "mock-jwt-token-" + Date.now(),
            user: {
              id: 1,
              username: "ThangTo",
              email: email,
              avatar: "https://i.pravatar.cc/150?img=68",
              premium: false,
              coins: 1000,
              watchlist: 0,
              hasPassword: true,
              loginMethod: "email",
              gender: "other",
            },
          });
        } else {
          reject(new Error("Email hoặc mật khẩu không đúng"));
        }
      }, 500);
    });
  }

  // Real API call
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Đăng nhập thất bại");
  }

  return response.json();
};

/**
 * Register new user
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export const register = async (username, email, password) => {
  // Mock register for development
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simple mock validation
        if (username && email && password) {
          resolve({
            token: "mock-jwt-token-" + Date.now(),
            user: {
              id: 1,
              username: username,
              email: email,
              avatar: "https://i.pravatar.cc/150?img=68",
              premium: false,
              coins: 1000,
              watchlist: 0,
              hasPassword: true,
              loginMethod: "email",
              gender: "other",
            },
          });
        } else {
          reject(new Error("Vui lòng điền đầy đủ thông tin"));
        }
      }, 500);
    });
  }

  // Real API call
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Đăng ký thất bại");
  }

  return response.json();
};

/**
 * Logout user (clear local storage and optionally call backend)
 */
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Optional: Call backend to invalidate token
  // await fetch(`${API_URL}/auth/logout`, { ... });
};

/**
 * Get current user from localStorage
 * @returns {object|null}
 */
export const getCurrentUser = () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (token && user) {
    return JSON.parse(user);
  }

  return null;
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

/**
 * Get auth token
 * @returns {string|null}
 */
export const getToken = () => {
  return localStorage.getItem("token");
};

/**
 * Set auth data
 * @param {string} token
 * @param {object} user
 */
export const setAuthData = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};
