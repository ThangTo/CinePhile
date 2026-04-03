export const hexToRgbChannels = (hex, fallback = "249, 115, 22") => {
  if (!hex || typeof hex !== "string") return fallback;

  let normalized = hex.trim().replace("#", "");

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `${r}, ${g}, ${b}`;
};

export const hexToRgba = (hex, alpha, fallback = "249, 115, 22") =>
  `rgba(${hexToRgbChannels(hex, fallback)}, ${alpha})`;
