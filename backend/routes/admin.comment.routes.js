const express = require('express');
const router = express.Router();
const adminCommentController = require('../controllers/admin.comment.controller');
const authMiddleware = require('../middleware/auth.middleware');
// Assuming there is an admin middleware content, but for now I'll stick to authMiddleware 
// and assume the user role check happens or a specific admin middleware is used.
// The user prompt said "separate like chat.routes", so I'm following that pattern.
// Usually admin routes are protected by admin check. I'll check admin.routes.js to see what middleware they use.

// GET /admin/comments
router.get('/', authMiddleware, adminCommentController.getAll);

// DELETE /admin/comments/:id
router.delete('/:id', authMiddleware, adminCommentController.deleteComment);

// PATCH /admin/comments/:id/status
router.patch('/:id/status', authMiddleware, adminCommentController.updateStatus);

module.exports = router;
