const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// const passport = require('passport');

const authMiddleware = require('../middleware/auth.middleware');

const { isAdmin } = require('../middleware/admin.middleware');
// // All admin routes require authentication
// // TODO: Add role-based authorization when auth middleware is implemented
// router.use(authMiddleware, isAdmin);

// ===== ADMIN MOVIES =====
// GET /api/v1/admin/movies - Get all movies
router.get('/movies', adminController.getAllMovies);

// GET /api/v1/admin/movies/:id - Get movie by ID
router.get('/movies/:id', adminController.getMovieById);

// POST /api/v1/admin/movies - Create movie
router.post('/movies', adminController.createMovie);

// GET /api/v1/admin/movies/search - Search movies
router.get('/movies/search', adminController.searchMovies);

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
