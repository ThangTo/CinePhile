/**
 * Register new user
 * @param {Object} userData - { username, email, password }
 * @returns {Promise<Object>} { user: Object, token: string, refreshToken: string }
 */
const register = async (userData) => {
  // TODO: Implement
};

/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} { user: Object, token: string, refreshToken: string }
 */
const login = async (credentials) => {
  // TODO: Implement
};

/**
 * Logout user
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @returns {Promise<Object>} { message: string }
 */
const logout = async (userId, token) => {
  // TODO: Implement
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} { token: string }
 */
const refreshToken = async (refreshToken) => {
  // TODO: Implement
};

/**
 * Get current user by token
 * @param {string} token - Access token
 * @returns {Promise<Object>} User object
 */
const getCurrentUser = async (token) => {
  // TODO: Implement
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - { fullName?, avatar?, bio?, ... }
 * @returns {Promise<Object>} Updated user object
 */
const updateProfile = async (userId, updates) => {
  // TODO: Implement
};

/**
 * Change password
 * @param {string} userId - User ID
 * @param {Object} passwords - { oldPassword, newPassword }
 * @returns {Promise<Object>} { message: string }
 */
const changePassword = async (userId, passwords) => {
  // TODO: Implement
};

/**
 * Send forgot password email
 * @param {string} email - User email
 * @returns {Promise<Object>} { message: string }
 */
const forgotPassword = async (email) => {
  // TODO: Implement
};

/**
 * Reset password with token
 * @param {Object} resetData - { token, newPassword }
 * @returns {Promise<Object>} { message: string }
 */
const resetPassword = async (resetData) => {
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
