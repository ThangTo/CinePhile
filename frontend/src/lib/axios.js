import axios from "axios";

// SỬA LẠI CỔNG 5000 -> 5001 CHO KHỚP VỚI BACKEND
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 
  "http://localhost:5001/api/v1"; 

console.log(API_BASE_URL);
const http = axios.create({
  baseURL: API_BASE_URL,
<<<<<<< Updated upstream
  timeout: 10000, // timeout 15s
<<<<<<< Updated upstream
  withCredentials: true,
=======
  withCredentials: false, // true nếu backend dùng cookie
=======
  timeout: 15000, 
  withCredentials: false,
>>>>>>> Stashed changes
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
>>>>>>> Stashed changes
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