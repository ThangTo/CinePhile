const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    // eslint-disable-next-line no-console
    console.log(`📄 Đã load .env từ: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Không tìm thấy file .env. Đang thử load từ process.env...');
  dotenv.config();
}

const { connectDB } = require('../config/db/db');
const Cast = require('../models/cast.model');
const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Kiểm tra xem tên có chứa ký tự tượng hình (CJK) không
 */
function containsCJKCharacters(name) {
  if (!name) return false;
  const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  return cjkRegex.test(name);
}

/**
 * Tìm tên Latin từ alsoKnownAs
 */
function findLatinName(alsoKnownAs) {
  if (!Array.isArray(alsoKnownAs) || alsoKnownAs.length === 0) return null;
  const latinRegex = /^[a-zA-Z\s\-']+$/;
  for (const alias of alsoKnownAs) {
    if (alias && latinRegex.test(alias.trim())) {
      return alias.trim();
    }
  }
  return null;
}

/**
 * Lấy thông tin person từ TMDb bằng tmdbId
 */
async function getPersonFromTmdb(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return null;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/person/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'vi-VN',
      },
    });
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Không thể lấy thông tin từ TMDb cho ID ${tmdbId}:`, error.message);
    return null;
  }
}

/**
 * Search person từ TMDb bằng tên
 */
async function searchPersonFromTmdb(name) {
  if (!TMDB_API_KEY || !name) return null;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/person`, {
      params: {
        api_key: TMDB_API_KEY,
        query: name,
        language: 'vi-VN',
        include_adult: false,
      },
    });
    const results = response.data?.results || [];
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Không thể search TMDb cho "${name}":`, error.message);
    return null;
  }
}

/**
 * Backfill nameLatin cho các cast đã có
 */
async function backfillCastLatinNames() {
  try {
    await connectDB();
    // eslint-disable-next-line no-console
    console.log('✅ Đã kết nối MongoDB');

    // Tìm tất cả cast có tên tượng hình nhưng chưa có nameLatin
    // Lấy tất cả cast chưa có nameLatin, sau đó filter bằng JavaScript
    const allCastsWithoutLatin = await Cast.find({
      nameLatin: { $exists: false },
    }).lean();

    // Filter bằng JavaScript để tìm những cast có tên tượng hình
    const castsToUpdate = allCastsWithoutLatin.filter((cast) => {
      return containsCJKCharacters(cast.name);
    });

    // eslint-disable-next-line no-console
    console.log(`📊 Tìm thấy ${castsToUpdate.length} cast cần cập nhật nameLatin`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < castsToUpdate.length; i++) {
      const cast = castsToUpdate[i];
      try {
        // eslint-disable-next-line no-console
        console.log(`\n[${i + 1}/${castsToUpdate.length}] Đang xử lý: "${cast.name}"`);

        let latinName = null;
        let person = null;

        // Ưu tiên: Nếu có tmdbId, lấy từ TMDb person API
        if (cast.tmdbId) {
          person = await getPersonFromTmdb(cast.tmdbId);
          if (person) {
            latinName = findLatinName(person.also_known_as || []);
          }
        }

        // Nếu không có tmdbId hoặc không tìm được, search lại
        if (!latinName) {
          person = await searchPersonFromTmdb(cast.name);
          if (person) {
            latinName = findLatinName(person.also_known_as || []);
            // Nếu tìm được person mới và có tmdbId, cập nhật luôn
            if (person.id && !cast.tmdbId) {
              await Cast.updateOne({ _id: cast._id }, { $set: { tmdbId: person.id } });
            }
          }
        }

        if (latinName) {
          await Cast.updateOne({ _id: cast._id }, { $set: { nameLatin: latinName } });
          // eslint-disable-next-line no-console
          console.log(`  ✅ Đã cập nhật: "${cast.name}" → "${latinName}"`);
          updatedCount++;
        } else {
          // eslint-disable-next-line no-console
          console.log(`  ⚠️  Không tìm thấy tên Latin cho "${cast.name}"`);
          skippedCount++;
        }

        // Sleep để tránh spam TMDb API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`  ❌ Lỗi khi xử lý "${cast.name}":`, error.message);
        errorCount++;
      }
    }

    // eslint-disable-next-line no-console
    console.log('\n📈 Tổng kết:');
    // eslint-disable-next-line no-console
    console.log(`  ✅ Đã cập nhật: ${updatedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  ⚠️  Không tìm thấy: ${skippedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  ❌ Lỗi: ${errorCount}`);

    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Lỗi khi backfill cast Latin names:', error);
    process.exit(1);
  }
}

backfillCastLatinNames();
