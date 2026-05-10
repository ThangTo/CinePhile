export const getEpisodeNumber = (episode) => {
  const rawNumber = episode?.episode ?? episode?.episodeId;
  const parsedNumber = Number.parseInt(rawNumber, 10);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
};

const normalizeAudioType = (audioType) =>
  typeof audioType === "string" ? audioType.trim().toLowerCase() : null;

const DEFAULT_AUDIO_PRIORITY = ["vietsub", "thuyet-minh", "long-tieng"];
const LEGACY_FULL_MOVIE_EPISODE = 0;

const matchesAudioType = (episode, audioType) => {
  const requestedAudioType = normalizeAudioType(audioType);
  if (!requestedAudioType) return false;
  return normalizeAudioType(episode?.audioType) === requestedAudioType;
};

const findEpisodeVariantsByNumber = (episodes, episodeNumber) => {
  const sameNumberEpisodes = episodes.filter(
    (episode) => getEpisodeNumber(episode) === episodeNumber,
  );

  if (sameNumberEpisodes.length > 0 || episodeNumber !== 1) {
    return sameNumberEpisodes;
  }

  return episodes.filter(
    (episode) => getEpisodeNumber(episode) === LEGACY_FULL_MOVIE_EPISODE,
  );
};

export const findEpisodeVariant = (episodes = [], episodeNumber = 1, audioType = null) => {
  if (!Array.isArray(episodes) || episodes.length === 0) return null;

  const requestedEpisodeNumber = Number.parseInt(episodeNumber, 10);
  const activeEpisodeNumber = Number.isFinite(requestedEpisodeNumber) ? requestedEpisodeNumber : 1;
  const sameNumberEpisodes = findEpisodeVariantsByNumber(episodes, activeEpisodeNumber);

  const matchingAudioEpisode = sameNumberEpisodes.find((episode) =>
    matchesAudioType(episode, audioType),
  );
  if (matchingAudioEpisode) return matchingAudioEpisode;
  if (sameNumberEpisodes.length > 0) return sameNumberEpisodes[0];

  const firstEpisodeVariants = findEpisodeVariantsByNumber(episodes, 1);
  return (
    firstEpisodeVariants.find((episode) => matchesAudioType(episode, audioType)) ||
    firstEpisodeVariants[0] ||
    episodes[0]
  );
};

export const countUniqueEpisodes = (episodes = []) => {
  if (!Array.isArray(episodes)) return 0;

  const episodeNumbers = new Set();
  episodes.forEach((episode) => {
    const episodeNumber = getEpisodeNumber(episode);
    if (episodeNumber !== null) episodeNumbers.add(episodeNumber);
  });

  return episodeNumbers.size;
};

export const pickPreferredAudioType = (
  episodes = [],
  preferredOrder = DEFAULT_AUDIO_PRIORITY,
) => {
  if (!Array.isArray(episodes) || episodes.length === 0) return null;

  const availableAudioTypes = episodes
    .map((episode) => normalizeAudioType(episode?.audioType))
    .filter(Boolean);

  return (
    preferredOrder.find((audioType) => availableAudioTypes.includes(audioType)) ||
    availableAudioTypes[0] ||
    null
  );
};
