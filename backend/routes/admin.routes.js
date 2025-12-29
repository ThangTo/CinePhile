const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// const passport = require('passport');

const authMiddleware = require('../middleware/auth.middleware');

const { isAdmin } = require('../middleware/admin.middleware');
// // All admin routes require authentication
// // TODO: Add role-based authorization when auth middleware is implemented
// router.use(authMiddleware, isAdmin);

const adminCommentRoutes = require('./admin.comment.routes');

// ===== ADMIN COMMENTS =====
router.use('/comments', adminCommentRoutes);

// ===== ADMIN MOVIES =====
// GET /api/v1/admin/movies - Get all movies
router.get('/movies', adminController.getAllMovies);

// GET /api/v1/admin/movies/search - Search movies
router.get('/movies/search', adminController.searchMovies);

// ===== ADMIN MOVIES CRAWL (Must be before /movies/:id to avoid route conflict) =====
// POST /api/v1/admin/movies/crawl/by-page - Crawl movies by page range
router.post('/movies/crawl/by-page', adminController.crawlMoviesByPage);

// POST /api/v1/admin/movies/crawl/search - Search movies for crawling
router.post('/movies/crawl/search', adminController.searchMoviesForCrawl);

// POST /api/v1/admin/movies/crawl/by-slug - Crawl a single movie by slug
router.post('/movies/crawl/by-slug', adminController.crawlMovieBySlug);

// GET /api/v1/admin/movies/:id - Get movie by ID (Must be after /movies/crawl routes)
router.get('/movies/:id', adminController.getMovieById);

// POST /api/v1/admin/movies - Create movie
router.post('/movies', adminController.createMovie);

// PUT /api/v1/admin/movies/:id - Update movie
router.put('/movies/:id', adminController.updateMovie);

// DELETE /api/v1/admin/movies/:id - Delete movie
router.delete('/movies/:id', adminController.deleteMovie);

// ===== ADMIN USERS =====
// GET /api/v1/admin/users - Get all users
router.get('/users', adminController.getAllUsers);

// GET /api/v1/admin/users/:id - Get user by ID
router.get('/users/:id', adminController.getUserById);

// POST /api/v1/admin/users - Create user
router.post('/users', adminController.createUser);

// PUT /api/v1/admin/users/:id - Update user
router.put('/users/:id', adminController.updateUser);

// DELETE /api/v1/admin/users/:id - Delete user
router.delete('/users/:id', adminController.deleteUser);

// PATCH /api/v1/admin/users/:id/toggle-status - Toggle user status
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);

// ===== ADMIN STATS =====
// GET /api/v1/admin/stats - Get dashboard statistics
router.get('/stats', adminController.getStats);

// GET /api/v1/admin/stats/charts/:type - Get chart data
router.get('/stats/charts/:type', adminController.getChartData);

// function isAdmin(req, res, next) {
//   if (req.isAuthenticated() && (req.user.role === 'admin')) {
//     return next();
//   }
//   return res.redirect('/');
// }

module.exports = router;
