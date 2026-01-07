const axios = require('axios');
const he = require('he'); // Import thư viện chuẩn hoá HTML Entities
const MovieModel = require('../models/movie.model');
const EpisodeModel = require('../models/episode.model');
const { ensureCastForNames } = require('../integrations/cast.service');
const { slugify } = require('../utils/movieAdminUtils');
const { createNotification } = require('../controllers/notification.controller');
const { invalidateMovieCache } = require('../middleware/cache.middleware');

const API_BASE_URL = 'https://phimapi.com';

/**
 * Hàm chính: Crawl phim từ trang phim mới cập nhật
 * @param {number} page - Trang cần crawl (mặc định trang 1)
 * @param {Function} onProgress - Callback để gửi log real-time (optional)
 * @param {boolean} skipExisting - Bỏ qua phim đã tồn tại (mặc định false)
 */
const crawlMovies = async (page = 1, onProgress = null, skipExisting = false) => {
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
    const totalMoviesInPage = moviesList.length;

    let count = 0;
    let skippedCount = 0;

    // 2. Lặp qua từng phim trong danh sách
    for (const movieItem of moviesList) {
      const slug = movieItem.slug;

      try {
        // Nếu skipExisting = true, kiểm tra phim đã tồn tại chưa trước khi crawl
        if (skipExisting) {
          const existingMovie = await MovieModel.findOne({ slug: slug });
          if (existingMovie) {
            log(`⏭️  Bỏ qua phim đã tồn tại: ${slug}`);
            skippedCount++;
            continue; // Bỏ qua phim này
          }
        }

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

        // 3. KIỂM TRA PHIM ĐÃ TỒN TẠI CHƯA
        const existingMovie = await MovieModel.findOne({ slug: slug });
        const isUpdate = !!existingMovie;

        // 4. LƯU MOVIE (Upsert)
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
            movieId: savedMovie._id,
          });
        } catch (notiError) {
          console.error(`⚠️ Lỗi gửi thông báo phim ${slug}:`, notiError.message);
        }

        // 5. ĐẢM BẢO CAST (diễn viên/đạo diễn) ĐƯỢC LƯU TRONG COLLECTION CAST (TMDb)
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

        // 6. LƯU EPISODES (Vào collection riêng) - có phân server/audioType
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

        const action = isUpdate ? 'cập nhật' : 'tạo mới';
        log(`✅ [${randomAge}] Đã ${action}: ${moviePayload.name}`);
        count++;
      } catch (err) {
        logError(`❌ Lỗi phim ${slug}: ${err.message}`);
      }
    }

    // Invalidate cache sau khi crawl xong trang (nếu có phim mới được crawl)
    if (count > 0) {
      try {
        await invalidateMovieCache();
        log(`🔄 Đã invalidate cache sau khi crawl ${count} phim`);
      } catch (cacheError) {
        logError(`⚠️ Lỗi invalidate cache: ${cacheError.message}`);
      }
    }

    // Trả về movies_count và thông tin về trang để khớp với hàm runPageRange
    return {
      status: 'success',
      movies_count: count,
      total_movies_in_page: totalMoviesInPage,
      skipped_count: skippedCount,
    };
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
 * @param {boolean} skipExisting - Bỏ qua phim đã tồn tại (mặc định false)
 */
