/**
 * Leaderboard Routes
 * GET /api/v1/users/leaderboard — public (no auth required)
 */

const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');

// GET /api/v1/users/leaderboard
router.get('/', leaderboardController.getTopUsers);

module.exports = router;
