const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
    
    // MP3 output pattern: chunk_000, chunk_001, ...
    const outputPattern = path.join(outDir, 'chunk_%03d.mp3');

    ffmpeg(m3u8Url)
      .inputOptions(['-protocol_whitelist', 'file,http,https,tcp,tls,crypto'])
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k') // 128k is optimal for speech
      .audioChannels(1) // Mono avoids unnecessary channels
      .audioFrequency(16000) // 16kHz is ideal for Whisper
      .outputOptions([
        '-f', 'segment',
        '-segment_time', String(chunkDurationSec),
        '-reset_timestamps', '1'
      ])
      .output(outputPattern)
      .on('start', (cmd) => {
        console.log(`[AudioService] Extracting audio chunks: ${cmd}`);
      })
      .on('progress', (progress) => {
        if (progress.percent && onProgress) {
          onProgress(Math.round(progress.percent));
        }
      })
      .on('end', () => {
        console.log(`[AudioService] Audio chunks extracted to: ${outDir}`);
        const files = fs.readdirSync(outDir)
          .filter(f => f.endsWith('.mp3'))
          .sort() // chunk_000.mp3, chunk_001.mp3...
          .map(f => path.join(outDir, f));
        
        resolve({ outDir, files });
      })
      .on('error', (err) => {
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
