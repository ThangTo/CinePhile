/**
 * Leaderboard Service
 * Fetches top users ranked by watch minutes plus weighted log streak score.
 */

import apiRequest from './utils/apiRequest';

const leaderboardService = {
  /**
   * Get top users leaderboard (public endpoint, no auth required)
   * @returns {Promise<Array>} Array of { id, username, avatar, isPremium, premiumPlan, totalWatchTime, currentStreak, maxStreak, score }
   */
  getTopUsersLeaderboard: () =>
    apiRequest('/users/leaderboard').then((res) => {
      // API returns { success: true, data: [...] }
      return res?.success ? res.data : [];
    }),
};

export default leaderboardService;
