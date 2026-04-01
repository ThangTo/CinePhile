const watchStreakService = require('../services/watchStreak.service');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * GET /api/v1/users/streak
 * Get current user's watch streak
 */
const getStreak = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const streak = await watchStreakService.getStreak(userId);
    if (!streak) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(streak);
  } catch (error) {
    console.error('[WatchStreak] getStreak error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/v1/users/streak
 * Record watch session — update streak
 * Body: { secondsWatched: number }
 */
const recordStreak = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { secondsWatched } = req.body;
    const streak = await watchStreakService.recordStreak(userId, Number(secondsWatched) || 0);
    if (!streak) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(streak);
  } catch (error) {
    console.error('[WatchStreak] recordStreak error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getStreak,
  recordStreak,
};
