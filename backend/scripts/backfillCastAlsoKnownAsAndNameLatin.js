/**
 * Script để cập nhật alsoKnownAs và nameLatin cho các Cast đã có tmdbId
 * - Lấy alsoKnownAs từ TMDb person API
 * - Xử lý nameLatin: nếu name không phải Latin, lấy từ alsoKnownAs đầu tiên,
 *   nếu không có thì dùng nameLatin hiện có, nếu vẫn không có thì dùng name ban đầu
 * Chạy: node backend/scripts/backfillCastAlsoKnownAsAndNameLatin.js
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'), // Root project
  path.resolve(__dirname, '../.env'), // Backend folder
  path.resolve(process.cwd(), '.env'), // Current working dir
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
  console.error('❌ Không tìm thấy file .env. Vui lòng tạo file .env ở thư mục gốc hoặc backend.');
  process.exit(1);
}

const mongoose = require('mongoose');
const Cast = require('../models/cast.model');
const { getPersonDetails } = require('../integrations/tmdb.service');
const { upsertCastFromTmdb } = require('../integrations/cast.service');
const { isLatinName } = require('../utils/castUtils');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
}

/**
 * Tìm tên Latin đầu tiên từ alsoKnownAs
 */
function findLatinName(alsoKnownAs) {
  if (!Array.isArray(alsoKnownAs) || alsoKnownAs.length === 0) return null;
  for (const alias of alsoKnownAs) {
    if (alias && isLatinName(alias)) {
      return alias.trim();
    }
  }
  return null;
}

