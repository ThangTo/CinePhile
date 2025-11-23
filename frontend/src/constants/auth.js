/**
 * Authentication Constants
 */

// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Mock mode - Now using real HTTP API (backend is ready)
export const USE_MOCK_AUTH = false;

// LocalStorage Keys
export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
  REFRESH_TOKEN: "refresh_token",
};

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator", // For future use
};

// Session Configuration
export const SESSION_CONFIG = {
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  AUTO_LOGOUT_ON_EXPIRY: true,
};

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// Error Messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
  EMAIL_EXISTS: "Email đã được sử dụng",
  WEAK_PASSWORD: `Mật khẩu phải có ít nhất ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} ký tự`,
  PASSWORDS_NOT_MATCH: "Mật khẩu xác nhận không khớp",
  INVALID_EMAIL: "Email không hợp lệ",
  REQUIRED_FIELDS: "Vui lòng điền đầy đủ thông tin",
  SERVER_ERROR: "Có lỗi xảy ra. Vui lòng thử lại sau",
  UNAUTHORIZED: "Bạn không có quyền truy cập",
  SESSION_EXPIRED: "Phiên đăng nhập đã hết hạn",
};

// Success Messages
export const AUTH_SUCCESS = {
  LOGIN: "Đăng nhập thành công!",
  REGISTER: "Đăng ký thành công!",
  LOGOUT: "Đã đăng xuất",
  PASSWORD_CHANGED: "Đổi mật khẩu thành công",
  EMAIL_CHANGED: "Đổi email thành công",
};
