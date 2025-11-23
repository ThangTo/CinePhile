import React, { useState } from "react";
import useAuth from "hooks/useAuth";
import { useNavigate } from "react-router-dom";
import authService from "services/auth.service";

/**
 * Quick Admin Login Button (For Development/Testing Only)
 * Đặt component này ở trang chủ hoặc header để test admin access
 * Uses authService.login() to match real API flow
 */
const QuickAdminLogin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async () => {
    setIsLoading(true);
    try {
      // Use authService.login() to call real backend API
      // Backend will return admin user for these credentials
      await authService.login({
        email: "admin@cinephile.com",
        password: "admin123",
      });

      // Reload to trigger useAuth to load the new user
      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);
      alert("Có lỗi khi login: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = async () => {
    setIsLoading(true);
    try {
      // Use authService.login() to match real API flow
      await authService.login({
        email: "user@cinephile.com",
        password: "user123",
      });

      // Reload to trigger useAuth to load the new user
      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);
      alert("Có lỗi khi login: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const goToAdmin = () => {
    // Verify user has admin role before navigating
    if (!user || user.role !== "admin") {
      alert("Bạn không có quyền admin. Vui lòng login lại.");
      console.error("❌ User role check failed:", {
        user,
        role: user?.role,
        expected: "admin",
      });
      return;
    }
    console.log("✅ Navigating to admin with role:", user.role);
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
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded transition-all"
          >
            <i className="fa-solid fa-user-shield mr-1"></i>
            {isLoading ? "Đang login..." : "Login as Admin"}
          </button>
          <button
            onClick={handleUserLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded transition-all"
          >
            <i className="fa-solid fa-user mr-1"></i>
            {isLoading ? "Đang login..." : "Login as User"}
          </button>
          <div className="text-[10px] text-gray-500 mt-2">
            Admin: admin@cinephile.com / admin123
            <br />
            User: user@cinephile.com / user123
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-white/10">
        <p className="text-[10px] text-gray-500">Only visible in development</p>
      </div>
    </div>
  );
};

export default QuickAdminLogin;
