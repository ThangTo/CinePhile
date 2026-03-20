const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('crypto');

/**
 * Generate a unique temp file path
 */
function tempFilePath(ext) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `cinephine_${id}${ext}`);
}

/**
 * Extract audio from an HLS (.m3u8) stream and save as a temporary .mp3 file.
 *
 * @param {string} m3u8Url - URL of the HLS stream
 * @param {Function} [onProgress] - Optional callback for extraction percentage
 * @returns {Promise<string>} - Path to the extracted .mp3 file
 */
function extractAudio(m3u8Url, onProgress) {
  return new Promise((resolve, reject) => {
    const outputPath = tempFilePath('.mp3');

    ffmpeg(m3u8Url)
      .inputOptions([
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
      ])
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioChannels(2)
      .audioFrequency(44100)
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[VideoProcessing] Extracting audio: ${cmd}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          const pct = Math.round(progress.percent);
          console.log(`[VideoProcessing] Audio extraction: ${pct}%`);
          if (onProgress) onProgress(pct);
        }
      })
      .on('end', () => {
        console.log(`[VideoProcessing] Audio extracted to: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`[VideoProcessing] Audio extraction failed: ${err.message}`);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .run();
  });
}

/**
 * Render a 16:9 video clip with burned-in subtitles and mixed audio.
 *
 * - Keeps original 16:9 aspect ratio (no crop).
 * - Burns subtitles (hardsub) with a legible font size for landscape.
 * - Mixes original audio at 40% volume with background music at 80% volume.
 *
 * @param {string} videoUrl      - Source video URL (HLS or direct)
 * @param {string} bgMusic       - Path/URL to background music file
 * @param {string} subtitleFile  - Path to .vtt or .ass subtitle file
 * @param {string} startTime     - Start timestamp (HH:MM:SS or seconds)
 * @param {number} duration      - Duration in seconds
 * @param {string} outputPath    - Output file path
 * @param {string} bgmStartTime  - BGM start timestamp
 * @param {number} bgmDuration   - Target final duration forced by BGM selection
 * @returns {Promise<string>}    - Path to the rendered clip
 */
function renderClip16x9(videoUrl, bgMusic, subtitleFile, startTime, duration, outputPath, bgmStartTime = '0', bgmDuration = null) {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Escape subtitle path for FFmpeg filter (Windows backslashes → forward slashes, colons escaped)
    const escapedSubPath = subtitleFile
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:');

    const command = ffmpeg();

    // Determine final clip duration (prioritize user BGM duration)
    const finalDuration = bgmDuration ? Number(bgmDuration) : duration;

    // Input 0: video source (with seek)
    command
      .input(videoUrl)
      .inputOptions([
        '-ss', String(startTime),
        '-t', String(finalDuration),
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
      ]);

    // Input 1: background music (with its own seek)
    if (bgMusic) {
      command
        .input(bgMusic)
        .inputOptions([
          '-ss', String(bgmStartTime),
          '-t', String(finalDuration),
          '-stream_loop', '-1', // Loop BGM if shorter than clip
        ]);
    } else {
      // If no bgMusic, we still map an empty audio to avoid filter errors or just adapt the filter.
      // Easiest is to generate silence if no bgMusic is provided
      command
        .input('anullsrc')
        .inputFormat('lavfi')
        .inputOptions([
          '-t', String(finalDuration)
        ]);
    }

    // Complex filter:
    //   [0:a] → lower volume to 40%
    //   [1:a] → set volume to 80%
    //   amix both audio streams
    //   Burn subtitles onto video
    const filterComplex = [
      // Audio mixing
      `[0:a]volume=0.4[original]`,
      `[1:a]volume=0.8[bgm]`,
      `[original][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      // Subtitle burn-in (force_style for legible landscape text)
      `[0:v]subtitles='${escapedSubPath}':force_style='FontSize=24,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,MarginV=30'[vout]`,
    ];

    command
      .complexFilter(filterComplex.join(';'))
      .outputOptions([
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-t', String(finalDuration),
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[VideoProcessing] Rendering clip: ${cmd}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[VideoProcessing] Render progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[VideoProcessing] Clip rendered: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`[VideoProcessing] Render failed: ${err.message}`);
        // Cleanup on failure
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .run();
  });
}

/**
 * Clean up a temporary file (best-effort, no throw)
 */
function cleanupTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[VideoProcessing] Cleaned up: ${filePath}`);
    }
  } catch (err) {
    console.warn(`[VideoProcessing] Cleanup failed for ${filePath}: ${err.message}`);
  }
}

module.exports = {
  extractAudio,
  renderClip16x9,
  cleanupTempFile,
  tempFilePath,
};
