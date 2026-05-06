const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const { extractAudioChunks, cleanupTempFile } = require('./audio.service');
const { speechToTextPipeline, getCacheKey } = require('./whisper.service');
const { getLanguageCacheKey, getWhisperProvider } = require('./whisperClient.service');
const r2Service = require('./r2.service');
const Episode = require('../models/episode.model');

const VTT_CACHE_DIR = path.join(__dirname, '..', 'temp_output', 'vtt_cache');
const FAILED_JOB_TTL_MS = 10 * 60 * 1000;
const READY_JOB_TTL_MS = 24 * 60 * 60 * 1000; // Cache local jobs for 24h
const DEFAULT_SUBTITLE_LANGUAGE = process.env.SUBTITLE_TRANSCRIPTION_LANGUAGE || process.env.WHISPER_LANGUAGE || 'auto';
const WHISPER_CHUNK_DURATION_SEC = Math.max(
  Number.parseInt(process.env.WHISPER_CHUNK_DURATION_SEC, 10) || 600,
  30,
);
const subtitleJobs = new Map();

function ensureCacheDir() {
  if (!fs.existsSync(VTT_CACHE_DIR)) {
    fs.mkdirSync(VTT_CACHE_DIR, { recursive: true });
  }
}

function toSubtitleUrl(language, fileName) {
  return `/subtitles/${language}/${encodeURIComponent(fileName)}`;
}

