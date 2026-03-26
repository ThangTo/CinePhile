const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

/**
 * Render a 16:9 video clip with burned-in subtitles and mixed audio.
 *
 * - Keeps original 16:9 aspect ratio (no crop).
 * - Burns subtitles (hardsub).
 * - Mixes original audio at 40% volume with background music at 80% volume.
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
      command
        .input('anullsrc')
        .inputFormat('lavfi')
        .inputOptions([
          '-t', String(finalDuration)
        ]);
    }

    const filterComplex = [
      `[0:a]volume=0.4[original]`,
      `[1:a]volume=0.8[bgm]`,
      `[original][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
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
        console.log(`[RenderService] Rendering clip: ${cmd}`);
      })
      .on('end', () => {
        console.log(`[RenderService] Clip rendered: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`[RenderService] Render failed: ${err.message}`);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  renderClip16x9,
};
