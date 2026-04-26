const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;
const SUBTITLE_FOLDER = process.env.R2_SUBTITLE_FOLDER || 'subtitles';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

/**
 * Upload a VTT file to R2
 * @param {string} localFilePath Path to local VTT file
 * @param {string} fileName Target filename in R2
 * @param {string} language Subtitle language code (e.g. 'ko')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadSubtitle(localFilePath, fileName, language = 'ko') {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME) {
    console.warn('[R2Service] Missing R2 configuration, skipping cloud upload');
    return null;
  }

  try {
    const key = `${SUBTITLE_FOLDER}/${language}/${fileName}`;
    const fileContent = fs.readFileSync(localFilePath);

    const uploadParams = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'text/vtt',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const publicBase = PUBLIC_DOMAIN ? PUBLIC_DOMAIN.replace(/\/$/, '') : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`;
    return `${publicBase}/${key}`;
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
  if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !PUBLIC_DOMAIN) return null;

  const key = `${SUBTITLE_FOLDER}/${language}/${fileName}`;
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    
    const publicBase = PUBLIC_DOMAIN.replace(/\/$/, '');
    return `${publicBase}/${key}`;
  } catch (error) {
    // If 404, it doesn't exist
    return null;
  }
}

module.exports = {
  uploadSubtitle,
  getSubtitleUrlIfMatch,
};
