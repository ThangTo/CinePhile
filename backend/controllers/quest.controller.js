const questService = require('../services/quest.service');

const getUserId = (req) => {
  if (req.user && req.user._id) return req.user._id;
  throw new Error('User ID required');
};

// GET /api/v1/quests — Get all quests with current user progress
const getQuests = async (req, res) => {
  try {
    const userId = getUserId(req);
    const data = await questService.getUserQuestProgress(userId);
    res.status(200).json({ data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// GET /api/v1/quests/summary — Lightweight summary for sidebar badge
const getQuestSummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    const data = await questService.getQuestSummary(userId);
    res.status(200).json({ data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// POST /api/v1/quests/:questId/claim — Claim reward for one quest
const claimReward = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { questId } = req.params;
    if (!questId) return res.status(400).json({ message: 'questId là bắt buộc' });

    const result = await questService.claimReward(userId, questId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// POST /api/v1/quests/claim-bonus — Claim completion bonus
const claimCompletionBonus = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type } = req.body;
    if (!type || !['daily', 'weekly'].includes(type)) {
      return res.status(400).json({ message: 'type phải là "daily" hoặc "weekly"' });
    }

    const result = await questService.claimCompletionBonus(userId, type);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  getQuests,
  getQuestSummary,
  claimReward,
  claimCompletionBonus,
};
