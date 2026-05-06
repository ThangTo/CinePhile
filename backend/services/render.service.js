const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { cleanupTempFile, tempFilePath } = require('./audio.service');
const { buildClipVtt } = require('./vttClip.service');

/**
 * Render a 16:9 video clip with burned-in subtitles and mixed audio.
 *
 * - Keeps original 16:9 aspect ratio (no crop).
 * - Burns subtitles for the selected clip range only.
 * - Keeps movie audio dominant and ducks background music underneath.
 */
function parseTimemarkToSeconds(timemark) {
  if (!timemark || typeof timemark !== 'string') return null;
  const parts = timemark.split(':');
  if (parts.length !== 3) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);

  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) return true;

  return fallback;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeAssStyleValue(value, fallback) {
  return String(value || fallback)
    .replace(/[,;]/g, '')
    .trim() || fallback;
}

function normalizeHexColor(value, fallback = 'FFFFFF') {
  const normalized = String(value || fallback).trim().replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
}

function hexColorToAssBgr(hexColor) {
  const color = normalizeHexColor(hexColor);
  const rr = color.slice(0, 2);
  const gg = color.slice(2, 4);
  const bb = color.slice(4, 6);
  return `${bb}${gg}${rr}`;
}

function normalizeRenderOptions(options = {}, env = process.env) {
  return {
    subtitleEnabled: parseBoolean(
      options.subtitleEnabled ?? options.subtitlesEnabled ?? options.enableSubtitles,
      parseBoolean(env.VIRAL_SUBTITLE_ENABLED, true),
    ),
    subtitleFont: sanitizeAssStyleValue(options.subtitleFont || env.VIRAL_SUBTITLE_FONT, 'Arial'),
    subtitleFontSize: clampNumber(options.subtitleFontSize || env.VIRAL_SUBTITLE_FONT_SIZE, 24, 14, 64),
    subtitleColor: normalizeHexColor(options.subtitleColor || env.VIRAL_SUBTITLE_COLOR, 'FFFFFF'),
    subtitleOutline: clampNumber(options.subtitleOutline || env.VIRAL_SUBTITLE_OUTLINE, 2.4, 0, 8),
    subtitleShadow: clampNumber(options.subtitleShadow || env.VIRAL_SUBTITLE_SHADOW, 0.7, 0, 6),
    subtitleMarginV: clampNumber(options.subtitleMarginV || env.VIRAL_SUBTITLE_MARGIN_V, 44, 0, 240),
  };
}

function buildSubtitleForceStyle(options = {}) {
  const normalized = normalizeRenderOptions(options);
  const primaryColor = `&H00${hexColorToAssBgr(normalized.subtitleColor)}`;

  return [
    `FontName=${normalized.subtitleFont}`,
    `FontSize=${normalized.subtitleFontSize}`,
    'Bold=1',
    `PrimaryColour=${primaryColor}`,
    'OutlineColour=&H00000000',
    'BorderStyle=1',
    `Outline=${normalized.subtitleOutline}`,
    `Shadow=${normalized.subtitleShadow}`,
    'Alignment=2',
    `MarginV=${normalized.subtitleMarginV}`,
  ].join(',');
}

