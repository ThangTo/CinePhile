const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const { extractAudioChunks, cleanupTempFile } = require('./audio.service');
const { speechToTextPipeline, getCacheKey } = require('./whisper.service');
const r2Service = require('./r2.service');
const Settings = require('../models/Settings');
const Episode = require('../models/episode.model');

const VTT_CACHE_DIR = path.join(__dirname, '..', 'temp_output', 'vtt_cache');
const FAILED_JOB_TTL_MS = 10 * 60 * 1000;
const READY_JOB_TTL_MS = 24 * 60 * 60 * 1000; // Cache local jobs for 24h
const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:8000';
const subtitleJobs = new Map();

function ensureCacheDir() {
  if (!fs.existsSync(VTT_CACHE_DIR)) {
    fs.mkdirSync(VTT_CACHE_DIR, { recursive: true });
  }
}

async function getColabUrl() {
  if (String(process.env.WHISPER_FORCE_LOCAL || '').toLowerCase() === 'true') {
    return null;
  }

  try {
    const setting = await Settings.findOne({ key: 'colab_whisper_url' });
    return setting ? setting.value : null;
  } catch (error) {
    return null;
  }
}

function toSubtitleUrl(language, fileName) {
  return `/subtitles/${language}/${encodeURIComponent(fileName)}`;
}

function getStableSubtitleCacheKey(videoUrl, language = 'ko', cacheIdentity = null) {
  if (cacheIdentity) {
    const stableHash = crypto
      .createHash('sha256')
      .update(String(cacheIdentity))
      .digest('hex');
    return `${stableHash}.${language}.v2.vtt`;
  }
  return getCacheKey(videoUrl, language);
}

function extractEpisodeIdFromCacheIdentity(cacheIdentity) {
  const value = String(cacheIdentity || '');
  const matched = value.match(/^episode:([0-9a-fA-F]{24})$/);
  return matched ? matched[1] : null;
}

async function clearSubtitleRequestCount(cacheIdentity) {
  const episodeId = extractEpisodeIdFromCacheIdentity(cacheIdentity);
  if (!episodeId) {
    return;
  }

  try {
    await Episode.findByIdAndUpdate(episodeId, { $set: { subtitleRequestCount: 0 } });
  } catch (error) {
    console.warn(
      `[SubtitleService] Failed to clear subtitleRequestCount for episode ${episodeId}: ${error.message}`,
    );
  }
}

async function ensureLocalWhisperReady() {
  try {
    await axios.get(`${WHISPER_API_URL}/health`, { timeout: 5000 });
  } catch (_error) {
    throw new Error(
      `Local Whisper server is unavailable at ${WHISPER_API_URL}. Please start Docker whisper service.`,
    );
  }
}

async function getCachedSubtitlePath(videoUrl, language = 'ko', cacheIdentity = null) {
  ensureCacheDir();
  const stableCacheKey = getStableSubtitleCacheKey(videoUrl, language, cacheIdentity);
  const stableCacheFile = path.join(VTT_CACHE_DIR, stableCacheKey);
  const legacyCacheKey = getCacheKey(videoUrl, language);
  const legacyCacheFile = path.join(VTT_CACHE_DIR, legacyCacheKey);
  
  if (fs.existsSync(stableCacheFile)) return stableCacheFile;

  if (
    legacyCacheKey !== stableCacheKey &&
    fs.existsSync(legacyCacheFile)
  ) {
    try {
      fs.copyFileSync(legacyCacheFile, stableCacheFile);
      return stableCacheFile;
    } catch (_error) {
      return legacyCacheFile;
    }
  }

  // Check R2 if not in local cache
  let r2Url = await r2Service.getSubtitleUrlIfMatch(stableCacheKey, language);
  if (!r2Url && legacyCacheKey !== stableCacheKey) {
    r2Url = await r2Service.getSubtitleUrlIfMatch(legacyCacheKey, language);
  }
  if (r2Url) {
    // Optional: download from R2 to local cache for faster subsequent access
    // For now, we'll just return null so the status logic knows it's on R2
    return 'R2:' + r2Url;
  }

  return null;
}

function updateJob(cacheKey, patch) {
  const current = subtitleJobs.get(cacheKey) || {};
  subtitleJobs.set(cacheKey, {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  });
}

function getActiveJob(cacheKey) {
  const job = subtitleJobs.get(cacheKey);
  if (!job) {
    return null;
  }

  const ttl = job.status === 'failed' ? FAILED_JOB_TTL_MS : READY_JOB_TTL_MS;
  if (job.status !== 'processing' && Date.now() - job.updatedAt > ttl) {
    subtitleJobs.delete(cacheKey);
    return null;
  }

  return job;
}

