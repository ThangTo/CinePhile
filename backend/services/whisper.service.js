const fs = require('fs');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const { tempFilePath } = require('./audio.service');

const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:8000';
const DEFAULT_WHISPER_MODEL = process.env.WHISPER_MODEL || 'Systran/faster-whisper-small';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const WHISPER_CONCURRENCY = Math.min(
  parsePositiveInt(process.env.WHISPER_CONCURRENCY, 4),
  8
);

async function transcribeChunk(audioPath) {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', DEFAULT_WHISPER_MODEL);
  form.append('response_format', 'vtt');
  form.append('language', 'vi');

  const response = await axios.post(
    `${WHISPER_API_URL}/v1/audio/transcriptions`,
    form,
    {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 1800000, 
    }
  );

  return typeof response.data === 'string'
    ? response.data
    : response.data.text || JSON.stringify(response.data);
}

function vttTimeToSeconds(vttTime) {
  const parts = vttTime.split(':');
  const secParts = parts[2].split('.');
  return (
    Number(parts[0]) * 3600 +
    Number(parts[1]) * 60 +
    Number(secParts[0]) +
    Number(secParts[1] || 0) / 1000
  );
}

function secondsToVttTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 1000);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function shiftVttTimestamps(vttContent, offsetSeconds) {
  if (!offsetSeconds) return vttContent;
  
  const regex = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/g;
  
  return vttContent.replace(regex, (match, startStr, endStr) => {
    const newStart = secondsToVttTime(vttTimeToSeconds(startStr) + offsetSeconds);
    const newEnd = secondsToVttTime(vttTimeToSeconds(endStr) + offsetSeconds);
    return `${newStart} --> ${newEnd}`;
  });
}

/**
 * Process multiple audio chunks in parallel.
 */
async function processChunksConcurrently(chunks, chunkDurationSec, concurrency = WHISPER_CONCURRENCY, onProgress) {
  const results = new Array(chunks.length);
  let completed = 0;

  let i = 0;
  const worker = async () => {
    while (i < chunks.length) {
      const index = i++;
      console.log(`[WhisperService] Processing chunk ${index + 1}/${chunks.length}...`);
      const vtt = await transcribeChunk(chunks[index]);
      
      const offsetSeconds = index * chunkDurationSec;
      
      let shiftedVtt = shiftVttTimestamps(vtt, offsetSeconds);
      if (index > 0) {
        shiftedVtt = shiftedVtt.replace(/^WEBVTT\r?\n\r?\n/, '');
      }
      
      results[index] = shiftedVtt;
      
      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / chunks.length) * 100));
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, worker);
  await Promise.all(workers);

  const mergedVtt = results.join('\n\n').replace(/\n{3,}/g, '\n\n');
  const vttPath = tempFilePath('.vtt');
  fs.writeFileSync(vttPath, mergedVtt, 'utf-8');
  
  return vttPath;
}

function getCacheKey(videoUrl) {
  return crypto.createHash('sha256').update(videoUrl).digest('hex') + '.vtt';
}

/**
 * Coordinate chunks processing and caching.
 */
async function speechToTextPipeline(mp3Files, videoUrl, chunkDurationSec, onProgress) {
  const cacheDir = path.join(__dirname, '..', 'temp_output', 'vtt_cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  
  const cacheFile = path.join(cacheDir, getCacheKey(videoUrl));
  if (fs.existsSync(cacheFile)) {
    console.log(`[WhisperService] VTT Cache hit for ${videoUrl}. Skipping transcription.`);
    if (onProgress) onProgress(100);
    return cacheFile; 
  }

  const vttPath = await processChunksConcurrently(
    mp3Files,
    chunkDurationSec,
    WHISPER_CONCURRENCY,
    onProgress
  );
  
  fs.copyFileSync(vttPath, cacheFile);
  console.log(`[WhisperService] Cached VTT at ${cacheFile}`);
  
  return vttPath;
}

module.exports = {
  speechToTextPipeline,
  transcribeChunk,
  getCacheKey
};