function renderClip16x9(
  videoUrl,
  bgMusic,
  subtitleFile,
  startTime,
  duration,
  outputPath,
  bgmStartTime = '0',
  bgmDuration = null,
  onProgress = null,
  renderOptions = {},
) {
  return new Promise((resolve, reject) => {
    let clipSubtitlePath = null;

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const command = ffmpeg();

    const finalDuration = bgmDuration ? Number(bgmDuration) : duration;
    const renderCrf = process.env.VIRAL_RENDER_CRF || '20';
    const renderPreset = process.env.VIRAL_RENDER_PRESET || 'medium';
    const movieAudioVolume = Number(process.env.VIRAL_MOVIE_AUDIO_VOLUME || process.env.VIRAL_ORIGINAL_AUDIO_VOLUME || 1.35);
    const bgmVolume = Number(process.env.VIRAL_BGM_VOLUME || 0.18);
    const hasBgMusic = Boolean(bgMusic);
    const normalizedRenderOptions = normalizeRenderOptions(renderOptions);
    const subtitleForceStyle = buildSubtitleForceStyle(normalizedRenderOptions);

    if (normalizedRenderOptions.subtitleEnabled && subtitleFile && fs.existsSync(subtitleFile)) {
      const sourceVtt = fs.readFileSync(subtitleFile, 'utf-8');
      const clipVtt = buildClipVtt(sourceVtt, startTime, finalDuration);

      if (clipVtt.cueCount > 0) {
        clipSubtitlePath = tempFilePath('.vtt');
        fs.writeFileSync(clipSubtitlePath, clipVtt.content, 'utf-8');
        console.log(`[RenderService] Prepared ${clipVtt.cueCount} subtitle cues for clip ${startTime}`);
      } else {
        console.warn(`[RenderService] No subtitle cues found for clip ${startTime} (${finalDuration}s). Rendering without hardsubs.`);
      }
    } else if (!normalizedRenderOptions.subtitleEnabled) {
      console.log(`[RenderService] Subtitles disabled for clip ${startTime}`);
    }

    // Input 0: video source (with seek)
    command
      .input(videoUrl)
      .inputOptions([
        '-ss', String(startTime),
        '-t', String(finalDuration),
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
      ]);

    // Input 1: background music (with its own seek)
    if (hasBgMusic) {
      command
        .input(bgMusic)
        .inputOptions([
          '-ss', String(bgmStartTime),
          '-t', String(finalDuration),
          '-stream_loop', '-1', // Loop BGM if shorter than clip
        ]);
    }

    const filterComplex = hasBgMusic
      ? [
          `[0:a]volume=${Number.isFinite(movieAudioVolume) ? movieAudioVolume : 1.35},asplit=2[dialogue][sidechain]`,
          `[1:a]volume=${Number.isFinite(bgmVolume) ? bgmVolume : 0.18}[bgmraw]`,
          `[bgmraw][sidechain]sidechaincompress=threshold=0.03:ratio=8:attack=50:release=800[bgmduck]`,
          `[dialogue][bgmduck]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.95[aout]`,
        ]
      : [
          `[0:a]volume=${Number.isFinite(movieAudioVolume) ? movieAudioVolume : 1.35},alimiter=limit=0.95[aout]`,
        ];

    if (clipSubtitlePath) {
      const escapedSubPath = clipSubtitlePath
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:');

      filterComplex.push(
        `[0:v]subtitles='${escapedSubPath}':force_style='${subtitleForceStyle}'[vout]`,
      );
    } else {
      filterComplex.push('[0:v]null[vout]');
    }

    command
      .complexFilter(filterComplex.join(';'))
      .outputOptions([
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', renderPreset,
        '-crf', renderCrf,
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-t', String(finalDuration),
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[RenderService] Rendering clip: ${cmd}`);
      })
      .on('progress', (progress = {}) => {
        if (!onProgress) return;

        const timemarkSeconds = parseTimemarkToSeconds(progress.timemark);
        const percent = Number.isFinite(progress.percent)
          ? progress.percent
          : Number.isFinite(timemarkSeconds) && finalDuration > 0
            ? (timemarkSeconds / finalDuration) * 100
            : null;

        if (Number.isFinite(percent)) {
          onProgress(Math.max(10, Math.min(99, Math.round(percent))));
        }
      })
      .on('end', () => {
        if (clipSubtitlePath) cleanupTempFile(clipSubtitlePath);
        if (onProgress) onProgress(100);
        console.log(`[RenderService] Clip rendered: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        if (clipSubtitlePath) cleanupTempFile(clipSubtitlePath);
        console.error(`[RenderService] Render failed: ${err.message}`);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  buildSubtitleForceStyle,
  normalizeRenderOptions,
  renderClip16x9,
};
