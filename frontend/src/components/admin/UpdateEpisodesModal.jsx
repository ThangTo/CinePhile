import React, { useState, useEffect, useRef } from "react";
import {
  FiX,
  FiFilm,
  FiSearch,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiSquare,
} from "react-icons/fi";
import { movieAPI } from "services/admin.service";
import OptimizedImage from "components/common/OptimizedImage";
import PaginationV2 from "components/common/PaginationV2";

const UpdateEpisodesModal = ({ isOpen, onClose, onUpdateSuccess }) => {
  const [movies, setMovies] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyNewEpisodes, setOnlyNewEpisodes] = useState(true); // Mặc định là true
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 50,
  });
  const [updateProgress, setUpdateProgress] = useState(null);
  const [updateLogs, setUpdateLogs] = useState([]);

  // AbortController để hủy update
  const abortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Hủy update nếu đang chạy
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isCancelledRef.current = false;
      hasLoadedRef.current = false;

      setMovies([]);
      setSelectedMovies(new Set());
      setSearchTerm("");
      setError(null);
      setSuccess(null);
      setUpdateProgress(null);
      setUpdateLogs([]);
      setIsLoading(false);
      setIsUpdating(false);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 50,
      });
    }
  }, [isOpen]);

  // Load movies when modal opens or search term changes
  useEffect(() => {
    if (!isOpen) return;

    // Load immediately when modal first opens
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMovies(1, "");
      return;
    }

    // Debounce search term changes
    const timeoutId = setTimeout(() => {
      loadMovies(1, searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  const loadMovies = async (page = 1, search = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await movieAPI.getUpdatingMovies({
        page,
        limit: 50,
        search: search || undefined,
      });
      console.log(response);
      if (response.data && response.pagination) {
        setMovies(response.data);
        setPagination(response.pagination);
      } else {
        const moviesData = Array.isArray(response) ? response : [];
        setMovies(moviesData);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: moviesData.length,
          limit: 50,
        });
      }
    } catch (err) {
      setError("Không thể tải danh sách phim: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadMovies(newPage, searchTerm);
  };

  // Toggle movie selection
  const toggleMovieSelection = (movieId) => {
    const newSelected = new Set(selectedMovies);
    if (newSelected.has(movieId)) {
      newSelected.delete(movieId);
    } else {
      newSelected.add(movieId);
    }
    setSelectedMovies(newSelected);
  };

  // Select all movies on current page
  const selectAll = () => {
    const allIds = new Set(movies.map((m) => m.id));
    setSelectedMovies(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedMovies(new Set());
  };

  // Hàm hủy update
  const handleCancelUpdate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      isCancelledRef.current = true;
      setIsUpdating(false);
      setUpdateProgress(null);
      setError("Cập nhật tập đã bị hủy bởi người dùng");
      setUpdateLogs((prev) => [
        ...prev,
        { type: "error", message: "❌ Cập nhật tập đã bị hủy", timestamp: new Date() },
      ]);
    }
  };

  // Handle update episodes
  const handleUpdateEpisodes = async () => {
    if (selectedMovies.size === 0) {
      setError("Vui lòng chọn ít nhất một phim");
      return;
    }

    // Tạo AbortController mới
    abortControllerRef.current = new AbortController();
    isCancelledRef.current = false;

    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    setUpdateLogs([]);
    setUpdateProgress({ current: 0, total: selectedMovies.size });

    try {
      const movieIds = Array.from(selectedMovies);

      await movieAPI.updateEpisodes(
        movieIds,
        onlyNewEpisodes, // Truyền tham số onlyNewEpisodes
        (data) => {
          // Kiểm tra nếu đã bị hủy
          if (isCancelledRef.current) {
            return;
          }

          if (data.type === "progress") {
            setUpdateProgress({
              current: data.current,
              total: data.total,
            });
            if (data.message) {
              setUpdateLogs((prev) => [
                ...prev,
                { type: "log", message: data.message, timestamp: new Date() },
              ]);
            }
            if (data.result) {
              const result = data.result;
              const logMessage = result.error
                ? `❌ ${result.movieName}: ${result.error}`
                : `✅ ${result.movieName}: ${result.updated} tập đã cập nhật (${
                    result.prevCurrent || "-"
                  }/${result.prevTotal || "-"} → ${result.newCurrent || "-"}/${
                    result.newTotal || "-"
                  })`;
              setUpdateLogs((prev) => [
                ...prev,
                {
                  type: result.error ? "error" : "success",
                  message: logMessage,
                  timestamp: new Date(),
                },
              ]);
            }
          } else if (data.type === "complete") {
            setSuccess(
              `Đã cập nhật thành công ${data.updated || 0} tập cho ${data.total || 0} phim`
            );
            setUpdateProgress(null);
            setSelectedMovies(new Set());
            if (onUpdateSuccess) {
              onUpdateSuccess();
            }
            setIsUpdating(false);
            abortControllerRef.current = null;
            // Reload movies to show updated data
            loadMovies(pagination.currentPage, searchTerm);
          } else if (data.type === "error") {
            setError(data.message || "Có lỗi xảy ra khi cập nhật tập");
            setUpdateProgress(null);
            setIsUpdating(false);
            abortControllerRef.current = null;
          }
        },
        abortControllerRef.current
      );
    } catch (err) {
      if (isCancelledRef.current) {
        // Đã bị hủy, không cần set error nữa
        return;
      }
      setError(err?.message || "Có lỗi xảy ra khi cập nhật tập");
      setUpdateProgress(null);
      setIsUpdating(false);
      abortControllerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 mt-0">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl h-[90vh] bg-bgColor3 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primaryColor/20 text-primaryColor">
              <FiRefreshCw size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cập Nhật Tập Phim</h2>
              <p className="text-xs text-gray-400">
                Chọn các phim đang cập nhật để cập nhật danh sách tập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 text-red-200">
              <FiAlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-xl p-4 flex items-center gap-3 text-green-200">
              <FiCheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* Search and Actions */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative group flex-1 w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-500 group-focus-within:text-primaryColor transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm phim..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Checkbox chỉ cập nhật tập mới */}
              {!isUpdating && (
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyNewEpisodes}
                    onChange={(e) => setOnlyNewEpisodes(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-primaryColor focus:ring-primaryColor focus:ring-offset-0"
                  />
                  <span className="whitespace-nowrap">Chỉ tập mới</span>
                </label>
              )}
              
              {selectedMovies.size > 0 && !isUpdating && (
                <>
                  <button
                    onClick={selectAll}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    onClick={handleUpdateEpisodes}
                    disabled={isUpdating}
                    className="px-6 py-2.5 rounded-xl bg-primaryColor text-black font-bold hover:bg-primaryColor/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <FiRefreshCw size={18} />
                    <span>Cập Nhật {selectedMovies.size} Phim</span>
                  </button>
                </>
              )}
              {isUpdating && (
                <button
                  onClick={handleCancelUpdate}
                  className="px-6 py-2.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 font-bold hover:bg-red-500/30 transition-all flex items-center gap-2"
                >
                  <FiSquare size={18} />
                  <span>Hủy Cập Nhật</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {updateProgress && (
            <div className="mb-4 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-sm">Đang cập nhật...</span>
                <span className="text-blue-200 text-sm">
                  {updateProgress.current} / {updateProgress.total}
                </span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(updateProgress.current / updateProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Update Logs */}
          {updateLogs.length > 0 && (
            <div className="mb-4 bg-black/20 border border-white/5 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
              <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <FiFilm className="text-primaryColor" />
                Logs Cập Nhật
              </h4>
              <div className="space-y-1 font-mono text-xs">
                {updateLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`${
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                        ? "text-green-400"
                        : "text-gray-300"
                    } whitespace-pre-wrap`}
                  >
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movies List */}
          <div className="bg-black/10 rounded-xl border border-white/5 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <FiLoader className="animate-spin text-primaryColor" size={32} />
              </div>
            ) : movies.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3 w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedMovies.size > 0 && selectedMovies.size === movies.length
                            }
                            onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                            disabled={isUpdating}
                            className="w-4 h-4 rounded bg-black/20 border-white/5 text-primaryColor focus:ring-primaryColor focus:ring-2"
                          />
                        </th>
                        <th className="px-4 py-3">Poster</th>
                        <th className="px-4 py-3">Tên Phim</th>
                        <th className="px-4 py-3 text-center">Trạng Thái</th>
                        <th className="px-4 py-3 text-center">Tập Hiện Tại</th>
                        <th className="px-4 py-3 text-center">Tổng Tập</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {movies.map((movie) => {
                        const isSelected = selectedMovies.has(movie.id);
                        return (
                          <tr
                            key={movie.id}
                            className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${
                              isSelected ? "bg-primaryColor/5" : ""
                            }`}
                            onClick={() => !isUpdating && toggleMovieSelection(movie.id)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMovieSelection(movie.id)}
                                disabled={isUpdating}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded bg-black/20 border-white/5 text-primaryColor focus:ring-primaryColor focus:ring-2"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative w-12 h-16 rounded overflow-hidden shadow-lg">
                                <OptimizedImage
                                  src={movie.poster || ""}
                                  alt={movie.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-white font-bold text-sm">{movie.title}</span>
                                <span className="text-xs text-gray-500">{movie.slug}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  movie.status === "ongoing"
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "bg-yellow-500/20 text-yellow-300"
                                }`}
                              >
                                {movie.status === "ongoing" ? "Đang cập nhật" : "Sắp chiếu"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-300">
                              {movie.currentEpisode || "-"}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-300">
                              {movie.totalEpisodes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="border-t border-white/5 bg-black/10 p-4 flex justify-center">
                    <PaginationV2
                      page={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <FiFilm className="text-4xl mb-3 text-gray-600" />
                <p>Không tìm thấy phim nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/10 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedMovies.size > 0 && (
              <span>
                Đã chọn <span className="text-white font-semibold">{selectedMovies.size}</span> phim
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateEpisodesModal;
