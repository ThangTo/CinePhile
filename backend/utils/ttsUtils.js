const crypto = require('crypto');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// ====================================================================
// TTS UTILITY (ElevenLabs + Cloudflare R2 Caching)
// ====================================================================

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;

// Khởi tạo R2 S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

/**
 * Tạo MD5 hash chuẩn từ chuỗi văn bản
 */
function createHash(text) {
  return crypto.createHash('md5').update(text.trim()).digest('hex');
}

/**
 * Kiểm tra xem File MP3 đã tồn tại trên thư mục tts-cache của R2 chưa
 */
async function checkR2CacheExists(bucketKey) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: bucketKey }));
    return true; // File exist
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error('[TTS Util] R2 HeadObject Error:', error);
    return false; // Coi như không có để thử tạo lại
  }
}

/**
 * Gọi ElevenLabs API và lưu lên R2 nếu chưa có
 */
async function generateTtsAudio(text) {
  if (!text || typeof text !== 'string') return null;
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    console.warn('[TTS Util] Thiếu API Key hoặc Voice ID của ElevenLabs.');
    return null; // Fallback về WebSpeech của Frontend
  }

  const cleanText = text.trim();
  const hash = createHash(cleanText);
  const bucketKey = `tts-cache/${hash}.mp3`;
  const publicUrl = `${PUBLIC_DOMAIN}/${bucketKey}`;

  // 1. Kiểm tra Cache R2
  const isCached = await checkR2CacheExists(bucketKey);
  if (isCached) {
    console.log(`[TTS Util] 🟢 OKE CACHE HIT: ${hash}.mp3`);
    return publicUrl;
  }

  // 2. Không có Cache -> Xử lý (ElevenLabs)
  console.log(`[TTS Util] 🔴 MISS CACHE: Đang gọi ElevenLabs cho "${cleanText}"...`);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_v3',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[TTS Util] ElevenLabs Error ${response.status}:`, errText);
      return null;
    }

    // 3. Upload file Audio trả về Lên R2
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: bucketKey,
      Body: buffer,
      ContentType: 'audio/mpeg',
    }));

    console.log(`[TTS Util] ✅ Upload R2 thành công: ${bucketKey}`);
    return publicUrl;
  } catch (error) {
    console.error('[TTS Util] Lỗi quá trình tạo TTS:', error);
    return null;
  }
}

module.exports = {
  generateTtsAudio,
};
