const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// POST /api/v1/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/v1/auth/login - Login user
router.post('/login', authController.login);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', authController.logout);

// POST /api/v1/auth/refresh-token - Refresh access token
router.post('/refresh-token', authController.refreshToken);

// GET /api/v1/auth/me - Get current user
router.get('/me', authController.getCurrentUser);

// PUT /api/v1/auth/profile - Update profile
router.put('/profile', authController.updateProfile);

// PUT /api/v1/auth/change-password - Change password
router.put('/change-password', authController.changePassword);

// POST /api/v1/auth/forgot-password - Send reset password email
router.post('/forgot-password', authController.forgotPassword);

// POST /api/v1/auth/reset-password - Reset password with token
router.post('/reset-password', authController.resetPassword);

module.exports = router;
