const path = require('path');
const fs = require('fs');
const { downloadVideoFromM3U8 } = require('../utils/video.util');
const Episode = require('../models/episode.model');
const Movie = require('../models/movie.model');

const downloadJobs = new Map();
const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_CONCURRENT_TIKTOK_DOWNLOADS = Math.max(
  1,
  Number.parseInt(process.env.TIKTOK_DOWNLOAD_MAX_CONCURRENT || '1', 10) || 1,
);
let activeTikTokDownloads = 0;

function normalizeJobId(jobId) {
  return typeof jobId === 'string' && jobId.trim() ? jobId.trim().slice(0, 120) : null;
}

function getInitialJobState() {
  const now = new Date().toISOString();
  return {
    status: 'pending',
    percent: 0,
    message: 'Dang cho xu ly...',
    url: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

function updateDownloadJob(jobId, patch) {
  if (!jobId) return;

  const current = downloadJobs.get(jobId) || getInitialJobState();
  downloadJobs.set(jobId, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function scheduleJobCleanup(jobId) {
  if (!jobId) return;
  const timer = setTimeout(() => {
    downloadJobs.delete(jobId);
  }, JOB_TTL_MS);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

exports.downloadSegment = async (req, res) => {
  let releaseDownloadSlot = null;

  try {
    const { movieId, episodeId, startTime, duration } = req.body;
    const jobId = normalizeJobId(req.body?.jobId);
    const normalizedStartTime = Math.max(0, Number(startTime) || 0);
    const normalizedDuration = Number(duration);

    if (jobId) {
      updateDownloadJob(jobId, getInitialJobState());
      scheduleJobCleanup(jobId);
    }

    if (!movieId || !episodeId) {
      updateDownloadJob(jobId, {
        status: 'failed',
        percent: 0,
        message: 'Thieu movieId hoac episodeId',
        error: 'Thieu movieId hoac episodeId',
      });
      return res.status(400).json({ success: false, message: 'Thiếu movieId hoặc episodeId' });
    }

    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
      updateDownloadJob(jobId, {
        status: 'failed',
        percent: 0,
        message: 'Thoi luong clip khong hop le',
        error: 'Thoi luong clip khong hop le',
      });
      return res.status(400).json({ success: false, message: 'Thoi luong clip khong hop le' });
    }

    if (activeTikTokDownloads >= MAX_CONCURRENT_TIKTOK_DOWNLOADS) {
      updateDownloadJob(jobId, {
        status: 'failed',
        percent: 0,
        message: 'Server dang tao clip khac, vui long thu lai sau',
        error: 'Too many active TikTok downloads',
      });
      return res.status(429).json({
        success: false,
        message: 'Server dang tao clip khac, vui long thu lai sau',
      });
    }

    activeTikTokDownloads += 1;
    let slotReleased = false;
    releaseDownloadSlot = () => {
      if (slotReleased) return;
      slotReleased = true;
      activeTikTokDownloads = Math.max(0, activeTikTokDownloads - 1);
    };

    // Prepare headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendProgress = (data) => {
      const percent = Number.isFinite(Number(data.percent)) ? Number(data.percent) : undefined;
      const status =
        data.type === 'complete' ? 'completed' : data.type === 'error' ? 'failed' : 'processing';

      updateDownloadJob(jobId, {
        status,
        ...(percent !== undefined ? { percent } : {}),
        ...(data.message ? { message: data.message } : {}),
        ...(data.url ? { url: data.url } : {}),
        ...(data.type === 'error' ? { error: data.message || 'Unknown error' } : {}),
      });

      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    const episode = await Episode.findOne({ _id: episodeId, movieId });
    if (!episode) {
      sendProgress({ type: 'error', message: 'Không tìm thấy tập phim' });
      releaseDownloadSlot();
      return res.end();
    }

    const m3u8Url = episode.link_m3u8 || episode.link_embed;
    if (!m3u8Url || !m3u8Url.includes('m3u8')) {
      sendProgress({ type: 'error', message: 'Không có m3u8Url hợp lệ để tải' });
      releaseDownloadSlot();
      return res.end();
    }

    const tempDir = path.join(__dirname, '../temp_output/tiktok');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = `tiktok_${movieId}_${episodeId}_${Date.now()}.mp4`;
    const outputPath = path.join(tempDir, filename);

    sendProgress({ type: 'progress', percent: 1, message: 'Dang chuan bi clip...' });

    downloadVideoFromM3U8(m3u8Url, outputPath, {
      startTime: normalizedStartTime,
      duration: normalizedDuration,
      sendProgress
    })
      .then((finalPath) => {
        sendProgress({ type: 'progress', percent: 100, message: 'Da tao clip thanh cong!' });
        sendProgress({ 
          type: 'complete', 
          percent: 100,
          url: `/api/v1/admin/tiktok/download/${filename}` 
        });
        res.end();
      })
      .catch((error) => {
        console.error('Error downloading TikTok segment:', error);
        sendProgress({ type: 'error', message: `Lỗi tải video: ${error.message}` });
        res.end();
      })
      .finally(() => {
        releaseDownloadSlot();
      });

  } catch (error) {
    if (releaseDownloadSlot) {
      releaseDownloadSlot();
    }
    console.error('Error in downloadSegment controller:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
};

exports.getDownloadStatus = (req, res) => {
  const jobId = normalizeJobId(req.params.jobId);
  const job = jobId ? downloadJobs.get(jobId) : null;

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Khong tim thay tien trinh tao clip',
    });
  }

  return res.json({
    success: true,
    job,
  });
};

exports.getFile = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../temp_output/tiktok', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Optionally delete file after download to save space
      // setTimeout(() => {
      //   if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      // }, 60000);
    });
  } else {
    res.status(404).json({ success: false, message: 'File không tồn tại hoặc đã bị xóa' });
  }
};
