const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminQuestController = require('../controllers/admin.quest.controller');
const thumbnailController = require('../controllers/thumbnail.controller');
const castController = require('../controllers/cast.controller');
const tiktokController = require('../controllers/tiktok.controller');
const playbackController = require('../controllers/playback.controller');
const hlsLabController = require('../controllers/hlsLab.controller');

const authMiddleware = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

// All admin routes require authentication first, then check admin role
router.use(authMiddleware);
router.use(isAdmin);

// ===== ADMIN TIKTOK =====
router.post('/tiktok/download-segment', tiktokController.downloadSegment);
router.get('/tiktok/download-segment/status/:jobId', tiktokController.getDownloadStatus);
router.get('/tiktok/download/:filename', tiktokController.getFile);

const adminCommentRoutes = require('./admin.comment.routes');

// ===== ADMIN COMMENTS =====
router.use('/comments', adminCommentRoutes);

// ===== ADMIN PLAYBACK METADATA =====
router.get('/playback/episodes', playbackController.listPlaybackEpisodes);
router.patch('/playback/episodes/:episodeId', playbackController.updateEpisodePlaybackMeta);
router.post('/playback/detect-intro', playbackController.detectIntro);
router.get('/playback/intro-batches', playbackController.listIntroDetectionBatches);
router.get('/playback/intro-batches/latest', playbackController.getLatestIntroDetectionBatch);
router.get('/playback/intro-batches/stats', playbackController.getIntroDetectionBatchStats);
router.get('/playback/intro-batches/preview', playbackController.getIntroDetectionBatchPreview);
router.get('/playback/intro-batches/:batchId/movies', playbackController.listIntroDetectionBatchMovies);
router.get('/playback/intro-batches/:batchId', playbackController.getIntroDetectionBatch);
router.get('/playback/detect-intro/:jobId', playbackController.getIntroDetectionStatus);

// ===== ADMIN HLS LAB =====
router.get('/hls-lab/inspect', hlsLabController.inspectPlaylist);
router.get('/hls-lab/playlist', hlsLabController.previewPlaylist);
router.post('/hls-lab/snippet', hlsLabController.processSnippet);

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

// POST /api/v1/admin/movies/crawl/by-genre - Search movies by genre/category
router.post('/movies/crawl/by-genre', adminController.searchMoviesByGenre);

// POST /api/v1/admin/movies/crawl/by-slug - Crawl a single movie by slug
router.post('/movies/crawl/by-slug', adminController.crawlMovieBySlug);

// ===== ADMIN MOVIES EPISODES UPDATE =====
// GET /api/v1/admin/movies/updating - Get movies with ongoing/upcoming status
router.get('/movies/updating', adminController.getUpdatingMovies);

// POST /api/v1/admin/movies/update-episodes - Update episodes for selected movies
router.post('/movies/update-episodes', adminController.updateEpisodesForMovies);

// POST /api/v1/admin/movies/update-quality - Update quality for CAM movies
router.post('/movies/update-quality', adminController.updateQualityForMovies);

// ===== ADMIN THUMBNAILS =====
// POST /api/v1/admin/thumbnails/process - Process movies (download video + generate thumbnails)
router.post('/thumbnails/process', thumbnailController.processMovies);

// GET /api/v1/admin/movies/:id - Get movie by ID (Must be after /movies/crawl routes)
router.get('/movies/:id', adminController.getMovieById);

// POST /api/v1/admin/movies - Create movie
router.post('/movies', adminController.createMovie);

// PUT /api/v1/admin/movies/:id - Update movie
router.put('/movies/:id', adminController.updateMovie);

// DELETE /api/v1/admin/movies/:id - Delete movie
router.delete('/movies/:id', adminController.deleteMovie);

// PATCH /api/v1/admin/movies/:id/toggle-hidden - Toggle movie hidden status
router.patch('/movies/:id/toggle-hidden', adminController.toggleMovieHidden);

// PATCH /api/v1/admin/movies/:id/toggle-featured - Toggle movie featured/banner status
router.patch('/movies/:id/toggle-featured', adminController.toggleMovieFeatured);

// POST /api/v1/admin/movies/hide-all - Hide all movies
router.post('/movies/hide-all', adminController.hideAllMovies);

// POST /api/v1/admin/movies/unhide-all - Unhide all movies
router.post('/movies/unhide-all', adminController.unhideAllMovies);

// ===== ADMIN USERS =====
// GET /api/v1/admin/users - Get all users
router.get('/users', adminController.getAllUsers);

// GET /api/v1/admin/users/:id - Get user by ID
router.get('/users/:id', adminController.getUserById);

// GET /api/v1/admin/users/:id/analytics - Get specific user's watch analytics
router.get('/users/:id/analytics', adminController.getUserAnalytics);

// GET /api/v1/admin/users/:id/streak - Get specific user's watch streak
router.get('/users/:id/streak', adminController.getUserStreak);

// GET /api/v1/admin/users/:id/quests - Get specific user's quest summary
router.get('/users/:id/quests', adminController.getUserQuestSummary);

// POST /api/v1/admin/users - Create user
router.post('/users', adminController.createUser);

// PUT /api/v1/admin/users/:id - Update user
router.put('/users/:id', adminController.updateUser);

