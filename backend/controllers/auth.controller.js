const authService = require('../services/auth.service');
const { attachAuthCookies, clearAuthCookies, getGoogleRedirects } = require('../utils/authUtils');

const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const { successRedirect, failureRedirect } = getGoogleRedirects(clientBaseUrl);

/**
 * POST /auth/register
 * Register new user
 * @param {Object} req.body - { username, email, password }
 * @returns {Object} { user: Object, token: string, refreshToken: string } (status: 201)
 */
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    attachAuthCookies(res, result);
    res.status(201).json({ user: result.user });
  } catch (error) {
    // Map error messages to Vietnamese
    let message = error.message;
    if (message.includes('already exists')) {
      if (message.includes('email')) {
        message = 'Email này đã được sử dụng';
      } else if (message.includes('Username')) {
        message = 'Tên người dùng này đã tồn tại';
      } else {
        message = 'Tài khoản đã tồn tại';
      }
    } else if (message.includes('required')) {
      message = 'Vui lòng điền đầy đủ thông tin';
    }
    res.status(400).json({ message });
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
    attachAuthCookies(res, result);
    res.json({
      user: result.user,
      accessToken: result.token,
    });
  } catch (error) {
    // Map error messages to Vietnamese
    let message = error.message;

    // Passport-local-mongoose error messages
    if (
      message.includes('Incorrect password') ||
      message.includes('Invalid credentials') ||
      message.includes('Password or username is incorrect') ||
      message.includes('incorrect')
    ) {
      message = 'Email hoặc mật khẩu không chính xác';
    } else if (
      message.includes('No salt value stored') ||
      message.includes('Authentication not possible')
    ) {
      message = 'Tài khoản này được tạo qua Google. Vui lòng đăng nhập bằng Google';
    } else if (message.includes('Missing credentials') || message.includes('required')) {
      message = 'Vui lòng nhập email và mật khẩu';
    } else if (message.includes('not found') || message.includes('does not exist')) {
      message = 'Tài khoản không tồn tại';
    }

    res.status(401).json({ message });
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
    // Get token from cookies or header
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    // Blacklist token in Redis
    const result = await authService.logout(token);

    // Clear cookies
    clearAuthCookies(res);
    res.json(result);
  } catch (error) {
    // Still clear cookies even if logout fails
    clearAuthCookies(res);
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
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tokens = await authService.refreshToken(incomingRefreshToken);
    attachAuthCookies(res, tokens);
    res.json({ message: 'Token refreshed' });
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
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Convert Mongoose document to plain object to ensure all fields (including avatar) are included
    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    res.json(userObj);
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
    // Return 400 for validation errors, 401 for authentication errors
    const statusCode = error.message.includes('không đúng') ? 401 : 400;
    res.status(statusCode).json({ message: error.message });
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

const googleCallback = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(failureRedirect);
    }

    const { token, refreshToken, user } = req.user;

    // Validate tokens
    if (!token || !refreshToken) {
      return res.redirect(failureRedirect);
    }

    // Set cookies (for both desktop and mobile)
    attachAuthCookies(res, { token, refreshToken });

    // Detect mobile device via User-Agent
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );

    const redirectUrl = new URL(successRedirect);

    // 🔒 CHỈ thêm tokens vào URL cho mobile devices (bảo mật)
    if (isMobile) {
      // Mobile: Include tokens in URL params (cookies có thể không hoạt động)
      redirectUrl.searchParams.set('token', encodeURIComponent(token));
      redirectUrl.searchParams.set('refreshToken', encodeURIComponent(refreshToken));
    }

    // Common params for both
    redirectUrl.searchParams.set('auth', 'google_success');
    redirectUrl.searchParams.set('t', Date.now().toString()); // Cache busting

    const finalUrl = redirectUrl.toString();

    return res.redirect(finalUrl);
  } catch (error) {
    return res.redirect(failureRedirect);
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
  googleCallback,
  GOOGLE_FAILURE_REDIRECT: failureRedirect,
};
