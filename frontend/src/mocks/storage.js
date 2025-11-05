// ============================================================================
// MSW Mock Storage (In-memory storage for service worker context)
// ============================================================================

// Note: In real scenarios, MSW handlers run in service worker which doesn't have access to localStorage
// We'll simulate it with a simple in-memory store

import { getDefaultUsers } from "./data/mockUsers";

/**
 * Mock storage for user authentication data
 */
export const mockStorage = {
  user: null,
  token: null,
  refreshToken: null,
};

/**
 * Admin mock storage for admin panel data
 */
export const adminMockStorage = {
  movies: [],
  users: [],
  initialized: false,
};

/**
 * Initialize admin mock storage with default data
 */
export const initializeAdminStorage = () => {
  if (adminMockStorage.initialized) return;

  // Initialize with mockTop10Movies for admin movies
  // Using dynamic import to avoid circular dependency
  const mockDataModule = require("./data/mockData");
  const mockTop10Movies = mockDataModule.mockTop10Movies || [];
  adminMockStorage.movies = mockTop10Movies.slice(0, 10).map((movie) => ({
    ...movie,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Initialize with default admin users from mockUsers.js
  adminMockStorage.users = getDefaultUsers();

  adminMockStorage.initialized = true;
};

// Initialize on first import
initializeAdminStorage();
