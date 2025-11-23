// ============================================================================
// MSW Helper Utilities
// ============================================================================

import { HttpResponse } from "msw";

/**
 * Delay helper for simulating network latency
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate mock JWT token
 * @param {string} prefix - Token prefix
 * @returns {string} Mock token
 */
export const generateMockToken = (prefix = "mock") =>
  `${prefix}-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create mock user object
 * @param {Object} overrides - User data overrides
 * @returns {Object} Mock user object
 */
export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: "MockUser",
  email: "mock@example.com",
  avatar: "https://i.pravatar.cc/150?img=68",
  premium: false,
  coins: 1000,
  watchlist: 0,
  hasPassword: true,
  loginMethod: "email",
  gender: "other",
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Check if request has valid authentication token
 * @param {Request} request - MSW request object
 * @returns {HttpResponse|null} Error response if unauthorized, null if authorized
 */
export const requireAuth = (request) => {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
};
