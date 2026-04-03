const DEFAULT_AVATARS = ['avt1.jpg', 'avt2.webp', 'avt3.jpg', 'avt4.jpg', 'avt5.jpg'];

const FALLBACK_R2_AVATAR_BASE_URL =
  'https://pub-e00827b92ed84d85a314a9c12ba6f2e7.r2.dev/avatars';

const AVATAR_FOLDER = process.env.R2_AVATAR_FOLDER || 'avatars';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const getAvatarBaseUrl = () => {
  if (process.env.R2_AVATAR_BASE_URL) {
    return trimTrailingSlash(process.env.R2_AVATAR_BASE_URL);
  }

  if (process.env.PUBLIC_DOMAIN) {
    return `${trimTrailingSlash(process.env.PUBLIC_DOMAIN)}/${AVATAR_FOLDER}`;
  }

  return trimTrailingSlash(FALLBACK_R2_AVATAR_BASE_URL);
};

const hashString = (value = '') => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const buildDefaultAvatarUrl = (filename) => `${getAvatarBaseUrl()}/${filename}`;

const extractDefaultAvatarFilename = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  const matchedFilename = DEFAULT_AVATARS.find((filename) => {
    const escaped = filename.replace('.', '\\.');
    return new RegExp(`(?:^|/)${escaped}(?:$|[?#])`, 'i').test(trimmed);
  });

  return matchedFilename || null;
};

const getDefaultAvatarUrlByKey = (key) => {
  const index = hashString(key || 'default') % DEFAULT_AVATARS.length;
  return buildDefaultAvatarUrl(DEFAULT_AVATARS[index]);
};

const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return buildDefaultAvatarUrl(DEFAULT_AVATARS[randomIndex]);
};

const normalizeAvatarForOutput = (avatar, key) => {
  const trimmed = String(avatar || '').trim();
  if (!trimmed) {
    return getDefaultAvatarUrlByKey(key);
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  const defaultAvatarFilename = extractDefaultAvatarFilename(trimmed);
  if (defaultAvatarFilename) {
    return buildDefaultAvatarUrl(defaultAvatarFilename);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith(`${AVATAR_FOLDER}/`)) {
    return `${getAvatarBaseUrl()}/${trimmed.slice(AVATAR_FOLDER.length + 1)}`;
  }

  if (trimmed.startsWith('users/')) {
    return `${getAvatarBaseUrl()}/${trimmed}`;
  }

  if (trimmed.startsWith('/api/v1/avatars/')) {
    const filename = trimmed.split('/').pop();
    return filename ? buildDefaultAvatarUrl(filename) : getDefaultAvatarUrlByKey(key);
  }

  return getDefaultAvatarUrlByKey(key);
};

module.exports = {
  AVATAR_FOLDER,
  DEFAULT_AVATARS,
  FALLBACK_R2_AVATAR_BASE_URL,
  buildDefaultAvatarUrl,
  extractDefaultAvatarFilename,
  getAvatarBaseUrl,
  getDefaultAvatarUrlByKey,
  getRandomAvatar,
  normalizeAvatarForOutput,
};
