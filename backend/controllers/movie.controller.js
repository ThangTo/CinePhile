const movieService = require('../services/movie.service');

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
 * Helper: Build filters object from request query
 * @param {Object} req.query - Request query object
 * @returns {Object} Filters object
 */
const buildFiltersFromQuery = (query) => {
  const parsedGenres = parseArrayParam(query.genres);
  const parsedCountries = parseArrayParam(query.countries);
  const parsedYear = parseArrayParam(query.year);
  const parsedAgeRating = parseArrayParam(query.ageRating);
  const parsedLang = parseArrayParam(query.lang);

  return {
    ...(parsedGenres && { genres: parsedGenres }),
    ...(parsedCountries && { countries: parsedCountries }),
    ...(parsedYear && { year: parsedYear }),
    ...(query.yearFrom && { yearFrom: query.yearFrom }),
    ...(query.yearTo && { yearTo: query.yearTo }),
    ...(query.quality && { quality: query.quality }),
    ...(query.type && { type: query.type }),
    ...(query.subType && { subType: query.subType }),
    ...(parsedAgeRating && { ageRating: parsedAgeRating }),
    ...(query.status && { status: query.status }),
    ...(query.ratingMin && { ratingMin: query.ratingMin }),
    ...(query.ratingMax && { ratingMax: query.ratingMax }),
    ...(parsedLang && { lang: parsedLang }),
  };
};

/**
 * GET /movies
 * Get all movies with filters and pagination
 * @param {Object} req.query - { page?, limit?, genre?, country?, year?, sort? }
 * @returns {Object} { data: Array, pagination: Object }
 */
