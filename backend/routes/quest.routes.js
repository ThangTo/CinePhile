const express = require('express');
const router = express.Router();
const questController = require('../controllers/quest.controller');
const authMiddleware = require('../middleware/auth.middleware');

const getUserId = (req) => {
  if (req.user && req.user._id) return req.user._id;
  throw new Error('User ID required');
};

// GET /api/v1/quests — Get all quests with current progress
router.get('/', authMiddleware, questController.getQuests);

// GET /api/v1/quests/summary — Lightweight summary for sidebar badge
router.get('/summary', authMiddleware, questController.getQuestSummary);

// POST /api/v1/quests/:questId/claim — Claim reward for one quest
router.post('/:questId/claim', authMiddleware, questController.claimReward);

// POST /api/v1/quests/claim-bonus — Claim completion bonus (body: { type: 'daily'|'weekly' })
router.post('/claim-bonus', authMiddleware, questController.claimCompletionBonus);

module.exports = router;
