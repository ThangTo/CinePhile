const thumbnailService = require('../services/thumbnail.service');

/**
 * Process movies: Download video from m3u8 and generate thumbnails
 * POST /api/v1/admin/thumbnails/process
 * Body: { movieIds: string[], force: boolean }
 */
exports.processMovies = async (req, res) => {
  try {
    const { movieIds, force = false } = req.body;

    if (!movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'movieIds is required and must be a non-empty array',
      });
    }

    // Set up SSE (Server-Sent Events) for real-time progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Progress callback to send logs immediately
    const sendProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Run processing - use .then() pattern like other SSE endpoints
    thumbnailService
      .processMoviesParallel(movieIds, force, sendProgress)
      .then(() => {
        res.write(`data: ${JSON.stringify({ type: 'complete', total: movieIds.length })}\n\n`);
        res.end();
      })
      .catch((error) => {
        console.error('Error processing movies:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      });
  } catch (error) {
    console.error('Error in processMovies controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
