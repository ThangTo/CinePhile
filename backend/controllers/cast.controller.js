const castService = require('../services/cast.service');

/**
 * Lấy thông tin chi tiết của diễn viên và danh sách phim đã đóng
 * GET /api/v1/cast/:id
 */
const getCastDetails = async (req, res) => {
  try {
    const { id } = req.params; // Cast _id hoặc tmdbId
    const { page = 1, limit = 20, sort = 'year' } = req.query;

    // Chỉ query DB, không xử lý logic khác
    const cast = await castService.getCastById(id);

    if (!cast) {
      return res.status(404).json({ error: 'Không tìm thấy diễn viên' });
    }

    // Lấy phim từ DB
    const movies = await castService.getMoviesByCast(cast._id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
    });

    res.json({
      cast,
      movies: movies.data,
      pagination: movies.pagination,
    });
  } catch (error) {
    console.error('Error getting cast details:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * Admin: Lấy danh sách tất cả Cast
 * GET /api/v1/admin/casts
 */
const getAllCasts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, department } = req.query;

    const result = await castService.getAllCasts({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      role,
      department,
    });

    res.json(result);
  } catch (error) {
    console.error('Error getting casts:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/**
 * Admin: Lấy Cast theo ID
 * GET /api/v1/admin/casts/:id
 */
const getCastById = async (req, res) => {
  try {
    const { id } = req.params;
    const cast = await castService.getCastById(id);

    if (!cast) {
      return res.status(404).json({ error: 'Không tìm thấy diễn viên' });
    }

    res.json(cast);
  } catch (error) {
    console.error('Error getting cast:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/**
 * Admin: Tạo Cast mới
 * POST /api/v1/admin/casts
 */
const createCast = async (req, res) => {
  try {
    const cast = await castService.createCast(req.body);
    res.status(201).json(cast);
  } catch (error) {
    console.error('Error creating cast:', error);
    if (error.message.includes('đã tồn tại') || error.message.includes('trùng')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: error.message });
    }
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/**
 * Admin: Cập nhật Cast
 * PUT /api/v1/admin/casts/:id
 */
const updateCast = async (req, res) => {
  try {
    const { id } = req.params;
    const cast = await castService.updateCast(id, req.body);
    res.json(cast);
  } catch (error) {
    console.error('Error updating cast:', error);
    if (error.message.includes('Không tìm thấy')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('đã tồn tại') || error.message.includes('trùng')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('không hợp lệ')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/**
 * Admin: Xóa Cast
 * DELETE /api/v1/admin/casts/:id
 */
const deleteCast = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await castService.deleteCast(id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting cast:', error);
    if (error.message.includes('Không tìm thấy')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('không hợp lệ')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Lỗi server' });
  }
};

module.exports = {
  getCastDetails,
  getAllCasts,
  getCastById,
  createCast,
  updateCast,
  deleteCast,
};
