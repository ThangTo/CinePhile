import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "services/auth.service";
import AuthModal from "components/auth/AuthModal";
import { saveReturnLocation } from "lib/auth-storage";

/**
 * AuthContext - Provides authentication state and methods throughout the app
 */
const AuthContext = createContext(null);

/**
 * AuthProvider - Wraps the app and provides auth context
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        //  Load cached user data trước để hiển thị ngay (không phải "Khách")
        const cachedUserData = authService.getCurrentUserLocal();
        if (cachedUserData) {
          setUser(cachedUserData);
        }

        //  Gọi API để lấy user mới nhất (có thể mất thời gian)
        // Nhưng vẫn giữ isLoading = true để không render UI "Khách"
        try {
          const currentUser = await authService.getCurrentUser();
          const userDataFromAPI = currentUser?.data || currentUser;

          if (userDataFromAPI) {
            setUser(userDataFromAPI);
            authService.setAuthData(null, userDataFromAPI);
          } else {
            //  Chỉ clear nếu thực sự không có user (401 hoặc không có data)
            // Không clear nếu chỉ là network error tạm thời
            authService.clearAuthData();
            setUser(null);
          }
        } catch (apiError) {
          // Xác định loại lỗi:
          // - status 401: Token hết hạn và refresh cũng thất bại
          // - status 0 hoặc undefined: Refresh token thất bại (axios interceptor trả status 0)
          // - Các status khác (500, 503...): Lỗi server/mạng tạm thời → giữ cached user
          const status = apiError?.status;
          const isAuthExpired = status === 401 || status === 0 || status === undefined;
          const isServerError = status >= 500;

          if (isAuthExpired && !isServerError) {
            console.warn("⚠️ Auth expired (status:", status, "), clearing auth data");
            authService.clearAuthData();
            setUser(null);
          } else {
            // Lỗi mạng/server tạm thời, giữ lại cached user
            console.warn("⚠️ Server/network error, keeping cached user:", apiError?.message);
          }
        }
      } catch (error) {
        // Lỗi nghiêm trọng, clear tất cả
        console.error("❌ Critical error in loadUser:", error);
        authService.clearAuthData();
        setUser(null);
      } finally {
        //  Chỉ set isLoading = false sau khi đã xử lý xong
        // Đảm bảo UI không hiển thị "Khách" trước khi load xong
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Fix 4: Kiểm tra lại auth state khi user quay lại tab/app
  // Giải quyết trường hợp token hết hạn khi app ở background
  useEffect(() => {
    let isChecking = false;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible" || !user || isChecking) return;
      isChecking = true;

      try {
        const currentUser = await authService.getCurrentUser();
        const userData = currentUser?.data || currentUser;
        if (userData) {
          setUser(userData);
          authService.setAuthData(null, userData);
        }
      } catch (error) {
        // Auth đã hết hạn khi tab/app ở background
        const status = error?.status;
        const isAuthExpired = status === 401 || status === 0 || status === undefined;
        const isServerError = status >= 500;

        if (isAuthExpired && !isServerError) {
          console.warn("⚠️ Auth expired while inactive, logging out");
          authService.clearAuthData();
          setUser(null);
        }
      } finally {
        isChecking = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  /**
   * Open authentication modal
   * Lưu location hiện tại để redirect về sau khi đăng nhập (chủ yếu cho Google OAuth)
   * @param {string} mode - "login" or "register"
   */
  const openAuthModal = (mode = "login") => {
    // Lưu location hiện tại (trừ khi đang ở trang đăng nhập hoặc callback)
    // Sử dụng window.location vì AuthProvider có thể được render ngoài Router
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const isAuthPage = currentPath === "/auth/google/callback" || currentPath.startsWith("/auth/");

    if (!isAuthPage) {
      // Lưu location hiện tại để redirect về sau khi đăng nhập (chủ yếu cho Google OAuth)
      saveReturnLocation(
        currentPath,
        currentSearch,
        null // Không thể lấy state từ window.location, nhưng không sao vì state thường không quan trọng
      );
    }

    setAuthMode(mode);
    setShowAuthModal(true);
  };

  /**
   * Close authentication modal
   */
  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  /**
   * Handle login
   */
  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      const userData = data?.user || data;
      if (userData) {
        setUser(userData);
        closeAuthModal();
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  /**
   * Handle register
   */
  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      const userDataFromResponse = data?.user || data;
      if (userDataFromResponse) {
        setUser(userDataFromResponse);
        closeAuthModal();
      }
      return data;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  };

  /**
   * Handle logout
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      authService.clearAuthData();
      setUser(null);
    }
  };

  /**
   * Update user data
   */
  const updateUser = (userData) => {
    setUser(userData);
    authService.setAuthData(null, userData);
  };

  /**
   * Force refresh user from API
   */
  const refetchCurrentUser = useCallback(async () => {
    const data = await authService.getCurrentUser();
    const userData = data?.data || data;
    if (userData) {
      setUser(userData);
      authService.setAuthData(null, userData);
      return userData;
    }
    throw new Error("Unable to fetch user");
  }, []);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  const value = {
    user,
    isLoading,
    isAuthenticated,
    showAuthModal,
    authMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    updateUser,
    getCurrentUser: refetchCurrentUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
    </AuthContext.Provider>
  );
};

/**
 * useAuth hook - Access auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
