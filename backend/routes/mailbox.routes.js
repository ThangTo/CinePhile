const express = require('express');
const router = express.Router();
const mailboxController = require('../controllers/mailbox.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

// ===== USER ROUTES =====
// GET /api/v1/mailbox
router.get('/', authMiddleware, mailboxController.getMyMailbox);

// GET /api/v1/mailbox/unread-count
router.get('/unread-count', authMiddleware, mailboxController.getUnreadCount);

// PUT /api/v1/mailbox/messages/read
router.put('/messages/read', authMiddleware, mailboxController.markRepliesAsRead);

// POST /api/v1/mailbox/messages
router.post('/messages', authMiddleware, mailboxController.sendMessage);

// ===== ADMIN ROUTES =====
// GET /api/v1/mailbox/admin/inbox
router.get('/admin/inbox', authMiddleware, isAdmin, mailboxController.adminGetInbox);

// GET /api/v1/mailbox/admin/:mailboxId
router.get('/admin/:mailboxId', authMiddleware, isAdmin, mailboxController.adminGetMailbox);

// POST /api/v1/mailbox/admin/:mailboxId/reply
router.post('/admin/:mailboxId/reply', authMiddleware, isAdmin, mailboxController.adminReply);

// PUT /api/v1/mailbox/admin/:mailboxId/status
router.put('/admin/:mailboxId/status', authMiddleware, isAdmin, mailboxController.adminUpdateStatus);

module.exports = router;
