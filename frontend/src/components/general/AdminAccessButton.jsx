import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";

/**
 * Admin Access Button
 * Hiển thị khi user có role admin
 * Thường đặt trong Header hoặc User Menu
 */
const AdminAccessButton = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Chỉ hiển thị nếu user là admin
  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <button
      onClick={() => navigate("/admin")}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
      title="Truy cập Admin Dashboard"
    >
      <i className="fa-solid fa-shield-halved"></i>
      <span className="font-semibold">Admin Panel</span>
    </button>
  );
};

export default AdminAccessButton;
