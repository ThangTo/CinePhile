import React, { useState, useEffect } from "react";
import { movieAPI } from "services/admin.service";
import MovieFormModal from "./MovieFormModal";
import MovieCrawlModal from "./MovieCrawlModal";
import UpdateEpisodesModal from "./UpdateEpisodesModal";
import MovieFilter from "components/common/MovieFilter";
import { BarSpinner } from "components/common/LoadingState";
import OptimizedImage from "components/common/OptimizedImage";
import PaginationV2 from "components/common/PaginationV2";
import ConfirmDialog from "components/common/ConfirmDialog";

import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiStar,
  FiFilm,
  FiCalendar,
  FiDownload,
  FiRefreshCw,
  FiAward,
} from "react-icons/fi";

const MovieTable = () => {
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCrawlModalOpen, setIsCrawlModalOpen] = useState(false);
  const [isUpdateEpisodesModalOpen, setIsUpdateEpisodesModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHideAllModalOpen, setIsHideAllModalOpen] = useState(false);
  const [isUnhideAllModalOpen, setIsUnhideAllModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });

  const loadMovies = async (page = 1, search = "", filterParams = {}) => {
    setIsLoading(true);
    try {
      // Build params object with filters
      const params = {
        page,
        limit: 20,
        ...(search && { search }),
        ...(filterParams.genres?.length && { genres: filterParams.genres.join(",") }),
        ...(filterParams.countries?.length && { countries: filterParams.countries.join(",") }),
        ...(filterParams.year && { year: filterParams.year }),
        ...(filterParams.yearFrom && { yearFrom: filterParams.yearFrom }),
        ...(filterParams.yearTo && { yearTo: filterParams.yearTo }),
        ...(filterParams.quality && { quality: filterParams.quality }),
        ...(filterParams.type && { type: filterParams.type }),
        ...(filterParams.ageRating && { ageRating: filterParams.ageRating }),
        ...(filterParams.status && { status: filterParams.status }),
        ...(filterParams.ratingMin && { ratingMin: filterParams.ratingMin }),
        ...(filterParams.ratingMax && { ratingMax: filterParams.ratingMax }),
        ...(showHiddenOnly && { isHidden: true }),
        ...(showFeaturedOnly && { isFeatured: true }),
      };

      const response = await movieAPI.getAll(params);
      if (response.data && response.pagination) {
        setMovies(Array.isArray(response.data) ? response.data : []);
        setPagination(response.pagination);
      } else {
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

  useEffect(() => {
    loadMovies(1, "", filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMovies(1, searchTerm, filters);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, showHiddenOnly, showFeaturedOnly]);

  const handleDelete = async (id) => {
    setIsDeleteModalOpen(false);
    setIsLoading(true);
    try {
      await movieAPI.delete(id);
      setMovies((prev) => prev.filter((movie) => movie.id !== id));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));
    } catch (err) {
      setError("Không thể xóa phim: " + err.message);
      loadMovies(pagination.currentPage, searchTerm);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (movie) => {
    setIsLoading(true);
    try {
      const fullMovie = await movieAPI.getById(movie.id);
      setSelectedMovie(fullMovie);
      setIsModalOpen(true);
    } catch (err) {
      setError("Không thể tải thông tin phim: " + err.message);
      setSelectedMovie(movie);
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleHidden = async (movie) => {
    setIsLoading(true);
    try {
      const result = await movieAPI.toggleHidden(movie.id);
      // Update movie in list
      setMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? { ...m, isHidden: result.isHidden } : m))
      );
      console.log(result.message);
    } catch (err) {
      setError("Không thể thay đổi trạng thái ẩn: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = async (movie) => {
    setIsLoading(true);
    try {
      const result = await movieAPI.toggleFeatured(movie.id);
      setMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? { ...m, isFeatured: result.isFeatured } : m))
      );
      console.log(result.message);
    } catch (err) {
      setError("Không thể thay đổi trạng thái banner: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHideAll = async () => {
    setIsHideAllModalOpen(false);
    setIsLoading(true);
    try {
      const result = await movieAPI.hideAll();
      // Reload movies to reflect changes
      await loadMovies(pagination.currentPage, searchTerm, filters);
      console.log(result.message);
    } catch (err) {
      setError("Không thể ẩn tất cả phim: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnhideAll = async () => {
    setIsUnhideAllModalOpen(false);
    setIsLoading(true);
    try {
      const result = await movieAPI.unhideAll();
      // Reload movies to reflect changes
      await loadMovies(pagination.currentPage, searchTerm, filters);
      console.log(result.message);
    } catch (err) {
      setError("Không thể hiện tất cả phim: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (movieData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedMovie) {
        const updatedMovie = await movieAPI.update(selectedMovie.id, movieData);
        setMovies((prev) =>
          prev.map((movie) => (movie.id === selectedMovie.id ? updatedMovie : movie))
        );
      } else {
        await movieAPI.create(movieData);
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
    loadMovies(newPage, searchTerm, filters);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  return (
    <div className="w-full animate-fade-in flex flex-col gap-4">
      {/* 1. Control Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiFilm className="text-primaryColor" />
            Danh Sách Phim
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Quản lý kho phim, xếp hạng và thông tin chi tiết.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Filter Dropdown - Đã ẩn / Banner */}
          <div className="relative group">
            <button
              className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all whitespace-nowrap ${
                showHiddenOnly || showFeaturedOnly
                  ? "bg-primaryColor text-black shadow-primaryColor/20"
                  : "bg-bgColor3 hover:text-primaryColor text-gray-400 border border-white/10"
              }`}
            >
              <FiEye size={18} />
              <span className="hidden sm:inline">
                {showFeaturedOnly ? "Banner" : showHiddenOnly ? "Đã ẩn" : "Bộ lọc"}
              </span>
              <i className="fa-solid fa-caret-down text-xs" />
            </button>
            <div className="absolute right-0 mt-2 w-52 bg-bgColor3 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => {
                  setShowHiddenOnly(!showHiddenOnly);
                  if (!showHiddenOnly) setShowFeaturedOnly(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-2 rounded-t-xl ${
                  showHiddenOnly
                    ? "text-yellow-400 font-semibold"
                    : "text-gray-300 hover:text-yellow-400"
                }`}
              >
                {showHiddenOnly ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                <span>Phim đã ẩn</span>
                {showHiddenOnly && (
                  <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">ON</span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowFeaturedOnly(!showFeaturedOnly);
                  if (!showFeaturedOnly) setShowHiddenOnly(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-2 rounded-b-xl ${
                  showFeaturedOnly
                    ? "text-amber-400 font-semibold"
                    : "text-gray-300 hover:text-amber-400"
                }`}
              >
                <FiAward size={16} />
                <span>Phim trên Banner</span>
                {showFeaturedOnly && (
                  <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">ON</span>
                )}
              </button>
            </div>
          </div>

          {/* Bulk Hide/Unhide Actions */}
          <div className="relative group">
            <button className="flex items-center gap-2 bg-bgColor3 hover:text-primaryColor text-gray-300 font-bold px-4 py-2.5 rounded-xl shadow-lg border border-white/10 transition-all whitespace-nowrap">
              <FiEyeOff size={18} />
              <span className="hidden sm:inline">Hành động</span>
              <i className="fa-solid fa-caret-down text-xs" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-bgColor3 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => setIsHideAllModalOpen(true)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 text-gray-300 hover:text-yellow-400 transition-colors flex items-center gap-2 rounded-t-xl"
              >
                <FiEyeOff size={16} />
                <span>Ẩn tất cả phim</span>
              </button>
              <button
                onClick={() => setIsUnhideAllModalOpen(true)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 text-gray-300 hover:text-green-400 transition-colors flex items-center gap-2 rounded-b-xl"
              >
                <FiEye size={16} />
                <span>Hiện tất cả phim</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative group flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-500 group-focus-within:text-primaryColor transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full bg-bgColor3 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all shadow-lg"
            />
          </div>

          {/* Update Episodes Button */}
          <button
            onClick={() => setIsUpdateEpisodesModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <FiRefreshCw size={20} />
            <span className="hidden sm:inline">Cập Nhật</span>
          </button>

          {/* Crawl Button - Replaced Add Button */}
          <button
            onClick={() => setIsCrawlModalOpen(true)}
            className="flex items-center gap-2 bg-primaryColor hover:bg-primaryColor/90 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primaryColor/20 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <FiDownload size={20} />
            <span className="hidden sm:inline">Crawl Phim</span>
          </button>
        </div>
      </div>

      {/* 2. Error Message Area */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between animate-pulse-soft">
          <span className="flex items-center gap-2">⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2.5. Filter Section */}
      <MovieFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        options={{ showAdvanced: true, compact: false, defaultCollapsed: true }}
      />

      {/* 3. Main Table Card */}
      <div className="bg-bgColor3 border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Poster</th>
                <th className="px-6 py-4">Thông tin phim</th>
                <th className="px-6 py-4 text-center">Năm</th>
                <th className="px-6 py-4 text-center">Rating</th>
                <th className="px-6 py-4 text-right">Lượt xem</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {movies.length > 0
                ? movies.map((movie, index) => (
                    <tr
                      key={movie.id}
                      className="group hover:bg-white/[0.02] transition-colors duration-200"
                    >
                      {/* Index */}
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {(pagination.currentPage - 1) * pagination.limit + index + 1}
                      </td>

                      {/* Poster */}
                      <td className="px-6 py-4">
                        <div className="relative w-12 h-16 rounded overflow-hidden shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300">
                          <OptimizedImage
                            src={movie.poster || movie.poster_url || ""}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                            priority={index < 5}
                          />
                        </div>
                      </td>

                      {/* Movie Info */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start gap-2">
                            <span className="text-white font-bold text-base line-clamp-1 flex-1 group-hover:text-primaryColor transition-colors">
                              {movie.title}
                            </span>
                            {movie.isFeatured && (
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 whitespace-nowrap">
                                ⭐ Banner
                              </span>
                            )}
                            {movie.isHidden && (
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 whitespace-nowrap">
                                Đã ẩn
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 italic truncate">
                            {movie.englishTitle || "No English Title"}
                          </span>
                        </div>
                      </td>

                      {/* Year */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-gray-300 text-xs font-medium">
                          <FiCalendar size={12} />
                          {movie.year}
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold">
                          <FiStar className="fill-yellow-500" size={14} />
                          <span>{movie.rating ? movie.rating.toFixed(1) : "N/A"}</span>
                        </div>
                      </td>

                      {/* Views */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-sm text-gray-300">
                          <span className="font-mono">{movie.views?.toLocaleString() || 0}</span>
                          <FiEye className="text-gray-600" size={14} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(movie)}
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                            title="Chỉnh sửa"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleFeatured(movie)}
                            className={`p-2 rounded-lg transition-all ${
                              movie.isFeatured
                                ? "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                                : "text-gray-500 hover:bg-gray-500/10 hover:text-gray-300"
                            }`}
                            title={movie.isFeatured ? "Gỡ khỏi banner" : "Đưa lên banner"}
                          >
                            <FiAward size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleHidden(movie)}
                            className={`p-2 rounded-lg transition-all ${
                              movie.isHidden
                                ? "text-green-400 hover:bg-green-500/10 hover:text-green-300"
                                : "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                            }`}
                            title={movie.isHidden ? "Hiện phim" : "Ẩn phim"}
                          >
                            {movie.isHidden ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMovie(movie);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                            title="Xóa phim"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : !isLoading && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                            <FiFilm className="text-gray-600 text-3xl" />
                          </div>
                          <p>Không tìm thấy bộ phim nào.</p>
                        </div>
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>

        {/* Loading State Overlay */}
        {isLoading && (
          <div className="flex items-center justify-center p-6">
            <BarSpinner />
          </div>
        )}

        {/* 4. Pagination Footer */}
        <div className="border-t border-white/5 bg-black/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            Đang xem <span className="text-white font-semibold">{movies.length}</span> /{" "}
            <span className="text-white font-semibold">{pagination.totalItems}</span>
          </span>

          {pagination.totalPages > 1 && (
            <div className="scale-90 sm:scale-100 origin-right ">
              <PaginationV2
                page={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                // className="bg-bgColor3"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MovieFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movie={selectedMovie}
        onSave={handleSave}
      />

      <MovieCrawlModal
        isOpen={isCrawlModalOpen}
        onClose={() => setIsCrawlModalOpen(false)}
        onCrawlSuccess={() => {
          loadMovies(pagination.currentPage, searchTerm);
        }}
      />

      <UpdateEpisodesModal
        isOpen={isUpdateEpisodesModalOpen}
        onClose={() => setIsUpdateEpisodesModalOpen(false)}
        onUpdateSuccess={() => {
          loadMovies(pagination.currentPage, searchTerm);
        }}
      />

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDelete(selectedMovie.id)}
        title="Xác nhận xóa phim"
        message={`Bạn có chắc chắn muốn xóa phim "${selectedMovie?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa ngay"
        cancelText="Giữ lại"
        isDanger={true}
      />

      <ConfirmDialog
        isOpen={isHideAllModalOpen}
        onClose={() => setIsHideAllModalOpen(false)}
        onConfirm={handleHideAll}
        title="Xác nhận ẩn tất cả phim"
        message="Bạn có chắc chắn muốn ẩn TẤT CẢ phim? Người dùng sẽ chỉ có thể xem trailer."
        confirmText="Ẩn tất cả"
        cancelText="Hủy"
        isDanger={true}
      />

      <ConfirmDialog
        isOpen={isUnhideAllModalOpen}
        onClose={() => setIsUnhideAllModalOpen(false)}
        onConfirm={handleUnhideAll}
        title="Xác nhận hiện tất cả phim"
        message="Bạn có chắc chắn muốn hiện TẤT CẢ phim đã ẩn?"
        confirmText="Hiện tất cả"
        cancelText="Hủy"
        isDanger={false}
      />
    </div>
  );
};

export default MovieTable;
