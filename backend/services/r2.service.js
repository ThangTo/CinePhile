const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
const fs = require('fs');

const SUBTITLE_FOLDER = process.env.R2_SUBTITLE_FOLDER || 'subtitles';

function getR2Config(overrides = {}) {
  return {
    accountId: overrides.accountId || process.env.R2_ACCOUNT_ID,
    accessKey: overrides.accessKey || process.env.R2_ACCESS_KEY,
    secretKey: overrides.secretKey || process.env.R2_SECRET_KEY,
    bucketName: overrides.bucketName || process.env.R2_BUCKET_NAME,
    publicDomain: overrides.publicDomain || process.env.PUBLIC_DOMAIN,
  };
}

function hasR2Config(overrides = {}) {
  const config = getR2Config(overrides);
  return Boolean(config.accountId && config.accessKey && config.secretKey && config.bucketName);
}

function createS3Client(overrides = {}) {
  const config = getR2Config(overrides);
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });
}

function getPublicUrl(key, overrides = {}) {
  const config = getR2Config(overrides);
  if (!config.publicDomain && !config.accountId) {
    return null;
  }

  const publicBase = config.publicDomain
    ? config.publicDomain.replace(/\/$/, '')
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}`;

  return `${publicBase}/${key}`;
}

async function uploadFileToR2(localFilePath, key, options = {}) {
  if (!hasR2Config({ bucketName: options.bucketName })) {
    console.warn('[R2Service] Missing R2 configuration, skipping cloud upload');
    return null;
  }

  const fileStream = fs.createReadStream(localFilePath);
  const client = createS3Client({ bucketName: options.bucketName });

  const uploadParams = {
    Bucket: options.bucketName || process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: options.contentType || 'application/octet-stream',
  };

  if (options.metadata) {
    uploadParams.Metadata = options.metadata;
  }

  await client.send(new PutObjectCommand(uploadParams));

  return {
    bucket: uploadParams.Bucket,
    key,
    url: getPublicUrl(key, { bucketName: uploadParams.Bucket }),
  };
}

async function deleteObjectsOlderThan(prefix, retentionDays, options = {}) {
  const days = Number.parseInt(retentionDays, 10);
  if (!Number.isFinite(days) || days <= 0) {
    return 0;
  }

  if (!hasR2Config({ bucketName: options.bucketName })) {
    return 0;
  }

  const bucket = options.bucketName || process.env.R2_BUCKET_NAME;
  const client = createS3Client({ bucketName: bucket });
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let continuationToken;

  do {
    const listResult = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objectsToDelete = (listResult.Contents || [])
      .filter((object) => object.Key && object.LastModified && object.LastModified.getTime() < cutoff)
      .map((object) => ({ Key: object.Key }));

    for (let i = 0; i < objectsToDelete.length; i += 1000) {
      const batch = objectsToDelete.slice(i, i + 1000);
      if (batch.length === 0) continue;

      const deleteResult = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch,
            Quiet: true,
          },
        }),
      );

      deletedCount += batch.length - (deleteResult.Errors || []).length;
    }

    continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
  } while (continuationToken);

  return deletedCount;
}

/**
 * Upload a VTT file to R2
 * @param {string} localFilePath Path to local VTT file
 * @param {string} fileName Target filename in R2
 * @param {string} language Subtitle language code (e.g. 'ko')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadSubtitle(localFilePath, fileName, language = 'ko') {
  try {
    const key = `${SUBTITLE_FOLDER}/${language}/${fileName}`;
    const result = await uploadFileToR2(localFilePath, key, { contentType: 'text/vtt' });
    return result ? result.url : null;
  } catch (error) {
    console.error('[R2Service] Upload failed:', error.message);
    return null;
  }
}

/**
 * Check if a subtitle exists in R2
 * @param {string} fileName Filename in R2
 * @param {string} language Subtitle language code
 * @returns {Promise<string|null>} Public URL if exists, else null
 */
async function getSubtitleUrlIfMatch(fileName, language = 'ko') {
  if (!hasR2Config() || !process.env.PUBLIC_DOMAIN) return null;

  const key = `${SUBTITLE_FOLDER}/${language}/${fileName}`;
  try {
    const client = createS3Client();
    await client.send(new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
    
    return getPublicUrl(key);
  } catch (error) {
    // If 404, it doesn't exist
    return null;
  }
}

module.exports = {
  createS3Client,
  deleteObjectsOlderThan,
  getR2Config,
  hasR2Config,
  uploadFileToR2,
  uploadSubtitle,
  getSubtitleUrlIfMatch,
};
