const movieService = require('../services/movie.service');

/**
 * GET /movies
 * Get all movies with filters and pagination
 * @param {Object} req.query - { page?, limit?, genre?, country?, year?, sort? }
 * @returns {Object} { data: Array, pagination: Object }
 */
const getAll = async (req, res) => {
  try {
    const result = await movieService.getAll(req.query, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/:id
 * Get movie by ID (supports slug or ObjectId)
 * @param {string} req.params.id - Movie ID or slug
 * @returns {Object} Movie object
 */
const getById = async (req, res) => {
  try {
    const movie = await movieService.getById(req.params.id);
    res.json(movie);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * GET /movies/trending/now
 * Get trending movies ordered by view count
 * @param {number} req.query.limit - Limit number of results (default: 10)
 * @returns {Object} { data: Array }
 */
const getTrending = async (req, res) => {
  try {
    const result = await movieService.getTrending(Number(req.query.limit) || 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/top/rated
 * Get top rated movies
 * @param {number} req.query.limit - Limit number of results (default: 10)
 * @returns {Object} { data: Array }
 */
const getTopRated = async (req, res) => {
  try {
    const result = await movieService.getTopRated(Number(req.query.limit) || 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/new/releases
 * Get latest movies
 * @param {number} req.query.limit - Limit number of results (default: 10)
 * @returns {Object} { data: Array }
 */
const getNewReleases = async (req, res) => {
  try {
    const result = await movieService.getNewReleases(Number(req.query.limit) || 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/genre/:genre
 * Get movies filtered by genre
 * @param {string} req.params.genre - Genre
 * @param {Object} req.query - { page?, limit? }
 */
const getByGenre = async (req, res) => {
  try {
    const result = await movieService.getByGenre(req.params.genre, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/meta/filters
 * Get available genres & countries for filtering
 */
const getFilters = async (_req, res) => {
  try {
    const data = await movieService.getFilterOptions();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/country/:country
 * Get movies filtered by country
 * @param {string} req.params.country - country slug
 */
const getByCountry = async (req, res) => {
  try {
    const result = await movieService.getByCountry(req.params.country, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/type/:type
 * Filter movies by type (single/series)
 */
const getByType = async (req, res) => {
  try {
    if (!['single', 'series'].includes(req.params.type)) {
      throw new Error('Invalid movie type. Use "single" or "series"');
    }
    const result = await movieService.getByType(req.params.type, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    const status = error.message.includes('Invalid movie type') ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

/**
 * GET /movies/search/query
 * Search movies
 * @param {string} req.query.q - Search query
 * @param {Object} req.query - { page?, limit? }
 */
const search = async (req, res) => {
  try {
    const result = await movieService.search(req.query.q || '', {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/:id/episodes
 * Get all episodes of a movie
 * @param {string} req.params.id - Movie ID or slug
 */
const getEpisodes = async (req, res) => {
  try {
    const episodes = await movieService.getEpisodes(req.params.id, req.query.season);
    res.json({ data: episodes });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * GET /movies/:id/cast
 * Get cast list
 * @param {string} req.params.id - Movie ID or slug
 */
const getCast = async (req, res) => {
  try {
    const cast = await movieService.getCast(req.params.id);
    res.json({ data: cast });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * GET /movies/:id/comments
 * Get comments with pagination
 * @param {string} req.params.id - Movie ID or slug
 * @param {Object} req.query - { page?, limit? }
 */
const getComments = async (req, res) => {
  try {
    const comments = await movieService.getComments(req.params.id, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(comments);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * POST /movies/:id/comments
 * Post comment (requires authentication)
 * @param {string} req.params.id - Movie ID or slug
 * @param {Object} req.body - { content, episodeId? }
 * @param {Object} req.user - Authed user
 */
const postComment = async (req, res) => {
  try {
    const newComment = await movieService.postComment(
      req.params.id,
      req.user?._id || null,
      req.body,
    );
    res.status(201).json(newComment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * POST /movies/:id/rate
 * Rate movie (requires authentication)
 * @param {string} req.params.id - Movie ID or slug
 * @param {number} req.body.rating - 1-10
 */
const rateMovie = async (req, res) => {
  try {
    const result = await movieService.rateMovie(
      req.params.id,
      req.user?._id || null,
      req.body.rating,
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * POST /comments/:commentId/like
 * Like a comment (requires authentication)
 * @param {string} req.params.commentId - Comment ID
 * @param {Object} req.body - { isCurrentlyLiked?: boolean, isCurrentlyDisliked?: boolean }
 * @param {Object} req.user - Authed user
 */
const likeComment = async (req, res) => {
  try {
    console.log('[Like Comment] Request:', {
      commentId: req.params.commentId,
      userId: req.user?._id,
      body: req.body,
      path: req.path,
      url: req.url,
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await movieService.likeComment(
      req.params.commentId,
      req.user._id,
      req.body.isCurrentlyLiked || false,
      req.body.isCurrentlyDisliked || false,
    );
    res.json(result);
  } catch (error) {
    console.error('[Like Comment] Error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ message: error.message });
  }
};

/**
 * POST /comments/:commentId/dislike
 * Dislike a comment (requires authentication)
 * @param {string} req.params.commentId - Comment ID
 * @param {Object} req.body - { isCurrentlyDisliked?: boolean, isCurrentlyLiked?: boolean }
 * @param {Object} req.user - Authed user
 */
const dislikeComment = async (req, res) => {
  try {
    console.log('[Dislike Comment] Request:', {
      commentId: req.params.commentId,
      userId: req.user?._id,
      body: req.body,
      path: req.path,
      url: req.url,
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await movieService.dislikeComment(
      req.params.commentId,
      req.user._id,
      req.body.isCurrentlyDisliked || false,
      req.body.isCurrentlyLiked || false,
    );
    res.json(result);
  } catch (error) {
    console.error('[Dislike Comment] Error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ message: error.message });
  }
};

/**
 * DELETE /comments/:commentId
 * Delete a comment (requires authentication)
 * Only the comment owner can delete their own comment
 * @param {string} req.params.commentId - Comment ID
 * @param {Object} req.user - Authed user
 */
const deleteComment = async (req, res) => {
  try {
    console.log('[Delete Comment] Request:', {
      commentId: req.params.commentId,
      userId: req.user?._id,
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await movieService.deleteComment(req.params.commentId, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('[Delete Comment] Error:', error);
    const statusCode = error.message.includes('not found')
      ? 404
      : error.message.includes('only delete')
      ? 403
      : 400;
    res.status(statusCode).json({ message: error.message });
  }
};

module.exports = {
  getAll,
  getById,
  getTrending,
  getTopRated,
  getNewReleases,
  getByGenre,
  getByCountry,
  getByType,
  getFilters,
  search,
  getEpisodes,
  getCast,
  getComments,
  postComment,
  rateMovie,
  likeComment,
  dislikeComment,
  deleteComment,
};
