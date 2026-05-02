const fs = require('fs');
const path = require('path');
const { processM3u8StreamDirect } = require('./m3u8Utils');

function parseTimemarkToSeconds(timemark) {
  if (typeof timemark !== 'string') return null;

  const parts = timemark.trim().split(':');
  if (parts.length !== 3) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);

  if (![hours, minutes, seconds].every(Number.isFinite)) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

function calculateProgressPercent(processedSeconds, totalSeconds, floor = 0, ceiling = 100) {
  const processed = Number(processedSeconds);
  const total = Number(totalSeconds);

  if (!Number.isFinite(processed) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  const rawPercent = (processed / total) * 100;
  const roundedPercent = Math.round(rawPercent * 10) / 10;

  return Math.min(ceiling, Math.max(floor, roundedPercent));
}

function getPlaylistDurationSeconds(lines) {
  if (!Array.isArray(lines)) return null;

  const total = lines.reduce((sum, line) => {
    const match = String(line).match(/^#EXTINF:([\d.]+)/);
    if (!match) return sum;

    const segmentDuration = Number(match[1]);
    return Number.isFinite(segmentDuration) ? sum + segmentDuration : sum;
  }, 0);

  return total > 0 ? total : null;
}

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url} (Status: ${response.status})`);
  return await response.text();
}

/**
 * Downloads a video from an m3u8 URL, optionally cutting a specific segment.
 * @param {string} m3u8Url - The source m3u8 URL.
 * @param {string} outputPath - The destination mp4 file path.
 * @param {Object} options - Options for cutting { startTime, duration, sendProgress }
 */
async function downloadVideoFromM3U8(m3u8Url, outputPath, options = {}) {
  const { startTime = null, duration = null, sendProgress = null } = options;
  const hasStartTime = startTime !== null && startTime !== undefined && startTime !== '';
  const normalizedStartTime = hasStartTime ? Math.max(0, Number(startTime) || 0) : null;
  const requestedDuration = normalizePositiveNumber(duration);

  try {
    if (sendProgress) {
      sendProgress({ type: 'progress', percent: 1, message: 'Dang doc playlist...' });
    }

    let currentUrl = m3u8Url;
    let content = await fetchText(currentUrl);

    // Check for master playlist
    if (content.includes('#EXT-X-STREAM-INF')) {
      const lines = content.split('\n');
      let maxBandwidth = 0;
      let bestUri = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('BANDWIDTH=')) {
          const match = lines[i].match(/BANDWIDTH=(\d+)/);
          const bandwidth = match ? parseInt(match[1]) : 0;

          if (lines[i + 1] && bandwidth > maxBandwidth) {
            maxBandwidth = bandwidth;
            bestUri = lines[i + 1].trim();
          }
        }
      }

      if (bestUri) {
        currentUrl = new URL(bestUri, currentUrl).toString();
        content = await fetchText(currentUrl);
      }
    }

    // Filter ads using the same playlist sanitizer as the watch proxy path.
    if (sendProgress) {
      sendProgress({ type: 'progress', percent: 3, message: 'Dang loc playlist...' });
    }

    const cleanContent = await processM3u8StreamDirect(currentUrl);
    const cleanLines = cleanContent.split('\n').filter(Boolean);

    const playlistDuration = getPlaylistDurationSeconds(cleanLines);
    const estimatedDuration =
      requestedDuration ||
      (playlistDuration && normalizedStartTime !== null
        ? Math.max(0, playlistDuration - normalizedStartTime)
        : playlistDuration);

    // Write clean m3u8 to the same directory as output
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const cleanM3u8Path = path.join(tempDir, `${path.basename(outputPath, '.mp4')}_clean.m3u8`);
    fs.writeFileSync(cleanM3u8Path, cleanLines.join('\n'));

    // Prepare FFmpeg command
    const commandArgs = [
      '-hide_banner',
      '-nostats',
      '-progress',
      'pipe:1',
      '-protocol_whitelist',
      'file,http,https,tcp,tls,crypto',
    ];

    // Fast seek using input option (before -i)
    if (normalizedStartTime !== null) {
      commandArgs.push('-ss', normalizedStartTime.toString());
    }

    commandArgs.push('-i', cleanM3u8Path);

    // If duration is provided, limit the output length
    if (requestedDuration !== null) {
      commandArgs.push('-t', requestedDuration.toString());
    }

    commandArgs.push('-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-y', outputPath);

    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const ffmpegProcess = spawn('ffmpeg', commandArgs);
      let lastPercentSent = 0;
      let lastProgressAt = 0;
      let progressBuffer = '';

      if (sendProgress) {
        sendProgress({
          type: 'progress',
          percent: 5,
          message: 'Bat dau tai video...',
          totalSeconds: estimatedDuration,
        });
      }

      const emitTimedProgress = (timemark) => {
        if (!timemark || !sendProgress) return;

        const processedSeconds = parseTimemarkToSeconds(timemark);
        const percent = calculateProgressPercent(processedSeconds, estimatedDuration, 5, 99);

        if (percent !== null) {
          const now = Date.now();
          const shouldSend = percent !== lastPercentSent || now - lastProgressAt >= 1500;

          if (shouldSend) {
            lastPercentSent = percent;
            lastProgressAt = now;
            sendProgress({
              type: 'progress',
              percent,
              message: `Dang tai: ${percent}% (${timemark})`,
              timemark,
              processedSeconds,
              totalSeconds: estimatedDuration,
            });
          }
        } else {
          sendProgress({ type: 'log', message: `Dang tai: ${timemark}` });
        }
      };

      ffmpegProcess.stdout.on('data', (data) => {
        progressBuffer += data.toString();
        const lines = progressBuffer.split(/\r?\n/);
        progressBuffer = lines.pop() || '';

        for (const line of lines) {
          const separatorIndex = line.indexOf('=');
          if (separatorIndex === -1) continue;

          const key = line.slice(0, separatorIndex).trim();
          const value = line.slice(separatorIndex + 1).trim();

          if (key === 'out_time' && value && value !== 'N/A') {
            emitTimedProgress(value);
          }
        }
      });

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        const matches = [...output.matchAll(/time=(\d+:\d{2}:\d{2}(?:\.\d+)?)/g)];
        const timeMatch = matches[matches.length - 1];

        if (timeMatch && sendProgress) {
          emitTimedProgress(timeMatch[1]);
        }
      });

      ffmpegProcess.on('close', (code) => {
        try {
          if (fs.existsSync(cleanM3u8Path)) {
            fs.unlinkSync(cleanM3u8Path);
          }
        } catch (err) {
          // Ignore
        }

        if (code === 0) {
          if (sendProgress) {
            sendProgress({ type: 'progress', percent: 100, message: 'Tai video thanh cong!' });
          }
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code: ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    throw error;
  }
}

module.exports = {
  calculateProgressPercent,
  downloadVideoFromM3U8,
  parseTimemarkToSeconds,
};
