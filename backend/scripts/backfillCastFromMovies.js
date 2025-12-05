const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env tương tự crawlByMovieName
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
const MovieModel = require('../models/movie.model');
const { ensureCastForNames } = require('../integrations/cast.service');

/**
 * Backfill cast từ toàn bộ movies đã có
 * - Lấy distinct actor/director từ collection movies
 * - Gọi TMDb và lưu vào collection cast
 */
async function backfillCastFromMovies() {
  try {
    await connectDB();
    // eslint-disable-next-line no-console
    console.log('✅ Đã kết nối MongoDB');

    // 1. Lấy toàn bộ tên diễn viên / đạo diễn distinct
    // eslint-disable-next-line no-console
    console.log('📥 Đang lấy danh sách distinct diễn viên và đạo diễn từ movies...');
    const actorNames = await MovieModel.distinct('actor');
    const directorNames = await MovieModel.distinct('director');

    const cleanActors = (actorNames || [])
      .map((n) => (Array.isArray(n) ? n : [n]))
      .flat()
      .map((n) => (n || '').trim())
      .filter(Boolean);

    const cleanDirectors = (directorNames || [])
      .map((n) => (Array.isArray(n) ? n : [n]))
      .flat()
      .map((n) => (n || '').trim())
      .filter(Boolean);

    // eslint-disable-next-line no-console
    console.log(`🎭 Số tên diễn viên (thô): ${cleanActors.length}`);
    // eslint-disable-next-line no-console
    console.log(`🎬 Số tên đạo diễn (thô): ${cleanDirectors.length}`);

    // 2. Đảm bảo cast cho diễn viên
    // eslint-disable-next-line no-console
    console.log('\n=== ĐANG BACKFILL DIỄN VIÊN (actor) ===');
    const actorCasts = await ensureCastForNames(cleanActors, 'actor');
    // eslint-disable-next-line no-console
    console.log(`✅ Đã xử lý cast cho ${actorCasts.length} diễn viên (actor).`);

    // 3. Đảm bảo cast cho đạo diễn
    // eslint-disable-next-line no-console
    console.log('\n=== ĐANG BACKFILL ĐẠO DIỄN (director) ===');
    const directorCasts = await ensureCastForNames(cleanDirectors, 'director');
    // eslint-disable-next-line no-console
    console.log(`✅ Đã xử lý cast cho ${directorCasts.length} đạo diễn (director).`);

    // 4. Tổng kết
    // eslint-disable-next-line no-console
    console.log('\n🎉 HOÀN TẤT BACKFILL CAST TỪ MOVIES');
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Lỗi khi backfill cast từ movies:', error);
    process.exit(1);
  }
}

backfillCastFromMovies();
