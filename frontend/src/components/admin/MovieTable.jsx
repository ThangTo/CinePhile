import React, { useState, useEffect } from "react";
import { movieAPI } from "services/admin.service";
import MovieFormModal from "./MovieFormModal";
import { BarSpinner } from "components/common/LoadingState";
import OptimizedImage from "components/common/OptimizedImage";
import Pagination from "components/common/Pagination";
import ConfirmDialog from "components/common/ConfirmDialog";

const MovieTable = () => {
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });

  // Load movies from API with search and pagination
  const loadMovies = async (page = 1, search = "") => {
    setIsLoading(true);
    try {
      const response = await movieAPI.getAll({ page, limit: 20, search });
      // Handle both paginated response { data: [], pagination: {} } and direct array
      if (response.data && response.pagination) {
        setMovies(Array.isArray(response.data) ? response.data : []);
        setPagination(response.pagination);
      } else {
        // Fallback for direct array response
        const moviesData = Array.isArray(response) ? response : [];
        setMovies(moviesData);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: moviesData.length,
          limit: 20,
        });
      }
    } catch (err) {
      setError("Không thể tải danh sách phim: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load movies on mount
  useEffect(() => {
    loadMovies(1, "");
  }, []);

  // Debounce search - reload when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMovies(1, searchTerm);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleDelete = async (id) => {
    setIsDeleteModalOpen(false);
    setIsLoading(true);
    try {
      await movieAPI.delete(id);
      // Remove from local state instead of reloading all
      setMovies((prev) => prev.filter((movie) => movie.id !== id));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));
    } catch (err) {
      setError("Không thể xóa phim: " + err.message);
      // Reload on error to ensure consistency
      loadMovies(pagination.currentPage, searchTerm);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (movie) => {
    setIsLoading(true);
    try {
      // Fetch full movie data for editing (includes all fields like description, ageRating)
      const fullMovie = await movieAPI.getById(movie.id);
      setSelectedMovie(fullMovie);
      setIsModalOpen(true);
    } catch (err) {
      setError("Không thể tải thông tin phim: " + err.message);
      // Fallback to using the movie from table if API fails
      setSelectedMovie(movie);
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
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
        const updatedMovie = await movieAPI.update(selectedMovie.id, movieData);
        // Update local state instead of reloading all
        setMovies((prev) =>
          prev.map((movie) => (movie.id === selectedMovie.id ? updatedMovie : movie))
        );
      } else {
        // Create
        await movieAPI.create(movieData);
        // Reload to get proper pagination
        loadMovies(pagination.currentPage, searchTerm);
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi lưu phim";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadMovies(newPage, searchTerm);
  };

  return (
    <div className="bg-bgColor3 rounded-xl border border-white/10 overflow-hidden">
      {/* Header with search */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Tìm kiếm phim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bgColor border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
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

      {/* Error message */}
      {error && (
        <div className="mx-6 mb-6 bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bgColor  border-b border-white/10">
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
            {movies.map((movie, index) => (
              <tr
                key={movie.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-300">{index + 1}</td>
                <td className="px-6 py-4">
                  <OptimizedImage
                    src={movie.poster}
                    alt={movie.title}
                    className="w-12 h-16 object-cover rounded"
                    priority={true}
                    lazy={false}
                    preloadOnHover={false}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-white font-medium">{movie.title}</div>
                  <div className="text-sm text-gray-400">{movie.englishTitle}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{movie.year}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-primaryColor font-semibold">
                    <i className="fa-solid fa-star text-xs"></i>
                    {movie.rating.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 text-center py-4 text-sm text-gray-300">
                  {movie.views?.toLocaleString() || "N/A"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(movie)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Sửa"
                    >
                      <i className="fa-solid fa-edit"></i>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMovie(movie);
                        setIsDeleteModalOpen(true);
                      }}
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

      {/* Loading state */}
      {isLoading && movies.length === 0 && (
        <section className="  flex items-center justify-center p-6">
          <BarSpinner />
        </section>
      )}

      {/* Pagination */}
      <div className="p-6 border-t border-white/10 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Hiển thị <span className="text-white font-semibold">{movies.length}</span> /{" "}
          <span className="text-white font-semibold">{pagination.totalItems}</span> phim
        </span>
        {pagination.totalPages > 1 && (
          <div className="flex justify-end items-center mt-[-32px]">
            <Pagination
              page={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              className="bg-bgColor3"
            />
          </div>
        )}
      </div>

      {/* Modal */}
      <MovieFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movie={selectedMovie}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDelete(selectedMovie.id)}
        title="Xóa Phim"
        message="Bạn có chắc chắn muốn xóa phim này?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDanger={true}
      />
    </div>
  );
};

export default MovieTable;