async function getSubtitleStatus(videoUrl, language = 'ko', cacheIdentity = null) {
  const cachedPath = await getCachedSubtitlePath(videoUrl, language, cacheIdentity);
  if (cachedPath) {
    await clearSubtitleRequestCount(cacheIdentity);

    const subtitleUrl = cachedPath.startsWith('R2:') 
      ? cachedPath.substring(3) 
      : toSubtitleUrl(language, path.basename(cachedPath));

    return {
      status: 'ready',
      progress: 100,
      subtitleUrl,
    };
  }

  const cacheKey = getStableSubtitleCacheKey(videoUrl, language, cacheIdentity);
  const job = getActiveJob(cacheKey);

  if (job?.status === 'processing') {
    return {
      status: 'processing',
      progress: Number.isFinite(job.progress) ? job.progress : 0,
      subtitleUrl: null,
    };
  }

  if (job?.status === 'failed') {
    return {
      status: 'failed',
      progress: 0,
      subtitleUrl: null,
      error: job.error || 'Failed to generate subtitle',
    };
  }

  if (job?.status === 'ready' && job.subtitleUrl) {
    return {
      status: 'ready',
      progress: 100,
      subtitleUrl: job.subtitleUrl,
    };
  }

  return {
    status: 'not_requested',
    progress: 0,
    subtitleUrl: null,
  };
}

async function runKoreanSubtitleGeneration(m3u8Url, fetchM3u8Url = null, chunkDurationSec = 60, cacheIdentity = null) {
  const cacheKey = getStableSubtitleCacheKey(m3u8Url, 'ko', cacheIdentity);
  const cacheFile = path.join(VTT_CACHE_DIR, cacheKey);
  const actualFetchUrl = fetchM3u8Url || m3u8Url;
  let audioChunks = null;
  const extractChunksWithFallback = async (durationSec, onProgress, fallbackProgress = 1) => {
    try {
      return await extractAudioChunks(actualFetchUrl, durationSec, onProgress);
    } catch (primaryError) {
      const canFallback = actualFetchUrl && m3u8Url && actualFetchUrl !== m3u8Url;
      if (!canFallback) {
        throw primaryError;
      }

      console.warn(
        `[SubtitleService] Proxy extraction failed, retrying original source. Error: ${primaryError.message}`,
      );

      updateJob(cacheKey, {
        status: 'processing',
        progress: Math.max(1, Number(fallbackProgress) || 1),
      });

      return extractAudioChunks(m3u8Url, durationSec, onProgress);
    }
  };

  updateJob(cacheKey, { status: 'processing', progress: 1, error: null });

  try {
    const colabUrl = await getColabUrl();
    
    if (colabUrl) {
      console.log(`[SubtitleService] Using Remote Colab Whisper at: ${colabUrl}`);
      
      // 1. Extract a single full audio file or first chunk for remote processing
      // To keep it simple and high quality, we'll extract the first 10 minutes or full if short
      // But for better results, let's extract the full audio as one mp3
      audioChunks = await extractChunksWithFallback(600, (progress) => {
        updateJob(cacheKey, { progress: Math.max(1, Math.min(20, Math.round(progress * 0.2))) });
      }, 5);

      // We'll just send the first chunk if multiple, or implement full audio extraction
      // For now, let's just use the local pipeline logic but replace the STT part
      
      // Actually, let's just use the existing chunking logic but call Colab for each chunk
      // to keep progress updates granular and handle long videos
      
      const vttChunks = [];
      for (let i = 0; i < audioChunks.files.length; i++) {
        const file = audioChunks.files[i];
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file));
        formData.append('language', 'ko');

        console.log(`[SubtitleService] Sending chunk ${i + 1} to Colab...`);
        const response = await axios.post(`${colabUrl}/transcribe`, formData, {
          headers: {
            ...formData.getHeaders(),
            'ngrok-skip-browser-warning': '69420', // Bypass ngrok warning page
          },
          timeout: 600000, // Increase to 10 minutes for large-v3
        });

        if (response.data && response.data.success) {
          console.log(`[SubtitleService] Chunk ${i + 1} transcribed successfully.`);
          vttChunks.push(response.data.vtt);
        } else {
          console.error(`[SubtitleService] Colab returned error for chunk ${i + 1}:`, response.data);
          throw new Error('Colab Whisper failed to transcribe audio');
        }
        
        const progress = 20 + Math.round(((i + 1) / audioChunks.files.length) * 70);
        updateJob(cacheKey, { progress });
      }

      // Merge and save
      let mergedVtt = vttChunks.join('\n\n').replace(/WEBVTT\n\n/g, '').trim();
      mergedVtt = 'WEBVTT\n\n' + mergedVtt;
      fs.writeFileSync(cacheFile, mergedVtt, 'utf-8');
    } else {
      // Local fallback
      await ensureLocalWhisperReady();

      audioChunks = await extractChunksWithFallback(chunkDurationSec, (progress) => {
        const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
        updateJob(cacheKey, {
          status: 'processing',
          progress: Math.max(1, Math.min(30, Math.round(safeProgress * 0.3))),
        });
      }, 5);

      const generatedCachePath = await speechToTextPipeline(
        audioChunks.files,
        m3u8Url, // Keep m3u8Url for consistent cacheKey
        chunkDurationSec,
        (progress) => {
          const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
          updateJob(cacheKey, {
            status: 'processing',
            progress: Math.min(99, Math.max(30, 30 + Math.round(safeProgress * 0.7))),
          });
        },
        'ko',
      );

      // speechToTextPipeline may cache by URL-based key; keep subtitle cache aligned
      // with our stable identity key (episode-based) to avoid regenerate loops.
      if (
        generatedCachePath &&
        generatedCachePath !== cacheFile &&
        fs.existsSync(generatedCachePath) &&
        !fs.existsSync(cacheFile)
      ) {
        fs.copyFileSync(generatedCachePath, cacheFile);
      }
    }

    if (!fs.existsSync(cacheFile)) {
      throw new Error('Korean subtitle cache file was not created');
    }

    // Upload to R2 after generation
    const r2Url = await r2Service.uploadSubtitle(cacheFile, cacheKey, 'ko');

    updateJob(cacheKey, {
      status: 'ready',
      progress: 100,
      subtitleUrl: r2Url || toSubtitleUrl('ko', cacheKey),
      error: null,
      promise: null,
    });

    await clearSubtitleRequestCount(cacheIdentity);
  } catch (error) {
    console.error('[SubtitleService] Generation error:', error.message);
    updateJob(cacheKey, {
      status: 'failed',
      progress: 0,
      error: error.message || 'Failed to generate Korean subtitles',
      promise: null,
    });
    throw error;
  } finally {
    if (audioChunks?.outDir) {
      cleanupTempFile(audioChunks.outDir);
    }
  }
}

