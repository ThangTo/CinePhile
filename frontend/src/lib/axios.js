import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || // CRA
  "http://localhost:5000/api/v1";

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // timeout 15s
  withCredentials: false, // true nếu backend dùng cookie
});

// Interceptors request
http.interceptors.request.use((config) => {
  const requiresAuth = config?.meta?.requiresAuth;
  if (requiresAuth) {
    // Use auth-storage helper to get token
    // Dynamic import to avoid circular dependency
    const authStorage = require("./auth-storage");
    const token = authStorage.getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptors response
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.message || err?.message || "Có lỗi khi kết nối máy chủ";
    return Promise.reject({
      status: err?.response?.status || 0,
      message,
      raw: err,
    });
  }
);

export default http;
