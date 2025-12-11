import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

console.log(API_BASE_URL);

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // timeout 10s
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
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Bỏ qua nếu không tìm thấy file auth-storage
      console.warn("Auth storage not found or error loading token");
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
    const isAuthPath =
      typeof originalRequest.url === "string" && originalRequest.url.includes("/auth/");

    // Auto-refresh access token on 401 (once per request)
    if (status === 401 && !originalRequest._retry && !originalRequest.__isRefreshCall) {
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

    const message = err?.response?.data?.message || err?.message || "Có lỗi khi kết nối máy chủ";
    return Promise.reject({
      status: status || 0,
      message,
      raw: err,
      isAuthPath,
    });
  }
);

export default http;
