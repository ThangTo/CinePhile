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
      isHidden,
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
      isHidden,
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
 * PATCH /admin/movies/:id/toggle-hidden
 * Toggle movie hidden status (hide/unhide)
 */
const toggleMovieHidden = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.toggleMovieHidden(id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * POST /admin/movies/hide-all
 * Hide all movies
 */
const hideAllMovies = async (req, res) => {
  try {
    const result = await adminService.hideAllMovies();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/movies/unhide-all
 * Unhide all movies
 */
const unhideAllMovies = async (req, res) => {
  try {
    const result = await adminService.unhideAllMovies();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
 * Search movies by name (advanced filters)
 */
const searchMoviesForCrawl = async (req, res) => {
  try {
    const { movieName, page, sort_field, sort_type, sort_lang, category, country, year, limit } =
      req.body;
    const { searchMovies } = require('../services/crawler.service');

    if (!movieName || !movieName.trim()) {
      return res.status(400).json({ message: 'Movie name is required' });
    }

    const options = {
      page,
      sort_field,
      sort_type,
      sort_lang,
      category,
      country,
      year,
      limit,
    };

    const movies = await searchMovies(movieName.trim(), options);
    res.json({ movies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/movies/crawl/by-genre
 * Search movies by genre/category
 */
const searchMoviesByGenre = async (req, res) => {
  try {
    const { type_list, page, sort_field, sort_type, sort_lang, country, year, limit } = req.body;
    const { searchMoviesByGenre } = require('../services/crawler.service');

    if (!type_list || !type_list.trim()) {
      return res.status(400).json({ message: 'Genre type_list is required' });
    }

    // Chỉ truyền các tham số có giá trị (không truyền undefined hoặc empty string)
    const options = {
      page: page || 1,
      sort_field: sort_field || '_id',
      sort_type: sort_type || 'asc',
      limit: limit || 10,
    };

    // Chỉ thêm các tham số optional nếu có giá trị
    if (sort_lang && sort_lang.trim()) {
      options.sort_lang = sort_lang.trim();
    }
    if (country && country.trim()) {
      options.country = country.trim();
    }
    if (year && year.toString().trim()) {
      options.year = year.toString().trim();
    }

    const movies = await searchMoviesByGenre(type_list.trim(), options);

    res.json({ movies: movies || [] });
  } catch (error) {
    console.error('Error in searchMoviesByGenre controller:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: error.message || 'Failed to search movies by genre',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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

/**
 * GET /admin/settings/theme
 * Get current theme setting
 */
const getTheme = async (req, res) => {
  try {
    const theme = await adminService.getTheme();
    res.json({ theme });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /admin/settings/theme
 * Update theme setting
 */
const setTheme = async (req, res) => {
  try {
    const { theme } = req.body;
    if (!theme) {
      return res.status(400).json({ message: 'Theme is required' });
    }
    await adminService.setTheme(theme);
    res.json({ message: 'Theme updated successfully', theme });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/movies/updating
 * Get movies for update modal (episodes or quality tab)
 */
const getUpdatingMovies = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, quality } = req.query;
    const result = await adminService.getUpdatingMovies({ page, limit, search, quality });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /admin/movies/update-episodes
 * Update episodes for selected movies
 */
const updateEpisodesForMovies = async (req, res) => {
  try {
    const { movieIds, onlyNewEpisodes = false } = req.body;

    if (!movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({ message: 'Movie IDs array is required' });
    }

    // Set up Server-Sent Events for real-time progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Flush headers immediately
    res.flushHeaders();

    // Progress callback to send logs
    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // Flush response to send data immediately
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Run update in background
    adminService
      .updateEpisodesForMovies(movieIds, onProgress, onlyNewEpisodes)
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
 * POST /admin/movies/update-quality
 * Update quality for CAM movies (upgrade to HD)
 */
const updateQualityForMovies = async (req, res) => {
  try {
    const { movieIds } = req.body;

    if (!movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({ message: 'Movie IDs array is required' });
    }

    // Set up Server-Sent Events for real-time progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Flush headers immediately
    res.flushHeaders();

    // Progress callback to send logs
    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // Flush response to send data immediately
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Run update in background
    adminService
      .updateQualityForMovies(movieIds, onProgress)
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

module.exports = {
  // Movies
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  toggleMovieHidden,
  hideAllMovies,
  unhideAllMovies,
  searchMovies,
  // Crawl
  crawlMoviesByPage,
  searchMoviesForCrawl,
  searchMoviesByGenre,
  crawlMovieBySlug,
  // Episodes
  getUpdatingMovies,
  updateEpisodesForMovies,
  updateQualityForMovies,
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
  // Settings
  getTheme,
  setTheme,
};
