/**
 * Mock Data for Admin Dashboard
 * Separate from user-facing mock data
 */

/**
 * Dashboard Statistics
 */
export const MOCK_ADMIN_STATS = {
  totalMovies: 1234,
  totalUsers: 5678,
  totalViews: 123456,
  activeUsers: 342,
  trends: {
    movies: "+12%",
    users: "+8%",
    views: "+24%",
    activeUsers: "+5%",
  },
};

/**
 * Chart Data for Analytics
 */
export const MOCK_CHART_DATA = {
  weeklyViews: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    data: [1200, 1900, 1500, 2100, 1800, 2500, 2200],
  },
  popularGenres: {
    labels: ["Hành Động", "Tình Cảm", "Hài", "Kinh Dị", "Cổ Trang"],
    data: [30, 25, 20, 15, 10],
  },
  userGrowth: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    data: [100, 150, 200, 280, 350, 420],
  },
};

/**
 * Activity Logs (for future implementation)
 */
export const MOCK_ACTIVITY_LOGS = [
  {
    id: 1,
    action: "created",
    type: "movie",
    user: "Admin",
    details: "Added movie 'Thần Đèn Ơi, Ước Đi'",
    timestamp: "2024-11-02T10:30:00Z",
  },
  {
    id: 2,
    action: "updated",
    type: "user",
    user: "Admin",
    details: "Changed role for user@example.com to admin",
    timestamp: "2024-11-02T09:15:00Z",
  },
  {
    id: 3,
    action: "deleted",
    type: "movie",
    user: "Admin",
    details: "Removed movie ID 999",
    timestamp: "2024-11-01T18:20:00Z",
  },
];

/**
 * System Settings (for future implementation)
 */
export const MOCK_SYSTEM_SETTINGS = {
  siteName: "CinePhile",
  maintenanceMode: false,
  registrationEnabled: true,
  commentsEnabled: true,
  maxUploadSize: 10, // MB
  allowedFileTypes: ["jpg", "jpeg", "png", "webp"],
};

