/**
 * Admin Service - API calls for admin dashboard
 * Mock implementation - replace with real API calls later
 */

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Movies API
 */
export const movieAPI = {
  // Get all movies
  getAll: async () => {
    await delay(300);
    // Return mock data - replace with fetch('/api/admin/movies')
    const mockMovies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    return mockMovies;
  },

  // Get movie by ID
  getById: async (id) => {
    await delay(200);
    const movies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    return movies.find((m) => m.id === id) || null;
  },

  // Create new movie
  create: async (movieData) => {
    await delay(500);
    const movies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    const newMovie = {
      ...movieData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    movies.push(newMovie);
    localStorage.setItem("admin_movies", JSON.stringify(movies));
    return newMovie;
  },

  // Update movie
  update: async (id, movieData) => {
    await delay(500);
    const movies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    const index = movies.findIndex((m) => m.id === id);
    if (index === -1) throw new Error("Movie not found");
    
    movies[index] = {
      ...movies[index],
      ...movieData,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("admin_movies", JSON.stringify(movies));
    return movies[index];
  },

  // Delete movie
  delete: async (id) => {
    await delay(300);
    const movies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    const filtered = movies.filter((m) => m.id !== id);
    localStorage.setItem("admin_movies", JSON.stringify(filtered));
    return { success: true };
  },

  // Search movies
  search: async (query) => {
    await delay(200);
    const movies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    return movies.filter((m) =>
      m.title.toLowerCase().includes(query.toLowerCase())
    );
  },
};

/**
 * Users API
 */
export const userAPI = {
  // Get all users
  getAll: async () => {
    await delay(300);
    const mockUsers = JSON.parse(localStorage.getItem("admin_users") || "[]");
    return mockUsers;
  },

  // Get user by ID
  getById: async (id) => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem("admin_users") || "[]");
    return users.find((u) => u.id === id) || null;
  },

  // Create new user
  create: async (userData) => {
    await delay(500);
    const users = JSON.parse(localStorage.getItem("admin_users") || "[]");
    
    // Check if email exists
    if (users.some((u) => u.email === userData.email)) {
      throw new Error("Email đã tồn tại");
    }
    
    const newUser = {
      ...userData,
      id: Date.now(),
      joinDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem("admin_users", JSON.stringify(users));
    return newUser;
  },

  // Update user
  update: async (id, userData) => {
    await delay(500);
    const users = JSON.parse(localStorage.getItem("admin_users") || "[]");
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found");
    
    // Check email duplicate (excluding current user)
    if (
      userData.email &&
      users.some((u) => u.id !== id && u.email === userData.email)
    ) {
      throw new Error("Email đã tồn tại");
    }
    
    users[index] = {
      ...users[index],
      ...userData,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("admin_users", JSON.stringify(users));
    return users[index];
  },

  // Delete user
  delete: async (id) => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem("admin_users") || "[]");
    const filtered = users.filter((u) => u.id !== id);
    localStorage.setItem("admin_users", JSON.stringify(filtered));
    return { success: true };
  },

  // Toggle user status
  toggleStatus: async (id) => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem("admin_users") || "[]");
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found");
    
    users[index].status = users[index].status === "active" ? "inactive" : "active";
    localStorage.setItem("admin_users", JSON.stringify(users));
    return users[index];
  },
};

/**
 * Stats API
 */
export const statsAPI = {
  // Get dashboard stats
  getStats: async () => {
    await delay(300);
    const movies = JSON.parse(localStorage.getItem("admin_movies") || "[]");
    const users = JSON.parse(localStorage.getItem("admin_users") || "[]");
    
    return {
      totalMovies: movies.length,
      totalUsers: users.length,
      totalViews: movies.reduce((sum, m) => sum + (m.views || 0), 0),
      activeUsers: users.filter((u) => u.status === "active").length,
      trends: {
        movies: "+12%",
        users: "+8%",
        views: "+24%",
        active: "+5%",
      },
    };
  },

  // Get chart data (placeholder)
  getChartData: async (type) => {
    await delay(200);
    // Return mock chart data
    return {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [12, 19, 3, 5, 2, 3, 15],
    };
  },
};

/**
 * Initialize mock data if empty
 */
export const initializeMockData = () => {
  if (!localStorage.getItem("admin_movies")) {
    localStorage.setItem("admin_movies", JSON.stringify([]));
  }
  if (!localStorage.getItem("admin_users")) {
    // Add default admin user
    const defaultUsers = [
      {
        id: 1,
        name: "Admin",
        email: "admin@cinephile.com",
        role: "admin",
        status: "active",
        joinDate: "2024-01-01",
      },
    ];
    localStorage.setItem("admin_users", JSON.stringify(defaultUsers));
  }
};

