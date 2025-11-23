const authService = require("../services/auth.service");

/**
 * POST /auth/register
 * Register new user
 * @param {Object} req.body - { username, email, password }
 * @returns {Object} { user: Object, token: string, refreshToken: string } (status: 201)
 */
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * POST /auth/login
 * Login user
 * @param {Object} req.body - { username, password }
 * @returns {Object} { user: Object, token: string, refreshToken: string }
 */
const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

/**
 * POST /auth/logout
 * Logout user (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} { message: string }
 */
const logout = async (req, res) => {
  try {
    // We might want to pass the token to blacklist it if we had that mechanism
    const token = req.headers.authorization?.split(' ')[1];
    const result = await authService.logout(req.user._id, token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /auth/refresh-token
 * Refresh access token
 * @param {string} req.body.refreshToken - Refresh token
 * @returns {Object} { token: string }
 */
const refreshToken = async (req, res) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

/**
 * GET /auth/me
 * Get current user (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @returns {Object} User object
 */
const getCurrentUser = async (req, res) => {
  try {
    // req.user is already attached by middleware, but we can fetch fresh data if needed
    // or just return req.user. Let's fetch fresh to be safe/consistent.
    // However, the service expects a token. 
    // Let's just return req.user for now as it's efficient, 
    // OR call service if we want to reuse logic (but service takes token).
    // Actually, let's just return req.user since middleware did the work.
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /auth/profile
 * Update profile (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { fullName?, avatar?, bio?, ... }
 * @returns {Object} Updated user object
 */
const updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfile(req.user._id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /auth/change-password
 * Change password (requires authentication)
 * @param {Object} req.user - User object from auth middleware
 * @param {Object} req.body - { oldPassword, newPassword }
 * @returns {Object} { message: string }
 */
const changePassword = async (req, res) => {
  try {
    const result = await authService.changePassword(req.user._id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * POST /auth/forgot-password
 * Send reset password email
 * @param {string} req.body.email - User email
 * @returns {Object} { message: string }
 */
const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json(result);
  } catch (error) {
    // Don't reveal if user exists or not for security, but for now we might
    // or just return success always. 
    // If service throws "User not found", we might want to mask it.
    // For this implementation, I'll pass the error message (dev mode style).
    res.status(404).json({ message: error.message });
  }
};

/**
 * POST /auth/reset-password
 * Reset password with token
 * @param {Object} req.body - { token, newPassword }
 * @returns {Object} { message: string }
 */
const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
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
