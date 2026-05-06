const Queue = require('bull');
const fs = require('fs');
const path = require('path');
const { getCacheKey } = require('./whisper.service');
const { getLanguageCacheKey } = require('./whisperClient.service');
const { addClipJob } = require('./videoQueue.service');

function normalizeTimestamp(timestamp) {
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return String(timestamp);
  }

  if (typeof timestamp !== 'string') {
    return '';
  }

  return timestamp.trim().replace(',', '.');
}

function timestampToSeconds(timestamp) {
  const normalized = normalizeTimestamp(timestamp);
  if (!normalized) {
    return Number.NaN;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(':');
  if (parts.some((part) => part === '' || Number.isNaN(Number(part)))) {
    return Number.NaN;
  }

  return parts.reverse().reduce(
    (total, part, index) => total + (Number(part) * (60 ** index)),
    0,
  );
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

const ANALYSIS_PIPELINE_STAGES = [
  { key: 'extract', label: 'Extract audio', start: 10, end: 40 },
  { key: 'whisper', label: 'Whisper subtitles', start: 40, end: 70 },
  { key: 'analyze', label: 'AI scene analysis', start: 70, end: 90 },
  { key: 'enqueue', label: 'Queue render jobs', start: 90, end: 100 },
];

function getStageProgress(globalProgress, start, end) {
  const progress = clampPercent(globalProgress);
  if (progress <= start) return 0;
  if (progress >= end) return 100;
  return clampPercent(((progress - start) / (end - start)) * 100);
}

function getStageState(stage, globalProgress, jobState) {
  const progress = clampPercent(globalProgress);

  if (jobState === 'completed') return 'completed';
  if (progress >= stage.end) return 'completed';
  if (progress < stage.start) return 'pending';

  return jobState === 'failed' ? 'failed' : 'active';
}

function buildAnalysisPipelineStages(globalProgress = 0, jobState = 'waiting') {
  const progress = clampPercent(globalProgress);
  return ANALYSIS_PIPELINE_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    progress: getStageProgress(progress, stage.start, stage.end),
    state: getStageState(stage, progress, jobState),
  }));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeCacheName(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function listAudioChunks(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith('.mp3'))
    .sort()
    .map((fileName) => path.join(dirPath, fileName))
    .filter((filePath) => fs.statSync(filePath).size > 0);
}

function readJsonCache(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.warn(`[AnalysisQueue] Ignoring invalid cache file ${filePath}: ${error.message}`);
    return null;
  }
}

function writeJsonCache(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function moveDirectory(sourceDir, targetDir) {
  ensureDir(path.dirname(targetDir));
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  try {
    fs.renameSync(sourceDir, targetDir);
  } catch (_error) {
    fs.cpSync(sourceDir, targetDir, { recursive: true });
    cleanupTempFile(sourceDir);
  }
}

function buildViralAnalysisCachePaths(proxyM3u8Url, language = VIRAL_TRANSCRIPTION_LANGUAGE) {
  const vttCacheKey = getCacheKey(proxyM3u8Url, language);
  const cacheId = safeCacheName(vttCacheKey.replace(/\.vtt$/i, ''));
  const cacheRoot = path.join(__dirname, '..', 'temp_output', 'viral_cache', cacheId);

  return {
    cacheId,
    cacheRoot,
    audioDir: path.join(cacheRoot, `audio_${WHISPER_CHUNK_DURATION_SEC}`),
    sceneBoundariesFile: path.join(cacheRoot, 'scene-boundaries.json'),
    scenesFile: path.join(cacheRoot, 'scenes.json'),
    vttCacheFile: path.join(__dirname, '..', 'temp_output', 'vtt_cache', vttCacheKey),
    vttCacheKey,
  };
}

const REDIS_URL = process.env.REDIS_URL;
const ANALYSIS_QUEUE_TIMEOUT_MS = Number(process.env.ANALYSIS_QUEUE_TIMEOUT_MS);
const WHISPER_CHUNK_DURATION_SEC = Math.max(
  Number.parseInt(
    process.env.VIRAL_CLIP_WHISPER_CHUNK_DURATION_SEC ||
    process.env.WHISPER_CHUNK_DURATION_SEC,
    10,
  ) || 300,
  30,
);
const VIRAL_TRANSCRIPTION_LANGUAGE = getLanguageCacheKey(
  process.env.VIRAL_CLIP_TRANSCRIPTION_LANGUAGE ||
  process.env.SUBTITLE_TRANSCRIPTION_LANGUAGE ||
  process.env.WHISPER_LANGUAGE ||
  'auto',
);

const defaultAnalysisJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 50,
  removeOnFail: 100,
};

