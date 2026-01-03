import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "contexts/AuthContext";
import { BarSpinner } from "components/common/LoadingState";
import { setAuthData, setToken, setRefreshToken } from "lib/auth-storage";
import apiRequest from "services/utils/apiRequest";

// Helper: Detect mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const GoogleAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentUser } = useAuth();
  const hasProcessedRef = useRef(false); //  React StrictMode chạy 2 lần

  useEffect(() => {
    //  Đảm bảo chỉ chạy 1 lần
    if (hasProcessedRef.current) {
      return;
    }

    const handleCallback = async () => {
      // Đánh dấu đã xử lý
      hasProcessedRef.current = true;

      const params = new URLSearchParams(location.search);
      const status = params.get("status") || params.get("auth");
      const isMobile = isMobileDevice();

      // 🔒 CHỈ xử lý tokens từ URL nếu là mobile device
      let token = null;
      let refreshToken = null;

      if (isMobile) {
        // Mobile: Lấy tokens từ URL
        token = params.get("token");
        refreshToken = params.get("refreshToken");

        //  URL Encoding trên iOS - decode đúng token
        if (token) {
          try {
            token = decodeURIComponent(token);
          } catch (e) {
            console.warn("Token decode error, using original:", e);
          }
        }
        if (refreshToken) {
          try {
            refreshToken = decodeURIComponent(refreshToken);
          } catch (e) {
            console.warn("RefreshToken decode error, using original:", e);
          }
        }
      } else {
        // Desktop: KHÔNG lấy tokens từ URL (bảo mật)
        // Chỉ dùng cookies
        console.log("💻 Desktop: Using cookies only, ignoring any tokens in URL");
      }

      if (status === "google_failed" || status === "failure") {
        navigate("/", { replace: true, state: { authError: "Đăng nhập Google thất bại" } });
        return;
      }

      try {
        // 🔒 MOBILE: Xử lý tokens từ URL
        if (isMobile && token && refreshToken) {
          // Validate token format
          if (token.length < 50) {
            console.error("❌ Token quá ngắn, có thể bị truncate:", token.length);
            throw new Error("Token không hợp lệ (quá ngắn)");
          }

          let localStorageAvailable = false;

          try {
            //  Kiểm tra localStorage có hoạt động không (Private mode)
            try {
              const testKey = "__localStorage_test__";
              localStorage.setItem(testKey, "test");
              localStorage.removeItem(testKey);
              localStorageAvailable = true;
            } catch (storageError) {
              console.error("❌ localStorage is blocked (Private mode?):", storageError);
              localStorageAvailable = false;
            }

            // Chỉ lưu vào localStorage nếu available
            if (localStorageAvailable) {
              // Store tokens in localStorage for mobile devices
              setToken(token);
              setRefreshToken(refreshToken);

              // Đợi localStorage được ghi xong trước khi tiếp tục
              // Đảm bảo token đã được lưu
              await new Promise((resolve) => {
                const checkToken = () => {
                  const savedToken = localStorage.getItem("token");
                  if (savedToken === token) {
                    resolve();
                  } else {
                    // Retry sau 50ms
                    setTimeout(checkToken, 50);
                  }
                };
                checkToken();
                // Timeout sau 1s
                setTimeout(resolve, 1000);
              });

              // Verify token was saved
              const savedToken = localStorage.getItem("token");
              if (savedToken !== token) {
                throw new Error("Không thể lưu token vào localStorage");
              }
            } else {
              // localStorage không available, thử dùng cookies
              console.warn("⚠️ localStorage không available, thử dùng cookies");
            }

            //  Kiểm tra format token trước khi gọi API
            // Token JWT thường có format: header.payload.signature
            const tokenParts = token.split(".");
            if (tokenParts.length !== 3) {
              throw new Error("Token không đúng format JWT");
            }

            // Try to get user info using the token from URL
            const userData = await apiRequest("/auth/me", {
              requiresAuth: true, // This will use the token from localStorage via axios interceptor
            });

            if (userData?.data || userData) {
              const user = userData?.data || userData;

              //  Đợi lưu user data xong
              if (localStorageAvailable) {
                setAuthData({ user, token, refreshToken });

                // Đợi thêm 100ms để đảm bảo localStorage được ghi xong
                await new Promise((resolve) => setTimeout(resolve, 100));
              }

              //  Thêm timestamp để tránh cache
              const timestamp = Date.now();
              navigate(`/?t=${timestamp}`, {
                replace: true,
                state: { authSuccess: "Đăng nhập thành công" },
              });
              return;
            }
          } catch (tokenError) {
            console.error("❌ Token-based auth failed:", {
              error: tokenError,
              message: tokenError?.message,
              status: tokenError?.status,
            });

            // Clear tokens if they failed
            if (localStorageAvailable) {
              setToken(null);
              setRefreshToken(null);
            }

            // Fall through to try cookies
            console.log("🔄 Falling back to cookies...");
          }
        }

        // 💻 DESKTOP hoặc MOBILE fallback: Dùng cookies
        console.log("🍪 Authenticating with cookies...");
        await getCurrentUser();

        //  Thêm timestamp để tránh cache
        const timestamp = Date.now();
        navigate(`/?t=${timestamp}`, {
          replace: true,
          state: { authSuccess: "Đăng nhập thành công" },
        });
      } catch (error) {
        console.error("❌ Google auth callback error:", {
          error,
          message: error?.message,
          status: error?.status,
        });

        //  Thêm timestamp để tránh cache
        const timestamp = Date.now();
        navigate(`/?t=${timestamp}`, {
          replace: true,
          state: { authError: error?.message || "Không thể tải thông tin tài khoản" },
        });
      }
    };

    handleCallback();
  }, [location.search, navigate, getCurrentUser]);

  return <BarSpinner />;
};

export default GoogleAuthHandler;
