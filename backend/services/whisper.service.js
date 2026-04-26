const fs = require('fs');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const { tempFilePath, cleanupTempFile } = require('./audio.service');

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

function cleanVttContent(vttContent) {
  if (!vttContent) return vttContent;

  const lines = vttContent.split('\n');
  const cleanedLines = [];
  let lastText = '';
  let repetitionCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Keep header and timestamps
    if (line.startsWith('WEBVTT') || line.includes('-->')) {
      cleanedLines.push(lines[i]);
      continue;
    }

    if (line === '') {
      cleanedLines.push(lines[i]);
      continue;
    }

    // Check for extreme hallucinations (very long strings of repeated characters like "아 아 아 ...")
    // If a line has a single word/char repeated many times, it's likely a hallucination
    const words = line.split(/\s+/);
    if (words.length > 10) {
      const uniqueWords = new Set(words);
      if (uniqueWords.size <= 2) {
        // Skip this line if it's just 1 or 2 unique words repeated over 10 times
        continue;
      }
    }

    // Check for consecutive identical lines (repetition across different timestamps)
    if (line === lastText) {
      repetitionCount++;
      // If repeated more than 2 times, skip
      if (repetitionCount > 2) {
        // Remove the timestamp line added before this one
        if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].includes('-->')) {
          cleanedLines.pop();
          // Also remove the blank line before the timestamp
          if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
            cleanedLines.pop();
          }
        }
        continue;
      }
    } else {
      repetitionCount = 0;
    }

    // Logic to fix long-duration cues for short text
    if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].includes('-->')) {
      const timestampLine = cleanedLines[cleanedLines.length - 1];
      const match = timestampLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      
      if (match) {
        const start = vttTimeToSeconds(match[1]);
        const end = vttTimeToSeconds(match[2]);
        const duration = end - start;
        
        // If the text is very short (e.g. 1-2 words) but duration is long (> 3s)
        // Trim the duration to a reasonable length (e.g. 2s + 0.5s per word)
        const wordCount = line.split(/\s+/).length;
        if (duration > 3 && wordCount <= 3) {
          const newDuration = Math.min(duration, 1.5 + wordCount * 0.5);
          const newEnd = secondsToVttTime(start + newDuration);
          cleanedLines[cleanedLines.length - 1] = `${match[1]} --> ${newEnd}`;
        }
      }
    }

    lastText = line;
    cleanedLines.push(lines[i]);
  }

  return cleanedLines.join('\n');
}

