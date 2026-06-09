import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "hooks/useAuth";
import BarSpinner from "components/common/LoadingState";

/**
 * Protected Route Wrapper
 * Kiểm tra authentication và authorization trước khi cho phép truy cập
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component cần bảo vệ
 * @param {string} props.requiredRole - Role cần thiết (admin, user)
 */
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isLoading } = useAuth();

  // Đang load thông tin user
  if (isLoading) {
    return <BarSpinner />;
  }

  // Chưa đăng nhập -> redirect về trang chủ
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Kiểm tra role nếu được yêu cầu
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-dvh bg-bgColor flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <i className="fa-solid fa-ban text-4xl text-red-500"></i>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Truy Cập Bị Từ Chối</h1>
          <p className="text-gray-400 mb-6">
            Bạn không có quyền truy cập trang này. Chỉ admin mới có thể truy cập.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Debug: Role hiện tại: {user?.role || "undefined"} | Yêu cầu: {requiredRole}
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-primaryColor hover:bg-primaryColor/90 text-black font-semibold px-6 py-3 rounded-lg transition-all"
          >
            <i className="fa-solid fa-home mr-2"></i>
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  // Có quyền truy cập
  return children;
};

export default ProtectedRoute;
