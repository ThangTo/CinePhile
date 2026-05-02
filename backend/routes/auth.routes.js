const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const avatarUploadMiddleware = require('../middleware/avatarUpload.middleware');

function handleGoogleCallback(req, res, next) {
  if (req.query?.error) {
    console.warn(`[Auth] Google OAuth rejected callback: ${req.query.error}`);
    return res.redirect(authController.GOOGLE_FAILURE_REDIRECT);
  }

  return passport.authenticate('google', { session: false }, (error, user, info) => {
    if (error) {
      console.warn(`[Auth] Google OAuth callback failed: ${error.message || error}`);
      return res.redirect(authController.GOOGLE_FAILURE_REDIRECT);
    }

    if (!user) {
      const reason = info?.message || 'No Google user returned';
      console.warn(`[Auth] Google OAuth callback failed: ${reason}`);
      return res.redirect(authController.GOOGLE_FAILURE_REDIRECT);
    }

    req.user = user;
    return authController.googleCallback(req, res, next);
  })(req, res, next);
}

// GET /api/v1/auth/google - Start Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

// GET /api/v1/auth/google/callback - Google OAuth callback
router.get('/google/callback', handleGoogleCallback);

// POST /api/v1/auth/request-registration-otp - Request OTP for registration
router.post('/request-registration-otp', authController.requestRegistrationOTP);

// POST /api/v1/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/v1/auth/login - Login user
router.post('/login', authController.login);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', authMiddleware, authController.logout);

// POST /api/v1/auth/refresh-token - Refresh access token
router.post('/refresh-token', authController.refreshToken);

// GET /api/v1/auth/me - Get current user
router.get('/me', authMiddleware, authController.getCurrentUser);

// PUT /api/v1/auth/profile - Update profile
router.put('/profile', authMiddleware, avatarUploadMiddleware, authController.updateProfile);

// PUT /api/v1/auth/change-password - Change password
router.put('/change-password', authMiddleware, authController.changePassword);

// POST /api/v1/auth/forgot-password - Send reset password email
router.post('/forgot-password', authController.forgotPassword);

// POST /api/v1/auth/verify-reset-otp - Verify OTP for password reset
router.post('/verify-reset-otp', authController.verifyPasswordResetOTP);

// POST /api/v1/auth/reset-password - Reset password with token
router.post('/reset-password', authController.resetPassword);

module.exports = router;
