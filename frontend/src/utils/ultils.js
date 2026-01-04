export const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const parseEpisodeNumber = (ep) => {
  if (ep === undefined || ep === null || ep === "") return 0;

  // If it's already a number, return it
  if (typeof ep === "number") return ep;

  // If it's a string, try to extract number
  if (typeof ep === "string") {
    // Remove all non-digit characters and parse
    const numStr = ep.replace(/\D/g, "");
    const num = parseInt(numStr, 10);
    return isNaN(num) ? 0 : num;
  }

  return 0;
};

export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};
