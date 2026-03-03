import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

// Increase timeout for production (Railway can be slower due to cold starts, network latency)
// Use environment variable or default to 30s for production, 10s for development
const isProduction = process.env.NODE_ENV === "production";
const TIMEOUT = process.env.REACT_APP_API_TIMEOUT
  ? parseInt(process.env.REACT_APP_API_TIMEOUT, 10)
  : isProduction
  ? 30000
  : 10000; // 30s for production, 10s for development

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  withCredentials: true,
});

// Interceptors request
http.interceptors.request.use((config) => {
  const requiresAuth = config?.meta?.requiresAuth;
  if (requiresAuth) {
    try {
      // Dynamic import để tránh lỗi vòng lặp dependency nếu có
      const authStorage = require("./auth-storage");
      const token = authStorage.getToken();

      // Kiểm tra token format và đảm bảo header đúng
      if (token) {
        // Validate token format
        if (typeof token !== "string" || token.length < 10) {
          // Fix 3: Token không hợp lệ → xóa và dùng cookies thay thế
          authStorage.setToken(null);
          return config;
        }

        // Validate JWT format
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          // Fix 3: Token sai format → xóa và dùng cookies thay thế
          authStorage.setToken(null);
          return config;
        }

        config.headers = config.headers || {};
        // Đảm bảo format header đúng: "Bearer <token>" (có dấu cách)
        const bearerToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        config.headers.Authorization = bearerToken;
      }
      // Không có token trong localStorage → request sẽ dùng cookies (withCredentials: true)
    } catch (e) {
      // Bỏ qua nếu không tìm thấy file auth-storage
    }
  }
  return config;
});

// Interceptors response with auto refresh
let refreshPromise = null;

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err?.config || {};
    const status = err?.response?.status;
    const url = originalRequest.url || "";

    // Check if this is a login/register request (should NOT auto-retry)
    const isLoginOrRegister = url.includes("/auth/login") || url.includes("/auth/register");

    // Auto-refresh access token on 401 (once per request)
    // BUT skip auto-retry for login/register endpoints
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.__isRefreshCall &&
      !isLoginOrRegister
    ) {
      originalRequest._retry = true;

      try {
        // Deduplicate refresh calls
        if (!refreshPromise) {
          // Mobile: include refreshToken from localStorage in request body
          // (cookies may be blocked as third-party)
          let refreshBody = {};
          try {
            const authStorage = require("./auth-storage");
            if (authStorage.isMobileDevice()) {
              const storedRefreshToken = authStorage.getRefreshToken();
              if (storedRefreshToken) {
                refreshBody = { refreshToken: storedRefreshToken };
              }
            }
          } catch (e) {}
          refreshPromise = http.post(
            "/auth/refresh-token",
            refreshBody,
            { withCredentials: true, __isRefreshCall: true }
          );
        }

        const refreshResponse = await refreshPromise;
        refreshPromise = null;

        // Mobile: save new tokens from refresh response to localStorage
        // Desktop: clear any stale localStorage tokens, rely solely on cookies
        try {
          const authStorage = require("./auth-storage");
          if (authStorage.isMobileDevice()) {
            const newAccessToken = refreshResponse?.data?.accessToken;
            const newRefreshToken = refreshResponse?.data?.refreshToken;
            if (newAccessToken) authStorage.setToken(newAccessToken);
            if (newRefreshToken) authStorage.setRefreshToken(newRefreshToken);
          } else {
            // Desktop: clear localStorage tokens, use cookies
            authStorage.setToken(null);
            authStorage.setRefreshToken(null);
          }
        } catch (e) {}

        // Retry — remove old Authorization header, use cookies or new localStorage token
        const retryConfig = { ...originalRequest, __isRefreshCall: false, withCredentials: true };
        if (retryConfig.headers) {
          delete retryConfig.headers.Authorization;
        }
        return http(retryConfig);
      } catch (refreshError) {
        refreshPromise = null;
        // Bubble up refresh failure
        return Promise.reject({
          status: refreshError?.response?.status || 0,
          message:
            refreshError?.response?.data?.message ||
            refreshError?.message ||
            "Không thể làm mới phiên đăng nhập",
          raw: refreshError,
        });
      }
    }

    // For login/register or any other error, return the original error message
    const message = err?.response?.data?.message || err?.message || "Có lỗi khi kết nối máy chủ";
    return Promise.reject({
      status: status || 0,
      message,
      raw: err,
    });
  }
);

export default http;
