// Script: Upload default avatar images from local folder to Cloudflare R2
// Usage:
//   cd backend
//   node scripts/uploadAvatarsToR2.js
//
// Requirements:
//   - .env configured with:
//       R2_ACCOUNT_ID
//       R2_ACCESS_KEY
//       R2_SECRET_KEY
//       R2_BUCKET_NAME
//       PUBLIC_DOMAIN           (e.g. https://cdn.yourdomain.com)
//       R2_AVATAR_BASE_URL      (optional, e.g. https://cdn.yourdomain.com/avatars)

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load environment variables from ../.env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME) {
  console.error(
    'Missing required R2 env vars. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME in .env',
  );
  process.exit(1);
}

const AVATAR_SOURCE_DIR = path.join(__dirname, '..', 'data', 'avatars');
const AVATAR_FOLDER = process.env.R2_AVATAR_FOLDER || 'avatars';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

const guessContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
};

const getPublicBaseForAvatars = () => {
  if (process.env.R2_AVATAR_BASE_URL) {
    return process.env.R2_AVATAR_BASE_URL.replace(/\/$/, '');
  }
  if (PUBLIC_DOMAIN) {
    const base = PUBLIC_DOMAIN.replace(/\/$/, '');
    return `${base}/${AVATAR_FOLDER}`;
  }
  // Fallback: direct R2 bucket URL (if public)
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${AVATAR_FOLDER}`;
};

async function uploadAvatar(fileName) {
  const filePath = path.join(AVATAR_SOURCE_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const key = `${AVATAR_FOLDER}/${fileName}`;
  const contentType = guessContentType(fileName);
  const fileStream = fs.createReadStream(filePath);

  const uploadParams = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  const publicBase = getPublicBaseForAvatars();
  const publicUrl = `${publicBase}/${fileName}`;

  return {
    fileName,
    key,
    url: publicUrl,
  };
}

async function main() {
  console.log('🚀 Uploading default avatars to R2...');
  console.log('Source dir:', AVATAR_SOURCE_DIR);
  console.log('Bucket:', R2_BUCKET_NAME);
  console.log('Folder:', AVATAR_FOLDER);

  const files = fs
    .readdirSync(AVATAR_SOURCE_DIR)
    .filter((f) => !fs.statSync(path.join(AVATAR_SOURCE_DIR, f)).isDirectory());

  if (files.length === 0) {
    console.log('No files found in avatars folder.');
    return;
  }

  const results = [];
  for (const file of files) {
    try {
      console.log(`⬆️  Uploading ${file}...`);
      const result = await uploadAvatar(file);
      console.log(`✅ Uploaded: ${result.url}`);
      results.push(result);
    } catch (err) {
      console.error(`❌ Failed to upload ${file}:`, err.message);
    }
  }

  console.log('\n📋 Upload summary (JSON):');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n💡 You can now update DEFAULT_AVATARS in backend/utils/avatarUtils.js using the URLs above.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

