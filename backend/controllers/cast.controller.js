const castService = require('../services/cast.service');
const { getPersonDetails, getPersonCredits } = require('../integrations/tmdb.service');

/**
 * Lấy thông tin chi tiết của diễn viên và danh sách phim đã đóng
 * GET /api/v1/cast/:id
 */
const getCastDetails = async (req, res) => {
  try {
    const { id } = req.params; // Cast _id hoặc tmdbId
    const { includeCredits = 'true', page = 1, limit = 20, sort = 'year' } = req.query;

    // Lấy Cast từ DB
    const cast = await castService.getCastById(id);

    if (!cast) {
      return res.status(404).json({ error: 'Không tìm thấy diễn viên' });
    }

    let tmdbDetails = null;
    let tmdbCredits = null;

    // Nếu có tmdbId và includeCredits = true, lấy thông tin chi tiết từ TMDb
    if (cast.tmdbId && includeCredits === 'true') {
      try {
        const [details, credits] = await Promise.all([
          getPersonDetails(cast.tmdbId),
          getPersonCredits(cast.tmdbId),
        ]);
        tmdbDetails = details;
        tmdbCredits = credits;
      } catch (tmdbError) {
        console.error('Error fetching TMDb data:', tmdbError.message);
        // Không throw error, chỉ log và tiếp tục
      }
    }

    // Lấy phim từ DB
    const movies = await castService.getMoviesByCast(cast._id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
    });

    res.json({
      cast: {
        ...cast,
        tmdbDetails, // Thông tin chi tiết từ TMDb (biography, birthday, etc.)
      },
      tmdbCredits, // Danh sách phim từ TMDb (có thể không có trong DB)
      movies: movies.data, // Phim có trong DB
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
