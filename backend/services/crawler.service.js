const axios = require('axios');
const he = require('he'); // Import thư viện chuẩn hoá HTML Entities
const MovieModel = require('../models/movie.model');
const EpisodeModel = require('../models/episode.model');

const API_BASE_URL = 'https://phimapi.com';

/**
 * Hàm chính: Crawl phim từ trang phim mới cập nhật
 * @param {number} page - Trang cần crawl (mặc định trang 1)
 */
const crawlMovies = async (page = 1) => {
  try {
    console.log(`🚀 Bắt đầu crawl trang ${page}...`);

    // 1. Gọi API lấy danh sách phim mới
    const listResponse = await axios.get(
      `${API_BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`,
    );
    const moviesList = listResponse.data.items;

    let count = 0;

    // 2. Lặp qua từng phim trong danh sách
    for (const movieItem of moviesList) {
      const slug = movieItem.slug;

      try {
        // --- Gọi API chi tiết ---
        const detailResponse = await axios.get(`${API_BASE_URL}/phim/${slug}`);
        const movieData = detailResponse.data.movie;
        const episodesData = detailResponse.data.episodes;

        // --- XỬ LÝ DỮ LIỆU ---

        // A. Xử lý Categories & Actors
        const categories = movieData.category
          ? movieData.category.map((c) => ({ name: c.name, slug: c.slug }))
          : [];
        const countries = movieData.country
          ? movieData.country.map((c) => ({ name: c.name, slug: c.slug }))
          : [];
        const actors = movieData.actor ? movieData.actor : [];
        const directors = movieData.director ? movieData.director : [];

        // B. Logic Random Age (Thêm mới)
        const ageGroups = ['T12', 'T14', 'T16', '18+'];
        const randomAge = ageGroups[Math.floor(Math.random() * ageGroups.length)];

        // C. Mapping dữ liệu (Có dùng he.decode và thêm age_rating)
        const moviePayload = {
          // Dùng he.decode để sửa lỗi font chữ (vd: &amp; -> &)
          name: he.decode(movieData.name || ''),
          slug: movieData.slug,
          original_name: he.decode(movieData.origin_name || ''),
          content: he.decode(movieData.content || ''),

          type: movieData.type,
          status: movieData.status,
          thumb_url: movieData.thumb_url,
          poster_url: movieData.poster_url,
          trailer_url: movieData.trailer_url,
          time: movieData.time,
          year: movieData.year,
          lang: movieData.lang,
          quality: movieData.quality,

          // Các field thống kê tập phim
          currentEpisode: movieData.episode_current,
          totalEpisodes: movieData.episode_total,

          // Mảng dữ liệu phụ
          categories: categories,
          country: countries,
          actor: actors,
          director: directors,

          // ID gốc và Age Rating mới thêm
          source_id: movieData._id,
          age_rating: randomAge, // <--- Đã thêm vào đây
        };

        // 3. LƯU MOVIE (Upsert)
        const savedMovie = await MovieModel.findOneAndUpdate({ slug: slug }, moviePayload, {
          upsert: true,
          new: true,
        });

        // 4. LƯU EPISODES (Vào collection riêng) - có phân server/audioType
        if (episodesData && episodesData.length > 0) {
          for (const server of episodesData) {
            const serverData = server.server_data || [];
            const audioType = detectAudioType(server.server_name);

            for (const ep of serverData) {
              const episodePayload = {
                movieId: savedMovie._id, // Link với Movie ID vừa lưu
                episodeId: extractEpisodeNumber(ep.name),
                slug: ep.slug,
                filename: ep.filename,
                serverName: server.server_name,
                audioType,
                link_embed: ep.link_embed,
                link_m3u8: ep.link_m3u8,
                duration: 0,
              };

              // Upsert Episode: tránh trùng lặp theo movie + tập + audioType
              await EpisodeModel.findOneAndUpdate(
                {
                  movieId: savedMovie._id,
                  episodeId: episodePayload.episodeId,
                  audioType,
                },
                episodePayload,
                { upsert: true },
              );
            }
          }
        }

        console.log(`✅ [${randomAge}] Đã cập nhật: ${moviePayload.name}`);
        count++;
      } catch (err) {
        console.error(`❌ Lỗi phim ${slug}:`, err.message);
      }
    }

    // Trả về movies_count để khớp với hàm runPageRange
    return { status: 'success', movies_count: count };
  } catch (error) {
    console.error('❌ Lỗi Crawl System:', error.message);
    throw error;
  }
};

/**
 * Hàm phụ trợ: Lấy số tập từ chuỗi (vd: "Tập 1" -> 1)
 */
const extractEpisodeNumber = (name = '') => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

/**
 * Hàm phụ trợ: Suy ra audioType từ server_name
 * VD: "#Hà Nội (Vietsub)" -> "vietsub"
 */
const detectAudioType = (serverName = '') => {
  const lower = serverName.toLowerCase();
  if (lower.includes('vietsub')) return 'vietsub';
  if (lower.includes('thuyết minh') || lower.includes('thuyet minh')) return 'thuyet-minh';
  if (lower.includes('lồng tiếng') || lower.includes('long tieng')) return 'long-tieng';
  return 'khac';
};

/**
 * Quản lý vòng lặp crawl nhiều trang
 */
const runPageRange = async (startPage, endPage) => {
  let totalMovies = 0;

  for (let page = startPage; page <= endPage; page++) {
    try {
      console.log(`\n================================`);
      console.log(`➡️ ĐANG XỬ LÝ TRANG ${page} / ${endPage}`);
      console.log(`================================`);

      const result = await crawlMovies(page);

      // Cộng dồn kết quả
      totalMovies += result.movies_count || 0;

      // Nghỉ 1 chút (0.5s) để tránh spam API
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Lỗi trang ${page}, bỏ qua sang trang kế.`);
    }
  }

  return {
    status: 'success',
    message: `✅ Hoàn thành quét từ trang ${startPage} đến ${endPage}.`,
    movies_count: totalMovies,
  };
};

module.exports = {
  crawlMovies,
  runPageRange,
};
