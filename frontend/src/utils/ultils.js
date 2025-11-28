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