if (Number.isFinite(ANALYSIS_QUEUE_TIMEOUT_MS) && ANALYSIS_QUEUE_TIMEOUT_MS > 0) {
  defaultAnalysisJobOptions.timeout = ANALYSIS_QUEUE_TIMEOUT_MS;
}

let analysisWorkerStarted = false;
let analysisEventBridgeStarted = false;

function createDisabledQueue() {
  return {
    add: async () => {
      throw new Error('Feature disabled');
    },
    getJob: async () => null,
    close: async () => {},
    on: () => {},
    process: () => {},
  };
}

function createQueue() {
  if (!REDIS_URL) {
    console.log('[Queue] Analysis Queue disabled: REDIS_URL missing.');
    return createDisabledQueue();
  }

  return new Queue('viral-analysis-queue', REDIS_URL, {
    redis: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    },
    settings: {
      lockDuration: Number.parseInt(process.env.ANALYSIS_QUEUE_LOCK_DURATION_MS, 10) || 30 * 60 * 1000,
      stalledInterval: Number.parseInt(process.env.ANALYSIS_QUEUE_STALLED_INTERVAL_MS, 10) || 60 * 1000,
      maxStalledCount: Number.parseInt(process.env.ANALYSIS_QUEUE_MAX_STALLED_COUNT, 10) || 2,
    },
    defaultJobOptions: defaultAnalysisJobOptions,
  });
}

const analysisQueue = createQueue();

