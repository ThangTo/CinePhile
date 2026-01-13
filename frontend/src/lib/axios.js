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
          throw new Error("Token không hợp lệ");
        }

        // Validate JWT format
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          throw new Error("Token không đúng format JWT");
        }

        config.headers = config.headers || {};
        // Đảm bảo format header đúng: "Bearer <token>" (có dấu cách)
        const bearerToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        config.headers.Authorization = bearerToken;
      }
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
          refreshPromise = http.post(
            "/auth/refresh-token",
            {},
            { withCredentials: true, __isRefreshCall: true }
          );
        }

        await refreshPromise;
        refreshPromise = null;

        // Retry the original request with credentials
        return http({
          ...originalRequest,
          __isRefreshCall: false,
          withCredentials: true,
        });
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
