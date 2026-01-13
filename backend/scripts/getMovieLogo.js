#!/usr/bin/env node
/**
 * Script lấy logo phim từ TMDB
 * Sử dụng: node getMovieLogo.js <movie_slug>
 *
 * Ví dụ:
 *   node getMovieLogo.js "squid-game-2"
 *   node getMovieLogo.js "one-piece"
 *
 * Ưu tiên:
 *   1. Logo Tiếng Việt (iso_639_1 = "vi")
 *   2. Logo Tiếng Anh (iso_639_1 = "en")
 *   3. Logo đầu tiên trong danh sách (thường có vote cao nhất)
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

const axios = require('axios');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db/db');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY không được cấu hình trong file .env');
  process.exit(1);
}

// Lấy slug từ command line
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Thiếu tham số!');
  console.log('\n📖 Cách sử dụng:');
  console.log('   node getMovieLogo.js <movie_slug>\n');
  console.log('📝 Ví dụ:');
  console.log('   node getMovieLogo.js "squid-game-2"');
  console.log('   node getMovieLogo.js "one-piece"\n');
  process.exit(1);
}

const MOVIE_SLUG = args[0];

/**
 * Lấy logo từ TMDB với ưu tiên ngôn ngữ
 * @param {number} tmdbId - TMDB ID
 * @param {string} type - "movie" hoặc "tv"
 * @returns {Promise<Object|null>} Logo info
 */
async function getMovieLogo(tmdbId, type = 'movie') {
  try {
    const endpoint =
      type === 'tv'
        ? `${TMDB_BASE_URL}/tv/${tmdbId}/images`
        : `${TMDB_BASE_URL}/movie/${tmdbId}/images`;

    const response = await axios.get(endpoint, {
      params: {
        api_key: TMDB_API_KEY,
        include_image_language: 'vi,en,null', // Lấy logo tiếng Việt, Anh và không có ngôn ngữ
      },
    });

    const logos = response.data?.logos || [];

    if (logos.length === 0) {
      console.log('⚠️  Không tìm thấy logo nào từ TMDB');
      return null;
    }

    console.log(`\n📊 Tìm thấy ${logos.length} logo từ TMDB`);

    // Ưu tiên 1: Tìm logo Tiếng Việt
    const viLogo = logos.find((logo) => logo.iso_639_1 === 'vi');
    if (viLogo) {
      console.log('✅ Ưu tiên 1: Tìm thấy logo Tiếng Việt');
      return {
        url: `https://image.tmdb.org/t/p/original${viLogo.file_path}`,
        language: 'vi',
        width: viLogo.width,
        height: viLogo.height,
        vote_average: viLogo.vote_average,
        vote_count: viLogo.vote_count,
      };
    }

    // Ưu tiên 2: Tìm logo Tiếng Anh
    const enLogo = logos.find((logo) => logo.iso_639_1 === 'en');
    if (enLogo) {
      console.log('✅ Ưu tiên 2: Tìm thấy logo Tiếng Anh');
      return {
        url: `https://image.tmdb.org/t/p/original${enLogo.file_path}`,
        language: 'en',
        width: enLogo.width,
        height: enLogo.height,
        vote_average: enLogo.vote_average,
        vote_count: enLogo.vote_count,
      };
    }

    // Đường cùng: Lấy logo đầu tiên
    const firstLogo = logos[0];
    console.log('✅ Đường cùng: Lấy logo đầu tiên trong danh sách');
    return {
      url: `https://image.tmdb.org/t/p/original${firstLogo.file_path}`,
      language: firstLogo.iso_639_1 || 'unknown',
      width: firstLogo.width,
      height: firstLogo.height,
      vote_average: firstLogo.vote_average,
      vote_count: firstLogo.vote_count,
    };
  } catch (error) {
    console.error(`❌ Lỗi khi lấy logo từ TMDB:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('═'.repeat(80));
  console.log('🎬 TMDB LOGO FETCHER');
  console.log('═'.repeat(80));
  console.log(`\n🔍 Đang tìm phim: ${MOVIE_SLUG}\n`);

  try {
    // Kết nối database
    await connectDB();

    // Tìm phim trong database
    const Movie = require('../models/movie.model');
    const movie = await Movie.findOne({ slug: MOVIE_SLUG }).lean();

    if (!movie) {
      console.error(`❌ Không tìm thấy phim với slug: ${MOVIE_SLUG}`);
      process.exit(1);
    }

    console.log(`✅ Tìm thấy phim: ${movie.name || movie.title}`);

    // Kiểm tra TMDB ID
    if (!movie.tmdb || !movie.tmdb.id) {
      console.error('❌ Phim này chưa có TMDB ID');
      console.log('💡 Hãy chạy script seedMovieTmdbData.js trước để lấy TMDB ID');
      process.exit(1);
    }

    const tmdbId = movie.tmdb.id;
    const tmdbType = movie.tmdb.type || 'movie';

    console.log(`📊 TMDB ID: ${tmdbId}`);
    console.log(`📺 Type: ${tmdbType}`);

    // Lấy logo
    const logo = await getMovieLogo(tmdbId, tmdbType);

    if (!logo) {
      console.log('\n❌ Không thể lấy logo cho phim này');
      process.exit(1);
    }

    // Hiển thị kết quả
    console.log('\n' + '═'.repeat(80));
    console.log('✅ THÀNH CÔNG!');
    console.log('═'.repeat(80));
    console.log(`\n📷 Logo URL: ${logo.url}`);
    console.log(`🌐 Ngôn ngữ: ${logo.language}`);
    console.log(`📐 Kích thước: ${logo.width}x${logo.height}`);
    console.log(`⭐ Vote: ${logo.vote_average} (${logo.vote_count} votes)`);

    // Cập nhật vào database (optional)
    console.log('\n💾 Cập nhật logo vào database...');
    await Movie.updateOne(
      { _id: movie._id },
      {
        $set: {
          'images.logo': logo.url,
        },
      },
    );
    console.log('✅ Đã cập nhật logo vào database');

    console.log('\n' + '═'.repeat(80));
  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Đóng kết nối database
    await mongoose.connection.close();
    console.log('\n👋 Đã đóng kết nối database');
  }
}

// Chạy script
main();
