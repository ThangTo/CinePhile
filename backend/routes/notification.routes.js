const express = require('express');
const router = express.Router();
const notiController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', notiController.getNotifications);
router.post('/mark-read', notiController.markAsRead);

module.exports = router;

const { createNotification } = require('../controllers/notification.controller');

