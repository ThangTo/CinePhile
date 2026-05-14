const playbackMetadataService = require('../services/playbackMetadata.service');
const batchReportService = require('../services/introDetectionBatchReport.service');
const introDetectionBatchService = require('../services/introDetectionBatch.service');
const {
  addIntroDetectionJob,
  getIntroDetectionJobStatus,
} = require('../services/introDetectionQueue.service');

const listPlaybackEpisodes = async (req, res) => {
  try {
    const result = await playbackMetadataService.listPlaybackEpisodes(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEpisodePlaybackMeta = async (req, res) => {
  try {
    const result = await playbackMetadataService.updateEpisodePlaybackMeta(
      req.params.episodeId,
      req.body,
      req.user,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

const detectIntro = async (req, res) => {
  try {
    const { movieId, ...options } = req.body || {};
    if (!movieId) {
      return res.status(400).json({ success: false, message: 'Movie ID is required' });
    }

    const job = await addIntroDetectionJob(movieId, options);
    res.status(202).json({
      success: true,
      jobId: job.id,
      state: job.state,
      backend: job.backend,
      fallbackReason: job.fallbackReason,
      data: job.data,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

const getIntroDetectionStatus = async (req, res) => {
  try {
    const status = await getIntroDetectionJobStatus(req.params.jobId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Intro detection job not found' });
    }

    res.json({ success: true, job: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listIntroDetectionBatches = async (req, res) => {
  try {
    const result = await batchReportService.listIntroDetectionBatchRuns(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getIntroDetectionBatchStats = async (req, res) => {
  try {
    const result = await batchReportService.getIntroDetectionBatchStats(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getIntroDetectionBatchPreview = async (req, res) => {
  try {
    const preview = await introDetectionBatchService.getIntroDetectionBatchPreview(req.query);
    res.json({ success: true, preview });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getLatestIntroDetectionBatch = async (_req, res) => {
  try {
    const batch = await batchReportService.getLatestIntroDetectionBatchRun();
    res.json({ success: true, batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getIntroDetectionBatch = async (req, res) => {
  try {
    const batch = await batchReportService.getIntroDetectionBatchRun(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Intro detection batch not found' });
    }

    res.json({ success: true, batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listIntroDetectionBatchMovies = async (req, res) => {
  try {
    const result = await batchReportService.listIntroDetectionBatchMovies(
      req.params.batchId,
      req.query,
    );
    if (!result) {
      return res.status(404).json({ success: false, message: 'Intro detection batch not found' });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  detectIntro,
  getIntroDetectionBatch,
  getIntroDetectionBatchPreview,
  getIntroDetectionBatchStats,
  getLatestIntroDetectionBatch,
  getIntroDetectionStatus,
  listIntroDetectionBatchMovies,
  listIntroDetectionBatches,
  listPlaybackEpisodes,
  updateEpisodePlaybackMeta,
};
