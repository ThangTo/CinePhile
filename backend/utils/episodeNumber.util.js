const FULL_MOVIE_LABELS = new Set([
  'full',
  'hoan tat',
  'vietsub',
  'thuyet minh',
  'thuyet-minh',
  'long tieng',
  'long-tieng',
  'hd',
]);

const normalizeLabel = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd');

const extractEpisodeNumber = (name = '') => {
  const normalizedName = normalizeLabel(name);
  if (!normalizedName) return 0;

  if (normalizedName.includes('trailer') || normalizedName.includes('sap chieu')) {
    return 0;
  }

  const match = normalizedName.match(/\d+/);
  if (match) return parseInt(match[0], 10);

  if (
    FULL_MOVIE_LABELS.has(normalizedName) ||
    normalizedName.includes('full') ||
    normalizedName.includes('hoan tat')
  ) {
    return 1;
  }

  return 0;
};

module.exports = {
  extractEpisodeNumber,
};
