const fs = require('fs');
const path = require('path');
const { cleanupTempFile } = require('../services/audio.service');
const { addClipJob, getJobStatus } = require('../services/videoQueue.service');
const { resolveViralClipPath } = require('../services/viralClipFile.service');
const Episode = require('../models/episode.model');

/**
 * POST /api/v1/generate-viral-clips
 *
 * Body: { movieId, m3u8Url, bgMusicUrl }
 *
 * Flow:
 *   1. Extract audio from HLS stream → temp .mp3
 *   2. Send .mp3 to Whisper → temp .vtt
 *   3. Read .vtt → analyze with LLM → JSON array of viral scenes
 *   4. Push each scene as a Bull queue job
 *   5. Return job IDs immediately (non-blocking)
 */
exports.generateViralClips = async (req, res) => {
  const {
    movieId,
    episodeId,
    audioType,
    m3u8Url: rawM3u8Url,
    bgMusicUrl,
    bgmStartTime,
    bgmDuration,
    subtitleEnabled,
    subtitleFont,
    subtitleFontSize,
    subtitleColor,
  } = req.body;
  const bgmFile = req.file;

  let m3u8Url = rawM3u8Url;

  // ── Validation & DB Fetching ──────────────────────────────────────────────
  if (!movieId) {
    return res.status(400).json({ success: false, error: 'Missing movieId' });
  }

  let mp3Path = null;
  let vttPath = null;

  try {
    // If episode details are provided, fetch from DB
    if (episodeId && audioType) {
      const episode = await Episode.findOne({ 
        movieId, 
        episodeId, 
        $or: [{ audioType: audioType }, { serverName: audioType }] 
      });
      if (!episode || !episode.link_m3u8) {
        return res.status(404).json({ success: false, error: 'Episode not found or missing m3u8 link' });
      }
      m3u8Url = episode.link_m3u8;
    }

    if (!m3u8Url) {
      return res.status(400).json({ success: false, error: 'Missing m3u8 URL or episode details' });
    }

    // Determine BGM source (prioritize uploaded file)
    let finalBgMusic = bgMusicUrl || '';
    if (bgmFile) {
      finalBgMusic = bgmFile.path;
    }

    // Use direct mode for server-side FFmpeg so only playlists go through the
    // local proxy; TS segments are fetched from source directly after ad filtering.
    const localPort = process.env.PORT || 5000;
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const proxyM3u8Url = `${protocol}://127.0.0.1:${localPort}/api/v1/movies/proxy-m3u8?url=${encodeURIComponent(m3u8Url)}&mode=direct`;
    // ── Enqueue Analysis Job ────────────────────────────────────────────
    console.log(`[ViralClip] Queueing analysis pipeline for movie: ${movieId}`);
    
    const { addAnalysisJob } = require('../services/analysisQueue.service');
    const job = await addAnalysisJob({
      movieId,
      proxyM3u8Url,
      finalBgMusic,
      bgmStartTime,
      bgmDuration,
      renderOptions: {
        subtitleEnabled,
        subtitleFont,
        subtitleFontSize,
        subtitleColor,
      },
    });

    console.log(`[ViralClip] Analysis job ${job.id} queued for movie: ${movieId}`);
    return res.status(200).json({
      success: true,
      message: 'Analysis job has been queued for processing',
      movieId,
      analysisJobId: job.id,
    });
  } catch (error) {
    if (bgmFile) cleanupTempFile(bgmFile.path);

    console.error(`[ViralClip] Failed to enqueue analysis for movie ${movieId}: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate viral clips',
      details: error.message,
    });
  }
};

/**
 * GET /api/v1/viral-clips/analysis-job/:jobId
 * Check the status of the analysis pipeline.
 */
exports.getAnalysisJobStatus = async (req, res) => {
  try {
    const { getAnalysisJobStatus } = require('../services/analysisQueue.service');
    const status = await getAnalysisJobStatus(req.params.jobId);
    
    if (!status) {
      return res.status(404).json({ success: false, error: 'Analysis job not found' });
    }

    return res.status(200).json({ success: true, job: status });
  } catch (error) {
    console.error(`[ViralClip] Failed to get analysis status: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to retrieve analysis status' });
  }
};

/**
 * GET /api/v1/viral-clips/job/:jobId
 *
 * Check the status of a specific clip rendering job.
 */
exports.getJobStatus = async (req, res) => {
  const { jobId } = req.params;

  try {
    const status = await getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: `Job ${jobId} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      job: status,
    });
  } catch (error) {
    console.error(`[ViralClip] Failed to get job status: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve job status',
    });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/viral-clips/file/:movieId/:filename
 *
 * Stream a rendered viral clip for preview/download.
 */
exports.getClipFile = async (req, res) => {
  try {
    const filePath = resolveViralClipPath(req.params.movieId, req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Clip file not found',
      });
    }

    const fileName = path.basename(filePath);
    const disposition = req.query.download ? 'attachment' : 'inline';

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.sendFile(filePath);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Convert a HH:MM:SS or MM:SS timestamp to seconds.
 */
function timestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}
