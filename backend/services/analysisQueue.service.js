const Queue = require('bull');
const fs = require('fs');
const path = require('path');
const { cleanupTempFile, extractAudioChunks } = require('./audio.service');
const { getCacheKey, speechToTextPipeline } = require('./whisper.service');
const { detectScenes } = require('./scene.service');
const { analyzeScenes } = require('./llm.service');
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
    0
  );
}

// ─── Configuration ──────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL;
const ANALYSIS_QUEUE_TIMEOUT_MS = Number(process.env.ANALYSIS_QUEUE_TIMEOUT_MS);
const WHISPER_CHUNK_DURATION_SEC = Math.max(
  Number.parseInt(process.env.WHISPER_CHUNK_DURATION_SEC, 10) || 120,
  30
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

let analysisQueue;

if (REDIS_URL) {
  // ─── Queue Instance ─────────────────────────────────────────────────────────
  analysisQueue = new Queue('viral-analysis-queue', REDIS_URL, {
    redis: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    },
    defaultJobOptions: defaultAnalysisJobOptions,
  });

  // ─── Worker ─────────────────────────────────────────────────────────────────
  analysisQueue.process(1, async (job) => {
    const { movieId, proxyM3u8Url, finalBgMusic, bgmStartTime, bgmDuration } = job.data;
    let mp3Dir = null;
    let vttPath = null;

    console.log(`[AnalysisQueue] Starting job ${job.id} for movie ${movieId}`);
    job.progress(10);

    try {
      job.log('Checking VTT cache...');
      const cacheDir = path.join(__dirname, '..', 'temp_output', 'vtt_cache');
      const cacheFile = path.join(cacheDir, getCacheKey(proxyM3u8Url));
      
      if (fs.existsSync(cacheFile)) {
        job.log('Cache hit! Skipping audio extraction and Whisper.');
        job.progress(70);
        vttPath = cacheFile;
      } else {
        // 1. Extract audio chunks (Mapping 0-100% to 10-40% global progress)
        job.log('Extracting audio chunks from M3U8 stream...');
        const extraction = await extractAudioChunks(proxyM3u8Url, WHISPER_CHUNK_DURATION_SEC, (p) => {
          job.progress(Math.round(10 + (p * 0.3)));
        });
        mp3Dir = extraction.outDir;
        const mp3Files = extraction.files;
        job.progress(40);
        
        // 2. Speech to Text chunks
        const startTimeSTT = new Date().toISOString();
        job.log(`[${startTimeSTT}] Running parallel faster-whisper...`);
        vttPath = await speechToTextPipeline(mp3Files, proxyM3u8Url, WHISPER_CHUNK_DURATION_SEC, (p) => {
          job.progress(Math.round(40 + (p * 0.3)));
        });
        job.log(`[${new Date().toISOString()}] Finished Whisper STT.`);
        job.progress(70);
      }

      // 3. Analyze Scenes
      job.log('Detecting physical scene boundaries...');
      const sceneBoundaries = await detectScenes(proxyM3u8Url, (p) => {
        job.progress(Math.round(70 + (p * 0.1)));
      });
      job.progress(80);

      job.log('Analyzing scenes via LLM...');
      const vttContent = fs.readFileSync(vttPath, 'utf-8');
      const scenes = await analyzeScenes(vttContent, sceneBoundaries);
      job.progress(90);

      // 4. Queue Individual Viral Clips
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
            })}`
          );
          continue;
        }

        const safeTime = startTime.replace(/[:.,]/g, '-');
        const outputPath = path.join(
          outputDir,
          `${(scene.category || 'clip').toLowerCase()}_${safeTime}.mp4`
        );

        const renderJob = await addClipJob({
          movieId,
          videoUrl: proxyM3u8Url,
          bgMusic: finalBgMusic,
          bgmStartTime: bgmStartTime || '0',
          bgmDuration: bgmDuration || null,
          subtitleFile: vttPath,
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

      // Clean up mp3 chunks directory
      if (mp3Dir) cleanupTempFile(mp3Dir);
      
      job.progress(100);
      console.log(`[AnalysisQueue] Finished job ${job.id} for movie ${movieId}. Created ${renderJobs.length} render jobs.`);
      
      return renderJobs;
    } catch (error) {
      console.error(`[AnalysisQueue] Job ${job.id} failed: ${error.message}`);
      if (mp3Dir) cleanupTempFile(mp3Dir);
      throw error;
    }
  });

  analysisQueue.on('progress', (job, progress) => {
    const { emitJobProgress } = require('./progressSocket.service');
    // progress is already a number 0-100
    emitJobProgress(job.id, { step: 'analysis', percent: progress });
    if(job.data && job.data.movieId) {
      emitJobProgress(job.data.movieId, { step: 'analysis', percent: progress });
    }
  });

  analysisQueue.on('completed', (job, result) => {
    const { emitJobProgress } = require('./progressSocket.service');
    emitJobProgress(job.id, { step: 'analysis', percent: 100, status: 'completed', result });
    if(job.data && job.data.movieId) {
      emitJobProgress(job.data.movieId, { step: 'analysis', percent: 100, status: 'completed', result });
    }
  });

  analysisQueue.on('failed', (job, err) => {
    console.error(`[AnalysisQueue] DLQ: Job ${job.id} failed permanently/transiently. Reason: ${err.message}`);
    const { emitJobProgress } = require('./progressSocket.service');
    emitJobProgress(job.id, { step: 'analysis', status: 'failed', error: err.message });
    if(job.data && job.data.movieId) {
      emitJobProgress(job.data.movieId, { step: 'analysis', status: 'failed', error: err.message });
    }
  });
} else {
  console.log('[Queue] Analysis Queue disabled: REDIS_URL missing.');
  analysisQueue = {
    add: async () => { throw new Error("Feature disabled") },
    getJob: async () => null,
    close: async () => {},
    on: () => {},
    process: () => {}
  };
}

// ─── Functions ─────────────────────────────────────────────────────────────
async function addAnalysisJob(jobData) {
  return analysisQueue.add(jobData);
}

async function getAnalysisJobStatus(jobId) {
  const job = await analysisQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job._progress;
  return {
    id: job.id,
    state,
    progress,
    result: job.returnvalue,
    data: job.data,
    error: job.failedReason,
  };
}

// Ensure the queue gracefully closes on shutdown
async function closeAnalysisQueue() {
  await analysisQueue.close();
}

module.exports = {
  addAnalysisJob,
  getAnalysisJobStatus,
  closeAnalysisQueue,
  analysisQueue,
};
