// ============================================================================
// Mock Users Data for Admin Panel
// ============================================================================

/**
 * Mock users database for admin panel
 * This file contains default users that will be initialized in adminMockStorage
 *
 * Structure (aligned with data/mockUsers.js):
 * - id: Unique user ID
 * - username: User's display name (used for both name and username)
 * - email: User's email address
 * - password: User's password (for development only, use hashed in production)
 * - role: User role ("admin" | "user")
 * - avatar: User's avatar URL
 * - premium: Whether user has premium subscription
 * - coins: User's coin balance
 * - joinDate: Date when user joined (YYYY-MM-DD format)
 * - status: User status ("active" | "inactive")
 * - createdAt: ISO timestamp when record was created
 * - updatedAt: ISO timestamp when record was last updated
 */

export const MOCK_ADMIN_USERS = [
  {
    id: 1,
    username: "Admin",
    name: "Admin", // Keep for backward compatibility
    email: "admin@cinephile.com",
    password: "admin123", // In production, use hashed password (bcrypt)
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=68",
    premium: true,
    coins: 9999,
    watchlist: 0,
    hasPassword: true,
    loginMethod: "email",
    gender: "other",
    joinDate: "2024-01-01",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    username: "Nguyễn Văn A",
    name: "Nguyễn Văn A", // Keep for backward compatibility
    email: "nguyenvana@example.com",
    password: "user123",
    role: "user",
    avatar: "https://i.pravatar.cc/150?img=12",
    premium: false,
    coins: 500,
    watchlist: 0,
    hasPassword: true,
    loginMethod: "email",
    gender: "other",
    joinDate: "2024-01-15",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    username: "Trần Thị B",
    name: "Trần Thị B", // Keep for backward compatibility
    email: "tranthib@example.com",
    password: "user123",
    role: "user",
    avatar: "https://i.pravatar.cc/150?img=25",
    premium: true,
    coins: 2000,
    watchlist: 0,
    hasPassword: true,
    loginMethod: "email",
    gender: "other",
    joinDate: "2024-02-20",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get default users for initialization
 * Creates fresh timestamps for each initialization
 * @returns {Array} Array of user objects
 */
export const getDefaultUsers = () => {
  return MOCK_ADMIN_USERS.map((user) => ({
    ...user,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};
