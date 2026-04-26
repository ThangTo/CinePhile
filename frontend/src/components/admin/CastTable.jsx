import React, { useState, useEffect } from "react";
import { castAPI } from "services/admin.service";
import CastFormModal from "./CastFormModal";
import { BarSpinner } from "components/common/LoadingState";
import PaginationV2 from "components/common/PaginationV2";
import ConfirmDialog from "components/common/ConfirmDialog";
import { handleAvatarError } from "utils/avatarUtils";
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiUser,
  FiEdit2,
  FiMapPin,
  FiCalendar,
  FiFilm,
} from "react-icons/fi";

const CastTable = () => {
  const [casts, setCasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCast, setSelectedCast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });

  const loadCasts = async (page = 1, search = "") => {
    setIsLoading(true);
    try {
      const response = await castAPI.getAll({ page, limit: 20, search });
      setCasts(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          limit: 20,
        }
      );
    } catch (err) {
      setError("Không thể tải danh sách diễn viên: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCasts(1, "");
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCasts(1, searchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleDelete = async (id) => {
    if (!id) {
      setError("Không tìm thấy ID diễn viên");
      return;
    }
    setIsDeleteModalOpen(false);
    setIsLoading(true);
    try {
      await castAPI.delete(id);
      setCasts((prev) => prev.filter((cast) => (cast._id || cast.id) !== id));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));
    } catch (err) {
      setError("Không thể xóa diễn viên: " + err.message);
      loadCasts(pagination.currentPage, searchTerm);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (cast) => {
    setSelectedCast(cast);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCast(null);
    setIsModalOpen(true);
  };

  const handleSave = async (castData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedCast) {
        const castId = selectedCast._id || selectedCast.id;
        const updatedCast = await castAPI.update(castId, castData);
        setCasts((prev) =>
          prev.map((cast) => ((cast._id || cast.id) === castId ? updatedCast : cast))
        );
      } else {
        await castAPI.create(castData);
        loadCasts(pagination.currentPage, searchTerm);
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.error || err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi lưu diễn viên";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadCasts(newPage, searchTerm);
  };

  const formatRole = (roles) => {
    if (!roles || roles.length === 0) return "Actor";
    return roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* 1. Control Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiUser className="text-primaryColor" />
            Danh Sách Diễn Viên
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Quản lý thông tin diễn viên, đạo diễn và người nổi tiếng.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-500 group-focus-within:text-primaryColor transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, alias, quê quán..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full bg-bgColor3 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all shadow-lg"
            />
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-primaryColor hover:bg-primaryColor/90 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primaryColor/20 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <FiPlus size={20} />
            <span className="hidden sm:inline">Thêm Diễn Viên</span>
          </button>
        </div>
      </div>

      {/* 2. Error Message Area */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between animate-pulse-soft mb-4">
          <span className="flex items-center gap-2">⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Table Card */}
      <div className="bg-bgColor3 border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Ảnh</th>
                <th className="px-6 py-4">Tên</th>
                <th className="px-6 py-4">Tên khác</th>
                <th className="px-6 py-4 text-center">Vai trò</th>
                <th className="px-6 py-4 text-center">Ngày sinh</th>
                <th className="px-6 py-4">Quê quán</th>
                <th className="px-6 py-4 text-center">Phim</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {casts.length > 0
                ? casts.map((cast, index) => {
                    const castId = cast._id || cast.id;
                    return (
                      <tr
                        key={castId}
                        className="group hover:bg-white/[0.02] transition-colors duration-200"
                      >
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>

                        <td className="px-6 py-4">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-blue-500 to-purple-500">
                            {cast.profileUrl || cast.profilePath ? (
                              <img
                                src={cast.profileUrl || cast.profilePath}
                                alt={cast.name || "Cast"}
                                className="w-full h-full object-cover"
                                onError={handleAvatarError}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-lg">
                                {(cast.name || "C").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 max-w-xs">
                          <span className="text-white font-bold text-base truncate pr-4 group-hover:text-primaryColor transition-colors">
                            {cast.name || "N/A"}
                          </span>
                          {cast.knownForDepartment && (
                            <div className="text-xs text-gray-500 mt-0.5">{cast.knownForDepartment}</div>
                          )}
                        </td>

                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {cast.alsoKnownAs && cast.alsoKnownAs.length > 0 ? (
                              cast.alsoKnownAs.slice(0, 2).map((alias, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                                >
                                  {alias}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                            {cast.alsoKnownAs && cast.alsoKnownAs.length > 2 && (
                              <span className="text-[10px] text-gray-500">+{cast.alsoKnownAs.length - 2}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                              cast.roles?.includes("director")
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            <FiFilm size={12} />
                            {formatRole(cast.roles)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {cast.birthday ? (
                              <>
                                <div className="flex items-center gap-2 text-gray-300 text-sm">
                                  <FiCalendar className="text-gray-600" size={14} />
                                  <span>{formatDate(cast.birthday)}</span>
                                </div>
                                {cast.deathday && (
                                  <span className="text-[10px] text-red-400">
                                    Mất: {formatDate(cast.deathday)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-600 text-xs italic">—</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 max-w-[150px]">
                          <div className="flex items-center gap-2 text-sm text-gray-300 truncate">
                            {cast.place_of_birth ? (
                              <>
                                <FiMapPin className="text-gray-600 flex-shrink-0" size={14} />
                                <span className="truncate">{cast.place_of_birth}</span>
                              </>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="text-yellow-400 font-black text-base">
                            {cast.movieCount || 0}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(cast)}
                              className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                              title="Chỉnh sửa"
                            >
                              <FiEdit2 size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCast(cast);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                              title="Xóa diễn viên"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : !isLoading && (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                            <FiUser className="text-gray-600 text-3xl" />
                          </div>
                          <p>Không tìm thấy diễn viên nào.</p>
                        </div>
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-6">
            <BarSpinner />
          </div>
        )}

        <div className="border-t border-white/5 bg-black/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            Đang xem <span className="text-white font-semibold">{casts.length}</span> /{" "}
            <span className="text-white font-semibold">{pagination.totalItems}</span>
          </span>

          {pagination.totalPages > 1 && (
            <div className="scale-90 sm:scale-100 origin-right">
              <PaginationV2
                page={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CastFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cast={selectedCast}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDelete(selectedCast?._id || selectedCast?.id)}
        title="Xác nhận xóa diễn viên"
        message={`Bạn có chắc chắn muốn xóa diễn viên "${selectedCast?.name || "N/A"}"? Các tham chiếu trong phim cũng sẽ bị xóa. Hành động này không thể hoàn tác.`}
        confirmText="Xóa ngay"
        cancelText="Giữ lại"
        isDanger={true}
      />
    </div>
  );
};

export default CastTable;
