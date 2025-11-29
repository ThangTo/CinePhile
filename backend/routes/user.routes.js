const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// GET /api/v1/users/:id - Get user profile
router.get('/', authMiddleware, userController.getProfile);

// PUT /api/v1/users/:id - Update user profile
router.put('/', authMiddleware, userController.updateProfile);

// POST /api/v1/users/favorites - Add to favorites
router.post('/favorites', authMiddleware, userController.addToFavorites);

// DELETE /api/v1/users/favorites/:movieId - Remove from favorites
router.delete('/favorites/:movieId', authMiddleware, userController.removeFromFavorites);

// GET /api/v1/users/favorites - Get favorites list
router.get('/favorites', authMiddleware, userController.getFavorites);

// POST /api/v1/users/watchlist - Add to watchlist
router.post('watchlist', authMiddleware, userController.addToWatchlist);

// DELETE /api/v1/users/watchlist/:movieId - Remove from watchlist
router.delete('/watchlist/:movieId', authMiddleware, userController.removeFromWatchlist);

// GET /api/v1/users/watchlist - Get watchlist
router.get('/watchlist', authMiddleware, userController.getWatchlist);

// GET /api/v1/users/history - Get watch history
router.get('/history', authMiddleware, userController.getHistory);

module.exports = router;
