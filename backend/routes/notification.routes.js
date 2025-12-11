const express = require('express');
const router = express.Router();
const notiController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /notifications - Get all notifications
router.get('/', authMiddleware, notiController.getNotifications);

// GET /notifications/unread - Get unread notifications only
router.get('/unread', authMiddleware, notiController.getUnreadNotifications);

// GET /notifications/unread/count - Get unread count
router.get('/unread/count', authMiddleware, notiController.getUnreadCount);

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', authMiddleware, notiController.markAsReadById);

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', authMiddleware, notiController.markAllAsRead);

// DELETE /notifications/:id - Delete notification
router.delete('/:id', authMiddleware, notiController.deleteNotification);

// POST /notifications - Create notification (for admin/testing)
router.post('/', authMiddleware, notiController.createNotificationApi);

module.exports = router;
