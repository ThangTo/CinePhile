const axios = require('axios');
const he = require('he'); // Import thư viện chuẩn hoá HTML Entities
const MovieModel = require('../models/movie.model');
const EpisodeModel = require('../models/episode.model');
const { ensureCastForNames } = require('../integrations/cast.service');

const { createNotification } = require('../controllers/notification.controller');

const API_BASE_URL = 'https://phimapi.com';

/**
 * Hàm chính: Crawl phim từ trang phim mới cập nhật
 * @param {number} page - Trang cần crawl (mặc định trang 1)
 */
const crawlMovies = async (page = 1, onProgress = null) => {
  try {
    const log = (message) => {
      if (onProgress) {
        onProgress({ type: 'log', message, page });
      } else {
        console.log(message);
      }
    };

    const logError = (message) => {
      if (onProgress) {
        onProgress({ type: 'error', message, page });
      } else {
        console.error(message);
      }
    };

    log(`🚀 Bắt đầu crawl trang ${page}...`);

    // 1. Gọi API lấy danh sách phim mới
    const listResponse = await axios.get(
      `${API_BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`,
      { timeout: 0 }, // Không timeout
    );
    const moviesList = listResponse.data.items || [];

    let count = 0;

    // 2. Lặp qua từng phim trong danh sách
    for (const movieItem of moviesList) {
      const slug = movieItem.slug;

      try {
        // --- Gọi API chi tiết ---
        const detailResponse = await axios.get(`${API_BASE_URL}/phim/${slug}`, {
          timeout: 0, // Không timeout
        });
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
        
        // --- [THÊM MỚI] GỬI THÔNG BÁO ---
        // Logic: Gửi thông báo khi phim được cập nhật/thêm mới
        try {
            await createNotification({
                title: 'Cập nhật phim',
                message: `Phim ${moviePayload.name} (${moviePayload.currentEpisode}) vừa được cập nhật.`,
                type: 'movie_update',
                movieId: savedMovie._id
            });
        } catch (notiError) {
            console.error(`⚠️ Lỗi gửi thông báo phim ${slug}:`, notiError.message);
        }



        // 3b. ĐẢM BẢO CAST (diễn viên/đạo diễn) ĐƯỢC LƯU TRONG COLLECTION CAST (TMDb)
        // Không block nếu TMDb lỗi; chỉ log và tiếp tục crawl.
        try {
          if (Array.isArray(actors) && actors.length) {
            await ensureCastForNames(actors, 'actor');
          }
          if (Array.isArray(directors) && directors.length) {
            await ensureCastForNames(directors, 'director');
          }
        } catch (castError) {
          // eslint-disable-next-line no-console
          console.error('⚠️  Lỗi khi đồng bộ cast từ TMDb:', castError.message);
        }

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

        const action = existingMovie ? 'cập nhật' : 'tạo mới';
        log(`✅ [${randomAge}] Đã ${action}: ${moviePayload.name}`);
        count++;
      } catch (err) {
        logError(`❌ Lỗi phim ${slug}: ${err.message}`);
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
 * @param {number} startPage - Trang bắt đầu
 * @param {number} endPage - Trang kết thúc (null = crawl đến hết)
 * @param {Function} onProgress - Callback để gửi log real-time (optional)
 */
const runPageRange = async (startPage, endPage = null, onProgress = null) => {
  let totalMovies = 0;
  let currentPage = startPage;
  let hasMorePages = true;

  const log = (message) => {
    if (onProgress) {
      onProgress({ type: 'log', message, page: currentPage });
    } else {
      console.log(message);
    }
  };

  const logError = (message) => {
    if (onProgress) {
      onProgress({ type: 'error', message, page: currentPage });
    } else {
      console.error(message);
    }
  };

  while (hasMorePages) {
    try {
      log(`\n================================`);
      log(`➡️ ĐANG XỬ LÝ TRANG ${currentPage}${endPage ? ` / ${endPage}` : ''}`);
      log(`================================`);

      const result = await crawlMovies(currentPage, onProgress);

      // Cộng dồn kết quả
      const moviesCount = result.movies_count || 0;
      totalMovies += moviesCount;

      // Nếu không có phim nào trong trang này, dừng lại
      if (moviesCount === 0) {
        log(`⚠️ Trang ${currentPage} không có phim nào. Dừng crawl.`);
        hasMorePages = false;
        break;
      }

      // Nếu đã đến trang kết thúc (nếu có), dừng lại
      if (endPage && currentPage >= endPage) {
        hasMorePages = false;
        break;
      }

      // Nghỉ 1 chút (0.5s) để tránh spam API
      await new Promise((resolve) => setTimeout(resolve, 500));
      currentPage++;
    } catch (error) {
      logError(`❌ Lỗi trang ${currentPage}: ${error.message}`);
      // Nếu lỗi nghiêm trọng, dừng lại
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        logError(`⚠️ Lỗi kết nối. Dừng crawl.`);
        hasMorePages = false;
        break;
      }
      currentPage++;
    }
  }

  const message = endPage
    ? `✅ Hoàn thành quét từ trang ${startPage} đến ${endPage}.`
    : `✅ Hoàn thành quét từ trang ${startPage} đến trang ${currentPage - 1}.`;

  log(message);
  log(`📊 Tổng số phim đã crawl: ${totalMovies}`);

  return {
    status: 'success',
    message,
    movies_count: totalMovies,
    pages_crawled: currentPage - startPage,
  };
};

/**
 * Tìm kiếm phim theo tên trên API
 * @param {string} movieName - Tên phim cần tìm
 * @returns {Promise<Array>} Danh sách phim tìm được (đã sắp xếp theo độ khớp)
 */
const searchMovies = async (movieName) => {
  try {
    const axios = require('axios');
    const API_BASE_URL = 'https://phimapi.com';

    const response = await axios.get(`${API_BASE_URL}/v1/api/tim-kiem`, {
      params: {
        keyword: movieName,
      },
    });

    let movies = response.data?.data?.items || response.data?.items || [];

    // Tính điểm tương đồng và sắp xếp
    if (movies.length > 0) {
      const calculateSimilarity = (str1, str2) => {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        if (s1.includes(s2) || s2.includes(s1)) return 0.8;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        const matches = shorter.split('').filter((char) => longer.includes(char)).length;
        return matches / Math.max(longer.length, 1);
      };

      movies = movies.map((movie) => {
        const movieTitle = movie.name || '';
        const similarity = calculateSimilarity(movieName, movieTitle);
        return {
          ...movie,
          similarity,
        };
      });

      movies.sort((a, b) => b.similarity - a.similarity);
    }

    return movies;
  } catch (error) {
    console.error(`❌ Lỗi khi tìm kiếm phim "${movieName}":`, error.message);
    return [];
  }
};

/**
 * Crawl và lưu một phim cụ thể theo slug
 * @param {string} slug - Slug của phim
 * @returns {Promise<Object>} Kết quả crawl
 */
const crawlMovieBySlug = async (slug) => {
  try {
    const axios = require('axios');
    const he = require('he');
    const { ensureCastForNames } = require('../integrations/cast.service');
    const { createNotification } = require('../controllers/notification.controller');
    const API_BASE_URL = 'https://phimapi.com';

    // Kiểm tra phim đã tồn tại chưa
    const existingMovie = await MovieModel.findOne({ slug: slug });
    const isUpdate = !!existingMovie;

    // Gọi API chi tiết phim
    const detailResponse = await axios.get(`${API_BASE_URL}/phim/${slug}`);
    const movieData = detailResponse.data.movie;
    const episodesData = detailResponse.data.episodes;

    if (!movieData) {
      return { success: false, message: 'Không tìm thấy dữ liệu' };
    }

    // Xử lý dữ liệu
    const categories = movieData.category
      ? movieData.category.map((c) => ({ name: c.name, slug: c.slug }))
      : [];
    const countries = movieData.country
      ? movieData.country.map((c) => ({ name: c.name, slug: c.slug }))
      : [];
    const actors = movieData.actor ? movieData.actor : [];
    const directors = movieData.director ? movieData.director : [];

    // Logic Random Age
    const ageGroups = ['T12', 'T14', 'T16', '18+'];
    const randomAge = ageGroups[Math.floor(Math.random() * ageGroups.length)];

    // Mapping dữ liệu
    const moviePayload = {
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
      currentEpisode: movieData.episode_current,
      totalEpisodes: movieData.episode_total,
      categories: categories,
      country: countries,
      actor: actors,
      director: directors,
      source_id: movieData._id,
      age_rating: randomAge,
    };

    // Lưu Movie
    const savedMovie = await MovieModel.findOneAndUpdate({ slug: slug }, moviePayload, {
      upsert: true,
      new: true,
    });

    // Gửi thông báo
    try {
      await createNotification({
        title: 'Cập nhật phim',
        message: `Phim ${moviePayload.name} (${moviePayload.currentEpisode}) vừa được cập nhật.`,
        type: 'movie_update',
        movieId: savedMovie._id,
      });
    } catch (notiError) {
      console.error(`⚠️ Lỗi gửi thông báo phim ${slug}:`, notiError.message);
    }

    // Đồng bộ Cast
    try {
      if (Array.isArray(actors) && actors.length) {
        await ensureCastForNames(actors, 'actor');
      }
      if (Array.isArray(directors) && directors.length) {
        await ensureCastForNames(directors, 'director');
      }
    } catch (castError) {
      console.error('⚠️  Lỗi khi đồng bộ cast từ TMDb:', castError.message);
    }

    // Lưu Episodes
    let episodeCount = 0;
    if (episodesData && episodesData.length > 0) {
      for (const server of episodesData) {
        const serverData = server.server_data || [];
        const audioType = detectAudioType(server.server_name);

        for (const ep of serverData) {
          const episodePayload = {
            movieId: savedMovie._id,
            episodeId: extractEpisodeNumber(ep.name),
            slug: ep.slug,
            filename: ep.filename,
            serverName: server.server_name,
            audioType,
            link_embed: ep.link_embed,
            link_m3u8: ep.link_m3u8,
            duration: 0,
          };

          await EpisodeModel.findOneAndUpdate(
            {
              movieId: savedMovie._id,
              episodeId: episodePayload.episodeId,
              audioType,
            },
            episodePayload,
            { upsert: true },
          );
          episodeCount++;
        }
      }
    }

    return {
      success: true,
      movie: moviePayload.name,
      episodes: episodeCount,
      isUpdate,
      movieData: savedMovie,
    };
  } catch (error) {
    console.error(`❌ Lỗi khi crawl phim ${slug}:`, error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  crawlMovies,
  runPageRange,
  searchMovies,
  crawlMovieBySlug,
};
