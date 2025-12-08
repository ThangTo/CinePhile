const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Tìm file .env ở nhiều vị trí có thể
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'), // Root của project
  path.resolve(__dirname, '../.env'), // Backend folder
  path.resolve(process.cwd(), '.env'), // Current working directory
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
  dotenv.config(); // Fallback: load từ process.env
}

// Kiểm tra MONGODB_URI
if (!process.env.MONGODB_URI) {
  // eslint-disable-next-line no-console
  console.error(`
❌ LỖI: Không tìm thấy biến môi trường MONGODB_URI!
Vui lòng:
1. Tạo file .env ở root project hoặc backend folder
2. Thêm dòng: MONGODB_URI=your_mongodb_connection_string
3. Hoặc export MONGODB_URI=your_mongodb_connection_string trước khi chạy script
`);
  process.exit(1);
}

const { connectDB } = require('../config/db/db');
const { runPageRange } = require('../services/crawler.service');

/**
 * Script: Crawl ~5000 phim đầu tiên
 * Giả sử mỗi trang phimapi trả về 10 phim,
 * thì từ page 1 đến page 500 ≈ 5000 phim.
 */
async function crawlFirst5000() {
  try {
    await connectDB();
    console.log('✅ Đã kết nối MongoDB');

    const startPage = 1;
    const endPage = 10; // 500 page * 10 phim/page ≈ 5000 phim

    console.log(`🚀 Bắt đầu crawl khoảng 5000 phim (từ trang ${startPage} đến ${endPage})...`);

    const result = await runPageRange(startPage, endPage);

    console.log('🎉 Hoàn tất crawl 5000 phim (theo range):');
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi crawl 5000 phim:', error);
    process.exit(1);
  }
}

crawlFirst5000();