async function transcribeChunk(audioPath, language = 'vi', previousText = '') {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', DEFAULT_WHISPER_MODEL);
  form.append('response_format', 'vtt');
  form.append('language', language);
  form.append('temperature', '0'); // Reduce hallucinations
  
  const defaultPrompt = 'This is a movie subtitle. Keep it concise and sync with dialogue. Ignore background noise and music.';
  const finalPrompt = previousText ? `${defaultPrompt} Previous context: ${previousText}` : defaultPrompt;
  form.append('prompt', finalPrompt);

  const response = await axios.post(
    `${WHISPER_API_URL}/v1/audio/transcriptions`,
    form,
    {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 1800000,
      responseType: 'text',
      transformResponse: [(data) => data],
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

function shouldDropCacheQueryParam(rawKey = '') {
  const key = String(rawKey || '').trim().toLowerCase();
  if (!key) return true;

  const exactVolatileKeys = new Set([
    'token',
    'auth',
    'auth_key',
    'authkey',
    'signature',
    'sig',
    'expires',
    'expire',
    'exp',
    'timestamp',
    'ts',
    'session',
    'sessionid',
    'x-amz-signature',
    'x-amz-expires',
    'x-amz-date',
    'x-amz-security-token',
    'x-amz-credential',
    'x-amz-algorithm',
    'x-amz-signedheaders',
  ]);

  if (exactVolatileKeys.has(key)) return true;

  return (
    key.includes('token') ||
    key.includes('signature') ||
    key.includes('auth') ||
    key.includes('expire') ||
    key.includes('session')
  );
}

function normalizeVideoUrlForCache(videoUrl) {
  const raw = String(videoUrl || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    parsed.hash = '';

    // If this is an internal proxy URL, normalize based on the original URL.
    if (parsed.pathname.includes('/proxy-m3u8')) {
      const nestedUrl = parsed.searchParams.get('url');
      if (nestedUrl) {
        return normalizeVideoUrlForCache(decodeURIComponent(nestedUrl));
      }
    }

    const keptParams = [];
    for (const [key, value] of parsed.searchParams.entries()) {
      if (!shouldDropCacheQueryParam(key)) {
        keptParams.push([key, value]);
      }
    }

    keptParams.sort((a, b) => {
      if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
      return a[1].localeCompare(b[1]);
    });

    parsed.search = '';
    for (const [key, value] of keptParams) {
      parsed.searchParams.append(key, value);
    }

    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch (error) {
    return raw.split('#')[0].split('?')[0];
  }
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
async function processChunksConcurrently(chunks, chunkDurationSec, concurrency = WHISPER_CONCURRENCY, onProgress, language = 'vi') {
  const results = new Array(chunks.length);
  let completed = 0;
  let previousText = '';

  // We process sequentially to enable prompt chaining across chunks
  for (let index = 0; index < chunks.length; index++) {
    console.log(`[WhisperService] Processing chunk ${index + 1}/${chunks.length}...`);
    const rawVtt = await transcribeChunk(chunks[index], language, previousText);
    const vtt = cleanVttContent(rawVtt);
    
    // Extract last 50 words for next chunk prompt
    const plainText = vtt.replace(/<[^>]*>/g, ' ').replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, ' ').replace(/WEBVTT/g, ' ').trim();
    const words = plainText.split(/\s+/).filter(Boolean);
    previousText = words.slice(-50).join(' ');
    
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

  let mergedVtt = results.join('\n\n').replace(/\n{3,}/g, '\n\n');
  mergedVtt = cleanVttContent(mergedVtt);
  
  // Ensure header is correct
  mergedVtt = 'WEBVTT\n\n' + mergedVtt.replace(/^WEBVTT\s*/, '').trimStart();
  
  const vttPath = tempFilePath('.vtt');
  fs.writeFileSync(vttPath, mergedVtt, 'utf-8');
  
  return vttPath;
}

/**
 * Coordinate chunks processing and caching.
 */
async function speechToTextPipeline(mp3Files, videoUrl, chunkDurationSec, onProgress, language = 'vi') {
  const cacheDir = path.join(__dirname, '..', 'temp_output', 'vtt_cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  
  const cacheKey = getCacheKey(videoUrl, language);
  const cacheFile = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cacheFile)) {
    console.log(`[WhisperService] VTT Cache hit for ${videoUrl} (lang: ${language}). Skipping transcription.`);
    if (onProgress) onProgress(100);
    return cacheFile; 
  }

  const vttPath = await processChunksConcurrently(
    mp3Files,
    chunkDurationSec,
    WHISPER_CONCURRENCY,
    onProgress,
    language
  );
  
  fs.copyFileSync(vttPath, cacheFile);
  cleanupTempFile(vttPath);
  console.log(`[WhisperService] Cached VTT at ${cacheFile}`);
  
  return cacheFile;
}

function getCacheKey(videoUrl, language = 'vi') {
  const normalizedUrl = normalizeVideoUrlForCache(videoUrl);
  const urlHash = crypto.createHash('sha256').update(normalizedUrl).digest('hex');
  return `${urlHash}.${language}.v2.vtt`; // Use v2 to bypass old cached files with ad sync bug
}

module.exports = {
  speechToTextPipeline,
  transcribeChunk,
  getCacheKey,
  vttTimeToSeconds,
  secondsToVttTime,
  shiftVttTimestamps
};