const runPageRange = async (startPage, endPage = null, onProgress = null, skipExisting = false) => {
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

      const result = await crawlMovies(currentPage, onProgress, skipExisting);

      // Cộng dồn kết quả
      const moviesCount = result.movies_count || 0;
      const totalMoviesInPage = result.total_movies_in_page || 0;
      const skippedCount = result.skipped_count || 0;
      totalMovies += moviesCount;

      // Chỉ dừng lại khi trang thực sự trống (không có phim nào từ API)
      // Không dừng khi skipExisting = true và tất cả phim đã tồn tại (vì vẫn có phim trong trang, chỉ là bị skip)
      if (totalMoviesInPage === 0) {
        log(`⚠️ Trang ${currentPage} không có phim nào từ API. Dừng crawl.`);
        hasMorePages = false;
        break;
      }

      // Log thông tin về phim đã skip (nếu có)
      if (skipExisting && skippedCount > 0) {
        log(
          `ℹ️  Trang ${currentPage}: Đã bỏ qua ${skippedCount} phim đã tồn tại, crawl ${moviesCount} phim mới`,
        );
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
/**
 * Search movies by genre/category
 * @param {string} typeList - Genre slug (e.g., 'hanh-dong', 'kinh-di')
 * @param {Object} options - { page, sort_field, sort_type, sort_lang, country, year, limit }
 * @returns {Promise<Array>} Array of movies (có kèm existsInDb nếu đã có trong DB)
 */
const searchMoviesByGenre = async (typeList, options = {}) => {
  try {
    const {
      page = 1,
      sort_field = '_id',
      sort_type = 'asc',
      sort_lang = '',
      country = '',
      year = '',
      limit = 10,
    } = options;

    const query = {
      page,
      sort_field,
      sort_type,
      limit,
    };

    // Chỉ thêm các tham số có giá trị hợp lệ (không phải empty string hoặc undefined)
    if (sort_lang && sort_lang.trim()) {
      query.sort_lang = sort_lang.trim();
    }

    if (country && country.trim()) {
      // Convert country name to slug format (remove accents, lowercase, replace spaces with hyphens)
      const countrySlug = slugify(country);
      query.country = countrySlug;
    }
    if (year && year.toString().trim()) {
      query.year = year.toString().trim();
    }

    const response = await axios.get(`${API_BASE_URL}/v1/api/the-loai/${typeList}`, {
      params: query,
      timeout: 30000,
    });

    // Helper function để normalize image URL
    const normalizeImageUrl = (url) => {
      if (!url) return null;
      // Nếu đã có http/https thì giữ nguyên
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // Nếu là relative path, thêm tiền tố phimimg.com
      return `https://phimimg.com${url.startsWith('/') ? url : '/' + url}`;
    };

    // Transform response to match searchMovies format
    // API có thể trả về items trực tiếp hoặc trong data.items
    let movies = [];

    if (response.data?.data?.items && Array.isArray(response.data.data.items)) {
      movies = response.data.data.items;
    } else if (response.data?.items && Array.isArray(response.data.items)) {
      movies = response.data.items;
    } else if (Array.isArray(response.data)) {
      movies = response.data;
    } else {
      console.error('Unexpected response format:', {
        data: response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
      });
      return [];
    }

    console.log(`Found ${movies.length} movies from API`);

    // Check existing movies in DB theo slug
    const slugs = movies.map((m) => m.slug).filter(Boolean);
    const existingMovies = await MovieModel.find({ slug: { $in: slugs } }, 'slug');
    const existingSlugSet = new Set(existingMovies.map((m) => m.slug));

    return movies
      .map((movie) => {
        if (!movie || !movie.slug) {
          console.warn('Invalid movie object:', movie);
          return null;
        }
        return {
          slug: movie.slug,
          name: movie.name || '',
          origin_name: movie.origin_name || '',
          year: movie.year || '',
          quality: movie.quality || '',
          time: movie.time || '',
          lang: movie.lang || '',
          category: movie.category || [],
          poster_url: normalizeImageUrl(movie.poster_url || movie.thumb_url),
          thumb_url: normalizeImageUrl(movie.thumb_url),
          similarity: 1, // Always 1 cho search theo thể loại
          existsInDb: existingSlugSet.has(movie.slug),
        };
      })
      .filter(Boolean); // Remove null entries
  } catch (error) {
    console.error('Error searching movies by genre:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });

    // Provide more specific error message
    let errorMessage = 'Failed to search movies by genre';
    if (error.response?.status === 404) {
      errorMessage = `Genre "${typeList}" not found`;
    } else if (error.response?.status === 400) {
      errorMessage = `Invalid request for genre "${typeList}"`;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * Search movies by name with advanced filters
 * @param {string} movieName - keyword
 * @param {Object} options - { page, sort_field, sort_type, sort_lang, category, country, year, limit }
 */
const searchMovies = async (movieName, options = {}) => {
  try {
    const axios = require('axios');
    const API_BASE_URL = 'https://phimapi.com';

    const { page = 1, sort_field, sort_type, sort_lang, category, country, year, limit } = options;

    const params = {
      keyword: movieName,
    };

    if (page) params.page = page;
    if (sort_field) params.sort_field = sort_field;
    if (sort_type) params.sort_type = sort_type;
    if (sort_lang) params.sort_lang = sort_lang;
    if (category) params.category = slugify(category);
    if (country) params.country = slugify(country);
    if (year) params.year = year;
    if (limit) params.limit = limit;

    console.log('searchMovies params:', params);

    const response = await axios.get(`${API_BASE_URL}/v1/api/tim-kiem`, {
      params,
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

      // Helper function để thêm tiền tố phimimg.com cho URL ảnh
      const normalizeImageUrl = (url) => {
        if (!url) return null;
        // Nếu đã có http/https thì giữ nguyên
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        // Nếu là relative path, thêm tiền tố phimimg.com
        return `https://phimimg.com${url.startsWith('/') ? url : '/' + url}`;
      };

      // Kiểm tra phim đã tồn tại trong DB theo slug
      const slugs = movies.map((m) => m.slug).filter(Boolean);
      const existingMovies = await MovieModel.find({ slug: { $in: slugs } }, 'slug');
      const existingSlugSet = new Set(existingMovies.map((m) => m.slug));

      movies = movies.map((movie) => {
        const movieTitle = movie.name || '';
        const similarity = calculateSimilarity(movieName, movieTitle);
        return {
          ...movie,
          similarity,
          // Normalize poster và thumb URLs
          poster_url: normalizeImageUrl(movie.poster_url),
          thumb_url: normalizeImageUrl(movie.thumb_url),
          existsInDb: existingSlugSet.has(movie.slug),
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

    // Invalidate cache sau khi crawl xong phim
    try {
      await invalidateMovieCache();
    } catch (cacheError) {
      console.error(`⚠️ Lỗi invalidate cache: ${cacheError.message}`);
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
  searchMoviesByGenre,
  crawlMovieBySlug,
};
