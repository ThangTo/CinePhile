import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "contexts/AuthContext";
import { BarSpinner } from "components/common/LoadingState";
import {
  setAuthData,
  setToken,
  setRefreshToken,
  getAndClearReturnLocation,
} from "lib/auth-storage";
import apiRequest from "services/utils/apiRequest";

// Helper: Detect mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const GoogleAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentUser } = useAuth();
  const hasProcessedRef = useRef(false);
  const lastProcessedSearchRef = useRef(null); // Lưu location.search đã xử lý
  const isMountedRef = useRef(true); // Track if component is mounted

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Bỏ qua nếu location.search rỗng (đã navigate về "/" không có params)
    if (!location.search || location.search.trim() === "") {
      return;
    }

    const params = new URLSearchParams(location.search);
    const status = params.get("status") || params.get("auth");
    const hasToken = params.get("token") && params.get("refreshToken");
    const hasFailure = status === "google_failed" || status === "failure";

    // Chỉ xử lý nếu có auth params hoặc token, và chưa xử lý location.search này
    const shouldProcess =
      (status === "google_success" || hasToken || hasFailure) &&
      location.search !== lastProcessedSearchRef.current;

    if (!shouldProcess) {
      return;
    }

    // Đánh dấu đã xử lý location.search này
    lastProcessedSearchRef.current = location.search;
    hasProcessedRef.current = true;

    const handleCallback = async () => {
      // Check if component is still mounted before proceeding
      if (!isMountedRef.current) return;
      const isMobile = isMobileDevice();

      // 🔒 CHỈ xử lý tokens từ URL nếu là mobile device
      let token = null;
      let refreshToken = null;

      if (isMobile) {
        // Mobile: Lấy tokens từ URL
        token = params.get("token");
        refreshToken = params.get("refreshToken");

        // URL Encoding trên iOS - decode đúng token
        if (token) {
          try {
            token = decodeURIComponent(token);
          } catch (e) {
            // Ignore decode errors
          }
        }
        if (refreshToken) {
          try {
            refreshToken = decodeURIComponent(refreshToken);
          } catch (e) {
            // Ignore decode errors
          }
        }
      }

      if (status === "google_failed" || status === "failure") {
        if (!isMountedRef.current) return;
        navigate("/", { replace: true, state: { authError: "Đăng nhập Google thất bại" } });
        return;
      }

      try {
        // 🔒 MOBILE: Xử lý tokens từ URL
        if (isMobile && token && refreshToken) {
          // Validate token format
          if (token.length < 50) {
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
            }

            // Kiểm tra format token trước khi gọi API
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

              // Check if still mounted before navigating
              if (!isMountedRef.current) return;

              // Lấy location đã lưu và redirect về đó
              const returnLocation = getAndClearReturnLocation();

              if (returnLocation && returnLocation.pathname !== "/") {
                // Redirect về location đã lưu
                navigate(returnLocation.pathname + returnLocation.search, {
                  state: { ...returnLocation.state, authSuccess: "Đăng nhập thành công" },
                  replace: true,
                });
              } else {
                // Navigate về homepage nếu không có location đã lưu
                navigate("/", {
                  replace: true,
                  state: { authSuccess: "Đăng nhập thành công" },
                });
              }
              return;
            }
          } catch (tokenError) {
            // Clear tokens if they failed
            if (localStorageAvailable) {
              setToken(null);
              setRefreshToken(null);
            }
            // Fall through to try cookies
          }
        }

        // 💻 DESKTOP hoặc MOBILE fallback: Dùng cookies
        await getCurrentUser();

        // Check if still mounted before navigating
        if (!isMountedRef.current) return;

        // Lấy location đã lưu và redirect về đó
        const returnLocation = getAndClearReturnLocation();

        if (returnLocation && returnLocation.pathname !== "/") {
          // Redirect về location đã lưu
          navigate(returnLocation.pathname + returnLocation.search, {
            state: { ...returnLocation.state, authSuccess: "Đăng nhập thành công" },
            replace: true,
          });
        } else {
          // Navigate về homepage nếu không có location đã lưu
          navigate("/", {
            replace: true,
            state: { authSuccess: "Đăng nhập thành công" },
          });
        }
      } catch (error) {
        // Check if still mounted before navigating
        if (!isMountedRef.current) return;

        // Navigate về homepage (xóa hết params để tránh vòng lặp)
        navigate("/", {
          replace: true,
          state: { authError: error?.message || "Không thể tải thông tin tài khoản" },
        });
      }
    };

    handleCallback();
  }, [location.search, navigate, getCurrentUser]);

  return (
    <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
      <BarSpinner />;
    </div>
  );
};

export default GoogleAuthHandler;
