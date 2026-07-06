const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/v1/chat - Handle chat (optional auth để hỗ trợ guest users)
router.post('/', authMiddleware.optionalAuth, chatController.handleChat);
router.post('/stream', authMiddleware.optionalAuth, chatController.handleChatStream);

// GET /api/v1/chat/history - Get chat history (optional auth)
router.get('/history', authMiddleware.optionalAuth, chatController.getChatHistory);

// DELETE /api/v1/chat/history - Clear chat history (optional auth)
router.delete('/history', authMiddleware.optionalAuth, chatController.clearChatHistory);

module.exports = router;
