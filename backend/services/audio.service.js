const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');

function parseTimemarkToSeconds(timemark) {
  if (!timemark || typeof timemark !== 'string') {
    return null;
  }

  const parts = timemark.split(':');
  if (parts.length !== 3) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const secondParts = parts[2].split('.');
  const seconds = Number(secondParts[0]);
  const fraction = secondParts[1] ? Number(`0.${secondParts[1]}`) : 0;

  if (![hours, minutes, seconds, fraction].every(Number.isFinite)) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds + fraction;
}

function tempFilePath(ext) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `cinephine_${id}${ext}`);
}

function cleanupTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.warn(`[AudioService] Cleanup failed for ${filePath}: ${err.message}`);
  }
}

/**
 * Extract audio from HLS stream and split it into chunks.
 * Uses -f segment to split audio into multiple MP3 files.
 */
function extractAudioChunks(m3u8Url, chunkDurationSec = 60, onProgress) {
  return new Promise((resolve, reject) => {
    const baseId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const outDir = path.join(os.tmpdir(), `cinephine_chunks_${baseId}`);
    fs.mkdirSync(outDir, { recursive: true });

    let totalDurationSec = null;
    let fallbackProgress = 0;
    let lastReportedProgress = 0;
    let progressEventCount = 0;
    let printedHeartbeat = false;

    // MP3 output pattern: chunk_000, chunk_001, ...
    const outputPattern = path.join(outDir, 'chunk_%03d.mp3');

    ffmpeg(m3u8Url)
      .inputOptions(['-protocol_whitelist', 'file,http,https,tcp,tls,crypto'])
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(1)
      .audioFrequency(16000)
      .outputOptions([
        '-f', 'segment',
        '-segment_time', String(chunkDurationSec),
        '-reset_timestamps', '1'
      ])
      .output(outputPattern)
      .on('start', (cmd) => {
        console.log(`[AudioService] Extracting audio chunks: ${cmd}`);
      })
      .on('codecData', (data) => {
        totalDurationSec = parseTimemarkToSeconds(data?.duration);
      })
      .on('progress', (progress = {}) => {
        let nextProgress = null;

        if (Number.isFinite(progress.percent)) {
          nextProgress = progress.percent;
        } else {
          const timemarkSec = parseTimemarkToSeconds(progress.timemark);
          if (
            Number.isFinite(totalDurationSec) &&
            totalDurationSec > 0 &&
            Number.isFinite(timemarkSec)
          ) {
            nextProgress = (timemarkSec / totalDurationSec) * 100;
          } else {
            // Some HLS playlists do not expose reliable duration for ffmpeg progress.
            fallbackProgress = Math.min(95, fallbackProgress + 0.25);
            nextProgress = fallbackProgress;
          }
        }

        const clampedProgress = Math.max(0, Math.min(99, Number(nextProgress) || 0));
        if (clampedProgress > lastReportedProgress) {
          lastReportedProgress = clampedProgress;
        }

        if (onProgress) {
          onProgress(lastReportedProgress);
        }

        progressEventCount += 1;
        if (onProgress && progressEventCount % 40 === 0) {
          process.stdout.write('.');
          printedHeartbeat = true;
        }
      })
      .on('end', () => {
        if (onProgress) {
          onProgress(100);
        }
        if (printedHeartbeat) {
          process.stdout.write('\n');
        }

        console.log(`[AudioService] Audio chunks extracted to: ${outDir}`);
        const files = fs.readdirSync(outDir)
          .filter(f => f.endsWith('.mp3'))
          .sort() // chunk_000.mp3, chunk_001.mp3...
          .map(f => path.join(outDir, f));

        resolve({ outDir, files });
      })
      .on('error', (err) => {
        if (printedHeartbeat) {
          process.stdout.write('\n');
        }

        console.error(`[AudioService] Audio extraction failed: ${err.message}`);
        cleanupTempFile(outDir);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  extractAudioChunks,
  tempFilePath,
  cleanupTempFile
};