const getAll = async (req, res) => {
  try {
    const filters = buildFiltersFromQuery(req.query);

    const result = await movieService.getAll(filters, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort || 'newest',
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
    // Check if user is admin
    const isAdmin = req.user?.role === 'admin';
    const movie = await movieService.getById(req.params.id, { isAdmin });
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
 * @param {Object} req.query - { page?, limit?, genres?, countries?, year?, yearFrom?, yearTo?, quality?, type?, ageRating?, status?, ratingMin?, ratingMax? }
 */
const getByGenre = async (req, res) => {
  try {
    const filters = {
      genre: req.params.genre,
      ...buildFiltersFromQuery(req.query),
    };
    const result = await movieService.getByGenre(req.params.genre, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort || 'newest',
      ...filters,
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
 * GET /movies/meta/top-genres
 * Get top genres by total view count
 * @param {number} req.query.limit - Number of genres to return (default: 10)
 */
const getTopGenres = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topGenres = await movieService.getTopGenresByViews(limit);
    res.json({ genres: topGenres });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/v1/movies/meta/theme
 * Get current theme setting (public endpoint)
 */
const getTheme = async (req, res) => {
  try {
    const adminService = require('../services/admin.service');
    const theme = await adminService.getTheme();
    res.json({ theme });
  } catch (error) {
    // Fallback to default if error
    res.json({ theme: 'default' });
  }
};

/**
 * GET /movies/country/:country
 * Get movies filtered by country
 * @param {string} req.params.country - country slug
 * @param {Object} req.query - { page?, limit?, genres?, countries?, year?, yearFrom?, yearTo?, quality?, type?, ageRating?, status?, ratingMin?, ratingMax? }
 */
const getByCountry = async (req, res) => {
  try {
    const filters = {
      country: req.params.country,
      ...buildFiltersFromQuery(req.query),
    };
    const result = await movieService.getByCountry(req.params.country, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort || 'newest',
      ...filters,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/type/:type
 * Filter movies by type (single/series)
 * @param {Object} req.query - { page?, limit?, genres?, countries?, year?, yearFrom?, yearTo?, quality?, ageRating?, status?, ratingMin?, ratingMax? }
 */
const getByType = async (req, res) => {
  try {
    const typeParam = req.params.type;
    const allowed = ['single', 'series', 'hoathinh', 'tvshows'];
    if (!allowed.includes(typeParam)) {
      throw new Error('Invalid movie type. Use "single", "series", "hoathinh" or "tvshows"');
    }

    const baseFilters = buildFiltersFromQuery(req.query);
    const result = await movieService.getByType(typeParam, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort || 'newest',
      type: typeParam,
      ...baseFilters,
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
    const filters = buildFiltersFromQuery(req.query);

    const result = await movieService.search(req.query.q || '', {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort || 'newest',
      ...filters,
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
    // Check if user is admin
    const isAdmin = req.user?.role === 'admin';
    const episodes = await movieService.getEpisodes(req.params.id, { isAdmin });
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
 * POST /movies/:id/view
 * Increment view count for a movie (no authentication required)
 * @param {string} req.params.id - Movie ID or slug
 */
const incrementView = async (req, res) => {
  try {
    const result = await movieService.incrementView(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
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
 * GET /movies/:id/ratings
 * Get ratings list for a movie
 * @param {string} req.params.id - Movie ID or slug
 * @param {Object} req.query - { page?, limit? }
 */
const getRatings = async (req, res) => {
  try {
    const ratings = await movieService.getRatings(req.params.id, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(ratings);
  } catch (error) {
    res.status(404).json({ message: error.message });
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

/**
 * GET /movies/:id/recommendations
 * Get recommended movies based on a movie
 * @param {string} req.params.id - Movie ID or slug
 * @param {number} req.query.limit - Limit number of results (default: 10)
 * @returns {Object} { data: Array }
 */
const getRecommendations = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const result = await movieService.getRecommendations(req.params.id, limit);

    res.json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * GET /movies/for-you
 * Get personalized movie recommendations based on user's watch history
 * Requires authentication
 * @param {number} req.query.limit - Limit number of results (default: 20)
 * @returns {Object} { data: Array }
 */
const getForYou = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const limit = Number(req.query.limit) || 20;
    const result = await movieService.getForYou(req.user._id, limit);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /movies/proxy-m3u8
 * Proxy M3U8 stream to filter out advertisements
 * @param {string} req.query.url - Taget M3U8 URL
 */
const proxyM3u8 = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

    // Use native fetch to get the M3U8 content
    let currentUrl = url;
    let response = await fetch(currentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U8: ${response.statusText}`);
    }
    let content = await response.text();

    // PHASE 1: Handle Master Playlist redirection
    if (content.includes('#EXT-X-STREAM-INF')) {
      const lines = content.split('\n');
      let maxBandwidth = 0;
      let bestUri = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('BANDWIDTH=')) {
          const match = lines[i].match(/BANDWIDTH=(\d+)/);
          const bandwidth = match ? parseInt(match[1], 10) : 0;
          
          const nextLine = (lines[i + 1] || '').trim();
          if (nextLine && !nextLine.startsWith('#') && bandwidth > maxBandwidth) {
            maxBandwidth = bandwidth;
            bestUri = nextLine;
          }
        }
      }

      if (bestUri) {
        currentUrl = new URL(bestUri, currentUrl).toString();
        response = await fetch(currentUrl);
        if (!response.ok) {
           throw new Error(`Failed to fetch nested M3U8: ${response.statusText}`);
        }
        content = await response.text();
      }
    }

    // PHASE 2: Filter Ads and Rewrite Links
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Check for ad segments
      if (line.startsWith('#EXTINF')) {
        let nextLine = (lines[i + 1] || '').trim();
        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));
          if (isAd) {
            skipNext = true;
            continue;
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      // Rewrite URL and convertv7 logic
      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          line = new URL(line, baseUrl).toString();
        }
        if (line.includes('convertv7/')) {
          line = line.replace('convertv7/', '');
        }
      }
      cleanLines.push(line);
    }

    const cleanContent = cleanLines.join('\n');

    // Send the filtered M3U8 playlist back to the client
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    // Prevent client/CDN caching of this stream to avoid stale playlists
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    res.send(cleanContent);
  } catch (error) {
    console.error('[proxyM3u8] Error:', error.message);
    res.status(500).send('Error processing M3U8 stream');
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
  getTopGenres,
  getTheme,
  search,
  getEpisodes,
  getCast,
  getComments,
  postComment,
  rateMovie,
  getRatings,
  incrementView,
  likeComment,
  dislikeComment,
  deleteComment,
  getRecommendations,
  getForYou,
  proxyM3u8,
};
