function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizePlaybackMeta(meta) {
  const introStartSec = Number(meta?.introStartSec);
  const introEndSec = Number(meta?.introEndSec);
  const outroStartSec = Number(meta?.outroStartSec);

  return {
    intro:
      Number.isFinite(introStartSec) &&
      Number.isFinite(introEndSec) &&
      introEndSec > introStartSec
        ? { startSec: introStartSec, endSec: introEndSec }
        : null,
    outro: Number.isFinite(outroStartSec) && outroStartSec > 0 ? { startSec: outroStartSec } : null,
  };
}

export function getDynamicOutroWindowSec(durationSec) {
  const duration = Number(durationSec);
  if (!Number.isFinite(duration) || duration <= 0) return null;

  return Math.round(clamp(duration * 0.05, 45, 180));
}

export function getEffectiveOutroStartSec(playbackMeta, durationSec) {
  const duration = Number(durationSec);
  if (!Number.isFinite(duration) || duration <= 0) return null;

  const customStartSec = Number(playbackMeta?.outro?.startSec);
  if (Number.isFinite(customStartSec) && customStartSec > 0 && customStartSec < duration) {
    return customStartSec;
  }

  const windowSec = getDynamicOutroWindowSec(duration);
  if (!windowSec) return null;

  return Math.max(0, duration - windowSec);
}

export function shouldShowNextEpisodePrompt({
  hasNativePlayer,
  hasNextEpisode,
  duration,
  currentTime,
  nextEpisodeCountdown,
  playbackMeta,
}) {
  if (!hasNativePlayer || !hasNextEpisode || !(duration > 0)) return false;
  if (nextEpisodeCountdown !== null && nextEpisodeCountdown !== undefined) return true;

  const outroStartSec = getEffectiveOutroStartSec(playbackMeta, duration);
  return Number.isFinite(outroStartSec) && currentTime >= outroStartSec;
}