async function requestKoreanSubtitleGeneration(
  m3u8Url,
  fetchM3u8Url = null,
  chunkDurationSec = 60,
  cacheIdentity = null,
) {
  ensureCacheDir();

  const currentStatus = await getSubtitleStatus(m3u8Url, 'ko', cacheIdentity);
  if (currentStatus.status === 'ready') {
    return currentStatus;
  }

  const cacheKey = getStableSubtitleCacheKey(m3u8Url, 'ko', cacheIdentity);
  const activeJob = getActiveJob(cacheKey);
  if (activeJob?.status === 'processing') {
    return {
      status: 'processing',
      progress: Number.isFinite(activeJob.progress) ? activeJob.progress : 0,
      subtitleUrl: null,
    };
  }

  const promise = runKoreanSubtitleGeneration(m3u8Url, fetchM3u8Url, chunkDurationSec, cacheIdentity).catch((error) => {
    console.error(`[SubtitleService] Failed to generate Korean subtitles: ${error.message}`);
  });

  updateJob(cacheKey, {
    status: 'processing',
    progress: 1,
    promise,
    error: null,
  });

  return {
    status: 'processing',
    progress: 1,
    subtitleUrl: null,
  };
}

async function generateKoreanSubtitles(
  m3u8Url,
  fetchM3u8Url = null,
  chunkDurationSec = 60,
  onProgress,
  cacheIdentity = null,
) {
  const request = await requestKoreanSubtitleGeneration(m3u8Url, fetchM3u8Url, chunkDurationSec, cacheIdentity);
  if (request.status === 'ready') {
    if (onProgress) onProgress(100);
    return request;
  }

  const cacheKey = getStableSubtitleCacheKey(m3u8Url, 'ko', cacheIdentity);
  const activeJob = getActiveJob(cacheKey);
  if (!activeJob?.promise) {
    return getSubtitleStatus(m3u8Url, 'ko', cacheIdentity);
  }

  let progressTimer = null;
  if (onProgress) {
    progressTimer = setInterval(() => {
      const job = getActiveJob(cacheKey);
      if (job?.status === 'processing') {
        onProgress(Number.isFinite(job.progress) ? job.progress : 0);
      }
    }, 1000);
  }

  try {
    await activeJob.promise;
  } finally {
    if (progressTimer) {
      clearInterval(progressTimer);
    }
  }

  return getSubtitleStatus(m3u8Url, 'ko', cacheIdentity);
}

module.exports = {
  generateKoreanSubtitles,
  requestKoreanSubtitleGeneration,
  getSubtitleStatus,
  getCachedSubtitlePath,
};
