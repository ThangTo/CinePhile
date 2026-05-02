function timestampToSeconds(timestamp) {
  if (typeof timestamp === 'number') {
    return Number.isFinite(timestamp) ? timestamp : Number.NaN;
  }

  const normalized = String(timestamp || '').trim().replace(',', '.');
  if (!normalized) return Number.NaN;

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(':');
  if (parts.length !== 3 || parts.some((part) => part === '' || Number.isNaN(Number(part)))) {
    return Number.NaN;
  }

  const [hours, minutes, seconds] = parts.map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function secondsToVttTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    `${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`,
  ].join(':');
}

function normalizeTextForMatching(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSubtitleBoilerplate(text) {
  const normalized = normalizeTextForMatching(text);
  if (!normalized) return true;

  const boilerplatePatterns = [
    /subscribe/,
    /dang ky/,
    /la la school/,
    /khong bo lo/,
    /video hap dan/,
    /like and share/,
    /nhan chuong/,
  ];

  return boilerplatePatterns.some((pattern) => pattern.test(normalized));
}

function parseVttCues(vttContent) {
  const lines = String(vttContent || '').replace(/\r/g, '').split('\n');
  const cues = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line.includes('-->')) continue;

    const match = line.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
    if (!match) continue;

    const textLines = [];
    index++;
    while (index < lines.length && lines[index].trim() !== '') {
      const textLine = lines[index].trim();
      if (textLine && !textLine.startsWith('NOTE')) {
        textLines.push(textLine);
      }
      index++;
    }

    const text = textLines.join('\n').trim();
    if (!text) continue;

    cues.push({
      start: timestampToSeconds(match[1]),
      end: timestampToSeconds(match[2]),
      text,
    });
  }

  return cues.filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start);
}

function buildClipVtt(vttContent, clipStart, clipDuration, options = {}) {
  const clipStartSeconds = timestampToSeconds(clipStart);
  const clipDurationSeconds = Number(clipDuration);
  const minCueDuration = Number(options.minCueDuration) || 0.1;

  if (!Number.isFinite(clipStartSeconds) || !Number.isFinite(clipDurationSeconds) || clipDurationSeconds <= 0) {
    return { content: 'WEBVTT\n\n', cueCount: 0 };
  }

  const clipEndSeconds = clipStartSeconds + clipDurationSeconds;
  const output = [];

  for (const cue of parseVttCues(vttContent)) {
    if (cue.end <= clipStartSeconds || cue.start >= clipEndSeconds) continue;
    if (isSubtitleBoilerplate(cue.text)) continue;

    const start = Math.max(0, cue.start - clipStartSeconds);
    const end = Math.min(clipDurationSeconds, cue.end - clipStartSeconds);
    if ((end - start) < minCueDuration) continue;

    output.push({
      start,
      end,
      text: cue.text,
    });
  }

  const body = output
    .map((cue) => `${secondsToVttTime(cue.start)} --> ${secondsToVttTime(cue.end)}\n${cue.text}`)
    .join('\n\n');

  return {
    content: `WEBVTT\n\n${body}${body ? '\n' : ''}`,
    cueCount: output.length,
  };
}

module.exports = {
  buildClipVtt,
  isSubtitleBoilerplate,
  parseVttCues,
  secondsToVttTime,
  timestampToSeconds,
};
