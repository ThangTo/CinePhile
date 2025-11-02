/**
 * Authentication Service
 * Handles login, register, logout, and session management
 */

import { MOCK_USERS, DEFAULT_USER_TEMPLATE, getRandomAvatar } from "../data/mockUsers";
import {
  API_URL,
  USE_MOCK_AUTH,
  STORAGE_KEYS,
  VALIDATION_RULES,
  AUTH_ERRORS,
} from "../constants/auth";

/**
 * Login user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export const login = async (email, password) => {
  // Mock login for development
  if (USE_MOCK_AUTH) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Find user in mock database
        const foundUser = MOCK_USERS.find(
          (u) => u.email === email && u.password === password
        );

        if (foundUser) {
          // Don't send password to client
          const { password: _, ...userWithoutPassword } = foundUser;
          
          const userData = {
            ...DEFAULT_USER_TEMPLATE,
            ...userWithoutPassword, // Override defaults with actual user data
          };
          
          resolve({
            token: "mock-jwt-token-" + Date.now(),
            user: userData,
          });
        } else {
          reject(new Error(AUTH_ERRORS.INVALID_CREDENTIALS));
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
  if (USE_MOCK_AUTH) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Check if email already exists
        const existingUser = MOCK_USERS.find((u) => u.email === email);
        if (existingUser) {
          reject(new Error(AUTH_ERRORS.EMAIL_EXISTS));
          return;
        }

        // Validate input
        if (!username || !email || !password) {
          reject(new Error(AUTH_ERRORS.REQUIRED_FIELDS));
          return;
        }

        if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
          reject(new Error(AUTH_ERRORS.WEAK_PASSWORD));
          return;
        }

        if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
          reject(new Error(AUTH_ERRORS.INVALID_EMAIL));
          return;
        }

        // Create new user (default role: user)
        const newUser = {
          id: MOCK_USERS.length + 1,
          username: username,
          email: email,
          password: password, // In production, hash this
          role: "user", // New users are always "user" role
          avatar: getRandomAvatar(),
          joinDate: new Date().toISOString().split("T")[0],
          ...DEFAULT_USER_TEMPLATE,
        };

        // Add to mock database
        MOCK_USERS.push(newUser);

        // Return without password
        const { password: _, ...userWithoutPassword } = newUser;
        
        resolve({
          token: "mock-jwt-token-" + Date.now(),
          user: userWithoutPassword,
        });
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
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  // Optional: Call backend to invalidate token
  // await fetch(`${API_URL}/auth/logout`, { ... });
};

/**
 * Get current user from localStorage
 * @returns {object|null}
 */
export const getCurrentUser = () => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const user = localStorage.getItem(STORAGE_KEYS.USER);

  if (token && user) {
    try {
      return JSON.parse(user);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }

  return null;
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
};

/**
 * Check if user is admin
 * @returns {boolean}
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === "admin";
};

/**
 * Get auth token
 * @returns {string|null}
 */
export const getToken = () => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

/**
 * Set auth data
 * @param {string} token
 * @param {object} user
 */
export const setAuthData = (token, user) => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};
