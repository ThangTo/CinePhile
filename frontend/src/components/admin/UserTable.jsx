import React, { useState, useEffect } from "react";
import { userAPI } from "services/admin.service";
import UserFormModal from "./UserFormModal";
import { BarSpinner } from "components/common/LoadingState";
import Pagination from "components/common/Pagination";
import ConfirmDialog from "components/common/ConfirmDialog";
import { formatTimeAgo } from "utils/dateUtils";
import { FiSearch, FiPlus, FiTrash2, FiUsers, FiMail, FiCalendar, FiUser } from "react-icons/fi";

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });

  // Load users from API with search and pagination
  const loadUsers = async (page = 1, search = "") => {
    setIsLoading(true);
    try {
      const response = await userAPI.getAll({ page, limit: 20, search });
      // Response should always have data and pagination now
      setUsers(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          limit: 20,
        }
      );
    } catch (err) {
      setError("Không thể tải danh sách người dùng: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load users on mount
  useEffect(() => {
    loadUsers(1, "");
  }, []);

  // Debounce search - reload when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers(1, searchTerm);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleDelete = async (id) => {
    if (!id) {
      setError("Không tìm thấy ID người dùng");
      return;
    }
    setIsDeleteModalOpen(false);
    setIsLoading(true);
    try {
      await userAPI.delete(id);
      // Remove from local state instead of reloading all
      setUsers((prev) => prev.filter((user) => (user._id || user.id) !== id));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));
    } catch (err) {
      setError("Không thể xóa người dùng: " + err.message);
      // Reload on error to ensure consistency
      loadUsers(pagination.currentPage, searchTerm);
    } finally {
      setIsLoading(false);
    }
  };

  // const toggleStatus = async (id) => {
  //   setIsLoading(true);
  //   try {
  //     const updatedUser = await userAPI.toggleStatus(id);
  //     // Update local state instead of reloading all
  //     setUsers((prev) => prev.map((user) => (user.id === id ? updatedUser : user)));
  //   } catch (err) {
  //     setError("Không thể thay đổi trạng thái: " + err.message);
  //     // Reload on error to ensure consistency
  //     loadUsers(pagination.currentPage, searchTerm);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const handleEdit = (user) => {
  //   setSelectedUser(user);
  //   setIsModalOpen(true);
  // };

  const handleAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleSave = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedUser) {
        // Update
        const userId = selectedUser._id || selectedUser.id;
        const updatedUser = await userAPI.update(userId, userData);
        // Update local state instead of reloading all
        setUsers((prev) =>
          prev.map((user) => ((user._id || user.id) === userId ? updatedUser : user))
        );
      } else {
        // Create
        await userAPI.create(userData);
        // Reload to get proper pagination
        loadUsers(pagination.currentPage, searchTerm);
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi lưu người dùng";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadUsers(newPage, searchTerm);
  };

  return (
    <div className="w-full animate-fade-in">
      {/* 1. Control Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiUsers className="text-primaryColor" />
            Danh Sách Người Dùng
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Quản lý tài khoản người dùng, vai trò và quyền truy cập.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative group flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-500 group-focus-within:text-primaryColor transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full bg-bgColor3 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all shadow-lg"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-primaryColor hover:bg-primaryColor/90 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primaryColor/20 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <FiPlus size={20} />
            <span className="hidden sm:inline">Thêm User</span>
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

      {/* 3. Main Table Card */}
      <div className="bg-bgColor3 border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Avatar</th>
                <th className="px-6 py-4">Tên</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Vai trò</th>
                {/* <th className="px-6 py-4 text-center">Trạng thái</th> */}
                <th className="px-6 py-4 text-right">Ngày tham gia</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {users.length > 0
                ? users.map((user, index) => {
                    const userId = user._id || user.id;
                    return (
                      <tr
                        key={userId}
                        className="group hover:bg-white/[0.02] transition-colors duration-200"
                      >
                        {/* Index */}
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>

                        {/* Avatar */}
                        <td className="px-6 py-4">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-blue-500 to-purple-500">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name || user.username || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-lg">
                                {(user.name || user.username || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* User Info */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-base truncate pr-4 group-hover:text-primaryColor transition-colors">
                              {user.name || user.username || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <FiMail className="text-gray-600" size={14} />
                            <span className="truncate max-w-xs">{user.email}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-purple-500/20 text-purple-400"
                                : user.role === "premium"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            <FiUser size={12} />
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "premium"
                              ? "Premium"
                              : "User"}
                          </span>
                        </td>

                        {/* Status */}
                        {/* <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(user.id)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            user.status === "active"
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {user.status === "active" ? "Hoạt động" : "Vô hiệu"}
                        </button>
                      </td> */}

                        {/* Join Date */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-1 text-sm">
                            {user.createdAt ? (
                              <>
                                <div className="flex items-center gap-2 text-gray-300">
                                  <FiCalendar className="text-gray-600" size={14} />
                                  <span>
                                    {new Date(user.createdAt).toLocaleDateString("vi-VN", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatTimeAgo(user.createdAt)}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* <button
                            onClick={() => handleEdit(user)}
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                            title="Chỉnh sửa"
                          >
                            <FiEdit2 size={18} />
                          </button> */}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                              title="Xóa người dùng"
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
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                            <FiUsers className="text-gray-600 text-3xl" />
                          </div>
                          <p>Không tìm thấy người dùng nào.</p>
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
            Đang xem <span className="text-white font-semibold">{users.length}</span> /{" "}
            <span className="text-white font-semibold">{pagination.totalItems}</span>
          </span>

          {pagination.totalPages > 1 && (
            <div className="scale-90 sm:scale-100 origin-right mt-[-32px]">
              <Pagination
                page={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                className="bg-bgColor3 mt-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDelete(selectedUser?._id || selectedUser?.id)}
        title="Xác nhận xóa người dùng"
        message={`Bạn có chắc chắn muốn xóa người dùng "${
          selectedUser?.name || selectedUser?.username || "N/A"
        }"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa ngay"
        cancelText="Giữ lại"
        isDanger={true}
      />
    </div>
  );
};

export default UserTable;
