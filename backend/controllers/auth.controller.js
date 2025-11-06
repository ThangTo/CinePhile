const authService = require("../services/auth.service");

/**
 * POST /auth/register
 * Register new user
 * @param {Object} req.body - { username, email, password }
 * @returns {Object} { user: Object, token: string, refreshToken: string } (status: 201)
 */
const register = async (req, res) => {
  // TODO: Implement
};

/**
 * POST /auth/login
 * Login user
 * @param {Object} req.body - { email, password }
 * @returns {Object} { user: Object, token: string, refreshToken: string }
 */
const login = async (req, res) => {
  // TODO: Implement
};

/**
 * POST /auth/logout
 * Logout user (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} { message: string }
 */
const logout = async (req, res) => {
  // TODO: Implement
};

/**
 * POST /auth/refresh-token
 * Refresh access token
 * @param {string} req.body.refreshToken - Refresh token
 * @returns {Object} { token: string }
 */
const refreshToken = async (req, res) => {
  // TODO: Implement
};

/**
 * GET /auth/me
 * Get current user (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} User object
 */
const getCurrentUser = async (req, res) => {
  // TODO: Implement
};

/**
 * PUT /auth/profile
 * Update profile (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { fullName?, avatar?, bio?, ... }
 * @returns {Object} Updated user object
 */
const updateProfile = async (req, res) => {
  // TODO: Implement
};

/**
 * PUT /auth/change-password
 * Change password (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { oldPassword, newPassword }
 * @returns {Object} { message: string }
 */
const changePassword = async (req, res) => {
  // TODO: Implement
};

/**
 * POST /auth/forgot-password
 * Send reset password email
 * @param {string} req.body.email - User email
 * @returns {Object} { message: string }
 */
const forgotPassword = async (req, res) => {
  // TODO: Implement
};

/**
 * POST /auth/reset-password
 * Reset password with token
 * @param {Object} req.body - { token, newPassword }
 * @returns {Object} { message: string }
 */
const resetPassword = async (req, res) => {
  // TODO: Implement
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
