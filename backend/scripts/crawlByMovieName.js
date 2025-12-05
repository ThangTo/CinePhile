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
    console.log(`📄 Đã load .env từ: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Không tìm thấy file .env. Đang thử load từ process.env...');
  dotenv.config(); // Fallback: load từ process.env
}

// Kiểm tra MONGODB_URI
if (!process.env.MONGODB_URI) {
  console.error(`
❌ LỖI: Không tìm thấy biến môi trường MONGODB_URI!

Vui lòng:
1. Tạo file .env ở root của project hoặc trong thư mục backend
2. Thêm dòng: MONGODB_URI=mongodb://localhost:27017/your-database-name
3. Hoặc truyền qua command line: MONGODB_URI="your-uri" node backend/scripts/crawlByMovieName.js "Tên phim"

Ví dụ:
   MONGODB_URI="mongodb://localhost:27017/cinephine" node backend/scripts/crawlByMovieName.js "Tên phim"
  `);
  process.exit(1);
}

const { connectDB } = require('../config/db/db');
const axios = require('axios');
const he = require('he');
const MovieModel = require('../models/movie.model');
const EpisodeModel = require('../models/episode.model');
const { ensureCastForNames } = require('../integrations/cast.service');

const API_BASE_URL = 'https://phimapi.com';

/**
 * Hàm phụ trợ: Lấy số tập từ chuỗi (vd: "Tập 1" -> 1)
 */
const extractEpisodeNumber = (name = '') => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

/**
 * Hàm phụ trợ: Suy ra audioType từ server_name
 */
const detectAudioType = (serverName = '') => {
  const lower = serverName.toLowerCase();
  if (lower.includes('vietsub')) return 'vietsub';
  if (lower.includes('thuyết minh') || lower.includes('thuyet minh')) return 'thuyet-minh';
  if (lower.includes('lồng tiếng') || lower.includes('long tieng')) return 'long-tieng';
  return 'khac';
};

/**
 * Tính độ tương đồng giữa hai chuỗi (Levenshtein distance đơn giản)
 * @param {string} str1 - Chuỗi 1
 * @param {string} str2 - Chuỗi 2
 * @returns {number} Điểm tương đồng (0-1, 1 = giống nhất)
 */
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Nếu một trong hai chuỗi chứa chuỗi kia, điểm cao
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Tính số ký tự giống nhau
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const matches = shorter.split('').filter((char) => longer.includes(char)).length;

  return matches / Math.max(longer.length, 1);
};

/**
 * Tìm kiếm phim theo tên trên API và sắp xếp theo độ khớp
 * @param {string} movieName - Tên phim cần tìm
 * @returns {Promise<Array>} Danh sách phim tìm được (đã sắp xếp theo độ khớp)
 */
const searchMovies = async (movieName) => {
  try {
    console.log(`🔍 Đang tìm kiếm phim: "${movieName}"...`);

    const response = await axios.get(`${API_BASE_URL}/v1/api/tim-kiem`, {
      params: {
        keyword: movieName,
      },
    });

    let movies = response.data?.data?.items || response.data?.items || [];

    // Tính điểm tương đồng và sắp xếp
    if (movies.length > 0) {
      movies = movies.map((movie) => {
        const movieTitle = movie.name || '';
        const similarity = calculateSimilarity(movieName, movieTitle);
        return {
          ...movie,
          similarity,
        };
      });

      // Sắp xếp theo độ tương đồng giảm dần
      movies.sort((a, b) => b.similarity - a.similarity);

      console.log(`✅ Tìm thấy ${movies.length} phim khớp với "${movieName}"`);
      console.log(
        `   🎯 Phim khớp nhất: "${movies[0].name}" (độ khớp: ${(movies[0].similarity * 100).toFixed(
          0,
        )}%)`,
      );
    } else {
      console.log(`⚠️  Không tìm thấy phim nào với từ khóa: "${movieName}"`);
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
    console.log(`\n📽️  Đang crawl phim: ${slug}...`);

    // Kiểm tra phim đã tồn tại chưa (giống logic trong crawler.service.js)
    const existingMovie = await MovieModel.findOne({ slug: slug });
    const isUpdate = !!existingMovie;

    if (isUpdate) {
      console.log(`   ℹ️  Phim đã tồn tại, sẽ cập nhật dữ liệu...`);
    }

    // Gọi API chi tiết phim
    const detailResponse = await axios.get(`${API_BASE_URL}/phim/${slug}`);
    const movieData = detailResponse.data.movie;
    const episodesData = detailResponse.data.episodes;

    if (!movieData) {
      console.log(`⚠️  Không tìm thấy dữ liệu phim cho slug: ${slug}`);
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

    // Logic Random Age (giống crawler.service.js)
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

    // 3. LƯU MOVIE (Upsert) - giống logic trong crawler.service.js
    const savedMovie = await MovieModel.findOneAndUpdate({ slug: slug }, moviePayload, {
      upsert: true,
      new: true,
    });

    // 3b. ĐỒNG BỘ CAST (diễn viên/đạo diễn) VỚI TMDb -> collection cast
    try {
      if (Array.isArray(actors) && actors.length) {
        await ensureCastForNames(actors, 'actor');
      }
      if (Array.isArray(directors) && directors.length) {
        await ensureCastForNames(directors, 'director');
      }
    } catch (castError) {
      // eslint-disable-next-line no-console
      console.error('⚠️  Lỗi khi đồng bộ cast từ TMDb (crawlByMovieName):', castError.message);
    }

    // 4. LƯU EPISODES (Vào collection riêng) - có phân server/audioType
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
          episodeCount++;
        }
      }
    }

    // Hiển thị thông báo rõ ràng: cập nhật hay tạo mới (giống crawler.service.js)
    const action = isUpdate ? 'cập nhật' : 'tạo mới';
    console.log(`✅ [${randomAge}] Đã ${action}: ${moviePayload.name}`);
    console.log(`   📊 Tổng số tập: ${episodeCount}`);

    return {
      success: true,
      movie: moviePayload.name,
      episodes: episodeCount,
      isUpdate,
    };
  } catch (error) {
    console.error(`❌ Lỗi khi crawl phim ${slug}:`, error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Crawl phim theo tên (có thể crawl nhiều phim)
 * @param {string|Array<string>} movieNames - Tên phim hoặc mảng tên phim
 * @param {boolean} exactMatch - Chỉ crawl phim khớp chính xác tên (mặc định: false)
 */
const crawlByMovieName = async (movieNames, exactMatch = false) => {
  try {
    await connectDB();
    console.log('✅ Đã kết nối MongoDB\n');

    // Chuyển đổi input thành mảng
    const names = Array.isArray(movieNames) ? movieNames : [movieNames];
    let totalCrawled = 0;
    let totalFailed = 0;

    for (const movieName of names) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎬 XỬ LÝ PHIM: "${movieName}"`);
      console.log('='.repeat(60));

      // Tìm kiếm phim
      const searchResults = await searchMovies(movieName);

      if (searchResults.length === 0) {
        console.log(`⚠️  Không tìm thấy phim nào với tên: "${movieName}"`);
        totalFailed++;
        continue;
      }

      // Nếu exactMatch = true, chỉ lấy phim đầu tiên (khớp nhất)
      const moviesToCrawl = exactMatch ? [searchResults[0]] : searchResults;

      console.log(`\n📋 Sẽ crawl ${moviesToCrawl.length} phim:`);
      moviesToCrawl.forEach((m, idx) => {
        const similarity =
          m.similarity !== undefined ? ` (khớp: ${(m.similarity * 100).toFixed(0)}%)` : '';
        console.log(`   ${idx + 1}. ${m.name}${similarity}`);
        console.log(`      Slug: ${m.slug}`);
      });

      // Crawl từng phim
      for (const movie of moviesToCrawl) {
        const result = await crawlMovieBySlug(movie.slug);

        if (result.success) {
          totalCrawled++;
        } else {
          totalFailed++;
        }

        // Nghỉ 0.5s giữa các phim để tránh spam API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 HOÀN TẤT CRAWL');
    console.log('='.repeat(60));
    console.log(`✅ Thành công: ${totalCrawled} phim`);
    console.log(`❌ Thất bại: ${totalFailed} phim`);
    console.log(`📊 Tổng cộng: ${totalCrawled + totalFailed} phim`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi crawl phim:', error);
    process.exit(1);
  }
};

