/**
 * Script để cập nhật thông tin chi tiết (biography, birthday, images, alsoKnownAs, etc.)
 * cho các Cast đã có tmdbId nhưng chưa có đầy đủ thông tin.
 * Chạy: node backend/scripts/backfillCastDetails.js
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env tương tự crawlByMovieName
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

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
}

async function backfillCastDetails() {
  await connectDB();

  // Tìm các cast có tmdbId nhưng chưa có biography hoặc alsoKnownAs (dấu hiệu chưa có full details)
  const castsToUpdate = await Cast.find({
    tmdbId: { $exists: true, $ne: null },
    $or: [
      { biography: { $exists: false } },
      { biography: null },
      { biography: '' },
      { alsoKnownAs: { $exists: false } },
      { alsoKnownAs: { $size: 0 } },
    ],
  }).lean();

  console.log(`\n🔍 Tìm thấy ${castsToUpdate.length} diễn viên cần cập nhật thông tin chi tiết từ TMDb.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < castsToUpdate.length; i++) {
    const castDoc = castsToUpdate[i];
    try {
      console.log(
        `\n[${i + 1}/${castsToUpdate.length}] 🔄 Đang xử lý diễn viên: ${castDoc.name} (TMDb ID: ${castDoc.tmdbId})`,
      );

      const tmdbDetails = await getPersonDetails(castDoc.tmdbId);

      if (tmdbDetails) {
        // Sử dụng upsertCastFromTmdb để cập nhật đầy đủ thông tin
        // Lấy role từ castDoc nếu có
        const role = castDoc.roles && castDoc.roles.length > 0 ? castDoc.roles[0] : null;
        await upsertCastFromTmdb(tmdbDetails, role);
        updatedCount++;
        console.log(`  👍 Đã cập nhật chi tiết cho diễn viên: ${castDoc.name}`);
      } else {
        console.log(`  ⚠️  Không tìm thấy chi tiết TMDb cho diễn viên: ${castDoc.name}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`  ❌ Lỗi tổng quát khi xử lý diễn viên ${castDoc.name}:`, error.message);
      errorCount++;
    }
    await new Promise((resolve) => setTimeout(resolve, 200)); // Delay để tránh rate limit
  }

  console.log(`\n🎉 Hoàn thành cập nhật.`);
  console.log(`  ✅ Đã cập nhật: ${updatedCount}`);
  console.log(`  ⚠️  Không tìm thấy: ${skippedCount}`);
  console.log(`  ❌ Lỗi: ${errorCount}`);
  mongoose.disconnect();
}

backfillCastDetails();