async function backfillCastAlsoKnownAsAndNameLatin() {
  await connectDB();

  // Tìm các cast có tmdbId nhưng:
  // 1. Chưa có alsoKnownAs hoặc rỗng
  // 2. Hoặc name không phải Latin nhưng chưa có nameLatin đúng
  const castsToUpdate = await Cast.find({
    tmdbId: { $exists: true, $ne: null },
    $or: [
      // Chưa có alsoKnownAs hoặc rỗng
      { alsoKnownAs: { $exists: false } },
      { alsoKnownAs: { $size: 0 } },
      { alsoKnownAs: null },
      // Name không phải Latin nhưng nameLatin chưa đúng (cần kiểm tra lại)
      {
        $and: [
          { name: { $exists: true, $ne: null, $ne: '' } },
          // Sẽ filter bằng JavaScript vì MongoDB không có hàm isLatinName
        ],
      },
    ],
  }).lean();

  // Filter bằng JavaScript để tìm cast có name không phải Latin nhưng nameLatin chưa đúng
  const filteredCasts = castsToUpdate.filter((cast) => {
    // Nếu đã có alsoKnownAs đầy đủ và nameLatin đúng, bỏ qua
    if (
      cast.alsoKnownAs &&
      Array.isArray(cast.alsoKnownAs) &&
      cast.alsoKnownAs.length > 0 &&
      cast.nameLatin &&
      isLatinName(cast.nameLatin)
    ) {
      return false;
    }

    // Nếu name không phải Latin và chưa có nameLatin, cần cập nhật
    if (!isLatinName(cast.name) && !cast.nameLatin) {
      return true;
    }

    // Nếu chưa có alsoKnownAs, cần cập nhật
    if (!cast.alsoKnownAs || !Array.isArray(cast.alsoKnownAs) || cast.alsoKnownAs.length === 0) {
      return true;
    }

    return true;
  });

  console.log(
    `\n🔍 Tìm thấy ${filteredCasts.length} diễn viên cần cập nhật alsoKnownAs và/hoặc nameLatin.`,
  );

  // Cấu hình batch processing
  const CONCURRENT_LIMIT = 5; // Xử lý 5 cast cùng lúc
  const DELAY_BETWEEN_BATCHES = 200; // Delay 200ms giữa các batch

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  /**
   * Xử lý một cast
   */
  async function processCast(castDoc, index, total) {
    try {
      console.log(
        `\n[${index + 1}/${total}] 🔄 Đang xử lý diễn viên: ${castDoc.name} (TMDb ID: ${
          castDoc.tmdbId
        })`,
      );

      // Lấy thông tin chi tiết từ TMDb
      const personDetails = await getPersonDetails(castDoc.tmdbId);

      if (!personDetails) {
        console.log(`  ⚠️  Không tìm thấy chi tiết TMDb cho diễn viên: ${castDoc.name}`);
        return { status: 'skipped' };
      }

      // Kiểm tra xem có cần cập nhật không
      const needsAlsoKnownAs =
        !castDoc.alsoKnownAs ||
        !Array.isArray(castDoc.alsoKnownAs) ||
        castDoc.alsoKnownAs.length === 0;
      const needsNameLatin = !isLatinName(castDoc.name) && !castDoc.nameLatin;

      if (!needsAlsoKnownAs && !needsNameLatin) {
        console.log(`  ⏩ Bỏ qua: đã có đầy đủ alsoKnownAs và nameLatin`);
        return { status: 'skipped' };
      }

      // Sử dụng upsertCastFromTmdb để cập nhật (hàm này đã có logic merge alsoKnownAs và xử lý nameLatin)
      const role = castDoc.roles && castDoc.roles.length > 0 ? castDoc.roles[0] : null;
      await upsertCastFromTmdb(personDetails, role);

      console.log(`  👍 Đã cập nhật alsoKnownAs và/hoặc nameLatin cho diễn viên: ${castDoc.name}`);

      // Log chi tiết
      if (needsAlsoKnownAs) {
        console.log(
          `    📝 alsoKnownAs: ${personDetails.alsoKnownAs?.length || 0} items đã được merge`,
        );
      }
      if (needsNameLatin) {
        const finalCast = await Cast.findById(castDoc._id).lean();
        if (finalCast.nameLatin) {
          console.log(`    📝 nameLatin: "${castDoc.name}" → "${finalCast.nameLatin}"`);
        }
      }

      return { status: 'updated', needsAlsoKnownAs, needsNameLatin };
    } catch (error) {
      console.error(`  ❌ Lỗi tổng quát khi xử lý diễn viên ${castDoc.name}:`, error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Xử lý một batch (nhiều cast cùng lúc)
   */
  async function processBatch(casts, startIndex) {
    const endIndex = Math.min(startIndex + CONCURRENT_LIMIT, casts.length);
    const batch = casts.slice(startIndex, endIndex);

    // Xử lý tất cả cast trong batch cùng lúc
    const results = await Promise.allSettled(
      batch.map((castDoc, batchIndex) =>
        processCast(castDoc, startIndex + batchIndex, casts.length),
      ),
    );

    // Đếm kết quả
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'updated') {
          updatedCount++;
        } else if (result.value.status === 'skipped') {
          skippedCount++;
        } else if (result.value.status === 'error') {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }

    return endIndex;
  }

  // Xử lý theo batch
  const startTime = Date.now();
  for (let i = 0; i < filteredCasts.length; i += CONCURRENT_LIMIT) {
    await processBatch(filteredCasts, i);

    // Delay giữa các batch (trừ batch cuối)
    if (i + CONCURRENT_LIMIT < filteredCasts.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }

    // Hiển thị progress
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const progress = ((i + CONCURRENT_LIMIT) / filteredCasts.length) * 100;
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = estimatedTotal - elapsed;
    console.log(
      `\n📊 Progress: ${Math.min(progress, 100).toFixed(1)}% | Đã xử lý: ${Math.min(
        i + CONCURRENT_LIMIT,
        filteredCasts.length,
      )}/${filteredCasts.length} | Thời gian còn lại: ~${remaining.toFixed(0)}s`,
    );
  }

  console.log(`\n🎉 Hoàn thành cập nhật.`);
  console.log(`  ✅ Đã cập nhật: ${updatedCount}`);
  console.log(`  ⚠️  Bỏ qua: ${skippedCount}`);
  console.log(`  ❌ Lỗi: ${errorCount}`);
  mongoose.disconnect();
}

backfillCastAlsoKnownAsAndNameLatin();