// ============================================
// MAIN: Đọc từ command line arguments
// ============================================
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📖 HƯỚNG DẪN SỬ DỤNG:

1. Crawl một phim:
   node backend/scripts/crawlByMovieName.js "Tên phim"

2. Crawl nhiều phim (cách nhau bởi dấu phẩy):
   node backend/scripts/crawlByMovieName.js "Phim 1" "Phim 2" "Phim 3"

3. Crawl phim khớp chính xác (chỉ lấy kết quả đầu tiên):
   node backend/scripts/crawlByMovieName.js --exact "Tên phim"

4. Crawl từ file (mỗi dòng là một tên phim):
   node backend/scripts/crawlByMovieName.js --file path/to/movies.txt

Ví dụ:
   node backend/scripts/crawlByMovieName.js "Avengers"
   node backend/scripts/crawlByMovieName.js "Avengers" "Spider-Man" "Iron Man"
   node backend/scripts/crawlByMovieName.js --exact "Avengers: Endgame"
  `);
  process.exit(0);
}

// Xử lý các flag đặc biệt
let exactMatch = false;
let filePath = null;
const movieNames = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--exact') {
    exactMatch = true;
  } else if (args[i] === '--file') {
    filePath = args[i + 1];
    i++; // Skip next argument
  } else {
    movieNames.push(args[i]);
  }
}

// Nếu có file, đọc từ file
if (filePath) {
  try {
    const fileContent = fs.readFileSync(path.resolve(filePath), 'utf-8');
    const namesFromFile = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    movieNames.push(...namesFromFile);
    console.log(`📄 Đã đọc ${namesFromFile.length} tên phim từ file: ${filePath}\n`);
  } catch (error) {
    console.error(`❌ Lỗi khi đọc file: ${error.message}`);
    process.exit(1);
  }
}

if (movieNames.length === 0) {
  console.error('❌ Vui lòng cung cấp tên phim hoặc đường dẫn file!');
  process.exit(1);
}

// Chạy crawl
crawlByMovieName(movieNames, exactMatch);
