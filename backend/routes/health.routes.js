const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// GET /api/v1/health - Health check
router.get('/', healthController.check);

module.exports = router;
