import React, { useState, useEffect } from "react";
import { userAPI } from "../../services/adminService";
import UserFormModal from "./UserFormModal";

// Mock user data
const MOCK_USERS = [
  { id: 1, name: "Nguyễn Văn A", email: "nguyenvana@example.com", role: "user", status: "active", joinDate: "2024-01-15" },
  { id: 2, name: "Trần Thị B", email: "tranthib@example.com", role: "user", status: "active", joinDate: "2024-02-20" },
  { id: 3, name: "Lê Văn C", email: "levanc@example.com", role: "admin", status: "active", joinDate: "2023-12-10" },
  { id: 4, name: "Phạm Thị D", email: "phamthid@example.com", role: "user", status: "inactive", joinDate: "2024-03-05" },
  { id: 5, name: "Hoàng Văn E", email: "hoangvane@example.com", role: "user", status: "active", joinDate: "2024-01-28" },
];

const UserTable = () => {
  const [users, setUsers] = useState(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    
    setIsLoading(true);
    try {
      await userAPI.delete(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      setError("Không thể xóa người dùng: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    setIsLoading(true);
    try {
      const updated = await userAPI.toggleStatus(id);
      setUsers(users.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError("Không thể thay đổi trạng thái: " + err.message);
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
        const updated = await userAPI.update(selectedUser.id, userData);
        setUsers(users.map((u) => (u.id === selectedUser.id ? updated : u)));
      } else {
        const newUser = await userAPI.create(userData);
        setUsers([newUser, ...users]);
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
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
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
          <thead className="bg-gray-900 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Họ Tên</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Vai Trò</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Trạng Thái</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Ngày Tham Gia</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-300">{user.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0)}
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

      {/* Footer */}
      <div className="p-6 border-t border-white/10 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Hiển thị <span className="text-white font-semibold">{filteredUsers.length}</span> người dùng
        </span>
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

