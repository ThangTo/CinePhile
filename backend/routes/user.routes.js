const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// GET /api/v1/users/:id - Get user profile
router.get('/:id', userController.getProfile);

// PUT /api/v1/users/:id - Update user profile
router.put('/:id', userController.updateProfile);

// POST /api/v1/users/:id/favorites - Add to favorites
router.post('/:id/favorites', userController.addToFavorites);

// DELETE /api/v1/users/:id/favorites/:movieId - Remove from favorites
router.delete('/:id/favorites/:movieId', userController.removeFromFavorites);

// GET /api/v1/users/:id/favorites - Get favorites list
router.get('/:id/favorites', userController.getFavorites);

// POST /api/v1/users/:id/watchlist - Add to watchlist
router.post('/:id/watchlist', userController.addToWatchlist);

// DELETE /api/v1/users/:id/watchlist/:movieId - Remove from watchlist
router.delete('/:id/watchlist/:movieId', userController.removeFromWatchlist);

// GET /api/v1/users/:id/watchlist - Get watchlist
router.get('/:id/watchlist', userController.getWatchlist);

// GET /api/v1/users/:id/history - Get watch history
router.get('/:id/history', userController.getHistory);

module.exports = router;
