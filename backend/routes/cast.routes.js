const express = require('express');
const router = express.Router();
const castController = require('../controllers/cast.controller');

// GET /api/v1/cast/:id - Get cast details with movies
router.get('/:id', castController.getCastDetails);

module.exports = router;
