const dotenv = require('dotenv');
dotenv.config();

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

    const startPage = 1139;
    const endPage = 1200; // 500 page * 10 phim/page ≈ 5000 phim

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
