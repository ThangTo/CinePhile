const express = require('express');
const router = express.Router();
const adminCommentController = require('../controllers/admin.comment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

// All admin comment routes require authentication first, then check admin role
router.use(authMiddleware);
router.use(isAdmin);

// GET /admin/comments
router.get('/', adminCommentController.getAll);

// DELETE /admin/comments/:id
router.delete('/:id', adminCommentController.deleteComment);

// PATCH /admin/comments/:id/status
router.patch('/:id/status', adminCommentController.updateStatus);

module.exports = router;