// POST /api/v1/admin/users/:id/coins - Adjust user coins
router.post('/users/:id/coins', adminController.adjustUserCoins);

// DELETE /api/v1/admin/users/:id - Delete user
router.delete('/users/:id', adminController.deleteUser);

// PATCH /api/v1/admin/users/:id/toggle-status - Toggle user status
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);

// ===== ADMIN STATS =====
// GET /api/v1/admin/stats - Get dashboard statistics
router.get('/stats', adminController.getStats);

// GET /api/v1/admin/stats/charts/:type - Get chart data
router.get('/stats/charts/:type', adminController.getChartData);

// GET /api/v1/admin/analytics/realtime - Get realtime active users
router.get('/analytics/realtime', adminController.getRealtimeActiveUsers);

// GET /api/v1/admin/analytics/visits - Get today/week/month visits
router.get('/analytics/visits', adminController.getRealtimeVisits);

// GET /api/v1/admin/analytics/locations - Get map locations
router.get('/analytics/locations', adminController.getAnalyticsLocations);

// GET /api/v1/admin/analytics/trending - Get top trending movies by timeframe
router.get('/analytics/trending', adminController.getTrendingMovies);

// GET /api/v1/admin/analytics/historical - Get historical visits by granularity + date range
router.get('/analytics/historical', adminController.getHistoricalVisits);

// GET /api/v1/admin/analytics/summary - Get all-time cumulative totals
router.get('/analytics/summary', adminController.getAnalyticsSummary);

// GET /api/v1/admin/analytics/unique - Get TRUE unique visitors by granularity + date range
router.get('/analytics/unique', adminController.getUniqueVisits);

// GET /api/v1/admin/analytics/unique-summary - Get all-time unique totals from PeriodAnalytics
router.get('/analytics/unique-summary', adminController.getUniqueAnalyticsSummary);

// ===== ADMIN SETTINGS =====
// GET /api/v1/admin/settings/theme - Get current theme
router.get('/settings/theme', adminController.getTheme);

// PUT /api/v1/admin/settings/theme - Update theme
router.put('/settings/theme', adminController.setTheme);

// GET /api/v1/admin/settings/features - Get feature permissions
router.get('/settings/features', adminController.getFeaturePermissions);

// PUT /api/v1/admin/settings/features - Update feature permissions
router.put('/settings/features', adminController.updateFeaturePermissions);

// GET /api/v1/admin/colab-url - Get current Colab Whisper URL
router.get('/colab-url', adminController.getColabUrl);

// POST /api/v1/admin/colab-url - Update Colab Whisper URL
router.post('/colab-url', adminController.updateColabUrl);

// GET /api/v1/admin/subtitles/requests - Get episodes requiring subtitles sorted by request count
router.get('/subtitles/requests', adminController.getSubtitleRequests);

// ===== ADMIN PRICING =====
// Note: GET routes are public (in app.js) — anyone can read coin packages & premium plans.
// Only write operations (POST/PUT/DELETE) require admin role.

// POST /api/v1/admin/pricing/coin-packages  (upsert)
router.post('/pricing/coin-packages', adminController.upsertCoinPackage);

// PUT /api/v1/admin/pricing/coin-packages/reorder
router.put('/pricing/coin-packages/reorder', adminController.reorderCoinPackages);

// DELETE /api/v1/admin/pricing/coin-packages/:id
router.delete('/pricing/coin-packages/:id', adminController.deleteCoinPackage);

// POST /api/v1/admin/pricing/premium-plans  (upsert)
router.post('/pricing/premium-plans', adminController.upsertPremiumPlan);

// DELETE /api/v1/admin/pricing/premium-plans/:id
router.delete('/pricing/premium-plans/:id', adminController.deletePremiumPlan);

// POST /api/v1/admin/pricing/seed - Seed default pricing
router.post('/pricing/seed', adminController.seedPricingSettings);

// ===== ADMIN QUESTS =====
// GET /api/v1/admin/quests/config
router.get('/quests/config', adminQuestController.getAdminQuestConfig);

// PUT /api/v1/admin/quests/config/:type
router.put('/quests/config/:type', adminQuestController.updateQuestConfig);

// POST /api/v1/admin/quests/templates
router.post('/quests/templates', adminQuestController.upsertQuestTemplate);

// DELETE /api/v1/admin/quests/templates/:id
router.delete('/quests/templates/:id', adminQuestController.archiveQuestTemplate);

// ===== ADMIN CASTS =====
// GET /api/v1/admin/casts - Get all casts
router.get('/casts', castController.getAllCasts);

// GET /api/v1/admin/casts/:id - Get cast by ID
router.get('/casts/:id', castController.getCastById);

// POST /api/v1/admin/casts - Create cast
router.post('/casts', castController.createCast);

// PUT /api/v1/admin/casts/:id - Update cast
router.put('/casts/:id', castController.updateCast);

// DELETE /api/v1/admin/casts/:id - Delete cast
router.delete('/casts/:id', castController.deleteCast);

// function isAdmin(req, res, next) {
//   if (req.isAuthenticated() && (req.user.role === 'admin')) {
//     return next();
//   }
//   return res.redirect('/');
// }

module.exports = router;