function getStableSubtitleCacheKey(videoUrl, language = DEFAULT_SUBTITLE_LANGUAGE, cacheIdentity = null) {
  const languageKey = getLanguageCacheKey(language);
  if (cacheIdentity) {
    const stableHash = crypto
      .createHash('sha256')
      .update(String(cacheIdentity))
      .digest('hex');
    return `${stableHash}.${languageKey}.v2.vtt`;
  }
  return getCacheKey(videoUrl, languageKey);
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

async function ensureWhisperReady() {
  const provider = await getWhisperProvider();

  if (provider.type === 'remote') {
    console.log(`[SubtitleService] Using remote Whisper at: ${provider.baseUrl}`);
    return provider;
  }

  try {
    await axios.get(`${provider.baseUrl}/health`, { timeout: 5000 });
    return provider;
  } catch (_error) {
    throw new Error(
      `Local Whisper server is unavailable at ${provider.baseUrl}. Please start Docker whisper service or configure the remote ngrok URL.`,
    );
  }
}

async function getCachedSubtitlePath(videoUrl, language = DEFAULT_SUBTITLE_LANGUAGE, cacheIdentity = null) {
  ensureCacheDir();
  const languageKey = getLanguageCacheKey(language);
  const stableCacheKey = getStableSubtitleCacheKey(videoUrl, languageKey, cacheIdentity);
  const stableCacheFile = path.join(VTT_CACHE_DIR, stableCacheKey);
  const legacyCacheKey = getCacheKey(videoUrl, languageKey);
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
  let r2Url = await r2Service.getSubtitleUrlIfMatch(stableCacheKey, languageKey);
  if (!r2Url && legacyCacheKey !== stableCacheKey) {
    r2Url = await r2Service.getSubtitleUrlIfMatch(legacyCacheKey, languageKey);
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

async function getSubtitleStatus(videoUrl, language = DEFAULT_SUBTITLE_LANGUAGE, cacheIdentity = null) {
  const languageKey = getLanguageCacheKey(language);
  const cachedPath = await getCachedSubtitlePath(videoUrl, languageKey, cacheIdentity);
  if (cachedPath) {
    await clearSubtitleRequestCount(cacheIdentity);

    const subtitleUrl = cachedPath.startsWith('R2:') 
      ? cachedPath.substring(3) 
      : toSubtitleUrl(languageKey, path.basename(cachedPath));

    return {
      status: 'ready',
      progress: 100,
      subtitleUrl,
    };
  }

  const cacheKey = getStableSubtitleCacheKey(videoUrl, languageKey, cacheIdentity);
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

async function runSubtitleGeneration(
  m3u8Url,
  fetchM3u8Url = null,
  chunkDurationSec = WHISPER_CHUNK_DURATION_SEC,
  cacheIdentity = null,
  language = DEFAULT_SUBTITLE_LANGUAGE,
) {
  const languageKey = getLanguageCacheKey(language);
  const cacheKey = getStableSubtitleCacheKey(m3u8Url, languageKey, cacheIdentity);
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
    const provider = await ensureWhisperReady();
    console.log(`[SubtitleService] Generating subtitles with ${provider.type} Whisper (language=${languageKey}).`);

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
      languageKey,
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

    if (!fs.existsSync(cacheFile)) {
      throw new Error('Subtitle cache file was not created');
    }

    // Upload to R2 after generation
    const r2Url = await r2Service.uploadSubtitle(cacheFile, cacheKey, languageKey);

    updateJob(cacheKey, {
      status: 'ready',
      progress: 100,
      subtitleUrl: r2Url || toSubtitleUrl(languageKey, cacheKey),
      error: null,
      promise: null,
    });

    await clearSubtitleRequestCount(cacheIdentity);
  } catch (error) {
    console.error('[SubtitleService] Generation error:', error.message);
    updateJob(cacheKey, {
      status: 'failed',
      progress: 0,
      error: error.message || 'Failed to generate subtitles',
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
  chunkDurationSec = WHISPER_CHUNK_DURATION_SEC,
  cacheIdentity = null,
  language = DEFAULT_SUBTITLE_LANGUAGE,
) {
  ensureCacheDir();
  const languageKey = getLanguageCacheKey(language);

  const currentStatus = await getSubtitleStatus(m3u8Url, languageKey, cacheIdentity);
  if (currentStatus.status === 'ready') {
    return currentStatus;
  }

  const cacheKey = getStableSubtitleCacheKey(m3u8Url, languageKey, cacheIdentity);
  const activeJob = getActiveJob(cacheKey);
  if (activeJob?.status === 'processing') {
    return {
      status: 'processing',
      progress: Number.isFinite(activeJob.progress) ? activeJob.progress : 0,
      subtitleUrl: null,
    };
  }

  const promise = runSubtitleGeneration(m3u8Url, fetchM3u8Url, chunkDurationSec, cacheIdentity, languageKey).catch((error) => {
    console.error(`[SubtitleService] Failed to generate subtitles: ${error.message}`);
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
  chunkDurationSec = WHISPER_CHUNK_DURATION_SEC,
  onProgress,
  cacheIdentity = null,
  language = DEFAULT_SUBTITLE_LANGUAGE,
) {
  const languageKey = getLanguageCacheKey(language);
  const request = await requestKoreanSubtitleGeneration(
    m3u8Url,
    fetchM3u8Url,
    chunkDurationSec,
    cacheIdentity,
    languageKey,
  );
  if (request.status === 'ready') {
    if (onProgress) onProgress(100);
    return request;
  }

  const cacheKey = getStableSubtitleCacheKey(m3u8Url, languageKey, cacheIdentity);
  const activeJob = getActiveJob(cacheKey);
  if (!activeJob?.promise) {
    return getSubtitleStatus(m3u8Url, languageKey, cacheIdentity);
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

  return getSubtitleStatus(m3u8Url, languageKey, cacheIdentity);
}

const requestSubtitleGeneration = requestKoreanSubtitleGeneration;
const generateSubtitles = generateKoreanSubtitles;

module.exports = {
  DEFAULT_SUBTITLE_LANGUAGE,
  generateSubtitles,
  generateKoreanSubtitles,
  requestSubtitleGeneration,
  requestKoreanSubtitleGeneration,
  getSubtitleStatus,
  getCachedSubtitlePath,
};
