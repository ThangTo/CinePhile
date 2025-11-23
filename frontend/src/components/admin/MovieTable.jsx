import React, { useState, useEffect } from "react";
import { movieAPI } from "services/admin.service";
import MovieFormModal from "./MovieFormModal";

const MovieTable = () => {
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load movies from API on mount
  useEffect(() => {
    const loadMovies = async () => {
      setIsLoading(true);
      try {
        const moviesData = await movieAPI.getAll();
        setMovies(Array.isArray(moviesData) ? moviesData : []);
      } catch (err) {
        setError("Không thể tải danh sách phim: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadMovies();
  }, []);

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phim này?")) return;

    setIsLoading(true);
    try {
      await movieAPI.delete(id);
      // Reload movies to ensure consistency
      const moviesData = await movieAPI.getAll();
      setMovies(Array.isArray(moviesData) ? moviesData : []);
    } catch (err) {
      setError("Không thể xóa phim: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedMovie(null);
    setIsModalOpen(true);
  };

  const handleSave = async (movieData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedMovie) {
        // Update
        await movieAPI.update(selectedMovie.id, movieData);
        // Reload movies to ensure consistency
        const moviesData = await movieAPI.getAll();
        setMovies(Array.isArray(moviesData) ? moviesData : []);
      } else {
        // Create
        await movieAPI.create(movieData);
        // Reload movies to ensure consistency
        const moviesData = await movieAPI.getAll();
        setMovies(Array.isArray(moviesData) ? moviesData : []);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-white/10 overflow-hidden">
      {/* Loading state */}
      {isLoading && movies.length === 0 && (
        <div className="p-6 flex items-center justify-center">
          <div className="text-white">Đang tải...</div>
        </div>
      )}

      {/* Header with search */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Tìm kiếm phim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
          />
        </div>
        <button
          onClick={handleAdd}
          className="ml-4 bg-primaryColor hover:bg-primaryColor/90 text-black font-semibold px-6 py-2.5 rounded-lg transition-all"
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Thêm Phim
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Poster
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Tên Phim
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Năm
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Rating
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Lượt Xem
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Hành Động
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMovies.map((movie) => (
              <tr
                key={movie.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-300">{movie.id}</td>
                <td className="px-6 py-4">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-white font-medium">{movie.title}</div>
                  <div className="text-sm text-gray-400">{movie.englishTitle}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{movie.year}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                    <i className="fa-solid fa-star text-xs"></i>
                    {movie.rating}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {movie.views?.toLocaleString() || "N/A"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(movie)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Sửa"
                    >
                      <i className="fa-solid fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(movie.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Xóa"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 border-t border-white/10 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Hiển thị <span className="text-white font-semibold">{filteredMovies.length}</span> phim
        </span>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Trước
          </button>
          <button className="px-4 py-2 bg-primaryColor text-black font-semibold rounded-lg">
            1
          </button>
          <button className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors">
            2
          </button>
          <button className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Sau
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mb-6 bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      )}

      {/* Modal */}
      <MovieFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movie={selectedMovie}
        onSave={handleSave}
      />
    </div>
  );
};

export default MovieTable;
