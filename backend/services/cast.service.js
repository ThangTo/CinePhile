const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Cast = require('../models/cast.model');
const { transformMovies, transformPaginatedResult } = require('../utils/movieTransformer');

/**
 * Lấy danh sách phim theo diễn viên (dựa trên Cast collection)
 * @param {string|number} castId - Cast _id hoặc tmdbId
 * @param {Object} options - { page, limit, sort }
 * @returns {Promise<Object>} { data: [...], pagination: {...} }
 */
async function getMoviesByCast(castId, options = {}) {
  const { page = 1, limit = 20, sort = 'year' } = options;
  const perPage = Math.min(parseInt(limit, 10) || 20, 100);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (currentPage - 1) * perPage;

  // Tìm Cast document
  const cast = await Cast.findOne(
    mongoose.Types.ObjectId.isValid(castId) ? { _id: castId } : { tmdbId: parseInt(castId, 10) },
  ).lean();

  if (!cast) {
    return {
      data: [],
      pagination: { page: currentPage, totalPages: 0, total: 0, limit: perPage },
    };
  }

  // Query movies có diễn viên này trong castIds hoặc actor array
  const query = {
    $or: [
      { 'castIds.castId': cast._id }, // Match qua castIds (chính xác nhất)
      { actor: { $in: [cast.name] } }, // Match bằng tên
      { actor: { $in: cast.alsoKnownAs || [] } }, // Match bằng alias
      ...(cast.nameLatin ? [{ actor: { $in: [cast.nameLatin] } }] : []), // Match bằng nameLatin
    ],
  };

  // Build sort options
  let sortOptions = {};
  if (sort === 'year') {
    sortOptions = { year: -1, createdAt: -1 };
  } else if (sort === 'rating') {
    sortOptions = { rating: -1, year: -1, createdAt: -1 };
  } else if (sort === 'views') {
    sortOptions = { viewCount: -1, year: -1, createdAt: -1 };
  } else {
    sortOptions = { year: -1, createdAt: -1 };
  }

  const [movies, total] = await Promise.all([
    Movie.find(query).sort(sortOptions).skip(skip).limit(perPage).lean(),
    Movie.countDocuments(query),
  ]);

  return {
    data: transformMovies(movies),
    pagination: {
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
      total,
    },
  };
}

/**
 * Lấy thông tin chi tiết của Cast
 * @param {string|number} castId - Cast _id hoặc tmdbId
 * @returns {Promise<Object|null>} Cast document
 */
async function getCastById(castId) {
  const cast = await Cast.findOne(
    mongoose.Types.ObjectId.isValid(castId) ? { _id: castId } : { tmdbId: parseInt(castId, 10) },
  ).lean();

  return cast;
}

module.exports = {
  getMoviesByCast,
  getCastById,
};
