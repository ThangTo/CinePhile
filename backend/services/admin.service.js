const MovieModel = require('../models/movie.model');
const UserModel = require('../models/user.model');
const EpisodeModel = require('../models/episode.model');
/**
 * Admin Service
 * Business logic for admin operations
 */

/**
 * Movies Management
 */

/**
 * Get all movies with pagination and filters
 * @param {Object} options - { page, limit, search }
 * @returns {Promise<Object>} { data: Array, pagination: Object }
 */
const getAllMovies = async (options = {}) => {
  // TODO: Implement - Get movies from database with pagination
  const { page = 1, limit = 20, search } = options;
  // Placeholder return
  return {
    data: [],
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: 0,
      totalPages: 0,
    },
  };
};

/**
 * Get movie by ID
 * @param {string|number} id - Movie ID
 * @returns {Promise<Object|null>} Movie object or null
 */
const getMovieById = async (id) => {
  // TODO: Implement - Get movie from database by ID
  return await MovieModel.findById(id);
};

/**
 * Create new movie
 * @param {Object} movieData - Movie data
 * @returns {Promise<Object>} Created movie object
 */
const createMovie = async (movieData) => {
  // TODO: Implement - Create movie in database
  return await MovieModel.create(movieData);
};

/**
 * Update movie
 * @param {string|number} id - Movie ID
 * @param {Object} movieData - Updated movie data
 * @returns {Promise<Object|null>} Updated movie object or null
 */
const updateMovie = async (id, movieData) => {
  // TODO: Implement - Update movie in database
  return await MovieModel.findByIdAndUpdate(id, movieData, { new: true });
};

/**
 * Delete movie
 * @param {string|number} id - Movie ID
 * @returns {Promise<boolean>} Success status
 */
const deleteMovie = async (id) => {
  const movie = await MovieModel.findByIdAndDelete(id);
  
  if (movie) {
    // TÍNH NĂNG QUAN TRỌNG: Cascade Delete
    // Khi xóa phim, phải xóa luôn tất cả tập phim của nó để sạch DB
    await EpisodeModel.deleteMany({ movieId: id });
    return true;
  }
  return false;
};
/**
 * Search movies
 * @param {string} query - Search query
 * @param {Object} options - { page, limit }
 * @returns {Promise<Object>} { data: Array, pagination: Object }
 */
const searchMovies = async (query, options = {}) => {
  // Tái sử dụng logic của getAllMovies cho gọn code
  return await getAllMovies({ ...options, search: queryStr });
};

/**
 * Users Management
 */

/**
 * Get all users with pagination and filters
 * @param {Object} options - { page, limit, search }
 * @returns {Promise<Object>} { data: Array, pagination: Object }
 */
const getAllUsers = async (options = {}) => {
  const { page = 1, limit = 20, search } = options;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  let query = {};
  if (search) {
    query = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
  }

  const [users, total] = await Promise.all([
    UserModel.find(query)
      .select('-password') // QUAN TRỌNG: Không bao giờ trả về password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    UserModel.countDocuments(query)
  ]);

  return {
    data: users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get user by ID
 * @param {string|number} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const getUserById = async (id) => {
  // TODO: Implement - Get user from database by ID
  return await UserModel.findById(id).select('-password');
  
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user object
 */
const createUser = async (userData) => {
  // TODO: Implement - Create user in database
  // Lưu ý: Controller cần đảm bảo hash password trước khi truyền vào đây
  // Hoặc Model User đã có middleware pre-save để hash password
  return await UserModel.create(userData);
};

/**
 * Update user
 * @param {string|number} id - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object|null>} Updated user object or null
 */
const updateUser = async (id, userData) => {
  // TODO: Implement - Update user in database
  return await UserModel.findByIdAndUpdate(id, userData, { new: true }).select('-password');
};

/**
 * Delete user
 * @param {string|number} id - User ID
 * @returns {Promise<boolean>} Success status
 */
const deleteUser = async (id) => {
  // TODO: Implement - Delete user from database
  const result = await UserModel.findByIdAndDelete(id);
  return !!result; // Trả về true/false
};



/**
 * Toggle user status (active/inactive)
 * @param {string|number} id - User ID
 * @returns {Promise<Object|null>} Updated user object or null
 */
const toggleUserStatus = async (id) => {
  // TODO: Implement - Toggle user status in database
  const user = await UserModel.findById(id);
  if (!user) return null;

  // Đảo trạng thái isBanned (Khóa/Mở khóa)
  // Đảm bảo trong User Schema có trường này (hoặc trường isActive)
  user.isBanned = !user.isBanned; 
  return await user.save();
};

/**
 * Statistics
 */

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Stats object
 */
const getStats = async () => {
  // TODO: Implement - Get statistics from database
  return {
    totalMovies: 0,
    totalUsers: 0,
    totalViews: 0,
    activeUsers: 0,
    trends: {
      movies: '0%',
      users: '0%',
      views: '0%',
      active: '0%',
    },
  };
};

/**
 * Get chart data
 * @param {string} type - Chart type (views, genres, growth)
 * @returns {Promise<Object>} Chart data object
 */
const getChartData = async (type) => {
  // TODO: Implement - Get chart data from database
  return {
    labels: [],
    data: [],
  };
};

module.exports = {
  // Movies
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
  // Users
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  // Stats
  getStats,
  getChartData,
};
