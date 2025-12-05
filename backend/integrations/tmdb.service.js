const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

if (!TMDB_API_KEY) {
  // Không throw error ở đây để server vẫn chạy được,
  // chỉ cảnh báo để dev biết cần cấu hình TMDB_API_KEY.
  // Các hàm bên dưới sẽ tự bỏ qua nếu không có key.
  // eslint-disable-next-line no-console
  console.warn('⚠️  TMDB_API_KEY is not set. Cast image fetching will be disabled.');
}

/**
 * Gọi TMDb /search/person theo tên
 * @param {string} name
 * @returns {Promise<Object|null>} Kết quả person tốt nhất hoặc null
 */
async function searchPersonByName(name) {
  if (!TMDB_API_KEY) return null;
  if (!name || !name.trim()) return null;

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/person`, {
      params: {
        api_key: TMDB_API_KEY,
        query: name,
        language: 'vi-VN',
        include_adult: false,
      },
    });

    const results = response.data?.results || [];
    if (!results.length) return null;

    const person = results[0];

    const result = {
      tmdbId: person.id,
      name: person.name || name,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || null,
      popularity: person.popularity || 0,
      alsoKnownAs: person.also_known_as || [],
    };

    // Log khi tìm thấy thành công
    // eslint-disable-next-line no-console
    console.log(
      `🔍 TMDb: Tìm thấy "${name}" → "${result.name}" (ID: ${result.tmdbId}, ${
        result.profileUrl ? 'có ảnh' : 'không có ảnh'
      })`,
    );

    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ TMDb searchPersonByName error for "${name}":`, error.message);
    return null;
  }
}

module.exports = {
  searchPersonByName,
};
