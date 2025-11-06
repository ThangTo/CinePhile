const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');

// GET /api/v1/movies - Get all movies with filters
router.get('/', movieController.getAll);

// GET /api/v1/movies/:id - Get movie by ID
router.get('/:id', movieController.getById);

// GET /api/v1/movies/trending/now - Get trending movies
router.get('/trending/now', movieController.getTrending);

// GET /api/v1/movies/top/rated - Get top rated movies
router.get('/top/rated', movieController.getTopRated);

// GET /api/v1/movies/new/releases - Get new releases
router.get('/new/releases', movieController.getNewReleases);

// GET /api/v1/movies/genre/:genre - Get movies by genre
router.get('/genre/:genre', movieController.getByGenre);

// GET /api/v1/movies/search/query - Search movies
router.get('/search/query', movieController.search);

// GET /api/v1/movies/:id/episodes - Get movie episodes
router.get('/:id/episodes', movieController.getEpisodes);

// GET /api/v1/movies/:id/cast - Get movie cast
router.get('/:id/cast', movieController.getCast);

// GET /api/v1/movies/:id/comments - Get movie comments
router.get('/:id/comments', movieController.getComments);

// POST /api/v1/movies/:id/comments - Post comment
router.post('/:id/comments', movieController.postComment);

// POST /api/v1/movies/:id/rate - Rate movie
router.post('/:id/rate', movieController.rateMovie);

module.exports = router;
