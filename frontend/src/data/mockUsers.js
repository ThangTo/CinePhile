/**
 * Mock User Database
 * In production, this will be handled by backend database
 */

export const MOCK_USERS = [
  {
    id: 1,
    username: "Admin",
    email: "admin@cinephile.com",
    password: "admin123", // In production, use hashed password (bcrypt)
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=68",
    premium: true,
    coins: 9999,
    joinDate: "2024-01-01",
    status: "active",
  },
  {
    id: 2,
    username: "User Demo",
    email: "user@cinephile.com",
    password: "user123",
    role: "user",
    avatar: "https://i.pravatar.cc/150?img=33",
    premium: false,
    coins: 1000,
    joinDate: "2024-06-15",
    status: "active",
  },
  {
    id: 3,
    username: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    password: "user123",
    role: "user",
    avatar: "https://i.pravatar.cc/150?img=12",
    premium: false,
    coins: 500,
    joinDate: "2024-08-20",
    status: "active",
  },
  {
    id: 4,
    username: "Trần Thị B",
    email: "tranthib@example.com",
    password: "user123",
    role: "user",
    avatar: "https://i.pravatar.cc/150?img=25",
    premium: true,
    coins: 2000,
    joinDate: "2024-09-10",
    status: "active",
  },
];

/**
 * Default user object structure for new registrations
 */
export const DEFAULT_USER_TEMPLATE = {
  role: "user",
  premium: false,
  coins: 1000,
  status: "active",
  watchlist: 0,
  hasPassword: true,
  loginMethod: "email",
  gender: "other",
};

/**
 * Get random avatar URL
 */
export const getRandomAvatar = () => {
  const randomId = Math.floor(Math.random() * 70) + 1;
  return `https://i.pravatar.cc/150?img=${randomId}`;
};

