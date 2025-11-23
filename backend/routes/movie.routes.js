const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');

// IMPORTANT: Routes with specific paths must be defined BEFORE routes with parameters
// Otherwise Express will match /:id first and treat "trending", "top", etc. as IDs

// GET /api/v1/movies - Get all movies with filters
router.get('/', movieController.getAll);

// GET /api/v1/movies/trending/now - Get trending movies (must be before /:id)
router.get('/trending/now', movieController.getTrending);

// GET /api/v1/movies/top/rated - Get top rated movies (must be before /:id)
router.get('/top/rated', movieController.getTopRated);

// GET /api/v1/movies/new/releases - Get new releases (must be before /:id)
router.get('/new/releases', movieController.getNewReleases);

// GET /api/v1/movies/search/query - Search movies (must be before /:id)
router.get('/search/query', movieController.search);

// GET /api/v1/movies/genre/:genre - Get movies by genre (must be before /:id)
router.get('/genre/:genre', movieController.getByGenre);

// GET /api/v1/movies/:id/episodes - Get movie episodes (must be before /:id)
router.get('/:id/episodes', movieController.getEpisodes);

// GET /api/v1/movies/:id/cast - Get movie cast (must be before /:id)
router.get('/:id/cast', movieController.getCast);

// GET /api/v1/movies/:id/comments - Get movie comments (must be before /:id)
router.get('/:id/comments', movieController.getComments);

// POST /api/v1/movies/:id/comments - Post comment
router.post('/:id/comments', movieController.postComment);

// POST /api/v1/movies/:id/rate - Rate movie
router.post('/:id/rate', movieController.rateMovie);

// GET /api/v1/movies/:id - Get movie by ID (must be LAST to avoid conflicts)
router.get('/:id', movieController.getById);

module.exports = router;
