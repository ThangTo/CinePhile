const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/v1/ai/command — Xử lý lệnh giọng nói qua LLM (có kèm optionalAuth để nhận diện user nếu đã đăng nhập)
router.post('/command', authMiddleware.optionalAuth, aiController.processVoiceCommand);

// POST /api/v1/ai/tts — Tạo Audio TTS (ElevenLabs + R2 Cache)
router.post('/tts', aiController.generateVoiceAudio);

module.exports = router;
