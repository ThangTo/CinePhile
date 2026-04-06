/**
 * Admin Dashboard Constants
 */

export const ADMIN_TABS = {
  OVERVIEW: "overview",
  MOVIES: "movies",
  USERS: "users",
  COMMENTS: "comments",
  VIRAL_CLIPS: "viral-clips",
  NOTIFICATIONS: "notifications",
  SETTINGS: "settings",
  PRICING: "pricing",
  MAILBOX: "mailbox",
  QUESTS: "quests",
};

export const ADMIN_MENU_ITEMS = [
  { id: ADMIN_TABS.OVERVIEW, label: "Tong quan", icon: "fa-chart-line" },
  { id: ADMIN_TABS.MOVIES, label: "Phim", icon: "fa-film" },
  { id: ADMIN_TABS.USERS, label: "Nguoi dung", icon: "fa-users" },
  { id: ADMIN_TABS.COMMENTS, label: "Binh luan", icon: "fa-comments" },
  { id: ADMIN_TABS.VIRAL_CLIPS, label: "Viral Clips", icon: "fa-bolt" },
  { id: ADMIN_TABS.NOTIFICATIONS, label: "Thong bao", icon: "fa-bell" },
  { id: ADMIN_TABS.MAILBOX, label: "Hop thu", icon: "fa-envelope" },
  { id: ADMIN_TABS.SETTINGS, label: "Cai dat", icon: "fa-cog" },
  { id: ADMIN_TABS.PRICING, label: "Quan ly gia", icon: "fa-dollar-sign" },
  { id: ADMIN_TABS.QUESTS, label: "Nhiem vu", icon: "fa-list-check" },
];

export const STAT_COLORS = {
  BLUE: "blue",
  GREEN: "green",
  PURPLE: "purple",
  YELLOW: "yellow",
  RED: "red",
};

export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

export const QUALITY_OPTIONS = [
  { value: "4K", label: "4K Ultra HD" },
  { value: "HD", label: "HD 1080p" },
  { value: "SD", label: "SD 720p" },
  { value: "CAM", label: "CAM (Cinema)" },
];

export const AGE_RATING_OPTIONS = [
  { value: "P", label: "P - Moi lua tuoi" },
  { value: "T13", label: "T13 - Tren 13 tuoi" },
  { value: "T16", label: "T16 - Tren 16 tuoi" },
  { value: "T18", label: "T18 - Tren 18 tuoi" },
];

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BANNED: "banned",
  PENDING: "pending",
};

export const ADMIN_USER_ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
];

export const ACTION_TYPES = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
  LOGIN: "login",
  LOGOUT: "logout",
};

export const PERMISSIONS = {
  MOVIE_CREATE: "movie:create",
  MOVIE_READ: "movie:read",
  MOVIE_UPDATE: "movie:update",
  MOVIE_DELETE: "movie:delete",
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  COMMENT_MODERATE: "comment:moderate",
  COMMENT_DELETE: "comment:delete",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",
};

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  moderator: [
    PERMISSIONS.MOVIE_READ,
    PERMISSIONS.MOVIE_UPDATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.COMMENT_MODERATE,
    PERMISSIONS.COMMENT_DELETE,
  ],
  user: [PERMISSIONS.MOVIE_READ],
};
