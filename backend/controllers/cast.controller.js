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

module.exports = {
  getCastDetails,
};
