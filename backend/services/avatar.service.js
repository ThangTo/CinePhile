const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const {
  AVATAR_FOLDER,
  extractDefaultAvatarFilename,
  getAvatarBaseUrl,
  getDefaultAvatarUrlByKey,
  normalizeAvatarForOutput,
} = require('../utils/avatarUtils');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const MAX_AVATAR_BYTES = Number.parseInt(process.env.AVATAR_MAX_BYTES || '', 10) || 5 * 1024 * 1024;

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const hasR2Config = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET_NAME,
);

const performFetch = (...args) => {
  if (typeof fetch === 'function') {
    return fetch(...args);
  }

  return import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
};

const s3Client = hasR2Config
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    })
  : null;

const ensureAvatarStorageConfigured = () => {
  if (!hasR2Config || !s3Client) {
    throw new Error('Avatar storage is not configured');
  }
};

const getAvatarOwnerKey = (user) =>
  user?.username || user?.email || user?._id?.toString() || 'default';

const isHttpUrl = (value = '') => /^https?:\/\//i.test(value);

const normalizeContentType = (value = '') =>
  String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

const getFileExtensionFromMimeType = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/avif') return 'avif';
  return 'bin';
};

const buildAvatarPublicUrl = (objectKey) => {
  const suffix = String(objectKey || '')
    .replace(/\\/g, '/')
    .replace(new RegExp(`^${AVATAR_FOLDER}/?`), '');

  return `${getAvatarBaseUrl()}/${suffix}`;
};

const buildManagedAvatarKey = (userId, contentType) => {
  const extension = getFileExtensionFromMimeType(contentType);
  const fingerprint = crypto.randomBytes(8).toString('hex');
  return `${AVATAR_FOLDER}/users/${userId}/${Date.now()}-${fingerprint}.${extension}`;
};

const deriveManagedKeyFromUrl = (avatarUrl) => {
  const baseUrl = getAvatarBaseUrl();
  if (!avatarUrl || !avatarUrl.startsWith(`${baseUrl}/users/`)) {
    return null;
  }

  const suffix = avatarUrl.slice(baseUrl.length).replace(/^\/+/, '');
  return suffix ? `${AVATAR_FOLDER}/${suffix}` : null;
};

const validateAvatarPayload = ({ buffer, contentType }) => {
  const normalizedContentType = normalizeContentType(contentType);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Avatar file is empty');
  }

  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new Error('Avatar file is too large');
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.has(normalizedContentType)) {
    throw new Error('Invalid avatar file type');
  }

  return normalizedContentType;
};

const deleteAvatarObject = async (objectKey) => {
  if (!objectKey || !s3Client) {
    return;
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
      }),
    );
  } catch (error) {
    console.warn('[Avatar] Failed to delete old avatar from R2:', error.message);
  }
};

const saveUserAvatarState = async (user, { avatar, avatarStorageKey }) => {
  const previousAvatarKey = user.avatarStorageKey || null;

  user.avatar = avatar;
  user.avatarStorageKey = avatarStorageKey || null;
  await user.save();

  if (
    previousAvatarKey &&
    previousAvatarKey !== user.avatarStorageKey &&
    previousAvatarKey.startsWith(`${AVATAR_FOLDER}/users/`)
  ) {
    await deleteAvatarObject(previousAvatarKey);
  }

  return user;
};

const uploadAvatarBufferForUser = async (user, { buffer, contentType }) => {
  ensureAvatarStorageConfigured();

  const normalizedContentType = validateAvatarPayload({ buffer, contentType });
  const objectKey = buildManagedAvatarKey(user._id.toString(), normalizedContentType);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: normalizedContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return saveUserAvatarState(user, {
    avatar: buildAvatarPublicUrl(objectKey),
    avatarStorageKey: objectKey,
  });
};

const parseAvatarDataUrl = (dataUrl) => {
  const matched = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!matched) {
    throw new Error('Invalid avatar data URL');
  }

  return {
    contentType: normalizeContentType(matched[1]),
    buffer: Buffer.from(matched[2], 'base64'),
  };
};

