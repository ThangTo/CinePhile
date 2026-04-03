/**
 * Format seconds into a human-readable watch duration string.
 * @param {number} seconds
 * @returns {string} e.g. "2.5h", "45m", "30s"
 */
const formatWatchDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
  return `${seconds}s`;
};

export default formatWatchDuration;