async function processAnalysisJob(job) {
  const { cleanupTempFile, extractAudioChunks } = require('./audio.service');
  const { speechToTextPipeline } = require('./whisper.service');
  const { detectScenes } = require('./scene.service');
  const { analyzeScenes } = require('./llm.service');
  const { movieId, proxyM3u8Url, finalBgMusic, bgmStartTime, bgmDuration, renderOptions } = job.data;
  let tempMp3Dir = null;
  let vttPath = null;

  console.log(`[AnalysisQueue] Starting job ${job.id} for movie ${movieId}`);
  job.progress(10);

  try {
    job.log('Checking VTT cache...');
    const cachePaths = buildViralAnalysisCachePaths(proxyM3u8Url);
    ensureDir(cachePaths.cacheRoot);

    if (fs.existsSync(cachePaths.vttCacheFile)) {
      job.log('Cache hit. Skipping audio extraction and Whisper.');
      job.progress(70);
      vttPath = cachePaths.vttCacheFile;
    } else {
      let mp3Files = listAudioChunks(cachePaths.audioDir);

      if (mp3Files.length > 0) {
        job.log(`Audio chunk cache hit (${mp3Files.length} chunks). Skipping extraction.`);
      } else {
        job.log('Extracting audio chunks from M3U8 stream...');
        const extraction = await extractAudioChunks(proxyM3u8Url, WHISPER_CHUNK_DURATION_SEC, (progress) => {
          job.progress(Math.round(10 + (progress * 0.3)));
        });
        tempMp3Dir = extraction.outDir;
        moveDirectory(tempMp3Dir, cachePaths.audioDir);
        tempMp3Dir = null;
        mp3Files = listAudioChunks(cachePaths.audioDir);
      }

      if (mp3Files.length === 0) {
        throw new Error('No audio chunks were available after extraction');
      }

      job.progress(40);

      const startTimeSTT = new Date().toISOString();
      job.log(`[${startTimeSTT}] Running Whisper STT (${VIRAL_TRANSCRIPTION_LANGUAGE})...`);
      vttPath = await speechToTextPipeline(
        mp3Files,
        proxyM3u8Url,
        WHISPER_CHUNK_DURATION_SEC,
        (progress) => {
          job.progress(Math.round(40 + (progress * 0.3)));
        },
        VIRAL_TRANSCRIPTION_LANGUAGE,
      );
      job.log(`[${new Date().toISOString()}] Finished Whisper STT.`);
      job.progress(70);
    }

    let scenes = readJsonCache(cachePaths.scenesFile);
    if (Array.isArray(scenes) && scenes.length > 0) {
      job.log(`Scene analysis cache hit (${scenes.length} clips). Skipping scene detection and LLM.`);
      job.progress(90);
    } else {
      let sceneBoundaries = readJsonCache(cachePaths.sceneBoundariesFile);
      if (Array.isArray(sceneBoundaries) && sceneBoundaries.length > 0) {
        job.log(`Scene boundary cache hit (${sceneBoundaries.length} boundaries).`);
        job.progress(80);
      } else {
        job.log('Detecting physical scene boundaries...');
        sceneBoundaries = await detectScenes(proxyM3u8Url, (progress) => {
          job.progress(Math.round(70 + (progress * 0.1)));
        });
        writeJsonCache(cachePaths.sceneBoundariesFile, sceneBoundaries);
        job.progress(80);
      }

      job.log('Analyzing scenes via LLM...');
      const vttContent = fs.readFileSync(vttPath, 'utf-8');
      scenes = await analyzeScenes(vttContent, sceneBoundaries);
      writeJsonCache(cachePaths.scenesFile, scenes);
    }
    job.progress(90);

    job.log(`Queueing ${scenes.length} viral clip render jobs...`);
    const outputDir = path.join(__dirname, '..', 'temp_output', 'viral_clips', movieId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const renderJobs = [];
    for (const scene of scenes) {
      const startTime = normalizeTimestamp(scene.start_time);
      const endTime = normalizeTimestamp(scene.end_time);
      const startSeconds = timestampToSeconds(startTime);
      const endSeconds = timestampToSeconds(endTime);
      const duration = Number((endSeconds - startSeconds).toFixed(3));

      if (!startTime || !endTime || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || duration <= 0) {
        console.warn(
          `[AnalysisQueue] Skipping invalid scene from analyzer: ${JSON.stringify({
            start_time: scene.start_time,
            end_time: scene.end_time,
            category: scene.category,
          })}`,
        );
        continue;
      }

      const safeTime = startTime.replace(/[:.,]/g, '-');
      const outputPath = path.join(
        outputDir,
        `${(scene.category || 'clip').toLowerCase()}_${safeTime}.mp4`,
      );

      const renderJob = await addClipJob({
        movieId,
        videoUrl: proxyM3u8Url,
        bgMusic: finalBgMusic,
        bgmStartTime: bgmStartTime || '0',
        bgmDuration: bgmDuration || null,
        subtitleFile: vttPath,
        renderOptions,
        startTime,
        duration,
        outputPath,
        category: scene.category,
        reason: scene.reason,
      });

      renderJobs.push({
        jobId: renderJob.id,
        category: scene.category,
        start_time: startTime,
        end_time: endTime,
        reason: scene.reason,
        outputPath,
      });
    }

    if (renderJobs.length === 0) {
      throw new Error('No valid viral clips were returned by the analyzer');
    }

    job.progress(100);
    console.log(`[AnalysisQueue] Finished job ${job.id} for movie ${movieId}. Created ${renderJobs.length} render jobs.`);

    return renderJobs;
  } catch (error) {
    console.error(`[AnalysisQueue] Job ${job.id} failed: ${error.message}`);
    if (tempMp3Dir) cleanupTempFile(tempMp3Dir);
    throw error;
  }
}

function parseBullResult(rawResult) {
  if (typeof rawResult !== 'string') {
    return rawResult;
  }

  try {
    return JSON.parse(rawResult);
  } catch (_error) {
    return rawResult;
  }
}

async function getQueueJob(jobId) {
  try {
    return await analysisQueue.getJob(jobId);
  } catch (error) {
    console.warn(`[AnalysisQueue] Failed to load job ${jobId}: ${error.message}`);
    return null;
  }
}

function emitAnalysisProgress(job, payload) {
  const { emitJobProgress } = require('./progressSocket.service');
  emitJobProgress(job.id, payload);

  if (job.data && job.data.movieId) {
    emitJobProgress(job.data.movieId, payload);
  }
}

function registerAnalysisQueueEventBridge() {
  if (!REDIS_URL || analysisEventBridgeStarted) {
    return false;
  }

  analysisEventBridgeStarted = true;

  analysisQueue.on('global:progress', async (jobId, progress) => {
    const job = await getQueueJob(jobId);
    if (!job) return;
    emitAnalysisProgress(job, { step: 'analysis', percent: progress });
  });

  analysisQueue.on('global:completed', async (jobId, rawResult) => {
    const job = await getQueueJob(jobId);
    if (!job) return;
    emitAnalysisProgress(job, {
      step: 'analysis',
      percent: 100,
      status: 'completed',
      result: parseBullResult(rawResult),
    });
  });

  analysisQueue.on('global:failed', async (jobId, failedReason) => {
    const job = await getQueueJob(jobId);
    if (!job) {
      const { emitJobProgress } = require('./progressSocket.service');
      emitJobProgress(jobId, { step: 'analysis', status: 'failed', error: failedReason });
      return;
    }

    emitAnalysisProgress(job, { step: 'analysis', status: 'failed', error: failedReason });
  });

  analysisQueue.on('error', (error) => {
    console.error(`[AnalysisQueue] Queue error: ${error.message}`);
  });

  return true;
}

function startAnalysisQueueWorker() {
  if (!REDIS_URL) {
    console.log('[AnalysisQueue] Worker disabled: REDIS_URL missing.');
    return false;
  }

  if (analysisWorkerStarted) {
    return true;
  }

  analysisWorkerStarted = true;
  analysisQueue.process(1, processAnalysisJob);

  analysisQueue.on('completed', (job) => {
    console.log(`[AnalysisQueue] Job ${job.id} completed successfully.`);
  });

  analysisQueue.on('failed', (job, err) => {
    console.error(`[AnalysisQueue] DLQ: Job ${job?.id} failed. Reason: ${err.message}`);
  });

  analysisQueue.on('error', (error) => {
    console.error(`[AnalysisQueue] Queue error: ${error.message}`);
  });

  console.log('[AnalysisQueue] Worker started with concurrency=1');
  return true;
}

async function addAnalysisJob(jobData) {
  return analysisQueue.add(jobData);
}

async function getAnalysisJobStatus(jobId) {
  const job = await analysisQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = typeof job.progress === 'function' ? job.progress() : job._progress;
  const isFailed = state === 'failed';
  return {
    id: job.id,
    state,
    progress,
    stages: buildAnalysisPipelineStages(progress, state),
    result: job.returnvalue,
    data: job.data,
    error: isFailed ? job.failedReason : null,
    attemptsMade: job.attemptsMade,
  };
}

async function closeAnalysisQueue() {
  await analysisQueue.close();
}

module.exports = {
  addAnalysisJob,
  analysisQueue,
  buildAnalysisPipelineStages,
  buildViralAnalysisCachePaths,
  closeAnalysisQueue,
  getAnalysisJobStatus,
  listAudioChunks,
  registerAnalysisQueueEventBridge,
  startAnalysisQueueWorker,
};
