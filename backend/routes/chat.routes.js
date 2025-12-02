const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/v1/chat - Handle chat
router.post('/', chatController.handleChat);

module.exports = router;