const downloadRemoteAvatar = async (avatarUrl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await performFetch(avatarUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to download avatar (${response.status})`);
    }

    const contentType = normalizeContentType(response.headers.get('content-type'));
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      contentType,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const assignDefaultAvatar = async (user) =>
  saveUserAvatarState(user, {
    avatar: getDefaultAvatarUrlByKey(getAvatarOwnerKey(user)),
    avatarStorageKey: null,
  });

const setManagedAvatarUrl = async (user, avatarUrl) => {
  const managedKey = deriveManagedKeyFromUrl(avatarUrl);

  return saveUserAvatarState(user, {
    avatar: avatarUrl,
    avatarStorageKey: managedKey,
  });
};

const updateUserAvatarFromValue = async (user, avatarValue) => {
  const rawAvatar = String(avatarValue || '').trim();

  if (!rawAvatar) {
    return assignDefaultAvatar(user);
  }

  if (rawAvatar.startsWith('data:image/')) {
    const payload = parseAvatarDataUrl(rawAvatar);
    return uploadAvatarBufferForUser(user, payload);
  }

  const defaultAvatarFilename = extractDefaultAvatarFilename(rawAvatar);
  if (defaultAvatarFilename) {
    return saveUserAvatarState(user, {
      avatar: normalizeAvatarForOutput(rawAvatar, getAvatarOwnerKey(user)),
      avatarStorageKey: null,
    });
  }

  if (rawAvatar.startsWith(`${AVATAR_FOLDER}/users/`)) {
    return saveUserAvatarState(user, {
      avatar: normalizeAvatarForOutput(rawAvatar, getAvatarOwnerKey(user)),
      avatarStorageKey: rawAvatar,
    });
  }

  if (rawAvatar.startsWith('users/')) {
    return saveUserAvatarState(user, {
      avatar: normalizeAvatarForOutput(rawAvatar, getAvatarOwnerKey(user)),
      avatarStorageKey: `${AVATAR_FOLDER}/${rawAvatar}`,
    });
  }

  const managedKey = deriveManagedKeyFromUrl(rawAvatar);
  if (managedKey) {
    return setManagedAvatarUrl(user, rawAvatar);
  }

  if (isHttpUrl(rawAvatar)) {
    const payload = await downloadRemoteAvatar(rawAvatar);
    return uploadAvatarBufferForUser(user, payload);
  }

  return saveUserAvatarState(user, {
    avatar: normalizeAvatarForOutput(rawAvatar, getAvatarOwnerKey(user)),
    avatarStorageKey: null,
  });
};

const updateUserAvatarFromFile = async (user, file) => {
  if (!file || !file.buffer) {
    throw new Error('Avatar file is required');
  }

  return uploadAvatarBufferForUser(user, {
    buffer: file.buffer,
    contentType: file.mimetype,
  });
};

const migrateStoredAvatarToR2 = async (user) => {
  const currentAvatar = String(user?.avatar || '').trim();
  const normalizedAvatar = normalizeAvatarForOutput(currentAvatar, getAvatarOwnerKey(user));
  const managedKey = deriveManagedKeyFromUrl(currentAvatar);
  const defaultAvatarFilename = extractDefaultAvatarFilename(currentAvatar);

  if (!currentAvatar) {
    return assignDefaultAvatar(user);
  }

  if (defaultAvatarFilename) {
    if (normalizedAvatar !== currentAvatar || user.avatarStorageKey) {
      return saveUserAvatarState(user, {
        avatar: normalizedAvatar,
        avatarStorageKey: null,
      });
    }

    return user;
  }

  if (managedKey) {
    if (user.avatarStorageKey !== managedKey) {
      user.avatarStorageKey = managedKey;
      await user.save();
    }
    return user;
  }

  if (normalizedAvatar !== currentAvatar || user.avatarStorageKey) {
    try {
      return await updateUserAvatarFromValue(user, currentAvatar);
    } catch (error) {
      console.warn(
        `[Avatar] Failed to migrate avatar for user ${user._id}: ${error.message}`,
      );
      return saveUserAvatarState(user, {
        avatar: normalizedAvatar,
        avatarStorageKey: null,
      });
    }
  }

  if (isHttpUrl(currentAvatar) || currentAvatar.startsWith('data:image/')) {
    try {
      return await updateUserAvatarFromValue(user, currentAvatar);
    } catch (error) {
      console.warn(
        `[Avatar] Failed to store external avatar for user ${user._id}: ${error.message}`,
      );
    }
  }

  return user;
};

module.exports = {
  ALLOWED_AVATAR_MIME_TYPES: Array.from(ALLOWED_AVATAR_MIME_TYPES),
  MAX_AVATAR_BYTES,
  assignDefaultAvatar,
  buildAvatarPublicUrl,
  hasR2Config,
  migrateStoredAvatarToR2,
  updateUserAvatarFromFile,
  updateUserAvatarFromValue,
};
