import React from "react";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

/**
 * Quick Admin Login Button (For Development/Testing Only)
 * Đặt component này ở trang chủ hoặc header để test admin access
 */
const QuickAdminLogin = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    const adminUser = {
      id: 1,
      name: "Admin",
      email: "admin@cinephile.com",
      role: "admin",
    };
    login(adminUser);
    alert("Đã login làm Admin! Bạn có thể truy cập /admin");
  };

  const handleUserLogin = () => {
    const normalUser = {
      id: 2,
      name: "User Demo",
      email: "user@cinephile.com",
      role: "user",
    };
    login(normalUser);
    alert("Đã login làm User thường! Không có quyền truy cập /admin");
  };

  const handleLogout = () => {
    logout();
  };

  const goToAdmin = () => {
    navigate("/admin");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-primaryColor rounded-lg p-4 shadow-2xl">
      <h3 className="text-sm font-bold text-white mb-3">🔧 Dev Tools</h3>
      
      {user ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-300 mb-2">
            Logged in as: <span className="text-primaryColor font-semibold">{user.name}</span>
            <br />
            Role: <span className="text-yellow-400">{user.role}</span>
          </div>
          <button
            onClick={goToAdmin}
            className="w-full bg-primaryColor hover:bg-primaryColor/90 text-black text-xs font-semibold px-3 py-2 rounded transition-all"
          >
            <i className="fa-solid fa-shield-halved mr-1"></i>
            Go to Admin
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded transition-all"
          >
            <i className="fa-solid fa-sign-out-alt mr-1"></i>
            Logout
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleAdminLogin}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded transition-all"
          >
            <i className="fa-solid fa-user-shield mr-1"></i>
            Login as Admin
          </button>
          <button
            onClick={handleUserLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded transition-all"
          >
            <i className="fa-solid fa-user mr-1"></i>
            Login as User
          </button>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-white/10">
        <p className="text-[10px] text-gray-500">Only visible in development</p>
      </div>
    </div>
  );
};

export default QuickAdminLogin;

