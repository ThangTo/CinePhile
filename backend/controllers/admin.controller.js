const adminService = require('../services/admin.service');
const { transformMovieData, slugify } = require('../utils/movieAdminUtils');
const { transformMovie } = require('../utils/movieTransformer');

/**
 * Helper: Parse array query parameters (genres, countries)
 * @param {string|string[]} param - Query parameter value
 * @returns {string[]|undefined} Parsed array or undefined
 */
const parseArrayParam = (param) => {
  if (!param) return undefined;
  return Array.isArray(param) ? param : param.split(',').filter(Boolean);
};

/**
 * Admin Movies Controllers
 */

/**
 * GET /admin/movies
 * Get all movies with pagination and filters
 */
const getAllMovies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      genres,
      countries,
      year,
      yearFrom,
      yearTo,
      quality,
      type,
      ageRating,
      status,
      ratingMin,
      ratingMax,
    } = req.query;

    // Parse array params (genres, countries)
    const parsedGenres = parseArrayParam(genres);
    const parsedCountries = parseArrayParam(countries);

    const result = await adminService.getAllMovies({
      page,
      limit,
      search,
      genres: parsedGenres,
      countries: parsedCountries,
      year,
      yearFrom,
      yearTo,
      quality,
      type,
      ageRating,
      status,
      ratingMin,
      ratingMax,
    });
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
    // Transform movie to frontend format before sending
    const transformedMovie = transformMovie(movie);
    res.json(transformedMovie);
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
    // Validate required fields
    if (!req.body.name && !req.body.title) {
      return res.status(400).json({ message: 'Movie name is required' });
    }

    // Transform data from frontend format to DB format
    const transformedData = transformMovieData(req.body, false);

    // Create movie (service will handle slug uniqueness)
    const movie = await adminService.createMovie(transformedData);
    // Transform movie to frontend format before sending
    const transformedMovie = transformMovie(movie);
    res.status(201).json(transformedMovie);
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

    // Transform data from frontend format to DB format
    const transformedData = transformMovieData(req.body, true);

    // Handle slug generation if name changed but slug not provided
    const existingMovie = await adminService.getMovieById(id);
    if (!existingMovie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const newName = transformedData.name || req.body.title;
    if (newName && newName !== existingMovie.name && !transformedData.slug && !req.body.slug) {
      // Name changed but slug not provided, generate new slug
      transformedData.slug = slugify(newName);
    }

    // Update movie (service will handle slug uniqueness)
    const movie = await adminService.updateMovie(id, transformedData);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    // Transform movie to frontend format before sending
    const transformedMovie = transformMovie(movie);
    res.json(transformedMovie);
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

/**
 * POST /admin/movies/crawl/by-page
 * Crawl movies by page range with Server-Sent Events for real-time logs
 */
const crawlMoviesByPage = async (req, res) => {
  try {
    const { startPage = 1, endPage = null, skipExisting = false } = req.body;
    const { runPageRange } = require('../services/crawler.service');

    if (!startPage || startPage < 1) {
      return res.status(400).json({ message: 'Invalid start page' });
    }

    if (endPage && (endPage < 1 || startPage > endPage)) {
      return res.status(400).json({ message: 'Invalid page range' });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Progress callback to send logs
    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Run crawl in background
    runPageRange(
      parseInt(startPage),
      endPage ? parseInt(endPage) : null,
      onProgress,
      skipExisting === true,
    )
      .then((result) => {
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.end();
      })
      .catch((error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/movies/crawl/search
 * Search movies by name
 */
const searchMoviesForCrawl = async (req, res) => {
  try {
    const { movieName } = req.body;
    const { searchMovies } = require('../services/crawler.service');

    if (!movieName || !movieName.trim()) {
      return res.status(400).json({ message: 'Movie name is required' });
    }

    const movies = await searchMovies(movieName.trim());
    res.json({ movies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/movies/crawl/by-slug
 * Crawl a single movie by slug
 */
const crawlMovieBySlug = async (req, res) => {
  try {
    const { slug } = req.body;
    const { crawlMovieBySlug } = require('../services/crawler.service');
    const { transformMovie } = require('../utils/movieTransformer');

    if (!slug || !slug.trim()) {
      return res.status(400).json({ message: 'Movie slug is required' });
    }

    const result = await crawlMovieBySlug(slug.trim());

    if (!result.success) {
      return res.status(400).json({ message: result.message || 'Failed to crawl movie' });
    }

    // Transform movie data to frontend format
    const transformedMovie = result.movieData ? transformMovie(result.movieData) : null;

    res.json({
      success: true,
      message: `Successfully ${result.isUpdate ? 'updated' : 'created'} movie: ${result.movie}`,
      movie: transformedMovie,
      episodes: result.episodes,
      isUpdate: result.isUpdate,
    });
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
  // Crawl
  crawlMoviesByPage,
  searchMoviesForCrawl,
  crawlMovieBySlug,
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
