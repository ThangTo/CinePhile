/**
 * Script để cập nhật tmdb data, castIds và images cho các phim cũ trong database
 * Chạy: node backend/scripts/seedMovieTmdbData.js
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
const Movie = require('../models/movie.model');
const axios = require('axios');
const { ensureCastFromTmdbId } = require('../integrations/cast.service');
const { getMovieImages } = require('../integrations/tmdb.service');

const PHIMAPI_BASE_URL = 'https://phimapi.com';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
}

async function seedMovieTmdbData() {
  await connectDB();

  const moviesToUpdate = await Movie.find({
    $or: [
      { 'tmdb.id': { $exists: false } },
      { castIds: { $exists: false } },
      { castIds: { $size: 0 } },
    ],
  }).lean();

  console.log(`\n🔍 Tìm thấy ${moviesToUpdate.length} phim cần cập nhật TMDb data hoặc castIds.`);

  let updatedCount = 0;
  for (const movieDoc of moviesToUpdate) {
    try {
      console.log(`\n🔄 Đang xử lý phim: ${movieDoc.name} (Slug: ${movieDoc.slug})`);

      let movieUpdatePayload = {};
      let tmdbId = movieDoc.tmdb?.id;
      let tmdbType = movieDoc.tmdb?.type;

      // 1. Cập nhật tmdb data từ PhimAPI nếu chưa có
      if (!tmdbId) {
        try {
          const detailResponse = await axios.get(`${PHIMAPI_BASE_URL}/phim/${movieDoc.slug}`);
          const movieData = detailResponse.data.movie;
          if (movieData?.tmdb?.id) {
            tmdbId = movieData.tmdb.id;
            tmdbType = movieData.tmdb.type;
            movieUpdatePayload.tmdb = {
              type: tmdbType,
              id: tmdbId,
              season: movieData.tmdb.season,
              vote_average: movieData.tmdb.vote_average,
              vote_count: movieData.tmdb.vote_count,
            };
            console.log(`  ✅ Đã lấy TMDb ID: ${tmdbId} (Type: ${tmdbType}) từ PhimAPI`);
          } else {
            console.log('  ⚠️  Không tìm thấy TMDb ID từ PhimAPI.');
          }
        } catch (phimApiError) {
          console.warn(`  ❌ Lỗi khi lấy TMDb ID từ PhimAPI cho ${movieDoc.slug}:`, phimApiError.message);
        }
      } else {
        console.log(`  ✅ Đã có TMDb ID: ${tmdbId} (Type: ${tmdbType})`);
      }

      // 2. Cập nhật castIds từ TMDb nếu có tmdbId và chưa có castIds
      if (tmdbId && (!movieDoc.castIds || movieDoc.castIds.length === 0)) {
        try {
          const castDocs = await ensureCastFromTmdbId({ tmdb: { id: tmdbId, type: tmdbType } });
          if (castDocs && castDocs.length > 0) {
            movieUpdatePayload.castIds = castDocs.map(({ castDoc, character, order }) => ({
              castId: castDoc._id,
              character: character || null,
              order: order || 999,
            }));
            console.log(`  ✅ Đã cập nhật ${movieUpdatePayload.castIds.length} castIds từ TMDb.`);
          } else {
            console.log('  ⚠️  Không tìm thấy cast từ TMDb.');
          }
        } catch (castError) {
          console.warn(`  ❌ Lỗi khi lấy cast từ TMDb cho ${movieDoc.slug}:`, castError.message);
        }
      } else if (movieDoc.castIds && movieDoc.castIds.length > 0) {
        console.log(`  ✅ Đã có ${movieDoc.castIds.length} castIds.`);
      }

      // 3. Cập nhật images gallery từ TMDb nếu có tmdbId và chưa có images
      if (tmdbId && (!movieDoc.images || !movieDoc.images.backdrops || movieDoc.images.backdrops.length === 0)) {
        try {
          const images = await getMovieImages(tmdbId, tmdbType);
          if (images && (images.backdrops.length > 0 || images.posters.length > 0)) {
            movieUpdatePayload.images = images;
            console.log(
              `  🖼️  Đã lưu ${images.backdrops.length} backdrops và ${images.posters.length} posters.`,
            );
          } else {
            console.log('  ⚠️  Không tìm thấy images gallery từ TMDb.');
          }
        } catch (imageError) {
          console.warn(`  ❌ Lỗi khi lấy images từ TMDb cho ${movieDoc.slug}:`, imageError.message);
        }
      } else if (movieDoc.images && movieDoc.images.backdrops && movieDoc.images.backdrops.length > 0) {
        console.log(`  🖼️  Đã có ${movieDoc.images.backdrops.length} backdrops.`);
      }

      if (Object.keys(movieUpdatePayload).length > 0) {
        await Movie.updateOne({ _id: movieDoc._id }, { $set: movieUpdatePayload });
        updatedCount++;
        console.log(`  👍 Đã cập nhật phim: ${movieDoc.name}`);
      } else {
        console.log(`  ⏩ Bỏ qua phim: ${movieDoc.name} (không có gì để cập nhật)`);
      }
    } catch (error) {
      console.error(`❌ Lỗi tổng quát khi xử lý phim ${movieDoc.name}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 200)); // Delay để tránh rate limit
  }

  console.log(`\n🎉 Hoàn thành cập nhật. Tổng số phim đã cập nhật: ${updatedCount}/${moviesToUpdate.length}`);
  mongoose.disconnect();
}

seedMovieTmdbData();

