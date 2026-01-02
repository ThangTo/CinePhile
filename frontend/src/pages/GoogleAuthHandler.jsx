import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "contexts/AuthContext";
import { BarSpinner } from "components/common/LoadingState";
import { setAuthData, setToken, setRefreshToken } from "lib/auth-storage";
import apiRequest from "services/utils/apiRequest";

const GoogleAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const status = params.get("status") || params.get("auth");
      const token = params.get("token");
      const refreshToken = params.get("refreshToken");

      if (status === "google_failed" || status === "failure") {
        navigate("/", { replace: true, state: { authError: "Đăng nhập Google thất bại" } });
        return;
      }

      try {
        // If tokens are in URL params (mobile fallback), try to get user info with them
        if (token && refreshToken) {
          try {
            // Store tokens in localStorage for mobile devices
            setToken(token);
            setRefreshToken(refreshToken);

            // Try to get user info using the token from URL
            const userData = await apiRequest("/auth/me", {
              requiresAuth: true, // This will use the token from localStorage via axios interceptor
            });

            if (userData?.data || userData) {
              const user = userData?.data || userData;
              setAuthData({ user, token, refreshToken });
              // Clean up URL params by navigating without them
              navigate("/", { replace: true, state: { authSuccess: "Đăng nhập thành công" } });
              return;
            }
          } catch (tokenError) {
            console.warn("Failed to authenticate with URL token, trying cookies:", tokenError);
            // Clear tokens if they failed
            setToken(null);
            setRefreshToken(null);
            // Fall through to try cookies
          }
        }

        // Try to get user from cookies (desktop/browser)
        await getCurrentUser();
        navigate("/", { replace: true, state: { authSuccess: "Đăng nhập thành công" } });
      } catch (error) {
        console.error("Google auth callback error:", error);
        navigate("/", { replace: true, state: { authError: "Không thể tải thông tin tài khoản" } });
      }
    };

    handleCallback();
  }, [location.search, navigate, getCurrentUser]);

  return <BarSpinner />;
};

export default GoogleAuthHandler;
