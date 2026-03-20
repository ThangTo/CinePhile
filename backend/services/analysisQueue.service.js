const Queue = require('bull');
const fs = require('fs');
const path = require('path');
const { extractAudio, cleanupTempFile } = require('./videoProcessing.service');
const { speechToText, analyzeScenes } = require('./ai.service');
const { addClipJob } = require('./videoQueue.service');

// ─── Configuration ──────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─── Queue Instance ─────────────────────────────────────────────────────────
const analysisQueue = new Queue('viral-analysis-queue', REDIS_URL, {
  redis: {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  },
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

function timestampToSeconds(t) {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// ─── Worker ─────────────────────────────────────────────────────────────────
analysisQueue.process(1, async (job) => {
  const { movieId, proxyM3u8Url, finalBgMusic, bgmStartTime, bgmDuration } = job.data;
  let mp3Path = null;
  let vttPath = null;

  console.log(`[AnalysisQueue] Starting job ${job.id} for movie ${movieId}`);
  job.progress(10); // Extracting audio initialized

  try {
    // 1. Extract audio (Mapping 0-100% to 10-40% global progress)
    job.log('Extracting audio from M3U8 stream...');
    mp3Path = await extractAudio(proxyM3u8Url, (p) => {
      job.progress(Math.round(10 + (p * 0.3)));
    });
    job.progress(40);
    
    // 2. Speech to Text (Mapping 0-100% to 40-70% global progress)
    job.log('Running faster-whisper speech to text...');
    vttPath = await speechToText(mp3Path, (p) => {
      job.progress(Math.round(40 + (p * 0.3)));
    });
    job.progress(70);

    // 3. Analyze Scenes
    job.log('Analyzing scenes via LLM...');
    const vttContent = fs.readFileSync(vttPath, 'utf-8');
    const scenes = await analyzeScenes(vttContent);
    job.progress(90);

    // 4. Queue Individual Viral Clips
    job.log(`Queueing ${scenes.length} viral clip render jobs...`);
    const outputDir = path.join(__dirname, '..', 'temp_output', 'viral_clips', movieId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const renderJobs = [];
    for (const scene of scenes) {
      const duration = timestampToSeconds(scene.end_time) - timestampToSeconds(scene.start_time);
      const safeTime = (scene.start_time || '').replace(/:/g, '-');
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
        startTime: scene.start_time,
        duration,
        outputPath,
        category: scene.category,
        reason: scene.reason,
      });

      renderJobs.push({
        jobId: renderJob.id,
        category: scene.category,
        start_time: scene.start_time,
        end_time: scene.end_time,
        reason: scene.reason,
        outputPath,
      });
    }

    // Clean up mp3 ONLY, vtt is needed for render child jobs
    cleanupTempFile(mp3Path);
    
    job.progress(100);
    console.log(`[AnalysisQueue] Finished job ${job.id} for movie ${movieId}. Created ${renderJobs.length} render jobs.`);
    
    return renderJobs;
  } catch (error) {
    console.error(`[AnalysisQueue] Job ${job.id} failed: ${error.message}`);
    if (mp3Path) cleanupTempFile(mp3Path);
    if (vttPath) cleanupTempFile(vttPath);
    throw error;
  }
});

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
