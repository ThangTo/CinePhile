const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Debug middleware để log requests
router.use((req, res, next) => {
  console.log(`[Comment Routes] ${req.method} ${req.path}`, {
    params: req.params,
    query: req.query,
    body: req.body
  });
  next();
});

// Test route để kiểm tra routing
router.get('/test', (req, res) => {
  res.json({ message: 'Comment routes are working!' });
});

// POST /api/v1/comments/:commentId/like - Like a comment (requires authentication)
router.post('/:commentId/like', (req, res, next) => {
  console.log('[Comment Routes] Like route matched:', req.params.commentId);
  next();
}, authMiddleware, movieController.likeComment);

// POST /api/v1/comments/:commentId/dislike - Dislike a comment (requires authentication)
router.post('/:commentId/dislike', (req, res, next) => {
  console.log('[Comment Routes] Dislike route matched:', req.params.commentId);
  next();
}, authMiddleware, movieController.dislikeComment);

// DELETE /api/v1/comments/:commentId - Delete a comment (requires authentication)
router.delete('/:commentId', authMiddleware, movieController.deleteComment);

module.exports = router;

