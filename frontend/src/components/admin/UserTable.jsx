import React, { useState, useEffect } from "react";
import { userAPI } from "services/admin.service";
import UserFormModal from "./UserFormModal";
import { BarSpinner } from "components/common/LoadingState";

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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
      // Handle both paginated response { data: [], pagination: {} } and direct array
      if (response.data && response.pagination) {
        setUsers(Array.isArray(response.data) ? response.data : []);
        setPagination(response.pagination);
      } else {
        // Fallback for direct array response
        const usersData = Array.isArray(response) ? response : [];
        setUsers(usersData);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: usersData.length,
          limit: 20,
        });
      }
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
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    setIsLoading(true);
    try {
      await userAPI.delete(id);
      // Remove from local state instead of reloading all
      setUsers((prev) => prev.filter((user) => user.id !== id));
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

  const toggleStatus = async (id) => {
    setIsLoading(true);
    try {
      const updatedUser = await userAPI.toggleStatus(id);
      // Update local state instead of reloading all
      setUsers((prev) => prev.map((user) => (user.id === id ? updatedUser : user)));
    } catch (err) {
      setError("Không thể thay đổi trạng thái: " + err.message);
      // Reload on error to ensure consistency
      loadUsers(pagination.currentPage, searchTerm);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

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
        const updatedUser = await userAPI.update(selectedUser.id, userData);
        // Update local state instead of reloading all
        setUsers((prev) => prev.map((user) => (user.id === selectedUser.id ? updatedUser : user)));
      } else {
        // Create
        await userAPI.create(userData);
        // Reload to get proper pagination
        loadUsers(pagination.currentPage, searchTerm);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-bgColor3 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bgColor border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
          />
        </div>
        <button
          onClick={handleAdd}
          className="ml-4 bg-primaryColor hover:bg-primaryColor/90 text-black font-semibold px-6 py-2.5 rounded-lg transition-all"
        >
          <i className="fa-solid fa-user-plus mr-2"></i>
          Thêm User
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bgColor border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Họ Tên
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Vai Trò
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Trạng Thái
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Ngày Tham Gia
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                Hành Động
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-300">{user.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {user.role === "admin" ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleStatus(user.id)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {user.status === "active" ? "Hoạt động" : "Vô hiệu"}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{user.joinDate}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Sửa"
                    >
                      <i className="fa-solid fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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
      {isLoading && users.length === 0 && (
        <section className="flex items-center justify-center p-6">
          <BarSpinner />
        </section>
      )}

      {/* Footer with Pagination */}
      <div className="p-6 border-t border-white/10 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Hiển thị <span className="text-white font-semibold">{users.length}</span> /{" "}
          <span className="text-white font-semibold">{pagination.totalItems}</span> người dùng
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadUsers(pagination.currentPage - 1, searchTerm)}
            disabled={pagination.currentPage <= 1}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-white">
            Trang {pagination.currentPage} / {pagination.totalPages}
          </span>
          <button
            onClick={() => loadUsers(pagination.currentPage + 1, searchTerm)}
            disabled={pagination.currentPage >= pagination.totalPages}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
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
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSave}
      />
    </div>
  );
};

export default UserTable;
