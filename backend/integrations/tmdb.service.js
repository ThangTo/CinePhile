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

/**
 * Lấy credits (cast & crew) từ TMDb movie/tv ID
 * @param {number} tmdbId - TMDb movie/tv ID
 * @param {string} type - "movie" hoặc "tv"
 * @param {number} season - Season number (chỉ cho TV, optional)
 * @returns {Promise<Object|null>} { cast: [...], crew: [...] }
 */
async function getCreditsFromTmdb(tmdbId, type = 'movie', season = null) {
  if (!TMDB_API_KEY || !tmdbId) return null;

  try {
    let endpoint;
    if (type === 'tv' && season !== null) {
      endpoint = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}/credits`;
    } else if (type === 'tv') {
      endpoint = `${TMDB_BASE_URL}/tv/${tmdbId}/credits`;
    } else {
      endpoint = `${TMDB_BASE_URL}/movie/${tmdbId}/credits`;
    }

    const response = await axios.get(endpoint, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'vi-VN',
      },
    });

    const cast = (response.data?.cast || []).map((person) => ({
      tmdbId: person.id,
      name: person.name,
      character: person.character || null, // Vai diễn
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || 'Acting',
      popularity: person.popularity || 0,
      order: person.order || 999, // Thứ tự xuất hiện
      alsoKnownAs: person.also_known_as || [],
    }));

    const crew = (response.data?.crew || []).map((person) => ({
      tmdbId: person.id,
      name: person.name,
      job: person.job || null, // Vai trò (Director, Producer, etc.)
      department: person.department || null,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || null,
      popularity: person.popularity || 0,
      alsoKnownAs: person.also_known_as || [],
    }));

    return { cast, crew };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ TMDb getCreditsFromTmdb error for ${type}/${tmdbId}:`, error.message);
    return null;
  }
}

/**
 * Lấy thông tin chi tiết của person từ TMDb
 * @param {number} personId - TMDb person ID
 * @returns {Promise<Object|null>} Person details
 */
async function getPersonDetails(personId) {
  if (!TMDB_API_KEY || !personId) return null;

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/person/${personId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'vi-VN',
        append_to_response: 'images,external_ids',
      },
    });

    const person = response.data;
    return {
      tmdbId: person.id,
      name: person.name,
      biography: person.biography || null,
      birthday: person.birthday || null,
      deathday: person.deathday || null,
      place_of_birth: person.place_of_birth || null,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || null,
      popularity: person.popularity || 0,
      gender: person.gender || 0,
      alsoKnownAs: person.also_known_as || [],
      images: person.images?.profiles || [],
      imdbId: person.external_ids?.imdb_id || null,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ TMDb getPersonDetails error for person ${personId}:`, error.message);
    return null;
  }
}

/**
 * Lấy danh sách phim/TV shows mà person đã đóng
 * @param {number} personId - TMDb person ID
 * @returns {Promise<Object|null>} { cast: [...], crew: [...] }
 */
async function getPersonCredits(personId) {
  if (!TMDB_API_KEY || !personId) return null;

  try {
    // Dùng combined_credits để lấy cả movies và TV shows
    const response = await axios.get(`${TMDB_BASE_URL}/person/${personId}/combined_credits`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'vi-VN',
      },
    });

    const cast = (response.data?.cast || []).map((item) => ({
      id: item.id,
      title: item.title || item.name, // title cho movie, name cho TV
      original_title: item.original_title || item.original_name,
      character: item.character || null, // Vai diễn
      release_date: item.release_date || item.first_air_date || null,
      poster_path: item.poster_path || null,
      poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      media_type: item.media_type, // "movie" hoặc "tv"
      popularity: item.popularity || 0,
      vote_average: item.vote_average || 0,
      vote_count: item.vote_count || 0,
    }));

    const crew = (response.data?.crew || []).map((item) => ({
      id: item.id,
      title: item.title || item.name,
      original_title: item.original_title || item.original_name,
      job: item.job || null, // Vai trò (Director, Producer, etc.)
      department: item.department || null,
      release_date: item.release_date || item.first_air_date || null,
      poster_path: item.poster_path || null,
      poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      media_type: item.media_type,
      popularity: item.popularity || 0,
      vote_average: item.vote_average || 0,
      vote_count: item.vote_count || 0,
    }));

    return { cast, crew };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ TMDb getPersonCredits error for person ${personId}:`, error.message);
    return null;
  }
}

/**
 * Lấy tất cả images (backdrops & posters) từ TMDb
 * @param {number} tmdbId - TMDb movie/tv ID
 * @param {string} type - "movie" hoặc "tv"
 * @returns {Promise<Object|null>} { backdrops: [...], posters: [...] }
 */
async function getMovieImages(tmdbId, type = 'movie') {
  if (!TMDB_API_KEY || !tmdbId) return null;

  try {
    const endpoint =
      type === 'tv'
        ? `${TMDB_BASE_URL}/tv/${tmdbId}/images`
        : `${TMDB_BASE_URL}/movie/${tmdbId}/images`;

    const response = await axios.get(endpoint, {
      params: {
        api_key: TMDB_API_KEY,
        include_image_language: 'en,vi,null', // Lấy ảnh tiếng Anh, Việt và không có ngôn ngữ
      },
    });

    const backdrops = (response.data?.backdrops || [])
      .slice(0, 5) // Giới hạn 5 ảnh backdrop
      .map((img) => `https://image.tmdb.org/t/p/original${img.file_path}`);

    const posters = (response.data?.posters || [])
      .slice(0, 5) // Giới hạn 5 ảnh poster
      .map((img) => `https://image.tmdb.org/t/p/original${img.file_path}`);

    return { backdrops, posters };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ TMDb getMovieImages error for ${type}/${tmdbId}:`, error.message);
    return null;
  }
}

/**
 * Lấy logo từ TMDB với ưu tiên ngôn ngữ
 * @param {number} tmdbId - TMDB ID
 * @param {string} type - "movie" hoặc "tv"
 * @returns {Promise<string|null>} Logo URL hoặc null
 */
async function getMovieLogo(tmdbId, type = 'movie') {
  if (!TMDB_API_KEY || !tmdbId) return null;

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
      return null;
    }

    // Ưu tiên 1: Tìm logo Tiếng Việt
    const viLogo = logos.find((logo) => logo.iso_639_1 === 'vi');
    if (viLogo) {
      return `https://image.tmdb.org/t/p/original${viLogo.file_path}`;
    }

    // Ưu tiên 2: Tìm logo Tiếng Anh
    const enLogo = logos.find((logo) => logo.iso_639_1 === 'en');
    if (enLogo) {
      return `https://image.tmdb.org/t/p/original${enLogo.file_path}`;
    }

    // Đường cùng: Lấy logo đầu tiên
    const firstLogo = logos[0];
    return `https://image.tmdb.org/t/p/original${firstLogo.file_path}`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ TMDb getMovieLogo error for ${type}/${tmdbId}:`, error.message);
    return null;
  }
}

module.exports = {
  searchPersonByName,
  getCreditsFromTmdb,
  getPersonDetails,
  getPersonCredits,
  getMovieImages,
  getMovieLogo,
};
