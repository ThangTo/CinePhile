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

/**
 * Admin: Lấy danh sách tất cả Cast (có phân trang, tìm kiếm)
 * @param {Object} options - { page, limit, search, role, department }
 * @returns {Promise<Object>} { data: [...], pagination: {...} }
 */
async function getAllCasts(options = {}) {
  const { page = 1, limit = 20, search, role, department } = options;
  const perPage = Math.min(parseInt(limit, 10) || 20, 100);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (currentPage - 1) * perPage;

  // Build query
  const query = {};

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { nameLatin: searchRegex },
      { biography: searchRegex },
      { place_of_birth: searchRegex },
      { alsoKnownAs: searchRegex },
    ];
  }

  if (role) {
    query.roles = { $in: [role] };
  }

  if (department) {
    query.knownForDepartment = department;
  }

  const [casts, total] = await Promise.all([
    Cast.find(query).sort({ popularity: -1, name: 1 }).skip(skip).limit(perPage).lean(),
    Cast.countDocuments(query),
  ]);

  return {
    data: casts,
    pagination: {
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
      total,
    },
  };
}

/**
 * Admin: Tạo Cast mới
 * @param {Object} data - Cast data
 * @returns {Promise<Object>} Cast document đã tạo
 */
async function createCast(data) {
  const castData = {
    name: data.name,
    nameLatin: data.nameLatin,
    profileUrl: data.profileUrl || data.profilePath,
    profilePath: data.profilePath,
    biography: data.biography,
    birthday: data.birthday,
    deathday: data.deathday,
    place_of_birth: data.place_of_birth,
    knownForDepartment: data.knownForDepartment,
    roles: data.roles || ['actor'],
    alsoKnownAs: data.alsoKnownAs || [],
    popularity: data.popularity || 0,
    tmdbId: data.tmdbId,
    imdbId: data.imdbId,
    gender: data.gender,
    images: data.images || [],
  };

  // Nếu có tmdbId, kiểm tra trùng
  if (castData.tmdbId) {
    const existing = await Cast.findOne({ tmdbId: castData.tmdbId });
    if (existing) {
      throw new Error('Cast với tmdbId này đã tồn tại');
    }
  }

  const cast = new Cast(castData);
  await cast.save();
  return cast.toObject();
}

/**
 * Admin: Cập nhật Cast
 * @param {string} id - Cast _id
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Cast document đã cập nhật
 */
async function updateCast(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('ID không hợp lệ');
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.nameLatin !== undefined) updateData.nameLatin = data.nameLatin;
  if (data.profileUrl !== undefined) updateData.profileUrl = data.profileUrl;
  if (data.profilePath !== undefined) updateData.profilePath = data.profilePath;
  if (data.biography !== undefined) updateData.biography = data.biography;
  if (data.birthday !== undefined) updateData.birthday = data.birthday;
  if (data.deathday !== undefined) updateData.deathday = data.deathday;
  if (data.place_of_birth !== undefined) updateData.place_of_birth = data.place_of_birth;
  if (data.knownForDepartment !== undefined)
    updateData.knownForDepartment = data.knownForDepartment;
  if (data.roles !== undefined) updateData.roles = data.roles;
  if (data.alsoKnownAs !== undefined) updateData.alsoKnownAs = data.alsoKnownAs;
  if (data.popularity !== undefined) updateData.popularity = data.popularity;
  if (data.imdbId !== undefined) updateData.imdbId = data.imdbId;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.images !== undefined) updateData.images = data.images;

  // Nếu có tmdbId, kiểm tra trùng (trừ chính nó)
  if (data.tmdbId !== undefined) {
    const existing = await Cast.findOne({ tmdbId: data.tmdbId, _id: { $ne: id } });
    if (existing) {
      throw new Error('Cast với tmdbId này đã tồn tại');
    }
    updateData.tmdbId = data.tmdbId;
  }

  const cast = await Cast.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  ).lean();

  if (!cast) {
    throw new Error('Không tìm thấy diễn viên');
  }

  return cast;
}

/**
 * Admin: Xóa Cast
 * @param {string} id - Cast _id
 * @returns {Promise<Object>} Kết quả xóa
 */
async function deleteCast(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('ID không hợp lệ');
  }

  const cast = await Cast.findByIdAndDelete(id);
  if (!cast) {
    throw new Error('Không tìm thấy diễn viên');
  }

  // Xóa tham chiếu trong các movie có castIds trỏ đến cast này
  await Movie.updateMany({ 'castIds.castId': id }, { $pull: { castIds: { castId: id } } });

  return { success: true, message: 'Đã xóa diễn viên' };
}

module.exports = {
  getMoviesByCast,
  getCastById,
  getAllCasts,
  createCast,
  updateCast,
  deleteCast,
};
