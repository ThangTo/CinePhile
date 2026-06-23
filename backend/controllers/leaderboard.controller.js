/**
 * Leaderboard Controller
 * Public endpoint — no authentication required.
 */

const leaderboardService = require('../services/leaderboard.service');

/**
 * GET /api/v1/users/leaderboard
 * Returns top 10 users ranked by watch minutes plus weighted log streak score.
 */
exports.getTopUsers = async (req, res) => {
  try {
    const topUsers = await leaderboardService.getTopUsersLeaderboard();
    return res.status(200).json({ success: true, data: topUsers });
  } catch (error) {
    console.error('[LeaderboardController] getTopUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load the leaderboard. Please try again later.',
    });
  }
};
