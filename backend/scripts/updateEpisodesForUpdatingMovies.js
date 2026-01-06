/**
 * Script: Cập nhật danh sách tập cho các phim có status "ongoing" hoặc "upcoming"
 *
 * Cách chạy:
 *   1) Đặt MONGODB_URI trong .env (root hoặc backend)
 *   2) yarn script:node backend/scripts/updateEpisodesForUpdatingMovies.js
 *      hoặc: node backend/scripts/updateEpisodesForUpdatingMovies.js
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { parseEpisodeNumber } = require('../utils/movieTransformer');

// Load .env (tương tự các script crawl)
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'), // Root project
  path.resolve(__dirname, '../.env'), // Backend folder
  path.resolve(process.cwd(), '.env'), // Current working dir
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📄 Đã load .env từ: ${envPath}`);
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.warn('⚠️  Không tìm thấy .env, dùng process.env hiện tại.');
  dotenv.config();
}

if (!process.env.MONGODB_URI) {
  console.error('❌ Thiếu MONGODB_URI, dừng script.');
  process.exit(1);
}

const { connectDB } = require('../config/db/db');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');

const API_BASE_URL = 'https://phimapi.com';

// Helpers
const extractEpisodeNumber = (name = '') => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const detectAudioType = (serverName = '') => {
  const lower = serverName.toLowerCase();
  if (lower.includes('vietsub')) return 'vietsub';
  if (lower.includes('thuyết minh') || lower.includes('thuyet minh')) return 'thuyet-minh';
  if (lower.includes('lồng tiếng') || lower.includes('long tieng')) return 'long-tieng';
  return 'khac';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function updateEpisodesForMovie(movie) {
  const slug = movie.slug;
  if (!slug) return { updated: 0, skipped: true };

  try {
    // Lấy chi tiết phim từ API nguồn
    const detailResponse = await axios.get(`${API_BASE_URL}/phim/${slug}`);
    const movieData = detailResponse.data?.movie;
    const episodesData = detailResponse.data?.episodes;

    if (!movieData || !episodesData || !episodesData.length) {
      console.warn(`⚠️  Không có dữ liệu tập cho phim ${slug}`);
      return { updated: 0, skipped: true };
    }

    // Lưu lại số tập trước khi cập nhật
    const prevCurrent = parseEpisodeNumber(movie.currentEpisode) || null;
    const prevTotal = parseInt(movie.totalEpisodes) || 0;

    // Xác định status dựa trên logic giống detail page
    // Nếu currentEpisode === totalEpisodes thì status = "completed"
    // Nếu currentEpisode > 0 && currentEpisode < totalEpisodes thì status = "ongoing"
    // Nếu không có tập nào thì giữ nguyên status hoặc dùng từ API
    let newStatus = movieData.status || movie.status;
    const currentEp = parseEpisodeNumber(movieData.episode_current) || 0;
    const totalEp = parseInt(movieData.episode_total) || 0;

    if (currentEp > 0 && totalEp > 0 && currentEp === totalEp) {
      // Đã hoàn thành tất cả tập
      newStatus = 'completed';
    } else if (currentEp > 0 && totalEp > 0 && currentEp < totalEp) {
      // Đang cập nhật (có tập nhưng chưa đủ)
      newStatus = 'ongoing';
    } else if (currentEp === 0 && totalEp === 0) {
      // Chưa có tập nào, có thể là upcoming
      if (movieData.status === 'upcoming' || movie.status === 'upcoming') {
        newStatus = 'upcoming';
      } else {
        // Giữ nguyên status hiện tại nếu không phải upcoming
        newStatus = movie.status || 'ongoing';
      }
    }

    // Cập nhật thống kê tập cho Movie
    await Movie.updateOne(
      { _id: movie._id },
      {
        currentEpisode: movieData.episode_current,
        totalEpisodes: movieData.episode_total,
        status: newStatus,
      },
    );

    let updatedCount = 0;

    // Duyệt các server
    for (const server of episodesData) {
      const serverData = server.server_data || [];
      const audioType = detectAudioType(server.server_name);

      for (const ep of serverData) {
        const episodePayload = {
          movieId: movie._id,
          episodeId: extractEpisodeNumber(ep.name),
          slug: ep.slug,
          filename: ep.filename,
          serverName: server.server_name,
          audioType,
          link_embed: ep.link_embed,
          link_m3u8: ep.link_m3u8,
          duration: 0,
        };

        await Episode.findOneAndUpdate(
          {
            movieId: movie._id,
            episodeId: episodePayload.episodeId,
            audioType,
          },
          episodePayload,
          { upsert: true, new: true },
        );
        updatedCount++;
      }
    }

    return {
      updated: updatedCount,
      skipped: false,
      prevCurrent,
      prevTotal,
      newCurrent: movieData.episode_current,
      newTotal: movieData.episode_total,
    };
  } catch (error) {
    console.error(`❌ Lỗi cập nhật tập cho phim ${movie.slug}:`, error.message);
    return { updated: 0, skipped: false, error: error.message };
  }
}

async function main() {
  await connectDB();

  // Chỉ lấy phim đang cập nhật hoặc sắp chiếu
  const targets = await Movie.find({
    status: { $in: ['ongoing', 'upcoming'] },
  })
    .select('_id slug name status')
    .lean();

  console.log(`🔍 Found ${targets.length} movies (ongoing/upcoming) cần cập nhật tập.`);

  let totalUpdated = 0;
  for (let idx = 0; idx < targets.length; idx++) {
    const movie = targets[idx];
    const result = await updateEpisodesForMovie(movie);
    totalUpdated += result.updated;

    const prefix = `[${idx + 1}/${targets.length}]`;
    const prevInfo =
      result.prevCurrent || result.prevTotal
        ? `prevEp: ${result.prevCurrent || '-'} / ${result.prevTotal || '-'}`
        : `prevEp: -`;
    const newInfo =
      result.newCurrent || result.newTotal
        ? `newEp: ${result.newCurrent || '-'} / ${result.newTotal || '-'}`
        : `newEp: -`;

    console.log(
      `${prefix} 🎯 ${movie.slug} | ${movie.status} | ${prevInfo} -> ${newInfo} | updated: ${
        result.updated
      }${result.skipped ? ' (skipped)' : ''}`,
    );
    // tránh spam API
    await sleep(300);
  }

  console.log(`✅ Hoàn tất. Tổng số tập upsert: ${totalUpdated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
