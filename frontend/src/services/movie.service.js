import apiRequest from "./utils/apiRequest";

const movieService = {
  // Lấy thông tin phim
  getById: (id) => apiRequest(`/movies/${id}`),

  // Lấy danh sách tập phim (API MỚI)
  getEpisodes: (id) => apiRequest(`/movies/${id}/episodes`),

  // Lấy danh sách diễn viên (API MỚI)
  getCast: (id) => apiRequest(`/movies/${id}/cast`),

  // --- Các hàm cũ ---
  getAll: (params = {}) => apiRequest("/movies", { params }),
  getTrending: (limit = 10) => apiRequest("/movies/trending/now", { params: { limit } }),
  getTopRated: (limit = 10) => apiRequest("/movies/top/rated", { params: { limit } }),
  getNewReleases: (limit = 10) => apiRequest("/movies/new/releases", { params: { limit } }),
  getByGenre: (genre, params = {}) => apiRequest(`/movies/genre/${genre}`, { params }),
  search: (query, params = {}) => apiRequest("/movies/search/query", { params: { q: query, ...params }, }),
  getComments: (id, params = {}) => apiRequest(`/movies/${id}/comments`, { params }),
  postComment: (id, commentData) => apiRequest(`/movies/${id}/comments`, { method: "POST", data: commentData, requiresAuth: true, }),
  rateMovie: (id, rating) => apiRequest(`/movies/${id}/rate`, { method: "POST", data: { rating }, requiresAuth: true, }),
};

export default movieService;