const adminService = require('../services/admin.service');

/**
 * Admin Movies Controllers
 */

/**
 * GET /admin/movies
 * Get all movies with pagination and filters
 */
const getAllMovies = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const result = await adminService.getAllMovies({ page, limit, search });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/movies/:id
 * Get movie by ID
 */
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await adminService.getMovieById(id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/movies
 * Create new movie
 */
const createMovie = async (req, res) => {
  try {
    const movie = await adminService.createMovie(req.body);
    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /admin/movies/:id
 * Update movie
 */
const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await adminService.updateMovie(id, req.body);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /admin/movies/:id
 * Delete movie
 */
const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    await adminService.deleteMovie(id);
    res.json({ success: true, message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * GET /admin/movies/search
 * Search movies
 */
const searchMovies = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const result = await adminService.searchMovies(q, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin Users Controllers
 */

/**
 * GET /admin/users
 * Get all users with pagination and filters
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const result = await adminService.getAllUsers({ page, limit, search });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/users/:id
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await adminService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/users
 * Create new user
 */
const createUser = async (req, res) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /admin/users/:id
 * Update user
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await adminService.updateUser(id, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /admin/users/:id
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await adminService.deleteUser(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * PATCH /admin/users/:id/toggle-status
 * Toggle user status (active/inactive)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await adminService.toggleUserStatus(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin Stats Controllers
 */

/**
 * GET /admin/stats
 * Get dashboard statistics
 */
const getStats = async (req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/stats/charts/:type
 * Get chart data
 */
const getChartData = async (req, res) => {
  try {
    const { type } = req.params;
    const chartData = await adminService.getChartData(type);
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  // Movies
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
  // Users
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  // Stats
  getStats,
  getChartData,
};
