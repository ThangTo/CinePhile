/**
 * Admin Dashboard Constants
 */

// Dashboard Tabs
export const ADMIN_TABS = {
  OVERVIEW: "overview",
  MOVIES: "movies",
  USERS: "users",
  COMMENTS: "comments",
  VIRAL_CLIPS: "viral-clips",
  NOTIFICATIONS: "notifications",
  SETTINGS: "settings",
  PRICING: "pricing",
};

// Sidebar Menu Items
export const ADMIN_MENU_ITEMS = [
  { id: ADMIN_TABS.OVERVIEW, label: "Tổng Quan", icon: "fa-chart-line" },
  { id: ADMIN_TABS.MOVIES, label: "Phim", icon: "fa-film" },
  { id: ADMIN_TABS.USERS, label: "Người Dùng", icon: "fa-users" },
  { id: ADMIN_TABS.COMMENTS, label: "Bình Luận", icon: "fa-comments" },
  { id: ADMIN_TABS.VIRAL_CLIPS, label: "Viral Clips", icon: "fa-bolt" },
  { id: ADMIN_TABS.NOTIFICATIONS, label: "Thông Báo", icon: "fa-bell" },
  { id: ADMIN_TABS.SETTINGS, label: "Cài Đặt", icon: "fa-cog" },
  { id: ADMIN_TABS.PRICING, label: "Quản Lý Giá", icon: "fa-dollar-sign" },
];

// Stat Card Colors
export const STAT_COLORS = {
  BLUE: "blue",
  GREEN: "green",
  PURPLE: "purple",
  YELLOW: "yellow",
  RED: "red",
};

// Table Pagination
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// Movie Quality Options
export const QUALITY_OPTIONS = [
  { value: "4K", label: "4K Ultra HD" },
  { value: "HD", label: "HD 1080p" },
  { value: "SD", label: "SD 720p" },
  { value: "CAM", label: "CAM (Cinema)" },
];

// Age Rating Options
export const AGE_RATING_OPTIONS = [
  { value: "P", label: "P - Mọi lứa tuổi" },
  { value: "T13", label: "T13 - Trên 13 tuổi" },
  { value: "T16", label: "T16 - Trên 16 tuổi" },
  { value: "T18", label: "T18 - Trên 18 tuổi" },
];

// User Status Options
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BANNED: "banned",
  PENDING: "pending",
};

// User Role Options
export const ADMIN_USER_ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
];

// Action Types for Logs
export const ACTION_TYPES = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
  LOGIN: "login",
  LOGOUT: "logout",
};

// Permissions (for future RBAC)
export const PERMISSIONS = {
  // Movies
  MOVIE_CREATE: "movie:create",
  MOVIE_READ: "movie:read",
  MOVIE_UPDATE: "movie:update",
  MOVIE_DELETE: "movie:delete",

  // Users
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  // Comments
  COMMENT_MODERATE: "comment:moderate",
  COMMENT_DELETE: "comment:delete",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",
};

// Role Permissions Mapping
export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS), // Full access
  moderator: [
    PERMISSIONS.MOVIE_READ,
    PERMISSIONS.MOVIE_UPDATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.COMMENT_MODERATE,
    PERMISSIONS.COMMENT_DELETE,
  ],
  user: [PERMISSIONS.MOVIE_READ],
};
