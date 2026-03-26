const ffmpeg = require('fluent-ffmpeg');

/**
 * Detect scene changes in a video using FFmpeg.
 * Returns an array of timestamps (in seconds) where scene changes occur.
 */
function detectScenes(videoUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const sceneBoundaries = [];
    
    ffmpeg(videoUrl)
      .inputOptions(['-protocol_whitelist', 'file,http,https,tcp,tls,crypto'])
      .outputOptions([
        '-filter:v', "select='gt(scene,0.4)',showinfo",
        '-f', 'null'
      ])
      .output('-')
      .on('start', (cmd) => {
        console.log(`[SceneService] Detecting scenes: ${cmd}`);
      })
      .on('stderr', (stderrLine) => {
        // Parse showinfo logs for scene cut timestamps
        // Format example: [Parsed_showinfo_1 @ 0x...] n:   0 pts_time:12.345 ...
        const match = stderrLine.match(/pts_time:([\d.]+)/);
        if (match) {
          const timestamp = parseFloat(match[1]);
          sceneBoundaries.push(timestamp);
        }
      })
      .on('progress', (progress) => {
        if (progress.percent && onProgress) {
          onProgress(Math.round(progress.percent));
        }
      })
      .on('end', () => {
        console.log(`[SceneService] Found ${sceneBoundaries.length} scene changes.`);
        resolve(sceneBoundaries);
      })
      .on('error', (err) => {
        console.error(`[SceneService] Scene detection failed/interrupted: ${err.message}`);
        resolve(sceneBoundaries); // Resolve partially found boundaries to avoid breaking pipeline
      })
      .run();
  });
}

module.exports = {
  detectScenes
};
