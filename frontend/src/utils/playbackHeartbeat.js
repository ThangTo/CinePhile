const defaultNow = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const getMediaTime = (video) => Number(video?.currentTime) || 0;
const getPlaybackRate = (video) => Math.max(0.25, Math.abs(Number(video?.playbackRate) || 1));

export const createPlaybackHeartbeatAccumulator = ({ now = defaultNow } = {}) => {
  let lastTickMs = null;
  let lastMediaTime = null;

  const reset = (video) => {
    lastTickMs = now();
    lastMediaTime = video ? getMediaTime(video) : null;
  };

  const collect = (video) => {
    if (!video) return 0;

    const nowMs = now();
    const currentMediaTime = getMediaTime(video);

    if (lastTickMs === null || lastMediaTime === null) {
      lastTickMs = nowMs;
      lastMediaTime = currentMediaTime;
      return 0;
    }

    const wallDelta = Math.max(0, (nowMs - lastTickMs) / 1000);
    const mediaDelta = Math.max(0, currentMediaTime - lastMediaTime);

    lastTickMs = nowMs;
    lastMediaTime = currentMediaTime;

    if (!wallDelta || !mediaDelta) return 0;

    const normalizedMediaDelta = mediaDelta / getPlaybackRate(video);
    return Math.min(wallDelta, normalizedMediaDelta + 0.25);
  };

  return {
    reset,
    collect,
  };
};
